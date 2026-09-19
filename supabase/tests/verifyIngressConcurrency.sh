#!/bin/zsh
# G46-Nacharbeit (Review): Echter SQL-Konkurrenztest für claim_ingress_slot.
# Zwei parallele Sessions beanspruchen gleichzeitig je eine ANDERE Nonce an
# der 120er-Grenze (119 vorgefüllt). Ohne Serialisierung könnten beide unter
# der Grenze bleiben; mit pg_advisory_xact_lock pro Quelle gewinnt genau eine.
# Synchronisation: Beide Sessions bauen zuerst ihre Verbindung auf und warten
# dann per pg_sleep auf denselben Startpunkt — Aufwachversatz (ms) gegenüber
# Claim-Dauer vernachlässigbar, Überlapp praktisch garantiert.
# DB-Zugang ausschließlich aus Umgebung (keine Secrets im Repo):
#   PGHOST PGPORT PGUSER PGDATABASE PGPASSWORD müssen gesetzt sein.
# Ablauf: Setup → parallele Claims → Auswertung (genau 1× ok +
# 1× rate_limited) → Cleanup. Idempotent.

set -u
: "${PGHOST:?PGHOST fehlt (z. B. 127.0.0.1)}"
: "${PGPORT:?PGPORT fehlt (z. B. 54322)}"
: "${PGUSER:?PGUSER fehlt}"
: "${PGDATABASE:?PGDATABASE fehlt}"
: "${PGPASSWORD:?PGPASSWORD fehlt}"
# psql-Client: PSQL_BIN überschreibbar (z. B. /opt/homebrew/opt/libpq/bin/psql).
PSQL_BIN="${PSQL_BIN:-psql}"

OUT_A="$(mktemp)"
OUT_B="$(mktemp)"
trap 'rm -f "$OUT_A" "$OUT_B"' EXIT

run_claim() {
  local nonce="$1"
  local out="$2"
  "$PSQL_BIN" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -A \
    -c "SELECT pg_sleep(2); SELECT public.claim_ingress_slot('$nonce', NULL, 'shrace', 120);" > "$out" 2>&1
}

"$PSQL_BIN" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -A -v ON_ERROR_STOP=1 \
  -c "INSERT INTO public.ingress_nonces (nonce, source_system) SELECT 'g46-sh-race-prefill-' || g, 'shrace' FROM generate_series(1, 119) g ON CONFLICT DO NOTHING;" > /dev/null

run_claim 'g46-sh-race-a' "$OUT_A" &
run_claim 'g46-sh-race-b' "$OUT_B" &
wait

last_line() {
  grep -aE '^(ok|replay|rate_limited)$' "$1" | tail -1
}

A="$(last_line "$OUT_A")"
B="$(last_line "$OUT_B")"
echo "Race-Ergebnis: A=$A B=$B"

"$PSQL_BIN" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -A \
  -c "DELETE FROM public.ingress_nonces WHERE source_system = 'shrace';" > /dev/null

if { [ "$A" = "ok" ] && [ "$B" = "rate_limited" ]; } || { [ "$A" = "rate_limited" ] && [ "$B" = "ok" ]; }; then
  echo "KONKURRENZTEST BESTANDEN: genau ein Slot, einer rate-begrenzt."
  exit 0
else
  echo "KONKURRENZTEST FEHLGESCHLAGEN: Serialisierung verletzt."
  exit 1
fi
