#!/bin/bash
set -euo pipefail
umask 077
mkdir -p /backups
while true; do
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  temporary="/backups/.plant-${stamp}.sql.gz.tmp"
  target="/backups/plant-${stamp}.sql.gz"
  databases="plant_auth plant_bag_filter plant_consumables"
  # plant_drawings exists only after Drawing Database provisioning; include it when present.
  if mysql -h "${MYSQL_HOST:-mysql}" -uroot -N -e 'USE plant_drawings' >/dev/null 2>&1; then
    databases="$databases plant_drawings"
  fi
  # shellcheck disable=SC2086
  mysqldump -h "${MYSQL_HOST:-mysql}" -uroot --single-transaction --no-tablespaces --set-gtid-purged=OFF --databases $databases | gzip > "$temporary"
  gzip -t "$temporary"
  mv "$temporary" "$target"
  find /backups -maxdepth 1 -type f -name 'plant-*.sql.gz' -mtime +13 -delete
  printf '{"event":"backup.complete","file":"%s","databases":"%s"}\n' "$(basename "$target")" "$databases"
  # Drawing Database files (driver fs): daily archive of the append-only volume, 14-day retention.
  # With driver s3, rely on bucket versioning and retention instead (docs/OPERATIONS.md).
  if [[ -d /drawings-files ]] && [[ -n "$(ls -A /drawings-files 2>/dev/null)" ]]; then
    files_temporary="/backups/.drawings-files-${stamp}.tar.gz.tmp"
    files_target="/backups/drawings-files-${stamp}.tar.gz"
    tar -C /drawings-files -czf "$files_temporary" .
    gzip -t "$files_temporary"
    mv "$files_temporary" "$files_target"
    find /backups -maxdepth 1 -type f -name 'drawings-files-*.tar.gz' -mtime +13 -delete
    printf '{"event":"backup.files_complete","file":"%s"}\n' "$(basename "$files_target")"
  fi
  [[ "${RUN_ONCE:-false}" == true ]] && break
  sleep 86400
done
