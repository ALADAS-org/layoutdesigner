# Dialecte `.pattern` — Spécification (v2)

*Extraite empiriquement de **30 fichiers** couvrant **3 familles**. Chaque affirmation est constatée dans les données. Le schéma associé (`pattern.schema.json`, draft 2020-12) valide les 30 fichiers.*

Un `.pattern` est un fichier **JSON valide** décrivant comment dessiner les cellules d'une grille. Chaque cellule porte une valeur, et `Shapes` associe à chaque valeur une forme.

---

## 0. Familles de patterns

Le DSL a trois modes d'emploi. La famille change l'interprétation de `MaxCellValue` et des clefs de `Shapes`.

| Famille | Déclarée par | Valeur de cellule | Clefs `Shapes` | Types de forme propres |
|---|---|---|---|---|
| **default** (grille) | *(rien)* | entier `0..MaxCellValue` | `"0","1",…` (lettres si >9) | `ComboShape` + primitives |
| **text** | `Family: "text"` | un **caractère** | une seule clef `"*"` | `letter` |
| **quad** | `PatternFamily: "quad"` | entier `0..MaxCellValue` | `"0","1",…` | `QuadComboCell`, `SquareQuadCell`, `TriangleQuadCell`, `concave_diamond` |

> La famille est déclarée par **`Family`** (text) *ou* **`PatternFamily`** (quad) — deux orthographes du même concept. Voir 6.5.

---

## 1. Structure de tête

**Toujours présents (24/24)** : `Name`, `CellSize`, `MaxCellValue`, `CellValueMode`, `BackgroundColor`, `Shapes`.

| Champ | Type | Notes |
|---|---|---|
| `Name` | string | requis |
| `CellSize` | string num. | requis — px du côté de cellule |
| `MaxCellValue` | string num. **ou `"*"`** | requis — `"*"` en famille text |
| `CellValueMode` | string | requis — `Random`, `Sequence` |
| `BackgroundColor` | couleur | requis |
| `Shapes` | objet | requis — voir 4 |
| `Variables` | objet | **optionnel** (absent en text et dans certains quad) |
| `Tags` | string | optionnel |
| `Description` | string | optionnel |
| `Reference`, `ColorPaletteReference` | string (URL) | optionnel |
| `NumberFormat` | string | `absolute`, `percent` |
| `GridColor` | couleur | optionnel |
| `Schema` | string | pointeur vers le schéma (ex. `"pattern.schema"`) |
| `Family` / `PatternFamily` | string | voir 0 et 6.5 |
| `FontInfo` | objet | `{ family?, size }` — famille text |
| `ContentInfo` | objet | `{ textFormat }` — ex. `"fac_simile"` |
| `TextFlipFlop` | string bool | `"true"` — famille text |
| `BaseURL` | string (URL) | base des `icon_url` — 6.1 |

---

## 2. Système de variables

`Variables` (optionnel) = dictionnaire nom → valeur. Trois natures acceptées :

1. **Fragment de forme** : `"DigitMark": { "type":"digit_mark", … }`
2. **Liste de fragments** : `"TopBrokenBar(color)": [ {…}, {…} ]`
3. **Constante scalaire** : `"StrokeThickness_01": 0.3`, référencée par `"$StrokeThickness_01"`.

### Macros paramétrées
`Name(param)` déclare des paramètres ; `$param` est substitué à l'appel `$Name('valeur')`.
```json
"CellBackground(color)": { "type":"square", "fillColor":"$color" }   ->  "$CellBackground('black')"
```

---

## 3. Références

- `$Name` — insère la variable (fragment, liste ou scalaire), partout où une valeur est attendue.
- `$Name('a', 'b')` — appelle une macro avec substitution.

---

## 4. Formes (`Shapes`)

Clef = identifiant de cellule : entier, lettre façon hex (`A=10, B=11…` quand `MaxCellValue>9`, cf. `Truchet_2`), ou `"*"` (famille text). Chaque valeur est un conteneur (`ComboShape` / `QuadComboCell`) ou une forme directe.

### Conteneurs et primitives

