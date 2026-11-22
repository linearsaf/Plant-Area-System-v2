# Health check, housekeeping, sertifikat

Sumber: `docs/deployment/VPS-TQ-CMMS.md` §11 (renewal, rotasi sertifikat backend), §14 "Monitoring awal", §16.

## Health check

- Snapshot terjadwal: `/var/lib/tq-cmms/health/latest.json` (dari `tq-cmms-health-record.service`).
- Snapshot baru: `sudo systemctl start tq-cmms-health-record.service`, lalu baca `latest.json`. Bila unit belum terpasang: `sudo TQ_DOCKER=docker bash .agents/skills/tq-cmms-ops/scripts/health-check.sh`.
- Isi JSON: `status` (OK/WARN/CRIT), `issues`, `warnings`, release/SHA/dirty, layanan (state/health/restart/OOM), disk/inode, memori, umur backup, sisa hari sertifikat, kode HTTP backend loopback, binding port yang menyimpang.
- `/gateway-health` 204 saja tidak membuktikan Auth/database sehat. Lihat health container dan `/auth/login` 200.

Ringkasan health untuk pemilik: status, lalu setiap `issues` dengan tindakan yang diusulkan, lalu `warnings`. Sertakan angka dari JSON.

## Disk penuh / housekeeping

Lingkupnya resource tq-cmms saja. Host ini dipakai website lain.

0. Disk yang memuat `/var/lib/docker` ≥ 95% membuat MySQL berisiko gagal menulis. Aktifkan maintenance bila pengosongan berlingkup project tidak bisa segera menurunkannya.
1. Ukur dulu: `df -h / /var/lib/docker`, `sudo docker system df`, `sudo du -sh /opt/tq-cmms/backups /var/lib/docker/volumes/tq-cmms_* 2>/dev/null`, `sudo docker image ls 'plant-*' --format '{{.Repository}}:{{.Tag}} {{.ID}} {{.CreatedSince}} {{.Size}}'`.
2. Tentukan set yang dipertahankan: tag aktif (`RELEASE_TAG`), tag rollback (release sebelumnya di ops-log; tetap dipertahankan sampai release aktif diterima pemilik dan satu backup harian sesudahnya sukses), dan image yang dipakai container mana pun (`sudo docker ps -a --format '{{.Image}}'`).
3. Kandidat hapus = image `plant-*` di luar set itu. Dengan mandat housekeeping (gerbang di SKILL.md), hapus dan laporkan daftarnya; tanpa mandat itu, ajukan daftarnya. Perintah: `sudo docker image rm plant-<svc>:<tag> ...` (tanpa `-f`).
4. Backup lokal dirotasi sidecar (14 hari). File backup tidak dihapus manual sebelum salinan offsite-nya terbukti.
5. Cache BuildKit, image dangling, journal, dan log website lain bukan milik project. Bila hanya itu yang bisa mengosongkan disk, laporkan angkanya ke pemilik sebagai keputusan host dengan opsi konkret: `sudo docker builder prune --filter until=168h` dan `sudo journalctl --vacuum-time=14d`. Jalankan opsi yang disebut pemilik secara spesifik (pesan seperti "hapus cache docker dan log" sudah termasuk), dan jangan melebihi opsi itu. Image website lain dan `image prune` tetap di luar lingkup. Estimasi ruang yang benar-benar bebas memakai `sudo docker system df -v`, karena layer dipakai bersama antar-tag.
6. Selesai bila `df` sesudah tercatat di log dan memenuhi sasaran build (≥ 8 GiB kosong), atau laporan menyebut kekurangannya.

Log container memakai driver `local` dengan batas 3 × 10 MB (`compose.vps.yaml`), jadi log container jarang menjadi penyebab disk penuh. Periksa juga binlog MySQL (retensi 7 hari) dan volume `drawings-files`.

## Sertifikat

- Publik (Let's Encrypt, Nginx host): renewal oleh timer certbot existing dan hook `/etc/letsencrypt/renewal-hooks/deploy/50-tq-cmms-nginx`. Sisa < 30 hari berarti renewal macet. Periksa `sudo systemctl list-timers | grep -i certbot`, `sudo certbot renew --cert-name tq-cmms.com --dry-run`, dan probe ACME (runbook §10–11). Certificate website lain tidak disentuh.
- Backend self-signed (`infra/certs/tls.crt`, 365 hari, **tidak** diperbarui certbot): rotasi saat maintenance mengikuti runbook §11 paragraf terakhir. Simpan pasangan lama privat, buat pasangan baru, `sudo install` cert ke `/etc/nginx/tq-cmms/backend.crt`, `dc up -d --no-deps --force-recreate nginx`, uji backend `--cacert`, lalu `sudo nginx -t && sudo systemctl reload nginx`. Gagal berarti kembalikan keduanya. Rotasi butuh perintah pemilik. Usulkan rotasi saat sisa < 30 hari.

## Rutin lain yang layak dicek

- `dc logs --since 24h nginx | grep -c ' 5[0-9][0-9] '` sebagai tren 5xx.
- `sudo tail -n 80 /var/log/nginx/tq-cmms.error.log`.
- `/etc/logrotate.d/nginx` existing mencakup log domain ini.
- Working tree VPS bersih (`dirty_files` = 0).
