// =====================================================================================
// ====================  builtin-plugins/layer-component/index.js  =====================
// =====================================================================================
// LayerType `component` (cf. ARCHITECTURE §9) : couche qui POSE des composants figés
// .lypart (SVG) — timbre, cachet postal, bandeau, découpe de collage. Pensée pour la
// couche « ATC » (la plus haute en Z). Chaque item est placé avec :
//   x, y        position (mm, coin haut-gauche dans le document)
//   w, h        taille (mm) — w/h indépendants => DÉFORMATION ratio H/L
//   rotation    degrés (autour du centre de l'item)
//   flipX       miroir horizontal (pour varier les découpes)
//   opacity     0..1
// L'image SVG est pré-décodée en amont (item._img) ; sinon l'item est ignoré ce tour.
"use strict";

export function register(reg) {
  reg.registerLayerType({
    type: "component",
    label: "Composants (.lypart)",
    createDefault: () => ({ items: [] }),
    render: (gfx, layer, doc, env) => {
      const items = layer.props.items || [];
      for (const it of items) {
        if (!it || it.visible === false) continue;
        const img = it._img || (doc.assets[it.assetRef] && doc.assets[it.assetRef]._img);
        if (!img) continue; // pas encore décodé
        gfx.image(img, it.x, it.y, it.w, it.h, {
          rotation: it.rotation || 0,
          flipX: !!it.flipX,
          opacity: it.opacity == null ? 1 : it.opacity,
        });
      }
    },
  });
}

/**
 * Pré-décode les SVG des items d'une couche `component` en HTMLImageElement, puis
 * rappelle `onReady` (pour redessiner). À appeler côté renderer (DOM requis).
 * Chaque item doit porter `svg` (chaîne) ; on y attache `_img`.
 */
export function preloadComponents(doc, onReady) {
  let pending = 0;
  for (const layer of doc.layers) {
    if (layer.type !== "component") continue;
    for (const it of layer.props.items || []) {
      if (!it.svg || it._img) continue;
      pending++;
      const img = new Image();
      img.onload = () => { it._img = img; if (--pending === 0 && onReady) onReady(); };
      img.onerror = () => { if (--pending === 0 && onReady) onReady(); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(it.svg);
    }
  }
  if (pending === 0 && onReady) onReady();
}
