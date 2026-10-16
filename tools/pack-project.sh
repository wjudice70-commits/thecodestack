#!/usr/bin/env bash
# Pack project folders into single text files for upload to Gemini (or any AI).
# Usage:  tools/pack-project.sh summit-spaces      # one project
#         tools/pack-project.sh --all              # every top-level project folder
# Output: gemini-packs/<project>.md  (upload this file to Gemini)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=gemini-packs
mkdir -p "$OUT"

pack() {
  local p="${1%/}"
  [ -d "$p" ] || { echo "No such project folder: $p" >&2; return 1; }
  local f="$OUT/$p.md" binaries=()
  {
    echo "# Project: $p"
    echo
    echo "You are being given the full source of one of my projects, packed into a single file."
    echo "Read it all, then wait for my instructions. Treat CLAUDE.md (if present) as the project's rules."
    echo
    echo "## File tree"
    echo '```'
    find "$p" -type f -not -path '*/node_modules/*' -not -path '*/.git/*' | sort
    echo '```'
    while IFS= read -r file; do
      if grep -Iq . "$file" 2>/dev/null || [ ! -s "$file" ]; then
        echo; echo "## FILE: $file"; echo '```'; cat "$file"; echo; echo '```'
      else
        binaries+=("$file")
      fi
    done < <(find "$p" -type f -not -path '*/node_modules/*' -not -path '*/.git/*' | sort)
    if [ ${#binaries[@]} -gt 0 ]; then
      echo; echo "## Binary files (not included - upload separately if needed)"
      printf -- '- %s\n' "${binaries[@]}"
    fi
  } > "$f"
  echo "Wrote $f ($(wc -c < "$f") bytes)"
}

[ $# -ge 1 ] || { echo "Usage: $0 <project-folder> | --all" >&2; exit 1; }
if [ "$1" = "--all" ]; then
  for d in */; do case "$d" in tools/|gemini-packs/) ;; *) pack "$d";; esac; done
else
  for p in "$@"; do pack "$p"; done
fi
