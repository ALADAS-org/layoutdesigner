// =====================================================================================
// =============================  render/facade.js  ====================================
// =====================================================================================
// Façade `gfx` (cf. ARCHITECTURE §12) — LE point où l'incohérence de repère de P5
// (ellipseMode, rectMode, ancrage texte…) est absorbée UNE fois. Toute primitive et
// tout LayerType reçoivent un `gfx`, jamais le contexte brut, et dessinent en
// MILLIMÈTRES avec UN repère unique + les ancrages de §10.2.
//
//   Gfx (interface)        : le contrat ci-dessous.
//   CanvasTarget           : implémente Gfx sur un CanvasRenderingContext2D (= l'équivalent
//                            de P5CanvasTarget ; P5 serait un second backend au même contrat).
//   SvgTarget (à venir, §15.8) : même contrat, émet du SVG -> .lypart / print.
//
// Convention de repère : origine en haut-gauche, +x droite, +y bas (comme l'écran et le
// print). Unité publique = mm. pxPerMm est posé à la construction (dpi + zoom).
"use strict";

export const MM_PER_IN = 25.4;
export function pxPerMm(dpi, zoom = 1) {
  return (dpi / MM_PER_IN) * zoom;
}

// --- Ancrages normalisés (§10.2) -----------------------------------------------------
// Carré : centre + 8 compass, dans une box {x,y,w,h} (mm).
export function anchorSquare(name, box) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const x0 = box.x;
  const y0 = box.y;
  const x1 = box.x + box.w;
  const y1 = box.y + box.h;
  switch (name) {
    case "center": return { x: cx, y: cy };
    case "N":  return { x: cx, y: y0 };
    case "NE": return { x: x1, y: y0 };
    case "E":  return { x: x1, y: cy };
    case "SE": return { x: x1, y: y1 };
    case "S":  return { x: cx, y: y1 };
    case "SW": return { x: x0, y: y1 };
    case "W":  return { x: x0, y: cy };
    case "NW": return { x: x0, y: y0 };
    default:   return { x: cx, y: cy };
  }
}
// Hexagone : centre + directions angulaires 0,60,…,300 autour d'un centre, rayon R (mm).
export function anchorHex(name, center, R) {
  if (name === "center") return { x: center.x, y: center.y };
  const deg = parseFloat(name);
  if (Number.isNaN(deg)) return { x: center.x, y: center.y };
  const a = (deg * Math.PI) / 180;
  return { x: center.x + R * Math.cos(a), y: center.y + R * Math.sin(a) };
}

/**
 * Backend Canvas2D de la façade gfx. Tout est reçu/dessiné en mm ; une transformation
 * monde (pxPerMm) est posée sur le contexte, donc les épaisseurs de trait en mm passent
 * à l'échelle automatiquement — cohérence garantie entre écran et export.
 */
export class CanvasTarget {
  constructor(ctx, { dpi = 96, zoom = 1, panXmm = 0, panYmm = 0 } = {}) {
    this.ctx = ctx;
    this.k = pxPerMm(dpi, zoom);
    this._fill = null;
    this._stroke = null;
    this._strokeW = 0.2; // mm
    // repère monde : px = (mm + pan) * k
    ctx.setTransform(this.k, 0, 0, this.k, panXmm * this.k, panYmm * this.k);
  }

  // -- état ---------------------------------------------------------------------------
  save() { this.ctx.save(); return this; }
  restore() { this.ctx.restore(); return this; }
  translate(x, y) { this.ctx.translate(x, y); return this; }
  rotate(rad) { this.ctx.rotate(rad); return this; }
  scale(sx, sy) { this.ctx.scale(sx, sy); return this; }
  setAlpha(a) { this.ctx.globalAlpha = a; return this; }
  setBlend(mode) { this.ctx.globalCompositeOperation = mode || "source-over"; return this; }