| `type` | Rôle | Champs propres |
|---|---|---|
| `ComboShape` | conteneur | `parts` (requis) |
| `QuadComboCell` | conteneur quad | `parts` (requis) |
| `ComboCell` | conteneur | `parts` (requis), `visible` (bool) — quasi-doublon de `ComboShape`, voir 6.8 |
| `SquareQuadCell` | cellule 4 quartiers | `colorPairs` (requis, 4), `decoration`, `decorationColorChoices`, `colorPairChoices` |
| `TriangleQuadCell` | cellule 4 quartiers | `colorPairs` (requis, 4), `colorPairChoices`, `size`, `drawThickness` |
| `rectangle` | primitive | `position`, `size` (requis) |
| `square` | primitive | `size`, `position` (souv. `center`), `instanceCount` |
| `arc` | primitive | `position`, `size`, `startAngle`, `endAngle` (requis), `fillStyle:"PIE"`, `capStyle`, `rotation` |
| `circle` | primitive | `position` (souv. `center`), `size`, `instanceCount` |
| `losange` | primitive | `instanceCount`, `size` (générateur), `position` |
| `diamond` | primitive | `size`, `position`, `fillColor` — voir 6.9 |
| `polygram` | primitive | `vertex_count` (requis), `is_star:"true"` (étoilé), `position`, `size` |
| `guilloche` | primitive | `curve` (requis: hypotrochoid/epitrochoid/rose/spiral/lissajous/sine_band), params en fractions de cellule ; normalisé-natif |
| `line` | primitive | `start`/`end` (cardinaux ou `center`) |
| `concave_diamond` | primitive quad | `position`, `size`, `colorPairChoices` |
| `digit_mark` | primitive | affiche la valeur numérique ; `position`, `drawColor` |
| `letter` | primitive text | affiche le caractère ; `size`, `fillColor`, `drawColor`, `drawThickness` |
| `icon` | primitive | `icon_url` (requis) — 6.1 |
| `diagonal` | primitive | `start`/`end` cardinaux, `capStyle` |
| `cardinal_line` | primitive | `start`/`end` cardinaux, `Z` |

### Valeurs spéciales
- **Couleur** : hex, nommée, `none`, ou `$ref`.
- **Paire de couleurs** (`colorPairs`) : `"fill+draw"`, ex. `"orange+#7bed9a"`, `"none+none"`. Quatre par cellule quad = les 4 quartiers.
- **`colorPairChoices`** : ensemble de paires dont une est tirée au hasard. **Deux formats** (6.6) : tableau `["a+b","c+d"]` ou string à barres `"a+b|c+d"`.
- **`position`** / `start` / `end` : `["x","y"]`, mot-clef `"center"`, **cardinal** (`N,S,E,W,NE,NW,SE,SW`), ou `$ref`.
- **`Z`** (ordre de dessin) : entier, ou mot-clef `"min"` / `"max"`.
- **`vertex_count`** (polygram) : nombre de sommets ; `is_star:"true"` transforme le polygone régulier en polygone étoilé (pentagramme…).
- **`size`** : scalaire, `["w","h"]`, `$ref`, ou **générateur** `{"start":5,"step":8}`.
- **Répétition** : `instanceCount:N` + `size:{start,step}` -> N instances concentriques (moteur des moirés).

---

## 5. Ce que le schéma NE PEUT PAS valider (-> validateur sémantique)

1. Qu'une `$ref` résout vers une variable définie.
2. Que l'arité d'un appel `$Name('a')` correspond aux paramètres déclarés.
3. Que les clefs de `Shapes` couvrent `0..MaxCellValue` sans trou (famille default/quad).
4. Que `colorPairs` a bien 4 éléments en famille quad.
5. La cohérence des coordonnées (6.2) et de l'ancrage (6.3).

---

## 6. Incohérences connues (confirmées)

### 6.1 — Assets images : fragile au partage
`icon` -> `icon_url` résolu contre `BaseURL = http://127.0.0.1:3000/…`. **Un `.pattern` avec icônes casse dès qu'on le partage.** -> cas légitime pour un `icon` inline (9).

### 6.2 — Coordonnées : abs/normalisé pilotées par `NumberFormat` (surchargé)
Le moteur (`quadComboCell.getPartPosition`) fait `if (NumberFormat=="percent") x *= cellSize`. Donc `NumberFormat` **décide déjà** de l'espace : `percent`=normalisé, `absolute`=pixels. Pas de `CoordMode` à ajouter — le vrai défaut est que **`NumberFormat` est surchargé** (format d'affichage des chiffres ET espace de coordonnées). -> dédoubler en deux champs distincts.

