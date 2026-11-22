# Insiden

Sumber: `docs/deployment/VPS-TQ-CMMS.md` §16 (tabel troubleshooting), `docs/OPERATIONS.md` "Health dan diagnosa".

Prinsipnya **fail-closed**: data dan bukti diamankan dulu, layanan dikembalikan lewat jalur yang sudah terbukti (release sebelumnya), lalu perbaikan diusulkan ke pemilik.

## Urutan pertama

1. Ambil snapshot health. Simpan bukti ke `.deploy/ops-log/evidence/<UTC-stamp>/` (umask 077): `dc ps -a`, `dc logs --tail=200 --no-color <layanan>`, `sudo docker inspect --format '{{.Name}} {{.State.Status}} {{.State.OOMKilled}} {{.RestartCount}}' <container>`, `git status --short`, dan `git diff` bila ada perubahan lokal. Saring log sebelum disimpan: `... | grep -viE 'cookie|token|password|secret|authorization|@'`.
2. Bila data berisiko rusak atau tulis harus berhenti: `sudo touch /var/lib/tq-cmms/maintenance`. Saat MySQL masih hidup, ambil backup baru (`RUN_ONCE=true`) sebagai titik pemulihan keadaan sekarang.
3. Cocokkan gejala dengan tabel runbook §16 dan bagian di bawah.
4. Pulihkan dalam lingkup gerbang insiden di SKILL.md. Untuk yang di luar lingkup, tulis rencana dan tunggu pemilik.
5. Laporan memuat kronologi (UTC/WIB), bukti, tindakan, status domain, dan risiko yang tersisa.

## Gejala umum

| Gejala                                                | Periksa                                                                                                                     | Pemulihan dalam mandat                                                                                                                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 502 dari Nginx host                                   | `curl --cacert ... --resolve` ke 18443, `dc ps`, trust `/etc/nginx/tq-cmms/backend.crt`, `/var/log/nginx/tq-cmms.error.log` | Start/recreate layanan project yang mati (`--no-deps`); cert backend dan trust host disamakan                                                                                     |
| 503 semua halaman                                     | penanda maintenance? Auth readiness (`dc ps auth`)                                                                          | Pulihkan MySQL/Auth, lalu uji login. Guard SSO tetap aktif.                                                                                                                       |
| Container unhealthy / restart loop                    | `dc logs`, `docker inspect` OOM, `free -m`, `docker stats --no-stream`, proses build/job lain                               | Hentikan build/job paralel, start ulang sekali, amati 15 menit. OOM lagi berarti rollback image (bila kompatibel) atau rencana ke pemilik. Budget memori diubah hanya lewat repo. |
| API mengembalikan `<!DOCTYPE`                         | routing/prefix gateway, `dc exec -T nginx nginx -t`                                                                         | Recreate gateway dari template release aktif                                                                                                                                      |
| Semua klien ber-IP sama / rate limit massal           | `.deploy/real-ip.conf` vs gateway network                                                                                   | Generate ulang trust list (runbook §9), lalu `nginx -s reload`                                                                                                                    |
| Login gagal / redirect loop                           | `PUBLIC_ORIGIN`, cookie, Host header                                                                                        | Konfigurasi dikoreksi. Akun dan sesi tidak direset.                                                                                                                               |
| `drawings:reconcile` exit 1                           | laporan missing/mismatch                                                                                                    | Maintenance untuk Drawing (nonaktifkan di Katalog aplikasi oleh admin). File dipulihkan dari arsip lewat keputusan pemilik.                                                       |
| Release berhenti di tengah (build/upgrade sebelumnya) | `git rev-parse HEAD` dan `RELEASE_TAG` vs entri ops-log terakhir; image `plant-*:<tag>` mana yang ada                       | Belum migrasi → rollback ke OLD_SHA/OLD_TAG tercatat ([update-release.md](update-release.md#rollback))                                                                            |
| Arsip `drawings-files` basi, dump DB segar            | `dc logs --since 48h backup`, `RestartCount` `tq-cmms-backup-1`, sisa `.tmp` di `backups/`, disk                            | `backup.sh` dump DB dulu lalu tar; tar gagal (disk/izin) membuat container keluar dan restart. Perbaiki penyebab, lalu `RUN_ONCE=true backup`                                     |
| Disk penuh                                            | [housekeeping-monitoring.md](housekeeping-monitoring.md#disk-penuh--housekeeping)                                           | Hanya lingkup project                                                                                                                                                             |

## Migrasi gagal

1. Maintenance tetap. Aplikasi tetap berhenti. Migrasi tidak diulang dalam loop.
2. Bukti: `dc logs --no-color migrate`, isi `__drizzle_migrations` dan `data_migrations` untuk database terkait (id/hash/waktu), dan keberadaan objek yang dikeluhkan error (mis. `SHOW COLUMNS ... LIKE 'brand'`).
3. Periksa perubahan lokal yang tidak dikenal di checkout. Bila ada, image release baru dianggap tercemar. Salin diff ke evidence dan jangan pakai image itu.
4. Bila objek yang dibuat migrasi bersifat aditif dan image lama tidak membacanya: rollback image ke release sebelumnya ([update-release.md](update-release.md#rollback)), uji backend, buka maintenance, lalu laporkan. Jurnal, kolom, dan tabel tetap apa adanya.
5. Perbaikan jurnal atau schema dikerjakan di repo (PR + CI), lalu dirilis ulang. Jangan menambal langsung di database produksi.

## Perubahan tak dikenal di server

Bukti diff disimpan privat apa adanya dan tidak disalin ke chat, karena bisa memuat token. Setelah template gateway dikembalikan, jalankan `dc up -d --no-deps --force-recreate nginx` agar template dirender ulang. Penjelasan pemilik dicocokkan dengan bukti (isi diff, `stat` mtime). Bila tidak cocok, atau diff menyentuh header identitas, `SERVICE_TOKEN`, atau `auth_request`, perlakukan sebagai insiden keamanan.

File yang dipakai saat runtime (`infra/nginx/*` di-bind mount ke gateway, `compose*.yaml`, `infra/deploy/*`, `.deploy/*`) membuat rollback image pun ikut memakai perubahan itu. Maintenance tetap sampai pemilik menjelaskan perubahan tersebut. Pesan ke pengguna cukup "maintenance untuk pemeriksaan, data aman, kabar berikutnya jam …".

Perubahan pada file source/config, akun, atau grant yang tidak bisa dijelaskan dicatat sebagai insiden keamanan. Maintenance tetap dan bukti diamankan. Laporkan ke pemilik dengan rekomendasi: rotasi `AUTH_SECRET`/`SERVICE_TOKEN`/password database serempak (termasuk `MYSQL_ROOT_PASSWORD` bila job migrate/tools ikut tercemar), sesuai `OPERATIONS.md` "Topologi dan rahasia". Rotasi baru dikerjakan setelah ada keputusan pemilik.
