# Layout Designer — Architecture (v0.3)

*Document de référence pour l'amorçage du **Layout Designer** (TSCG). Il fige les décisions ; le code vient ensuite. Autorité : HEAD/source > corpus > mémoire. Points ouverts marqués **[À TRANCHER]**.*

> **v0.4** — **presets de document** (format + pile de couches nommées, ex. ATC) ; **groupes nommés** de couches ; types de couche de domaine **`postmark`** (tampon postal) et **`ink-stamp`** ; famille d'**effets de bord/encre** (perforations, déchirure, distress) ; masques/clip pour les découpages.
> **v0.3** — renommage `.lypat` → **`.lygrid`** (pattern) ; §10 nouvelle « Spécification du format `.lygrid` » consolidant les 8 specs pattern ; P5.js acté comme moteur derrière la façade ; primitives généralisées (point, ellipse, arc d'ellipse) ; symétrie kaléidoscope ; éditeur pattern **reporté** (sous-projet documenté).
> **v0.2** — trois formats (`.lydoc`/`.lypat`/`.lypart`), axe vivant/figé, façade de rendu à deux backends.

---

## 0. Vision & positionnement

Le Layout Designer compose des **artefacts imprimables à format fixe** par **couches** : cartes postales, billets fantaisie, timbres, cartes bancaires (ID-1), ATC/ARC, cartes à jouer / tarot. Un **pattern n'est plus le produit** — c'est une couche parmi d'autres (fond, guilloche de sécurité).

Principe directeur (« core + plugins ») : **le noyau ne connaît aucun domaine**. Formats, types de couche, primitives, exporteurs, langues — tout vient de **plugins**, même ceux livrés d'office.

**Axe structurant : vivant vs figé.** Réutilisable soit **vivant/paramétrique** (`.lygrid` re-rendu par le moteur), soit **figé** (`.lypart` : SVG transformable, non éditable). Trois formats (§8).

**Plateforme** : **ElectronJS**, avec **menu et barre d'outils rendus dans la page HTML** (pas de menu natif OS) — cohérent multi-plateforme et stylable via l'i18n/thème.

---

## 1. Structure du projet

```
layout-designer/
├─ package.json  main.js  preload.js
├─ src/
│  ├─ core/
│  │  ├─ document.js       # Document / GridPattern / Component (en mm)
│  │  ├─ session.js  workspace.js
│  │  ├─ undo.js  commands.js
│  │  ├─ plugin-host.js  registry.js     # layerTypes, primitives, tools, exporters, panels, commands
│  │  ├─ i18n.js  files.js
│  │  └─ render/ facade.js  p5-canvas-target.js  svg-target.js
│  ├─ renderer/            # UI composer (menu+toolbar HTML, tabs, panneaux, canvas P5)
│  ├─ pattern-editor/      # UI éditeur WYSIWYG .lygrid — SOUS-PROJET REPORTÉ (§11)
│  └─ shared/
├─ builtin-plugins/        # formats-print, layer-{fill,pattern,guilloche,text,image,component},
│                          # export-{png,pdf,svg}, locale-{fr,en}, prim-{point,line,ellipse,arc,rect,polygram,char}
├─ plugins/  locales/  schemas/
```

Built-in et tiers partagent **le même contrat**.

---

## 2. Modèle de données (mm ; rendu = dpi + zoom)

```
Document (.lydoc) { id, meta, format:FormatSpec, layers:Layer[], assets:{[id]:Asset} }
Layer { id, type, name, visible, locked, opacity, blendMode, region:Region, props }
Region { x, y, w, h, rotation }                      // mm, origine coin haut-gauche du trim

GridPattern (.lygrid) {                               // le « pattern », cf §10
  id, meta, grid:{type:"square|hex_pointy|hex_flat"},
  family:"default|text|quad", cellValueMode, maxCellValue,
  symbols:{…},                                        // ex-"Variables" : formes & macros réutilisables
  shapes:{ [cellValue]: Shape }                       // Shape = composition de primitives (mini-langage §10.3)
}
Shape { type, symmetry?:"none|quadrant", drawColor?, parts:[ Primitive | "$Symbol(args)" ], description? }

Component (.lypart) { id, meta, svg, intrinsic:{w,h}, provenance:{sourceKind,sourceId,version,hash} }
Asset { id, kind:"image|font|svg", mime, data:"base64…" }
```

Règle d'or : **toute mutation passe par une Command** (§5).

---

## 3. Pilier 1 — Plugins (client + serveur)

Sécurité Electron : `contextIsolation:true`, `nodeIntegration:false`.
- **Client** (renderer) : `layerTypes`, `primitives` (§10/§11), `tools`, `panels`, `commands`, `exporters`, `locales`. Pas de Node ; via l'`api` injectée.
- **Serveur** (main) : fichiers, export PDF/print, convertisseurs, baking crypto. Exposé au renderer **uniquement** via IPC déclarés.

Manifest `plugin.json` { id, name, version, side, entry, apiVersion, contributes{…} }.
Contrats : `LayerType { type, schema, createDefault, render(gfx,layer,doc,env), editorPanel?, migrate? }` ; `Primitive { type, schema, createDefault, render(gfx,part,env), anchorModel, editor?, handles? }`.
Découverte : scan `builtin-plugins/` puis `plugins/`. `apiVersion` refusé si incompatible. **[À TRANCHER]** sandbox plugins tiers (confiance+apiVersion en v0).

---

## 4. Pilier 2 — Couches

Pile = `document.layers` (index = z). add/remove/move/duplicate. Transverses (noyau) : visible/locked/opacity/blendMode/region/**mask** ; `props` au `LayerType`. Rendu : bas→haut, opacité/blend/**clip (mask)** puis `layerType.render(gfx,…)`. `blendMode` = sous-ensemble sûr.

**Groupes nommés.** Une couche peut être un **groupe** (couches enfants, visibilité/opacité héritées). Les groupes ont un **nom sémantique** et structurent le document. *Groupes plats nommés en v0 ; imbrication profonde v1.*

**Types de couche livrés** : `fill`, `pattern` (couche `.lygrid` vivante), `guilloche`, `image`, `text`, `component` (`.lypart`), **`postmark`** et **`ink-stamp`** (§4.1).

**Masque / clip.** Toute couche porte un `mask` optionnel (forme, chemin, ou alpha d'un asset) → pour les **découpages** (collage à bords découpés/déchirés). Le clip passe par `gfx.clip`.

**Effets de bord & d'encre** (famille) : générateurs appliqués au contour ou à la matière d'une couche — **perforation** (dentelure de timbre), **déchirure/deckle** (découpage), **distress** (look tampon caoutchouc : couverture partielle, grain, bords irréguliers, seedé). *v0 : paramètre de la couche qui en a besoin ; v1 : modificateur de couche réutilisable* **[À TRANCHER]**.

### 4.1 Types de couche de domaine « postal / mail-art »

- **`postmark`** (tampon postal / oblitération). Générateur procédural. Anatomie & params :
  - `shape` : cercle | double-cercle concentrique | ovale | rectangle.
  - `textTop` (lieu, en arc), `textBottomOrCenter` (date « JJ MOIS AAAA », parfois heure) — texte disposé le long du cercle.
  - `rings` : nombre d'anneaux concentriques.
  - `killerBars` : `{ count:5..7, amplitude }` — les barres **ondulées** d'oblitération qui prolongent le cachet.
  - `inkColor` (noir / rouge / violet), `rotation`, `opacity`, `distress:{ amount, seed }`.
  - Placement : par `region` + `rotation` ; chevauche volontiers timbre et carte.
- **`ink-stamp`** (tampon caoutchouc générique : « PAR AVION », « RETURN TO SENDER », cachet décoratif). = forme + texte + `distress`. Le `postmark` en est une spécialisation.

### 4.2 Presets de document

Un **preset** = un format + une **pile de couches nommées** de départ. Contribué par plugin (dans `formats-print` ou un plugin dédié), donc extensible.

- Preset **ATC** : `fond` (fill/pattern) · `découpages` (groupe : `image`/`component` + masque bord déchiré) · `timbres` (groupe : `component` `.lypart` + perforation) · `tampons` (groupe : `postmark`/`ink-stamp`).
- Généralisable : presets « billet », « tarot », « carte postale »… Choisir un preset à la création (`new`) pose la structure ; l'utilisateur reste libre d'ajouter/retirer.

---

## 5. Pilier 3 — Undo / Redo

Command, pile **par session** (et pile distincte dans l'éditeur pattern). `Command{label,do,undo,coalesceKey?}`. Mutations via `api.dispatch(cmd)` uniquement. Coalescing par `coalesceKey`. Hors undo : sélection, zoom, onglet. `dirty` = pile ≠ dernier point sauvé.

---

## 6. Pilier 4 — i18n

Catalogues JSON par langue, clés pointées namespacées par plugin. `t(key,params?)`, fallback `en` puis clé brute. Langues : **fr, en**. **Aucune chaîne UI en dur** (le menu/toolbar HTML du point 1 passe par `t()`). **[À TRANCHER]** RTL (prévoir `dir`).

---

## 7. Pilier 5 — Interface multi-documents (onglets, type IDE)

`Workspace{sessions[],activeId}` ; `DocumentSession{id,kind:"lydoc|lygrid",model,undoStack,viewState,dirty,filePath?}`. Un même espace ouvre `.lydoc` (composer) **et** `.lygrid` (éditeur pattern) en onglets. **Menu + barre d'outils en HTML** (point 1), stylés et traduits. Disposition : menu → toolbar → [panneau gauche (Layers/Cellules) | canvas P5 | panneau droit (Propriétés/Format)] → barre d'état (zoom, mm, dpi). `viewState` par onglet, non-undoable. **[À TRANCHER]** fenêtres détachables (v1+).

---

## 8. Pilier 6 — Formats : `.lydoc` / `.lygrid` / `.lypart`

| Ext | Rôle | Éditable | Réutilisable comme |
|---|---|---|---|
| **`.lydoc`** | document / composition | oui (composer) | figé → `.lypart` |
| **`.lygrid`** | pattern / papier peint | oui (éditeur WYSIWYG §11, reporté) | couche `pattern` **vivante**, ou figé → `.lypart` |
| **`.lypart`** | composant figé (SVG) | **non** | couche `component` transformable |

JSON, préfixe `.ly`, version en tête + migrations, JSON Schema dans `schemas/` + validation à l'ouverture (hérite du validateur existant), **assets embarqués en base64** par défaut (portable). `.lygrid` = structure `.pattern` actuelle + en-tête `"lygrid":"0.1"`. `.lypart` = `{lypart, meta, intrinsic, provenance, svg}`. **[À TRANCHER]** compression (JSON pur en v0).

---

## 9. Pilier 7 — Réutilisation & composants

- **Vivant** : `.lygrid` déposé en couche `pattern` → re-rendu, paramétrique.
- **Figé** : `.lypart` = `.lydoc`/`.lygrid` exporté SVG, placé en couche `component`. Transformations : échelle, rotation, **déformation du ratio H/L**, **rognage** (matrice affine + clip SVG). Non éditable ; pour changer → ré-éditer la source, ré-exporter.
- Provenance stockée (source/version/hash) → « source modifiée depuis le gel » détectable. Pas de récursion (SVG inerte).
- **[À TRANCHER v1+]** imbrication **vivante** `.lydoc`-dans-`.lydoc` / édition in-situ — le composant figé couvre le besoin en v0.

---

## 10. Spécification du format `.lygrid` (le pattern)

Un `.lygrid` dessine les cellules d'une grille : chaque **valeur de cellule** → une **Shape**. Grille **carrée** ou **hexagonale** (via `grid_layout`). Familles : `default`, `text`, `quad`.

### 10.1 Primitives (point 3)
Jeu canonique, chacune une contribution de plugin (`Primitive`) :

| Primitive | Remplace/généralise | Paramètres clés |
|---|---|---|
| `point` | (nouveau) | position, taille |
| `line` | line / cardinal_line / diagonal | start, end (ancrages §10.2) |
| `ellipse` | **généralise `circle`** | position, size=[w,h] (cercle = w=h) |
| `arc` (arc d'ellipse) | l'`arc` actuel | position, size=[w,h], startAngle, endAngle, fillStyle:PIE, rotation |
| `rectangle` | rectangle / square | position, size=[w,h] (carré = w=h) |
| `polygram` | — | vertex_count, is_star |
| `char` (caractère texte) | letter | fillColor, drawColor, size |

Chaque primitive **déclare son `anchorModel`** ; la façade (§12) l'applique → le repère P5 tordu est masqué.

### 10.2 Points d'ancrage (point 5)
Repère **normalisé** selon le type de grille :
- **Carré** : `center, N, NE, E, SE, S, SW, W, NW` (centre + 8 compass). *(ta liste omettait E/W — supposé typo ; les 8 sont retenus, comme `CardinalLineShape` aujourd'hui.)*
- **Hexagonale** : `center, 0, 60, 120, 180, 240, 300` (centre + 6 directions angulaires ; correspondance sommets/arêtes selon l'orientation pointy/flat).

Ces noms sont le **seul** vocabulaire d'ancrage ; `position:[x,y]` reste possible en coordonnées (percent → ×cellSize, cf. `NumberFormat`).

### 10.3 Mini-langage JSON : formes & macros (point 4)
Permet à l'utilisateur de **décrire de nouvelles formes sans code**, par composition — c'est le cœur « déclaratif » du `.lygrid`.
- **Shape** = `ComboShape` + `parts[]` ; une part est une primitive (§10.1) ou une référence de symbole.
- **Symboles** (ex-`Variables`) : fragments réutilisables nommés. Simple (`DigitMark`) ou **macro paramétrable** `Name(a,b)` avec substitution `$a` à l'appel `$Name('x','y')`.
- Exemple de référence : **IChing** — chaque trigramme (8 valeurs de cellule) est une Shape composée de `rectangle`s (barres pleines/brisées) ; la variante colorée réutilise un symbole `DigitMark`. (cf. `IChingTriColor.lygrid`.)
- Distinction nette : **primitives** = code (plugin, contrat `Primitive`) ; **formes utilisateur** = données (ce mini-langage). Le futur éditeur (§11) est l'UI de ce mini-langage.

### 10.4 Types de pattern
- **Guilloché** (point 6) : courbes paramétriques (hypotrochoïde, épitrochoïde, rose, spirale, lissajous, bande sinus) — primitive `guilloche`, normalisée-native.
- **Texte** (point 7) : famille `text`, `MaxCellValue:"*"`, forme unique sous clé `"*"` avec primitive `char` ; `FontInfo`, `TextFlipFlop`. (cf. `Text_FlipFlop.lygrid`.)

### 10.5 Symétrie de cellule — kaléidoscope (point 8)
Propriété `symmetry` sur une Shape :
- `"none"` (défaut).
- `"quadrant"` : l'auteur dessine le contenu d'**un** quadrant (ex. NW) ; le moteur **réfléchit** en quatre — miroir vertical → NE, horizontal → SW, les deux → SE. Effet kaléidoscope.
- Implémentation : au rendu de la cellule, dessiner la Shape 4 fois sous les 4 transformations miroir (la façade `gfx` porte `save/restore` + `scale(-1,…)`).
- **[À TRANCHER]** généralisations : miroir simple (x ou y), symétrie **6-fold** sur grille hexa.

---

## 11. Éditeur WYSIWYG de patterns (`.lygrid`) — SOUS-PROJET, REPORTÉ

Documenté, **non prioritaire**. Le JSON `.lygrid` est trop ésotérique pour un utilisateur final → éditer visuellement. Surfaces prévues : sélecteur de valeur de cellule ; palette de primitives (§10.1) en glisser-déposer + manipulation directe (poignées) ; pickers couleur/épaisseur/Z ; panneau **Symboles** (remplace `$Name` ; §10.3) ; contrôles famille/grille/ancrage (§10.2) ; bascule **symétrie** (§10.5) ; aperçu live via le moteur (§12). Réutilise Command/undo et le contrat `Primitive`. Sortie : `.lygrid` (JSON invisible pour l'utilisateur). **À planifier après** que primitives + façade `gfx` existent.

---

## 12. Moteur de rendu — P5.js + façade `gfx`, deux backends (point 2)

- **P5.js** est le moteur de tracé. **Mais** le point de référence diffère selon la primitive P5 (`ellipseMode`, `rectMode`, ancrage du texte…). → **façade `gfx`** unique au-dessus, qui impose **un** repère et les ancrages de §10.2 ; chaque `Primitive.render` reçoit `gfx`, jamais P5 brut, et mappe en interne vers le repère P5 correct. L'incohérence P5 est absorbée à un seul endroit.
```
GFX : beginPath, moveTo, lineTo, vertex, arc, ellipse, rect, polygon, char,
      fill, stroke, save/restore, translate/rotate/scale, clip, anchor(name, grid)
P5CanvasTarget : écran interactif (P5)         — implémente GFX
SvgTarget      : export .lypart / impression   — implémente GFX en émettant du SVG
```
- **Export** = rendre dans `SvgTarget` → `.lypart` (composant) ou SVG/PDF (print, plugin serveur).
- **[À TRANCHER]** SVG : `p5.svg` (addon) vs émetteur SVG maison. La façade rend le choix transparent pour le code des primitives.
- Coût honnête : migrer le renderer `PatternLab` actuel (ctx brut) derrière `gfx` est le **refactor principal**.

---

## 13. Intégration de l'existant

| Construit | Rôle |
|---|---|
| `formats.js` | plugin `formats-print` |
| `grid_layout.js` | `layer-pattern` + ancrages hexa (§10.2) + éditeur |
| `guillocheShape.js` (math) | primitive `guilloche` (§10.4) |
| renderer `PatternLab` | base du rendu — **migrer derrière `gfx` (§12)** |
| `pattern_validate.js` | validateur `.lydoc`/`.lygrid` |
| classes hexa (Truchet/cube/triangles) | primitives / variantes `layer-pattern` |

---

## 14. Place dans le Layer Cake TSCG

- **M2** : document composité à couches ; couche à réalisation déclarative/procédurale ; placement par région ; commande réversible ; vivant vs figé ; **symétrie/kaléidoscope** ; ancrage normalisé.
- **M1** : Print Formats ; vocabulaire de primitives et de types de couche ; mini-langage de formes ; exporteurs.
- **M0** : un `.lydoc`, un `.lygrid`, un `.lypart` concrets.

---

## 15. Ordre de construction (session suivante)

1. **Noyau** : `document.js` (Document/GridPattern/Component), `session.js`, `undo.js`+`commands.js`.
2. **Façade `gfx`** + `P5CanvasTarget` ; ancrages §10.2 ; migrer le rendu pattern derrière `gfx`.
3. **plugin-host** + `registry` + contrats `LayerType`/`Primitive` ; charger `builtin-plugins/`.
4. **Primitives** (§10.1) + mini-langage de formes/macros (§10.3) + **symétrie quadrant** (§10.5).
5. **files.js** : `.lydoc`/`.lygrid` open/save + JSON Schemas + validation.
6. **i18n** (fr/en) ; **UI shell** : menu/toolbar HTML, onglets, canvas P5, panneau Layers.
7. Plugins : `formats-print`, `layer-fill`, `layer-pattern`, `layer-guilloche`, `layer-text`, `layer-image`.
8. **`SvgTarget`** + `export-svg` → `.lypart` ; couche `component`.
9. *(Reporté)* Éditeur WYSIWYG pattern (§11).

Preuve de scaffolding : ouvrir un `.lydoc`, réordonner/masquer une couche, annuler, changer de langue ; ouvrir un `.lygrid`, voir un pattern (IChing/guilloché) rendu, activer la symétrie quadrant ; geler un `.lydoc` en `.lypart` et le replacer transformé.

---

## 16. Décisions ouvertes **[À TRANCHER]**
Sandbox plugins tiers (confiance+apiVersion v0) · groupes imbriqués profonds (v1 ; groupes plats nommés en v0) · effets bord/encre : param en v0 vs modificateur réutilisable en v1 · RTL (prévoir `dir`) · fenêtres détachables (v1+) · compression `.ly*` (JSON pur v0) · imbrication vivante `.lydoc` (v1+) · SVG : p5.svg vs émetteur maison · symétrie : miroir simple / 6-fold hexa · finesse v0 éditeur pattern (reporté).

---

## 17. Reprise (handover court)

État : **architecture figée (v0.3), zéro code du Layout Designer écrit**. Décisions : noyau sans domaine + plugins ; trois formats `.lydoc`/`.lygrid`/`.lypart` (axe vivant/figé) ; Electron à menu/toolbar HTML ; P5.js derrière une façade `gfx` à deux backends (canvas/SVG) qui absorbe l'incohérence d'ancrage P5 ; primitives canoniques (point, line, ellipse, arc d'ellipse, rectangle, polygram, char) ; mini-langage de formes + macros (ex IChing) ; ancrages carré (8 compass+centre) / hexa (0..300+centre) ; symétrie kaléidoscope 4 quadrants ; **presets de document + groupes nommés (ex. ATC : fond/découpages/timbres/tampons) ; types `postmark`/`ink-stamp` ; masques + effets de bord/encre** ; éditeur pattern reporté ; toute mutation = Command. Briques réutilisables dans `outputs/` : `formats.js`, `grid_layout.js`, `guillocheShape.js` + classes hexa, `pattern_validate.js`, `pattern.schema.json`, renderer `PatternLab` (zip). Moteur existant de Michel (`pattern.js`+`shapes/`) = source pour un rendu fidèle. Prochaine session : **étape 1 du §15** (noyau). Bugs HEAD hors périmètre : `grid_data.getLength()`, champ `text_format` mort, `triangleShape.js` sans import.
