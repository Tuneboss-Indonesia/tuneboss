const { app, BrowserWindow, Menu, shell } = require("electron");
const fs = require("fs");
const http = require("http");
const path = require("path");

const isDev = process.env.TUNEBOSS_DESKTOP_DEV_URL;

const mimeTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

function contentType(filePath) {
  return mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function startStaticServer() {
  const distDir = path.join(__dirname, "..", "dist");

  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      const safePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
      const requestedFile = safePath ? path.join(distDir, safePath) : path.join(distDir, "index.html");
      const normalizedFile = path.normalize(requestedFile);
      const fallbackFile = path.join(distDir, "index.html");
      const filePath = normalizedFile.startsWith(distDir) && fs.existsSync(normalizedFile) && fs.statSync(normalizedFile).isFile()
        ? normalizedFile
        : fallbackFile;

      response.writeHead(200, { "Content-Type": contentType(filePath) });
      fs.createReadStream(filePath).pipe(response);
    });

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Desktop server tidak mendapatkan port."));
        return;
      }
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function createWindow(appUrl) {
  const icon = path.join(__dirname, "..", "assets", "logo.ico");
  const window = new BrowserWindow({
    backgroundColor: "#070707",
    height: 900,
    icon,
    minHeight: 720,
    minWidth: 1120,
    show: false,
    title: "TuneBoss Inventory",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    width: 1440,
  });

  window.once("ready-to-show", () => window.show());

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    void window.loadURL(isDev);
  } else {
    void window.loadURL(appUrl);
  }
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);

  const appUrl = isDev || await startStaticServer();
  createWindow(appUrl);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(appUrl);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
