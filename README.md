# my-widget

A personal desktop widget for Windows, built with Electron. It docks to the right side of the screen and shows:

- **School**: CJ's and Janz's class schedules, with who is in class right now
- **To-do** list
- **Work** schedule
- **Notes**

It has a blurred glass background, auto-hides after a few seconds of non-use, and slides back in when the cursor rests on the right screen edge. Everything is saved locally.

---

## What you need to install

| Requirement | Why | Where to get it |
|---|---|---|
| **Windows 10 or 11** | The blur effect uses a Windows API | - |
| **Node.js (LTS)** | Runs the project and installs packages | https://nodejs.org |
| **VS Code** (optional) | Editing the code | https://code.visualstudio.com |

Check Node is installed by opening a terminal and running:

```
node -v
npm -v
```

### Packages (installed through npm)

| Package | Type | Purpose |
|---|---|---|
| `electron` | dev | The app framework |
| `electron-builder` | dev | Builds the Windows installer (`.exe`) |
| `koffi` | runtime | Lets the app apply the blur and rounded shape on Windows |

Nothing else needs to be installed by hand.

---

## Setup

1. Put the project folder somewhere on your computer (for example `Desktop\my-widget`).
2. Open a terminal in that folder (in VS Code: **Terminal > New Terminal**).
3. Install all packages:

```
npm install
```

If you are starting from scratch instead, run these:

```
npm init -y
npm install electron --save-dev
npm install electron-builder --save-dev
npm install koffi
```

---

## Run it (for testing)

```
npm start
```

Close it with the X button in the widget's top corner, or press `Ctrl + C` in the terminal.

---

## Build the installer

```
npm run dist
```

The installer appears in the `release` folder as `my-widget Setup <version>.exe`. Run it to install the widget. It starts automatically and is set to launch at login.

### Making a new release after changes

1. Change the code and test with `npm start`.
2. Raise `"version"` in `package.json` (for example `1.0.0` to `1.0.1`).
3. Run `npm run dist`.
4. Close the running widget, then run the new installer. It replaces the old version.

Your data is kept between updates.

---

## Project files

| File | What it does |
|---|---|
| `main.js` | Window, blur, auto-hide, saving data |
| `preload.js` | Safe bridge between the window and `main.js` |
| `shared.js` | Shared helpers: icons, time formatting, people list |
| `index.html` | The widget interface |
| `schedule.html` | The school schedule pop-up |
| `package.json` | Project settings and the build configuration |

---

## Settings you can change

At the top of `main.js`:

| Setting | Meaning |
|---|---|
| `PANEL_WIDTH` | Widget width |
| `HEIGHT_RATIO` | Widget height as a fraction of the screen (lower is shorter) |
| `RIGHT_GAP` | Gap from the right screen edge |
| `IDLE_MS` | How long before it auto-hides |
| `EDGE_DWELL_MS` | How long the cursor must rest at the edge to reveal it |
| `BLUR_STATE` | `4` acrylic blur, `3` plain blur |
| `BLUR_TINT_ALPHA` | Glass darkness (`0x00` clear to `0xFF` solid) |
| `CORNER_RADIUS` | Roundness of the corners |

To rename the people in the school schedule, edit the `PEOPLE` list at the bottom of `shared.js`.

---

## Where your data is stored

```
%APPDATA%\my-widget\widget-data.json
```

Back this file up to keep your to-dos, notes, and schedules. Uninstalling the app does not delete it unless `deleteAppDataOnUninstall` is set in `package.json`.

---

## Uninstall

**Settings > Apps > Installed apps > my-widget > Uninstall.**

To only stop it launching at login, turn it off in **Task Manager > Startup apps**.

---

## Troubleshooting

- **No blur, flat dark panel:** run the app from a terminal and look for a line starting with `Blur unavailable` or `Rounded shape failed`. Make sure `koffi` is installed (`npm install koffi`).
- **Build fails with "Cannot create symbolic link":** turn on Developer Mode (Settings > System > For developers) or run the terminal as Administrator.
- **"Unknown publisher" warning when installing:** click **More info**, then **Run anyway**. This happens because the app is not code-signed.
- **Widget is hidden:** move the cursor to the very right edge of the screen and rest it there for a moment.
- **Seeing code instead of the interface:** one of the files has the wrong contents. `index.html` and `schedule.html` should start with `<!DOCTYPE html>`.
