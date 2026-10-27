// =====================================================================================
// ==================================  renderer/app.js  ================================
// =====================================================================================
// Coquille applicative du prototype (cf. ARCHITECTURE §7). Câble : Registry + plugins,
// i18n, une Session (document « timbre » instancié depuis un preset), le compositor sur
// la façade gfx (backend Canvas2D), et une UI DOM minimale (panneau Couches, undo/redo,
// format, langue, symétrie, repères). AUCUNE mutation hors Command (§5).
//
// En Electron ce fichier serait le point d'entrée du renderer ; ici il est importé par
// demo.html. Le plugin-host v0 = import statique + registry.install (§3).
"use strict";

import { Registry } from "../core/registry.js";
import { I18n, BASE_LOCALES } from "../core/i18n.js";
import { Session } from "../core/session.js";
import { createDocument, createLayer } from "../core/document.js";
import {
  cmdMoveLayer, cmdSetLayerField, cmdSetFormat,
} from "../core/commands.js";
import { CanvasTarget, MM_PER_IN } from "../core/render/facade.js";
import { renderDocument, drawPrintGuides } from "../core/render/compositor.js";

import * as formatsPrint from "../../builtin-plugins/formats-print/index.js";
import * as layerFill from "../../builtin-plugins/layer-fill/index.js";
import * as layerGuilloche from "../../builtin-plugins/layer-guilloche/index.js";
import * as layerPattern from "../../builtin-plugins/layer-pattern/index.js";
import * as layerText from "../../builtin-plugins/layer-text/index.js";
import * as layerPerforation from "../../builtin-plugins/layer-perforation/index.js";
import { makeIChing } from "../../assets/iching.lygrid.js";

// ---- 1. Registry + plugins ----------------------------------------------------------
const reg = new Registry();
reg.install([formatsPrint, layerFill, layerGuilloche, layerPattern, layerText, layerPerforation]);

// locales : base + celles des plugins
const locales = { fr: { ...BASE_LOCALES.fr, ...(reg.locales.fr || {}) }, en: { ...BASE_LOCALES.en, ...(reg.locales.en || {}) } };
const i18n = new I18n(locales, "fr");

// ---- 2. Instanciation d'un document depuis un preset (§4.2) ------------------------
function instantiatePreset(presetId) {
  const preset = reg.preset(presetId);
  const format = reg.format(preset.formatId);
  const grid = makeIChing("#6b3f2b");
  const api = {
    fill: (o) => ({ type: "fill", name: o.name, props: { color: o.color, color2: o.color2 || null } }),
    guilloche: (o) => ({ type: "guilloche", name: o.name, props: { family: o.family, color: o.color, lineWidth: o.lineWidth, count: o.count } }),
    pattern: (o) => ({ type: "pattern", name: o.name, opacity: o.opacity, props: { drawColor: o.color, cellSizeMm: 6, grid, forceSymmetry: null } }),
    text: (o) => ({ type: "text", name: o.name, props: { text: o.text, sizeMm: o.sizeMm, color: o.color, anchor: o.anchor, weight: o.weight || "normal" } }),
    perforation: (o) => ({ type: "perforation", name: o.name, props: {} }),
  };
  const layers = preset.build(api).map((s) => {
    const def = reg.layerType(s.type);
    const base = def && def.createDefault ? def.createDefault() : {};
    return createLayer({ type: s.type, name: s.name, opacity: s.opacity == null ? 1 : s.opacity, region: s.region || null, props: { ...base, ...s.props } });
  });
  return createDocument({ title: preset.label, format, layers });
}

const session = new Session(instantiatePreset("stamp"));

// ---- 3. Rendu --------------------------------------------------------------------
let DPI = 96;        // écran de travail
let ZOOM = 1;        // ajusté pour tenir dans le canvas
let showGuides = true;

const canvas = () => document.getElementById("ld-canvas");

function fitZoom(format) {
  // vise ~560 px de large utile
  const target = 560;
  const mmW = format.w + 2 * format.bleed;
  return target / ((mmW / MM_PER_IN) * DPI);
}

function render() {
  const doc = session.doc;
  const format = doc.format;
  ZOOM = fitZoom(format);
  const k = (DPI / MM_PER_IN) * ZOOM;
  const bw = format.w + 2 * format.bleed;
  const bh = format.h + 2 * format.bleed;

  const cv = canvas();
  cv.width = Math.ceil(bw * k);
  cv.height = Math.ceil(bh * k);
  const ctx = cv.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);

  // gfx : repère monde en mm, origine du TRIM décalée du bleed
  const gfx = new CanvasTarget(ctx, { dpi: DPI, zoom: ZOOM, panXmm: format.bleed, panYmm: format.bleed });

  // papier (fond perdu compris)
  gfx.save().setFill("#fcfbf7").noStroke().rect(-format.bleed, -format.bleed, bw, bh).restore();

  renderDocument(gfx, doc, { registry: reg, format, dpi: DPI, lang: i18n.lang, t: (k) => i18n.t(k) });

  if (showGuides) drawPrintGuides(gfx, format, { showBleed: true, showSafe: true });
}

