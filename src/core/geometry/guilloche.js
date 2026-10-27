// =====================================================================================
// ============================  geometry/guilloche.js  ================================
// =====================================================================================
// Math des courbes « guilloché » / sécurité (cf. ARCHITECTURE §10.4). Pur : chaque
// fonction renvoie une polyligne de points {x,y} NORMALISÉS dans [-1..1]², que la
// primitive/couche met ensuite à l'échelle de sa box (mm). Familles : hypotrochoïde,
// épitrochoïde, rose, spirale, lissajous, bande sinus.
"use strict";

/** Échantillonne une fonction paramétrique t->{x,y} sur [t0,t1] en n points. */
function sample(fn, n, t0, t1) {
  const pts = [];
  const dt = (t1 - t0) / n;
  for (let i = 0; i <= n; i++) pts.push(fn(t0 + i * dt));
  return pts;
}

// R = rayon fixe, r = rayon roulant, d = distance du point traceur (tous relatifs à 1).
export function hypotrochoid({ R = 1, r = 0.3, d = 0.5, turns = 1, samples = 1200 } = {}) {
  const k = (R - r) / r;
  const raw = sample((t) => ({
    x: (R - r) * Math.cos(t) + d * Math.cos(k * t),
    y: (R - r) * Math.sin(t) - d * Math.sin(k * t),
  }), samples, 0, turns * 2 * Math.PI);
  return normalize(raw);
}

export function epitrochoid({ R = 1, r = 0.2, d = 0.4, turns = 1, samples = 1200 } = {}) {
  const k = (R + r) / r;
  const raw = sample((t) => ({
    x: (R + r) * Math.cos(t) - d * Math.cos(k * t),
    y: (R + r) * Math.sin(t) - d * Math.sin(k * t),
  }), samples, 0, turns * 2 * Math.PI);
  return normalize(raw);
}

/** Rose polaire r = cos(k·θ) ; k entier -> pétales. */
export function rose({ k = 5, samples = 1400 } = {}) {
  const raw = sample((t) => {
    const rad = Math.cos(k * t);
    return { x: rad * Math.cos(t), y: rad * Math.sin(t) };
  }, samples, 0, 2 * Math.PI);
  return normalize(raw);
}

export function spiral({ turns = 6, samples = 1400 } = {}) {
  const tmax = turns * 2 * Math.PI;
  const raw = sample((t) => {
    const rad = t / tmax;
    return { x: rad * Math.cos(t), y: rad * Math.sin(t) };
  }, samples, 0, tmax);
  return normalize(raw);
}

export function lissajous({ a = 3, b = 2, delta = Math.PI / 2, samples = 1400 } = {}) {
  const raw = sample((t) => ({ x: Math.sin(a * t + delta), y: Math.sin(b * t) }), samples, 0, 2 * Math.PI);
  return raw; // déjà dans [-1,1]
}

/** Bande sinus horizontale (filet de sécurité), amplitude amp, cycles sur la largeur. */
export function sineBand({ cycles = 8, amp = 0.5, samples = 600 } = {}) {
  const raw = sample((t) => ({ x: t, y: amp * Math.sin(cycles * Math.PI * t) }), samples, -1, 1);
  return raw;
}

export const GUILLOCHE_FAMILIES = {
  hypotrochoid, epitrochoid, rose, spiral, lissajous, sine_band: sineBand,
};

/** Génère une famille par nom + params, renvoie la polyligne normalisée. */
export function guillocheCurve(family, params = {}) {
  const fn = GUILLOCHE_FAMILIES[family] || hypotrochoid;
  return fn(params);
}

/** Met une polyligne normalisée [-1..1]² à l'échelle d'une box {x,y,w,h} (mm). */
export function toBox(points, box, { inset = 0 } = {}) {
  const halfW = (box.w - 2 * inset) / 2;
  const halfH = (box.h - 2 * inset) / 2;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return points.map((p) => ({ x: cx + p.x * halfW, y: cy + p.y * halfH }));
}

// --- normalisation : recadre une polyligne quelconque dans [-1..1]² (ratio préservé) --
function normalize(pts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const s = 2 / Math.max(w, h); // échelle unique -> ratio préservé
  const ox = (minX + maxX) / 2;
  const oy = (minY + maxY) / 2;
  return pts.map((p) => ({ x: (p.x - ox) * s, y: (p.y - oy) * s }));
}