### 6.3 — Ancrage (origine P5.js)
`arc`/`rectangle` ancrés coin ; `circle`/`square` souvent `center`. Ancrage variable par primitive (`ellipseMode`/`rectMode`).

### 6.4 — Nombres string vs number
`"size":"50"` et `"size":50` coexistent. `CellSize`/`MaxCellValue` toujours string.

### 6.5 — `Family` vs `PatternFamily`
Même concept, deux orthographes (`text` vs `quad`). -> à unifier sur un seul nom.

### 6.6 — `colorPairChoices` : tableau vs string à barres
`["white+black", …]` (TriangleQuad) vs `"red+black|white+blue|…"` (concave_diamond). -> à unifier (tableau recommandé, plus lisible et validable).

### 6.7 — Variante « NoType »
`Text_Facsimile_NoType_UT` : le nom annonce une variante « sans type » (facsimilé via `ContentInfo.textFormat`). Ici `type:"letter"` est présent ; à surveiller si de vrais fichiers « NoType » arrivent — le schéma exige `type` sur chaque forme.

### 6.8 — `ComboShape` vs `ComboCell`
Deux conteneurs quasi identiques (`parts`) : `ComboShape` (156 occ.) et `ComboCell` (3 occ., + champ `visible`). Probable doublon historique. -> unifier, ou documenter ce que `ComboCell`/`visible` apporte de plus.

### 6.9 — Trois losanges : `losange`, `diamond`, `concave_diamond`
Trois primitives en losange coexistent. `losange` et `diamond` semblent redondants (`concave_diamond` a une géométrie propre, concave). -> clarifier la distinction ou fusionner `losange`/`diamond`.

---

## 7. Validateur sémantique (proposé)
Script Python/JS complétant le schéma pour les points 5 : résolution des `$refs`, arité des macros, couverture `0..MaxCellValue`, cardinalité de `colorPairs`. Réutilisable en pre-commit et dans le loader Electron.

---

## 8. Points d'extension (lien RFC)
- **`icon` inline** : ajouter `icon_data` (data-URI/base64) à côté de `icon_url` -> pattern auto-contenu, corrige 6.1. Bon usage de Base64 (binaire).
- **Forme procédurale** : `type:"script"`, corps **lisible** (tableau de lignes, pas Base64) + **sandbox** (façade restreinte, `contextIsolation`). Concept générique M2 (« réalisation déclarative ou procédurale »), corps concrets en M0.

---

## Rendering rules (fidelity to Silverquote)

> **Status: HYPOTHESES, to be re-verified in N1** (see `docs/ROADMAP.md`). These rules
> were derived by the abandoned improvised prototype (tag `proto-improvise-2026-10`),
> whose renders drifted from Silverquote. They are kept as starting hypotheses only;
> the authority is Silverquote itself — the screenshots in
> `assets/legacy/screenshots/silverquote/` and the Product Owner's Design gate.
> `cellBleedPx` below is an implementation trick of that prototype, not a Silverquote rule.

Candidate rules:

1. **`position: [x, y]` is relative to the cell CENTRE**, not the top-left corner.
   With `NumberFormat: "absolute"` the offsets are pixels (e.g. `["0","-12.5"]` places
   a part on the top edge of a 25 px cell); with `"percent"` they are fractions ×
   `CellSize`. String anchors (`center`, `N`, `NE`, …) are centre-relative too.
2. **Filled shapes get a default BLACK outline** when the part declares no `drawColor`.
   An explicit `"drawColor": "none"` suppresses the outline.
3. **`digit_mark` is an optional VIEW overlay** (Silverquote's `5∣3/6` toolbar toggle),
   not an always-drawn part — the renderer must be able to hide all digit marks.

Known gap: at non-integer cell sizes, adjacent cell fills can leave thin sub-pixel
seams (faint grid lines). Snap cell boxes to integer pixels to avoid them.

**Cells are JOINTIVE (edge-to-edge)** — cell centres are spaced by `CellSize`, with no
gap between them. An optional **grid overlay** (`GridColor`, e.g. `cyan`) is drawn ON TOP
of the filled cells, never as a space between them. At non-integer on-screen cell sizes,
adjacent fills can leave sub-pixel anti-alias seams; the engine overdraws each cell by a
fraction of a pixel (`cellBleedPx`, default 0.75) so neighbours overlap and seams vanish.