  // -- peinture -----------------------------------------------------------------------
  setFill(color) { this._fill = color; return this; }
  noFill() { this._fill = null; return this; }
  setStroke(color, widthMm = this._strokeW) { this._stroke = color; this._strokeW = widthMm; return this; }
  noStroke() { this._stroke = null; return this; }
  _paint() {
    const c = this.ctx;
    if (this._fill) { c.fillStyle = this._fill; c.fill(); }
    if (this._stroke) {
      c.strokeStyle = this._stroke;
      c.lineWidth = this._strokeW;
      c.lineJoin = "round";
      c.lineCap = "round";
      c.stroke();
    }
  }

  // -- chemins ------------------------------------------------------------------------
  beginPath() { this.ctx.beginPath(); return this; }
  moveTo(x, y) { this.ctx.moveTo(x, y); return this; }
  lineTo(x, y) { this.ctx.lineTo(x, y); return this; }
  closePath() { this.ctx.closePath(); return this; }

  // -- primitives (toutes en mm, repère unique) ---------------------------------------
  /** Ellipse CENTRÉE (absorbe ellipseMode de P5). cercle = w===h. */
  ellipse(cx, cy, w, h = w) {
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    this._paint();
    return this;
  }
  /** Rectangle par COIN haut-gauche (repère unique, quel que soit rectMode P5). */
  rect(x, y, w, h) {
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this._paint();
    return this;
  }
  roundRect(x, y, w, h, r) {
    const c = this.ctx;
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
    this._paint();
    return this;
  }
  /** Arc d'ellipse. mode: "PIE" (secteur) | "OPEN" (arc seul) | "CHORD". */
  arcEllipse(cx, cy, w, h, a0, a1, mode = "OPEN") {
    const c = this.ctx;
    c.beginPath();
    if (mode === "PIE") c.moveTo(cx, cy);
    c.ellipse(cx, cy, w / 2, h / 2, 0, a0, a1);
    if (mode === "PIE") c.closePath();
    else if (mode === "CHORD") c.closePath();
    this._paint();
    return this;
  }
  polygon(points) {
    if (!points.length) return this;
    const c = this.ctx;
    c.beginPath();
    c.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) c.lineTo(points[i].x, points[i].y);
    c.closePath();
    this._paint();
    return this;
  }
  polyline(points) {
    if (!points.length) return this;
    const c = this.ctx;
    c.beginPath();
    c.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) c.lineTo(points[i].x, points[i].y);
    this._paint(); // pas de closePath : ligne ouverte (guilloché, killer bars…)
    return this;
  }
  line(x0, y0, x1, y1) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    this._paint();
    return this;
  }
  /** Texte. sizeMm = hauteur de fonte en mm. align par rapport à (x,y). */
  char(text, x, y, sizeMm, { align = "center", baseline = "middle", font = "serif", weight = "normal" } = {}) {
    const c = this.ctx;
    c.save();
    c.font = `${weight} ${sizeMm}px ${font}`; // px dans le repère monde = mm réels
    c.textAlign = align;
    c.textBaseline = baseline;
    if (this._fill) { c.fillStyle = this._fill; c.fillText(text, x, y); }
    if (this._stroke) { c.strokeStyle = this._stroke; c.lineWidth = this._strokeW; c.strokeText(text, x, y); }
    c.restore();
    return this;
  }

  // -- clip ---------------------------------------------------------------------------
  clipRect(x, y, w, h, r = 0) {
    const c = this.ctx;
    c.beginPath();
    if (r > 0) {
      const rr = Math.min(r, w / 2, h / 2);
      c.moveTo(x + rr, y);
      c.arcTo(x + w, y, x + w, y + h, rr);
      c.arcTo(x + w, y + h, x, y + h, rr);
      c.arcTo(x, y + h, x, y, rr);
      c.arcTo(x, y, x + w, y, rr);
    } else {
      c.rect(x, y, w, h);
    }
    c.clip();
    return this;
  }
  clipPolygon(points) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) c.lineTo(points[i].x, points[i].y);
    c.closePath();
    c.clip();
    return this;
  }

  // -- ancrages (§10.2) ---------------------------------------------------------------
  anchor(name, box) { return anchorSquare(name, box); }
  anchorHex(name, center, R) { return anchorHex(name, center, R); }
}
