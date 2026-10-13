const { app, BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// ---- easy settings ----
const PANEL_WIDTH = 300;
const HEIGHT_RATIO = 0.78; // fraction of screen height (lower = shorter)
const RIGHT_GAP = 10; // gap from the right screen edge
const IDLE_MS = 1 * 1000; // auto-hide after this much non-use
const EDGE_DWELL_MS = 200; // how long the cursor must rest at the edge to reveal
const BLUR_STATE = 4; // 4 = acrylic blur, 3 = plain blur (try 3 if animation lags)
const BLUR_TINT_ALPHA = 0x30; // 0x00 = clear glass ... 0xFF = solid dark
const CORNER_RADIUS = 22;

// ---- data (shared by both windows) ----
const dbFile = () => path.join(app.getPath("userData"), "widget-data.json");
const defaults = () => ({ todos: [], notes: "", schedule: [], classes: [] });
let data = defaults();

function loadData() {
  try {
    data = { ...defaults(), ...JSON.parse(fs.readFileSync(dbFile(), "utf8")) };
  } catch {
    data = defaults();
  }
}

ipcMain.handle("db:load", () => data);

ipcMain.handle("db:set", (e, key, value) => {
  data[key] = value;
  fs.writeFileSync(dbFile(), JSON.stringify(data, null, 2));
  BrowserWindow.getAllWindows().forEach((w) => {
    if (w.webContents !== e.sender) w.webContents.send("db:updated", data);
  });
  return true;
});

ipcMain.on("app:quit", () => app.quit());
ipcMain.on("win:close", (e) =>
  BrowserWindow.fromWebContents(e.sender)?.close(),
);

// ---- always-on blur (Windows) ----
let blur = null;

function initBlur() {
  if (process.platform !== "win32") return;
  try {
    const koffi = require("koffi");
    const user32 = koffi.load("user32.dll");
    const gdi32 = koffi.load("gdi32.dll");
    const WCAData = koffi.struct("WCAData", {
      attr: "int",
      data: "void *",
      size: "size_t",
    });
    blur = {
      setAttr: user32.func(
        "int __stdcall SetWindowCompositionAttribute(uint64 hwnd, WCAData *data)",
      ),
      roundRgn: gdi32.func(
        "void * __stdcall CreateRoundRectRgn(int a, int b, int c, int d, int e, int f)",
      ),
      setRgn: user32.func(
        "int __stdcall SetWindowRgn(uint64 hwnd, void *rgn, int redraw)",
      ),
    };
  } catch (err) {
    console.warn("Blur unavailable, using plain tint:", err.message);
  }
}

function applyBlur(w) {
  if (!blur) return false;
  let hwnd;
  try {
    hwnd = w.getNativeWindowHandle().readBigUInt64LE(0);
    const b = w.getBounds();
    const sf = screen.getDisplayMatching(b).scaleFactor;
    const r = Math.round(CORNER_RADIUS * 2 * sf);
    const rgn = blur.roundRgn(
      0,
      0,
      Math.round(b.width * sf) + 1,
      Math.round(b.height * sf) + 1,
      r,
      r,
    );
    if (!rgn || !blur.setRgn(hwnd, rgn, 1))
      throw new Error("could not round the window shape");
  } catch (err) {
    console.warn("Rounded shape failed, using tinted fallback:", err.message);
    return false;
  }
  try {
    const tint =
      ((BLUR_TINT_ALPHA << 24) | (0x1e << 16) | (0x18 << 8) | 0x18) >>> 0; // AABBGGRR
    const accent = Buffer.alloc(16);
    accent.writeInt32LE(BLUR_STATE, 0);
    accent.writeInt32LE(2, 4);
    accent.writeUInt32LE(tint, 8);
    blur.setAttr(hwnd, { attr: 19, data: accent, size: 16 });
    return true;
  } catch (err) {
    console.warn("Could not apply blur, using tinted fallback:", err.message);
    return false;
  }
}

function finishWindow(w, { inactive } = {}) {
  w.webContents.once("did-finish-load", () => {
    if (!applyBlur(w)) {
      w.webContents.executeJavaScript(
        "document.documentElement.classList.add('no-blur')",
      );
    }
    inactive ? w.showInactive() : w.show();
  });
}

// ---- widget window + auto-hide ----
let win = null;
let popup = null;
let geo = null;
let hiddenX = 0;
let state = "shown";
let lastActive = Date.now();
let edgeSince = 0;
let anim = null;

ipcMain.on("app:activity", () => {
  lastActive = Date.now();
});

function slideTo(targetX, ms = 240) {
  if (anim) clearInterval(anim);
  const fromX = win.getBounds().x;
  const start = Date.now();
  anim = setInterval(() => {
    if (!win || win.isDestroyed()) return clearInterval(anim);
    const t = Math.min(1, (Date.now() - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    win.setBounds({
      x: Math.round(fromX + (targetX - fromX) * eased),
      y: geo.y,
      width: geo.width,
      height: geo.height,
    });
    if (t >= 1) {
      clearInterval(anim);
      anim = null;
    }
  }, 16);
}

function showWidget() {
  state = "shown";
  lastActive = Date.now();
  slideTo(geo.x);
}

function hideWidget() {
  state = "hidden";
  edgeSince = 0;
  slideTo(hiddenX);
}

function tick() {
  if (!win || win.isDestroyed()) return;
  const p = screen.getCursorScreenPoint();
  const d = screen.getPrimaryDisplay();
  const now = Date.now();

  if (state === "shown") {
    const over =
      p.x >= geo.x &&
      p.x <= geo.x + geo.width &&
      p.y >= geo.y &&
      p.y <= geo.y + geo.height;
    const popupOpen = popup && !popup.isDestroyed();
    if (over || popupOpen) lastActive = now;
    else if (now - lastActive > IDLE_MS) hideWidget();
  } else {
    const atEdge =
      p.x >= d.bounds.x + d.bounds.width - 2 &&
      p.y >= geo.y &&
      p.y <= geo.y + geo.height;
    if (atEdge) {
      if (!edgeSince) edgeSince = now;
      if (now - edgeSince >= EDGE_DWELL_MS) showWidget();
    } else {
      edgeSince = 0;
    }
  }
}

function createWindow() {
  const d = screen.getPrimaryDisplay();
  const wa = d.workArea;
  const height = Math.round(wa.height * HEIGHT_RATIO);

  geo = {
    x: d.bounds.x + d.bounds.width - PANEL_WIDTH - RIGHT_GAP,
    y: Math.round(wa.y + (wa.height - height) / 2),
    width: PANEL_WIDTH,
    height,
  };
  hiddenX = d.bounds.x + d.bounds.width;

  win = new BrowserWindow({
    ...geo,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  win.loadFile("index.html");
  finishWindow(win, { inactive: true });
  setInterval(tick, 100);
}

// ---- school schedule pop-up ----
ipcMain.on("popup:open", () => {
  if (popup && !popup.isDestroyed()) {
    popup.focus();
    return;
  }
  const wa = screen.getPrimaryDisplay().workArea;
  const w = 620;
  const h = Math.min(660, wa.height - 40);

  popup = new BrowserWindow({
    width: w,
    height: h,
    x: Math.round(wa.x + (wa.width - w) / 2),
    y: Math.round(wa.y + (wa.height - h) / 2),
    show: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });
  popup.loadFile("schedule.html");
  finishWindow(popup);
  popup.on("closed", () => {
    popup = null;
  });
});

if (!app.requestSingleInstanceLock()) {
  app.quit(); // already running, don't open a second copy
} else {
  app.on("second-instance", () => {
    if (win && !win.isDestroyed()) showWidget(); // launching again reveals it
  });

  app.whenReady().then(() => {
    loadData();
    initBlur();
    createWindow();
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: true });
  });
}
app.on("window-all-closed", () => app.quit());