// ---- 4. UI ------------------------------------------------------------------------
function el(tag, attrs = {}, kids = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const c of [].concat(kids)) if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return n;
}

function buildToolbar() {
  const bar = document.getElementById("ld-toolbar");
  bar.innerHTML = "";

  const undoBtn = el("button", { onclick: () => session.doUndo(), title: i18n.t("action.undo") }, "↶ " + i18n.t("action.undo"));
  const redoBtn = el("button", { onclick: () => session.doRedo(), title: i18n.t("action.redo") }, "↷ " + i18n.t("action.redo"));
  undoBtn.disabled = !session.undo.canUndo;
  redoBtn.disabled = !session.undo.canRedo;

  // format
  const fmtSel = el("select", {
    onchange: (e) => session.dispatch(cmdSetFormat(session.doc, reg.format(e.target.value))),
  });
  for (const f of reg.formats) {
    const o = el("option", { value: f.id }, `${f.label} (${f.w}×${f.h})`);
    if (session.doc.format.id === f.id) o.selected = true;
    fmtSel.appendChild(o);
  }

  // langue
  const langSel = el("select", { onchange: (e) => { i18n.setLang(e.target.value); renderAll(); } });
  for (const l of ["fr", "en"]) {
    const o = el("option", { value: l }, l.toUpperCase());
    if (i18n.lang === l) o.selected = true;
    langSel.appendChild(o);
  }

  // repères
  const guidesLbl = el("label", { class: "chk" }, [
    el("input", { type: "checkbox", onchange: (e) => { showGuides = e.target.checked; render(); } }),
    " " + i18n.t("guides.show"),
  ]);
  if (showGuides) guidesLbl.querySelector("input").checked = true;

  bar.append(
    undoBtn, redoBtn, el("span", { class: "sep" }),
    el("span", { class: "lbl" }, i18n.t("menu.format") + " :"), fmtSel,
    el("span", { class: "sep" }),
    el("span", { class: "lbl" }, i18n.t("menu.language") + " :"), langSel,
    el("span", { class: "sep" }), guidesLbl,
    el("span", { class: "sep" }),
    el("span", { class: "status" }, (session.undo.isDirty ? "● " + i18n.t("status.dirty") : "○ " + i18n.t("status.clean"))),
  );
}

function buildLayersPanel() {
  const panel = document.getElementById("ld-layers");
  panel.innerHTML = "";
  panel.appendChild(el("h2", {}, i18n.t("panel.layers")));

  // haut de la liste = sommet de pile (z max) -> on affiche en ordre inverse
  const layers = session.doc.layers;
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    const row = el("div", { class: "layer" + (session.selection === layer.id ? " sel" : "") });

    const eye = el("button", {
      class: "icon",
      title: layer.visible ? i18n.t("action.hide") : i18n.t("action.show"),
      onclick: () => session.dispatch(cmdSetLayerField(session.doc, layer.id, "visible", !layer.visible, { label: layer.visible ? i18n.t("action.hide") : i18n.t("action.show") })),
    }, layer.visible ? "👁" : "—");

    const name = el("span", { class: "name", onclick: () => session.select(layer.id) }, `${layer.name}  ·  ${layer.type}`);

    const up = el("button", { class: "icon", title: i18n.t("action.up"), onclick: () => i < layers.length - 1 && session.dispatch(cmdMoveLayer(session.doc, layer.id, i + 1)) }, "▲");
    const down = el("button", { class: "icon", title: i18n.t("action.down"), onclick: () => i > 0 && session.dispatch(cmdMoveLayer(session.doc, layer.id, i - 1)) }, "▼");
    up.disabled = i >= layers.length - 1;
    down.disabled = i <= 0;

    const op = el("input", {
      type: "range", min: "0", max: "100", value: String(Math.round(layer.opacity * 100)), class: "op",
      title: i18n.t("prop.opacity"),
      oninput: (e) => session.dispatch(cmdSetLayerField(session.doc, layer.id, "opacity", (+e.target.value) / 100, { label: i18n.t("prop.opacity"), coalesceKey: "op:" + layer.id })),
    });

    row.append(eye, name, up, down, op);
    panel.appendChild(row);

    // contrôle spécifique : symétrie kaléidoscope sur une couche pattern (§10.5)
    if (layer.type === "pattern") {
      const symLbl = el("label", { class: "chk sub" }, [
        el("input", {
          type: "checkbox",
          onchange: (e) => session.dispatch(cmdSetLayerField(session.doc, layer.id, "props",
            { ...layer.props, forceSymmetry: e.target.checked ? "quadrant" : null },
            { label: i18n.t("prop.symmetry") })),
        }),
        " " + i18n.t("prop.symmetry"),
      ]);
      if (layer.props.forceSymmetry === "quadrant") symLbl.querySelector("input").checked = true;
      panel.appendChild(symLbl);
    }
  }
}

function renderAll() {
  buildToolbar();
  buildLayersPanel();
  render();
}

session.on(() => renderAll());
window.addEventListener("DOMContentLoaded", renderAll);

// expose pour debug/console
window.LD = { reg, session, i18n, render, renderAll };
