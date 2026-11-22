#!/usr/bin/env bash
# Dipanggil tq-cmms-health-report.service (akun deployment) setelah snapshot health.
# Menambahkan ringkasan ke .deploy/ops-log/health-YYYY-MM.md. Snapshot diberikan ke agy
# di dalam prompt, jadi agy tidak membutuhkan tool apa pun (mode plan, read-only).
# Status OK hanya dicatat satu baris tanpa memanggil agy.
set -euo pipefail
ROOT="${TQ_ROOT:-/opt/tq-cmms}"
STATE_DIR="${TQ_STATE_DIR:-/var/lib/tq-cmms}"
AGY="${TQ_AGY:-agy}"
latest="$STATE_DIR/health/latest.json"
[ -r "$latest" ] || { echo "health-report: $latest tidak ada" >&2; exit 1; }

umask 077
mkdir -p "$ROOT/.deploy/ops-log"
log="$ROOT/.deploy/ops-log/health-$(date -u +%Y-%m).md"
status="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["status"])' "$latest")"
stamp="$(TZ=Asia/Jakarta date '+%Y-%m-%d %H:%M')"

fallback() {
  python3 - "$latest" <<'PY'
import json, sys
r = json.load(open(sys.argv[1]))
for k in ("issues", "warnings"):
    for item in r.get(k, []):
        print(f"- {k[:-1].upper()}: {item}")
PY
}

{
  printf '\n## %s WIB — health terjadwal: %s\n' "$stamp" "$status"
  if [ "$status" = OK ]; then
    printf 'Semua pemeriksaan lulus (%s).\n' "$(readlink "$latest" || basename "$latest")"
  else
    prompt="Skill tq-cmms-ops, mode terjadwal read-only. Jangan menjalankan tool atau perintah apa pun.
Berikut snapshot health JSON produksi tq-cmms. Tulis ringkasan Markdown maksimal 15 baris untuk pemilik:
baris pertama status; lalu setiap item 'issues' dengan dugaan penyebab dan tindakan yang diusulkan
(rujuk file reference skill yang relevan); lalu 'warnings' singkat. Pakai angka dari JSON, jangan mengarang.

$(cat "$latest")"
    if ! timeout 360 "$AGY" -p "$prompt" --mode plan --print-timeout 300s 2>>"$ROOT/.deploy/ops-log/health-report.err"; then
      echo "(ringkasan agy gagal; daftar mentah)"
      fallback
    fi
  fi
} >>"$log"
