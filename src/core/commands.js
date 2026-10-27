// =====================================================================================
// ===================================  commands.js  ===================================
// =====================================================================================
// Fabriques de Command (cf. ARCHITECTURE §5). CHAQUE mutation du document est ici, et
// NULLE PART ailleurs : couches ajoutées/retirées/déplacées, propriétés éditées, format
// changé. Les fonctions prennent le `doc` (muté en place par do/undo — c'est le modèle
// vivant de la session) et renvoient une Command annulable.
"use strict";

import { Command } from "./undo.js";
import { layerIndex } from "./document.js";

/** Ajoute une couche (au sommet par défaut, ou à l'index donné). */
export function cmdAddLayer(doc, layer, at = null) {
  const index = at == null ? doc.layers.length : at;
  return new Command({
    label: `Ajouter « ${layer.name} »`,
    do: () => doc.layers.splice(index, 0, layer),
    undo: () => doc.layers.splice(index, 1),
  });
}

/** Retire une couche (mémorise sa position pour un undo exact). */
export function cmdRemoveLayer(doc, layerId) {
  let idx = -1;
  let removed = null;
  return new Command({
    label: "Retirer la couche",
    do: () => {
      idx = layerIndex(doc, layerId);
      removed = doc.layers[idx];
      doc.layers.splice(idx, 1);
    },
    undo: () => doc.layers.splice(idx, 0, removed),
  });
}

/** Déplace une couche de `from` vers `to` dans la pile (z-order). */
export function cmdMoveLayer(doc, layerId, to) {
  let from = -1;
  return new Command({
    label: "Réordonner",
    do: () => {
      from = layerIndex(doc, layerId);
      const [l] = doc.layers.splice(from, 1);
      doc.layers.splice(to, 0, l);
    },
    undo: () => {
      const [l] = doc.layers.splice(to, 1);
      doc.layers.splice(from, 0, l);
    },
  });
}

/** Édite une propriété transverse (visible, locked, opacity, name, blendMode) ou region. */
export function cmdSetLayerField(doc, layerId, field, value, { label, coalesceKey = null } = {}) {
  let prev;
  const layer = () => doc.layers.find((l) => l.id === layerId);
  const cmd = new Command({
    label: label || `Modifier ${field}`,
    coalesceKey,
    do: () => {
      const l = layer();
      prev = l[field];
      l[field] = value;
    },
    undo: () => {
      layer()[field] = prev;
    },
  });
  // coalescing : une commande suivante sur le même champ remplace juste la valeur cible
  cmd.merge = (next) => {
    cmd.undo = next.undo;
  };
  return cmd;
}

/** Édite une entrée de `props` (spécifique au LayerType). */
export function cmdSetLayerProp(doc, layerId, key, value, { coalesceKey = null } = {}) {
  let prev;
  const layer = () => doc.layers.find((l) => l.id === layerId);
  const cmd = new Command({
    label: `Modifier ${key}`,
    coalesceKey,
    do: () => {
      const l = layer();
      prev = l.props[key];
      l.props = { ...l.props, [key]: value };
    },
    undo: () => {
      const l = layer();
      l.props = { ...l.props, [key]: prev };
    },
  });
  cmd.merge = (next) => {
    cmd.undo = next.undo;
  };
  return cmd;
}

/** Change le format du document (et ajuste les régions « plein trim »). */
export function cmdSetFormat(doc, format) {
  let prev;
  return new Command({
    label: `Format → ${format.label || format.id}`,
    do: () => {
      prev = doc.format;
      doc.format = format;
    },
    undo: () => {
      doc.format = prev;
    },
  });
}
