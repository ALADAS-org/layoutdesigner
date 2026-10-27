// =====================================================================================
// ===================================  preload.cjs  ===================================
// =====================================================================================
// Pont de sécurité Electron (cf. ARCHITECTURE §3). Stub en v0 : le prototype n'utilise
// aucun IPC (ni fichiers ni export encore — étapes §15.4 et §15.8). On expose un objet
// `ld` vide mais prêt : c'est ici que viendront files.open/save, export PDF/SVG, baking
// crypto — exposés UNIQUEMENT via des canaux IPC déclarés (jamais `require` au renderer).
// En .cjs pour rester CommonJS même si package.json est "type":"module".
"use strict";
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("ld", {
  apiVersion: "0.1",
  // files: { open, save },      // §15.4
  // exporter: { toSvg, toPdf }, // §15.8
});
