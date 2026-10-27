// =====================================================================================
// =====================================  main.js  =====================================
// =====================================================================================
// Processus principal Electron (cf. ARCHITECTURE §3, sécurité). On sert le dossier du
// projet via un petit serveur HTTP localhost puis on charge l'URL : cela permet aux
// modules ES (`<script type="module">`) de s'importer sans buter sur la politique CORS
// de file://. contextIsolation:true, nodeIntegration:false — le renderer n'a pas Node.
"use strict";

import { app, BrowserWindow } from "electron";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      if (p === "/") p = "/demo.html";
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
        res.writeHead(404); return res.end("not found");
      }
      res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
      fs.createReadStream(fp).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

async function createWindow() {
  const port = await startServer();
  const win = new BrowserWindow({
    width: 980,
    height: 760,
    title: "Layout Designer — prototype",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(ROOT, "preload.cjs"),
    },
  });
  win.loadURL(`http://127.0.0.1:${port}/demo.html`);
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
