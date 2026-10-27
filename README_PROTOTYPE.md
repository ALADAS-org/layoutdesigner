# Layout Designer — premier prototype

Tranche verticale **runnable** de l'architecture v0.4 (`LayoutDesigner_ARCHITECTURE.md`).
Elle réalise les **étapes 1→3 et 6→7** du §15 « Ordre de construction » et laisse en
réserve les étapes 4 (`files.js` open/save), 8 (`SvgTarget` → `.lypart`) et 9 (éditeur
WYSIWYG), exactement comme prévu.

## Ce que le prototype prouve (critère §15)

| Preuve attendue (§15) | État |
|---|---|
| Ouvrir un `.lydoc`, réordonner / masquer une couche, **annuler** | ✅ |
| Changer de **langue** (fr/en) | ✅ |
| Ouvrir un `.lygrid`, voir un pattern rendu (I Ching) | ✅ |
| Activer la **symétrie quadrant** (kaléidoscope §10.5) | ✅ |
| Changer de **format** → tout le document se recompose | ✅ |
| Geler un `.lydoc` en `.lypart` et le replacer transformé | ⏳ étape 8 |

Aperçus : `screenshots/preview_stamp.png` (timbre composé, 6 couches), `screenshots/preview_symmetry.png`
(symétrie quadrant active), `screenshots/preview_banknote.png` (même document recomposé en billet).

## Lancer

**Electron** (cible réelle) :
```bash
npm install      # electron
npm start
```
**Navigateur** (sans Electron, pour voir vite) — il faut un petit serveur statique, car
les modules ES ne s'importent pas depuis `file://` :
```bash
npx serve .      # puis ouvrir http://localhost:3000/demo.html
# ou : python3 -m http.server 8000  -> http://localhost:8000/demo.html
```

## Carte des fichiers → architecture

```
src/core/
  document.js        §2  Document / Layer / Region / GridPattern / Component (tout en mm)
  undo.js            §5  Command + UndoStack (coalescing par coalesceKey)
  commands.js        §5  TOUTES les mutations : add/remove/move/setField/setProp/setFormat
  session.js         §7  Session = doc + undo + bus d'événements (1 onglet)
  registry.js        §3  plugin-host v0 : LayerType / Primitive / formats / locales / presets
  i18n.js            §6  dictionnaires fr/en + t()
  render/
    facade.js        §12 façade gfx + CanvasTarget (absorbe l'ancrage §10.2 ; mm→px)
    compositor.js    §4  compositing bas→haut : région, opacité, blend, masque, délégation
  geometry/
    grid_layout.js       géométrie des cellules (carré / hexa) — ta brique, réutilisée
    guilloche.js     §10.4 courbes de sécurité (hypotrochoïde, rose, spirale…)

builtin-plugins/     §3/§13  chacun exporte register(reg)
  formats-print/     catalogue FormatSpec (mm) + preset « timbre »
  layer-fill/        LayerType fill (aplat / dégradé)
  layer-pattern/     LayerType .lygrid vivant : mini-langage §10.3 + SYMBOLES/MACROS + symétrie §10.5
  layer-guilloche/   LayerType guilloché
  layer-text/        LayerType texte (ancrage §10.2)
  layer-perforation/ LayerType dentelure (effet de bord §4)

assets/iching.lygrid.js   exemple de référence du mini-langage : 8 trigrammes Yi King
src/renderer/app.js       coquille : registry+plugins, session, compositor, UI DOM
demo.html                 hôte navigateur
main.js / preload.cjs     coquille Electron (contextIsolation:true, nodeIntegration:false)
```

## Le point d'architecture tenu : la façade `gfx` (§12)

Aucune couche, aucune primitive ne touche le canvas brut : toutes reçoivent `gfx` et
dessinent **en millimètres**, dans **un repère unique**, avec les **ancrages normalisés**
de §10.2 (`anchorSquare` centre+8, `anchorHex` centre+0..300). L'incohérence d'ancrage de
P5 (`ellipseMode`, `rectMode`, texte) est absorbée à **un seul endroit** (`facade.js`).
`CanvasTarget` est le premier backend ; `SvgTarget` (export `.lypart`/print, §15.8) viendra
implémenter **le même contrat** — le code des primitives ne changera pas.

## Réserve explicite (non régressif, conforme au périmètre)

- **§15.4** `files.js` : lecture/écriture `.lydoc`/`.lygrid` + JSON Schema (le validateur
  `pattern_validate.js` existe déjà, à brancher).
- **§15.8** `SvgTarget` + `export-svg` → `.lypart` + couche `component` (axe vivant/figé).
- **§15.9** éditeur WYSIWYG de patterns (sous-projet reporté §11).
- Couches `postmark` / `ink-stamp` (§4.1), masques bord déchiré, groupes nommés (§4) :
  le compositor porte déjà le crochet `mask` ; types à ajouter comme plugins.

## Note portage CommonJS

Tout est en **modules ES**. Pour un montage Electron plus ancien en CommonJS, remplacer
les `import/export` par `require/module.exports` (mécanique, sans changement de logique).
