const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("db", {
  load: () => ipcRenderer.invoke("db:load"),
  set: (key, value) => ipcRenderer.invoke("db:set", key, value),
  onUpdate: (cb) => ipcRenderer.on("db:updated", (_, d) => cb(d)),
  quit: () => ipcRenderer.send("app:quit"),
  activity: () => ipcRenderer.send("app:activity"),
  openSchedule: () => ipcRenderer.send("popup:open"),
  closeWindow: () => ipcRenderer.send("win:close"),
});
