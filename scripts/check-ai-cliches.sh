#!/usr/bin/env bash
# TheResaleValue — pre-publish AI-cliché check
# ------------------------------------------------------------
# Greps every content file (blogs, model pages, product landings)
# for phrases that scream AI-generated prose. Prints file:line
# for every hit and exits non-zero if any are found.
#
# Run manually:      bash scripts/check-ai-cliches.sh
# Wire into CI:      add to a pre-commit hook or Vercel build step
#
# Rule for adding a phrase to the list: only add if it's a genuine
# tell that a human editor would NEVER write in a first draft. Do
# not add legitimate English words that AI happens to overuse in
# specific contexts (that produces false positives).
# ------------------------------------------------------------

set -u
SCAN_PATHS=(src/pages src/data)

# -w = whole-word match. -i = case-insensitive. -n = line numbers.
GREP_OPTS='-i -n --include=*.astro --include=*.mdx --include=*.md --include=*.ts --include=*.json'

# High-confidence AI tells. Word-boundary matches.
PATTERNS=(
  '\bdelve\b'
  '\bdelving\b'
  '\btapestry\b'
  '\brealm\b'
  '\bunleash\b'
  '\bunlocking\b'
  '\bgame-?changer\b'
  '\bgame-?changing\b'
  '\brevolutionize\b'
  '\brevolutionise\b'
  '\bseamless\b'
  '\bseamlessly\b'
  '\brobust\b'
  '\bpivotal\b'
  '\bparamount\b'
  '\bcutting-edge\b'
  '\bstate-of-the-art\b'
  '\bever-evolving\b'
  '\bever-changing\b'
  '\bin today.s (fast-paced|digital|dynamic)\b'
  '\bwhen it comes to\b'
  "let'?s dive"
  '\bdive into\b'
  '\bdive deep\b'
  '\bembark on\b'
  "\bit'?s (worth|important) (to note|noting|mentioning)\b"
  '\bnavigate the (complex|intricate|nuanced)\b'
  '\bmoreover\b'
  '\bfurthermore\b'
  '\bnotwithstanding\b'
)

hits=0
for pat in "${PATTERNS[@]}"; do
  # shellcheck disable=SC2086
  matches=$(grep -Ern $GREP_OPTS "$pat" "${SCAN_PATHS[@]}" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "── FLAG: /$pat/"
    echo "$matches"
    echo
    hit_count=$(printf '%s\n' "$matches" | wc -l | tr -d ' ')
    hits=$((hits + hit_count))
  fi
done

# --- Typography tells ---------------------------------------------------
# Em-dashes are the single most reliable AI signal — commas, periods, or
# parentheses do the same job without giving the piece away. En-dashes are
# fine ONLY inside numeric ranges (5–10 km); banned as sentence connectors.
# Curly quotes and ellipsis characters get auto-inserted by AI tooling and
# should be replaced with straight quotes and three periods.
TYPO_PATTERNS=(
  # em-dash anywhere
  $'\xe2\x80\x94'
  # curly single quotes
  $'\xe2\x80\x98'
  $'\xe2\x80\x99'
  # curly double quotes
  $'\xe2\x80\x9c'
  $'\xe2\x80\x9d'
  # ellipsis character
  $'\xe2\x80\xa6'
)
TYPO_LABELS=(
  'em-dash (—) — use commas, periods, or parentheses'
  "curly single-quote open (') — use straight '"
  "curly single-quote close (') — use straight '"
  'curly double-quote open (") — use straight "'
  'curly double-quote close (") — use straight "'
  'ellipsis character (…) — use three periods ...'
)
for i in "${!TYPO_PATTERNS[@]}"; do
  pat="${TYPO_PATTERNS[$i]}"
  label="${TYPO_LABELS[$i]}"
  # shellcheck disable=SC2086
  matches=$(grep -rn $GREP_OPTS -F "$pat" "${SCAN_PATHS[@]}" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "── FLAG: $label"
    echo "$matches"
    echo
    hit_count=$(printf '%s\n' "$matches" | wc -l | tr -d ' ')
    hits=$((hits + hit_count))
  fi
done

if [ "$hits" -gt 0 ]; then
  echo "───────────────────────────────────────────"
  echo "AI-cliché check: $hits flagged line(s)."
  echo "Review each hit. If it's a legitimate use, rephrase anyway — the pattern is what reads as AI, not the intent."
  exit 1
fi

echo "AI-cliché check: clean. Nothing flagged."
exit 0
