// =====================================================================================
// ==============================  assets/lyparts.js  ==================================
// =====================================================================================
// Exemples de composants figés .lypart (SVG) — cf. ARCHITECTURE §8/§9. Ce sont des
// pièces réutilisables à POSER dans la couche « ATC » (timbre, cachet postal, bandeau,
// découpe de collage) avec position / échelle / déformation (cf. layer-component).
// Chaque fabrique renvoie { svg, intrinsic:{w,h} } ; l'intrinsèque sert de ratio par défaut.
"use strict";

// ---- Cachet postal (postmark) : double cercle + arc de texte + barres ondulées -------
export function makePostmark({ place = "TSCG · POSTE", date = "27 X 2026", ink = "#5a2340" } = {}) {
  const W = 230, H = 120, cx = 60, cy = 60, R = 52;
  // texte en arc (haut) via textPath
  const arcTop = `M ${cx - R + 8},${cy} A ${R - 8},${R - 8} 0 0 1 ${cx + R - 8},${cy}`;
  let bars = "";
  for (let i = 0; i < 7; i++) {
    const y = 28 + i * 10.5;
    let d = `M ${cx + R - 6},${y}`;
    for (let x = 0; x <= 150; x += 6) d += ` q 3,-4 6,0 q 3,4 6,0`;
    bars += `<path d="${d}" fill="none" stroke="${ink}" stroke-width="2.2"/>`;
  }
  return {
    intrinsic: { w: W, h: H },
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <g fill="none" stroke="${ink}" stroke-width="3">
    <circle cx="${cx}" cy="${cy}" r="${R}"/><circle cx="${cx}" cy="${cy}" r="${R - 7}"/>
  </g>
  <defs><path id="pmtop" d="${arcTop}"/></defs>
  <text font-family="Georgia, serif" font-size="12" fill="${ink}" letter-spacing="1.5">
    <textPath href="#pmtop" startOffset="50%" text-anchor="middle">${place}</textPath>
  </text>
  <text x="${cx}" y="${cy + 6}" font-family="Georgia, serif" font-size="13" fill="${ink}" text-anchor="middle">${date}</text>
  ${bars}
</svg>`,
  };
}

// ---- Timbre découpé (stamp cutout) : bord dentelé + rosace schématique + faciale ------
export function makeStampCutout({ value = "1.20", paper = "#f3ead4", ink = "#2b6b5e", denom = "#8a1f1f" } = {}) {
  const W = 100, H = 128, r = 2.6, pitch = 7;
  // bord dentelé (petits demi-cercles en négatif) : on dessine le papier puis des encoches
  let notches = "";
  for (let x = pitch / 2; x < W; x += pitch) { notches += `<circle cx="${x}" cy="0" r="${r}" fill="#fff"/><circle cx="${x}" cy="${H}" r="${r}" fill="#fff"/>`; }
  for (let y = pitch / 2; y < H; y += pitch) { notches += `<circle cx="0" cy="${y}" r="${r}" fill="#fff"/><circle cx="${W}" cy="${y}" r="${r}" fill="#fff"/>`; }
  // rosace schématique
  let rose = "";
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; rose += `<ellipse cx="50" cy="56" rx="26" ry="10" transform="rotate(${(a * 180 / Math.PI)} 50 56)" fill="none" stroke="${ink}" stroke-width="0.6" opacity="0.8"/>`; }
  return {
    intrinsic: { w: W, h: H },
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <rect x="2" y="2" width="${W - 4}" height="${H - 4}" fill="${paper}" stroke="${ink}" stroke-width="1.2"/>
  ${rose}
  <text x="50" y="16" font-family="Georgia, serif" font-size="8" fill="#333" text-anchor="middle" letter-spacing="1">TSCG·POSTE</text>
  <text x="50" y="118" font-family="Georgia, serif" font-size="20" font-weight="bold" fill="${denom}" text-anchor="middle">${value}</text>
  ${notches}
</svg>`,
  };
}

// ---- Bandeau déchiré (torn paper strip) pour collage ---------------------------------
export function makeTornStrip({ color = "#c9b382", w = 300, h = 54 } = {}) {
  // bords supérieur/inférieur irréguliers (déchirure)
  let top = `M 0,8`, bot = `M ${w},${h - 8}`;
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let x = 0; x <= w; x += 12) top += ` L ${x},${4 + rnd() * 8}`;
  for (let x = w; x >= 0; x -= 12) bot += ` L ${x},${h - 4 - rnd() * 8}`;
  const d = `${top} L ${w},${h - 8} ${bot.replace("M", "L")} Z`;
  return {
    intrinsic: { w, h },
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  <path d="${d}" fill="${color}" stroke="#9c8650" stroke-width="0.8"/>
</svg>`,
  };
}
