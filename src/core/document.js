// =====================================================================================
// ==================================  document.js  ====================================
// =====================================================================================
// Modèle de données du Layout Designer (cf. ARCHITECTURE §2). TOUT est en MILLIMÈTRES ;
// le rendu (dpi + zoom) est appliqué plus tard par la façade gfx. Aucune dépendance :
// pur modèle + fabriques + helpers. Toute MUTATION doit passer par une Command (§5) —
// ce module ne fournit que les fabriques et des opérations pures (clone, find).
//
// Document (.lydoc) { id, meta, format, layers[], assets{} }
// Layer       { id, type, name, visible, locked, opacity, blendMode, region, mask?, props }
// Region      { x, y, w, h, rotation }                     // mm, origine = coin trim HG
// GridPattern (.lygrid) { id, meta, grid, family, cellValueMode, maxCellValue, symbols, shapes }
// Component   (.lypart) { id, meta, svg, intrinsic{w,h}, provenance }
"use strict";

let _seq = 0;
/** Identifiant court, stable dans la session (pas un UUID : lisible pour le debug). */
export function uid(prefix = "id") {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq.toString(36)}`;
}

// ---- Region ------------------------------------------------------------------------
export function createRegion({ x = 0, y = 0, w = 10, h = 10, rotation = 0 } = {}) {
  return { x, y, w, h, rotation };
}

// ---- Layer -------------------------------------------------------------------------
export function createLayer({
  type,
  name,
  visible = true,
  locked = false,
  opacity = 1,
  blendMode = "normal",
  region = null,
  mask = null,
  props = {},
} = {}) {
  if (!type) throw new Error("createLayer: 'type' is required");
  return {
    id: uid("ly"),
    type,
    name: name || type,
    visible,
    locked,
    opacity,
    blendMode,
    region: region || createRegion({ w: 0, h: 0 }), // 0×0 = « plein document » (résolu au rendu)
    mask,
    props: { ...props },
  };
}

// ---- Document (.lydoc) -------------------------------------------------------------
export function createDocument({ title = "Untitled", format, layers = [], assets = {}, meta = {} } = {}) {
  return {
    kind: "lydoc",
    id: uid("doc"),
    meta: { title, created: Date.now(), ...meta },
    format: format || null, // FormatSpec (cf. formats-print) ; mm
    layers: layers.slice(),
    assets: { ...assets },
  };
}

// ---- GridPattern (.lygrid) ---------------------------------------------------------
export function createGridPattern({
  id,
  meta = {},
  grid = { type: "square" },
  family = "default",
  cellValueMode = "int",
  maxCellValue = 1,
  symbols = {},
  shapes = {},
} = {}) {
  return {
    kind: "lygrid",
    id: id || uid("grid"),
    meta,
    grid,
    family,
    cellValueMode,
    maxCellValue,
    symbols,
    shapes,
  };
}

// ---- Component (.lypart) -----------------------------------------------------------
export function createComponent({ id, meta = {}, svg = "", intrinsic = { w: 0, h: 0 }, provenance = {} } = {}) {
  return { kind: "lypart", id: id || uid("part"), meta, svg, intrinsic, provenance };
}

// ---- Opérations pures (lecture / clone — jamais de mutation en place) --------------
export function findLayer(doc, layerId) {
  return doc.layers.find((l) => l.id === layerId) || null;
}
export function layerIndex(doc, layerId) {
  return doc.layers.findIndex((l) => l.id === layerId);
}

/** Clone profond suffisant pour le modèle (JSON-safe : pas de fonctions dans les data). */
export function cloneDoc(doc) {
  return JSON.parse(JSON.stringify(doc));
}

/** FormatSpec -> Region « plein trim » (mm). Sert de région par défaut d'une couche. */
export function fullRegion(format) {
  return createRegion({ x: 0, y: 0, w: format ? format.w : 0, h: format ? format.h : 0 });
}

/** Région effective d'une couche : si 0×0, prend le plein trim du format. */
export function effectiveRegion(layer, format) {
  const r = layer.region;
  if (r && r.w > 0 && r.h > 0) return r;
  return fullRegion(format);
}
