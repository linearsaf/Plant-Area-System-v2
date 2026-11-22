#!/usr/bin/env bash
# Dipanggil tq-cmms-health-record.service (root). Menulis snapshot health ke state dir;
# tidak mengubah apa pun milik deployment. Retensi snapshot 30 hari.
set -euo pipefail
STATE_DIR="${TQ_STATE_DIR:-/var/lib/tq-cmms}"
dir="$STATE_DIR/health"
install -d -m 0755 "$dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="$dir/health-$stamp.json"
TQ_DOCKER="${TQ_DOCKER:-docker}" bash "$(dirname "${BASH_SOURCE[0]}")/health-check.sh" >"$out.tmp"
chmod 0644 "$out.tmp"
mv "$out.tmp" "$out"
ln -sfn "$(basename "$out")" "$dir/latest.json"
find "$dir" -maxdepth 1 -type f -name 'health-*.json' -mtime +30 -delete
