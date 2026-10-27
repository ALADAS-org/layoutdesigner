#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ld_generate_filetree.py — génère LD_FileTree.md depuis `git ls-files`.

Transposé de `tscg_generate_filetree.py` (projet TSCG) pour le dépôt
Layout Designer. Même principe : l'arbre résident du projet est régénéré
à partir des chemins EXACTS versionnés, jamais d'un os.walk du disque.

Sortie : docs/reboot-kit/LD_FileTree.md (corpus résident du projet Claude).

Pourquoi `git ls-files` et NON un os.walk du disque :
le disque local (Windows surtout) peut diverger en CASSE de ce qui est réellement
versionné. GitHub raw est sensible à la casse : lire le disque produit des URLs en
404. `git ls-files` donne les chemins EXACTS du dépôt et exclut d'office le gitignoré
(node_modules, etc.).

IMPORTANT — lancer depuis un clone À JOUR, sinon on photographie l'état local :
    git fetch --depth 1 origin main && git reset --hard origin/main
"""

import argparse
import os
import subprocess
import sys

REPO_URL = "https://raw.githubusercontent.com/ALADAS-org/layoutdesigner/main/"

# Emplacement CANONIQUE dans le dépôt (reboot-kit avec un TIRET).
TREE_OUTPUT = "docs/reboot-kit/LD_FileTree.md"

# ---------------------------------------------------------------- exclusions
EXCLUDED_PATH_SEGMENTS = {".git", "_archives", "api_key"}
EXCLUDED_EXTENSIONS    = {".api_key"}
EXCLUDED_NAME_PATTERNS = ["apik"]          # ceinture anti-fuite de secrets

# Dossiers repliés en simple compteur dans l'arbre (bruit volumineux).
COLLAPSED_DIRS = {
    "node_modules", "dist", "out", "release", "__pycache__", ".pytest_cache",
}

# Fichiers d'AUTORITÉ (★) : les contrats de conception à lire sur HEAD, jamais de
# mémoire — le modèle de données, la pile Command, la façade gfx, le compositor,
# le registre de plugins, et la spec d'architecture. Correspond aux ★ ontologies
# canoniques de TSCG, transposé aux contrats du Layout Designer.
AUTHORITY_FILES = {
    "docs/LayoutDesigner_ARCHITECTURE.md",
    "src/core/document.js",
    "src/core/undo.js",
    "src/core/commands.js",
    "src/core/registry.js",
    "src/core/render/facade.js",
    "src/core/render/compositor.js",
}


def is_secret_like(fname: str) -> bool:
    ext = "." + fname.rsplit(".", 1)[-1].lower() if "." in fname else ""
    if ext in EXCLUDED_EXTENSIONS:
        return True
    return any(pat in fname.lower() for pat in EXCLUDED_NAME_PATTERNS)


def list_tracked():
    try:
        raw = subprocess.check_output(
            ["git", "-c", "core.quotepath=off", "ls-files", "-z"],
            text=True, encoding="utf-8")
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"\n❌ Échec de `git ls-files` : {e}")
        print("   Lance ce script depuis la racine du dépôt git.")
        sys.exit(1)
    return [p for p in raw.split("\0") if p.strip()]


def keep_for_tree(path: str) -> bool:
    segments = path.split("/")
    if is_secret_like(segments[-1]):
        return False
    if any(seg in EXCLUDED_PATH_SEGMENTS for seg in segments[:-1]):
        return False
    return True


# ------------------------------------------------------------------- l'arbre
def build_tree(paths):
    """Construit un dict imbriqué {dir: {...}, '__files__': [noms]}."""
    root = {}
    for p in paths:
        parts = p.split("/")
        node = root
        for d in parts[:-1]:
            node = node.setdefault(d, {})
        node.setdefault("__files__", []).append(parts[-1])
    return root


def count_entries(node):
    n = len(node.get("__files__", []))
    for k, v in node.items():
        if k != "__files__":
            n += count_entries(v)
    return n


def render_tree(node, prefix_path="", indent=0, out=None):
    out = out if out is not None else []
    pad = "  " * indent
    for name in sorted((k for k in node if k != "__files__"), key=str.lower):
        child = node[name]
        if name in COLLAPSED_DIRS:
            out.append(f"{pad}- **{name}/** _(collapsed, {count_entries(child)} entries)_")
            continue
        out.append(f"{pad}- **{name}/**")
        render_tree(child, f"{prefix_path}{name}/", indent + 1, out)
    for fname in sorted(node.get("__files__", []), key=str.lower):
        full = f"{prefix_path}{fname}"
        star = " ★" if full in AUTHORITY_FILES else ""
        out.append(f"{pad}- {fname}{star}")
    return out


def write_tree(paths, outfile=TREE_OUTPUT):
    kept = sorted(p for p in paths if keep_for_tree(p))
    tree = build_tree(kept)
    body = render_tree(tree)
    header = (
        "# Layout Designer — Repository File Tree\n\n"
        f"*Generated from `git ls-files` ({len(kept)} tracked files). Directory-level map; "
        "`node_modules` / build / cache folders are collapsed to a count. "
        "★ = live authority file (core contract or architecture spec — read it from HEAD, "
        "never recite from memory). Regenerate with `cli_tools/ld_generate_filetree.py` after "
        "structural changes, then reload it into Project Knowledge.*\n\n"
    )
    parent = os.path.dirname(outfile)
    if parent:
        os.makedirs(parent, exist_ok=True)
    with open(outfile, "w", encoding="utf-8", newline="\n") as f:
        f.write(header + "\n".join(body) + "\n")
    print(f"✅ {outfile} — {len(kept)} fichiers, {len(body)} lignes")
    return kept


def main():
    ap = argparse.ArgumentParser(
        description=f"Génère {TREE_OUTPUT} depuis git ls-files.")
    ap.add_argument("--out", metavar="PATH",
                    help=f"chemin de sortie (défaut : {TREE_OUTPUT})")
    args = ap.parse_args()

    if not os.path.isdir(".git"):
        print("❌ Lance ce script depuis la RACINE du dépôt (pas de .git ici).")
        sys.exit(1)

    paths = list_tracked()
    print("=" * 60)
    print(f"Source : git ls-files — {len(paths)} fichiers versionnés")
    print("=" * 60)

    write_tree(paths, args.out or TREE_OUTPUT)

    print("\n⚠️  Vérifie que le clone est synchronisé sur HEAD avant de publier :")
    print("    git fetch --depth 1 origin main && git reset --hard origin/main")


if __name__ == "__main__":
    main()
