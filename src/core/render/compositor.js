// =====================================================================================
// ===========================  render/compositor.js  =================================
// =====================================================================================
// Compositing du document (cf. ARCHITECTURE §4) : parcourt les couches du bas vers le
// haut, applique région (translate + rotation), opacité, blend, masque (clip), puis
// délègue le tracé à layerType.render(gfx, layer, doc, env). Le compositor ne connaît
// AUCUN type de couche concret — tout vient du Registry. C'est ce qui rend le noyau
// « sans domaine » et extensible par plugin.
"use strict";

import { effectiveRegion } from "../document.js";

/** Dessine le fond perdu + trim + marge de sécurité (repères d'atelier, non imprimés). */
export function drawPrintGuides(gfx, format, { showBleed = true, showSafe = true } = {}) {
  if (!format) return;
  gfx.save();
  // trim
  gfx.noFill().setStroke("#333", 0.25).rect(0, 0, format.w, format.h);
  if (showBleed && format.bleed) {
    gfx.setStroke("#c0392b", 0.2);
    gfx.rect(-format.bleed, -format.bleed, format.w + 2 * format.bleed, format.h + 2 * format.bleed);
  }
  if (showSafe && format.safe) {
    gfx.setStroke("#2980b9", 0.2);
    gfx.rect(format.safe, format.safe, format.w - 2 * format.safe, format.h - 2 * format.safe);
  }
  gfx.restore();
}

/**
 * Rend un document entier dans un gfx déjà configuré (repère monde posé).
 * env = { registry, format, dpi, lang, t }  — passé tel quel aux LayerType.
 */
export function renderDocument(gfx, doc, env) {
  const format = doc.format || env.format;
  for (const layer of doc.layers) {
    if (!layer.visible) continue;
    const def = env.registry.layerType(layer.type);
    if (!def || typeof def.render !== "function") continue; // type inconnu -> ignoré

    const region = effectiveRegion(layer, format);
    gfx.save();
    gfx.setAlpha(layer.opacity == null ? 1 : layer.opacity);
    gfx.setBlend(layer.blendMode);
    // repère local de la couche : origine = coin de la région, rotation autour du centre
    gfx.translate(region.x, region.y);
    if (region.rotation) {
      gfx.translate(region.w / 2, region.h / 2);
      gfx.rotate((region.rotation * Math.PI) / 180);
      gfx.translate(-region.w / 2, -region.h / 2);
    }
    // masque : clip à la région (rectangle, coins du format pour la couche plein-trim)
    if (layer.mask && layer.mask.kind === "roundrect") {
      gfx.clipRect(0, 0, region.w, region.h, layer.mask.r || 0);
    }
    // la couche dessine dans un repère 0..region.w × 0..region.h (mm)
    def.render(gfx, layer, doc, { ...env, region, format });
    gfx.restore();
  }
}
