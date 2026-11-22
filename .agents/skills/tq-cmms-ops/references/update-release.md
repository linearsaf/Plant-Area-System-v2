# Update release dan rollback

Sumber: `docs/deployment/VPS-TQ-CMMS.md` §15, `docs/deployment/DEVELOPMENT-TO-VPS.md` §5–7. Rilis dengan migrasi khusus punya catatan sendiri (`R22-UPGRADE.md` + `OPENCLAW-R22-UPDATE.md`, `DRAWING-DATABASE-RELEASE.md`); baca yang relevan pada SHA target sebelum langkah 4.

Mandat lengkap = full SHA + ringkasan + migrasi/env + jendela maintenance (lihat gerbang di SKILL.md). Tanpa itu, kerjakan langkah 1–2 saja dan laporkan.

## Langkah

1. **Kunci release.** Simpan snapshot ke `.deploy/ops-log/evidence/<stamp>/` dan catat ke log: `OLD_SHA=$(git rev-parse HEAD)`, `OLD_TAG` dari `.env`, `sudo docker image ls 'plant-*' --format '{{.Repository}}:{{.Tag}} {{.ID}}'`. `git status --short` harus kosong; jika tidak, ikuti batas "Checkout" di SKILL.md. Selesai bila OLD_SHA, OLD_TAG, dan image ID keenam image lama tercatat.
2. **Verifikasi target (read-only).**
   - `git fetch origin && git merge-base --is-ancestor <SHA> origin/main` — gagal berarti bukan `main`: berhenti, minta merge.
   - CI untuk SHA persis itu: `curl -fsS https://api.github.com/repos/linearsaf/Plant-Area-System-v2/commits/<SHA>/check-runs | python3 -c 'import json,sys; [print(r["name"], r["status"], r["conclusion"]) for r in json.load(sys.stdin)["check_runs"]]'`. Semua `completed success`, atau berhenti. API gagal (rate limit, repo privat) → minta pemilik mengirim URL run CI untuk SHA itu; status checkpoint PENDING sampai terbukti.
   - Cakupan: `git diff --name-only $OLD_SHA <SHA>` — cari `packages/*/migrations/`, `scripts/*migration*`, `infra/nginx/`, `compose*.yaml`, `infra/deploy/`, `.env.example`. Diff ke **release aktif**, bukan ke main. Default build keenam image; build sebagian hanya bila diff terbatas pada `apps/<satu-app>/` tanpa `packages/`, `infra/`, atau lockfile.
   - Kapasitas: `df -h / /var/lib/docker`, `free -m`. Sasaran ≥ 8 GiB disk kosong dan ≥ 3 GiB RAM tersedia sebelum build; kurang → housekeeping berlingkup project dulu.
     Selesai bila daftar migrasi, perubahan env, perubahan gateway/Nginx host, dan image yang perlu dibuild tertulis di log.
3. **Maintenance + backup.** `sudo touch /var/lib/tq-cmms/maintenance`; `dc stop nginx portal bag-filter consumables drawings auth backup`; `dc run --rm --no-deps -e RUN_ONCE=true backup`. Verifikasi file terbaru: `sudo gzip -t` + `sudo sha256sum` (dan `drawings-files-*` bila ada). Jalankan mekanisme offsite yang tercatat di `HANDOVER-RESULT.md`, lalu verifikasi salinan remote; jika mekanisme belum ada → `BACKUP_OFFSITE_PENDING`, minta keputusan pemilik sebelum migrasi data.
4. **Checkout + tag.** `git checkout --detach <SHA>`; ubah hanya baris `RELEASE_TAG` (`sudo sed -i "s/^RELEASE_TAG=.*/RELEASE_TAG=${SHA:0:12}/" .env`). Variabel env baru dari catatan rilis ditambahkan tanpa menyentuh yang lain; nilai rahasia digenerate di VPS (`python3 -c 'import secrets;print(secrets.token_hex(32))'`) tanpa dicetak ke log. `dc config --quiet`.
5. **Build serial.** `for s in migrate auth portal bag-filter consumables drawings; do dc build "$s" || break; done` — periksa setiap hasil; satu gagal = berhenti (lihat Rollback). Daftar layanan mengikuti `infra/deploy/compose.vps.yaml` pada SHA target.
6. **Migrasi.** Jalankan job sesuai catatan rilis. Pola umum: `dc up --no-deps --force-recreate --exit-code-from migrate migrate` (jangan `start` container job lama). Rilis R22: `consumables:preflight` → `db:migrate` → `consumables:reconcile` via `dc run --rm --no-deps migrate ...`. Rilis tanpa file migrasi baru tetap menjalankan job ini sekali: idempoten, hanya memverifikasi katalog/koordinat. Exit ≠ 0 → maintenance tetap, simpan `dc logs --no-color migrate` ke evidence, buka [incident.md](incident.md#migrasi-gagal).
7. **Start terkontrol.** `dc up -d --no-deps --wait --wait-timeout 180 auth`, lalu `portal bag-filter consumables drawings`, lalu `nginx backup` (`--force-recreate nginx` bila template/include gateway berubah). `dc exec -T nginx nginx -t`. Perubahan `infra/deploy/nginx-host.https.conf`: `sudo install` ke `/etc/nginx/sites-available/tq-cmms.com` setelah backup file lama, `sudo nginx -t && sudo systemctl reload nginx`.
8. **Verifikasi backend sebelum membuka.** `curl --cacert infra/certs/tls.crt --resolve tq-cmms.com:18443:127.0.0.1 -sS -o /dev/null -w '%{http_code}\n' https://tq-cmms.com:18443/gateway-health` (204) dan `/auth/login` (200); `dc ps -a` semua healthy; health-check status bukan CRIT. Bila network dibuat ulang, generate ulang `.deploy/real-ip.conf` (runbook §9).
9. **Buka + QA publik.** `sudo rm -- /var/lib/tq-cmms/maintenance`. Dari VPS: `https://tq-cmms.com/gateway-health` 204, `/auth/login` 200, `/bag-filter/api/equipment` tanpa sesi 401 JSON. Login/SSO dan fitur yang berubah diuji pemilik dengan akunnya sendiri — catat sebagai `WAITING_OWNER_ACCEPTANCE` sampai ia konfirmasi. Periksa website lain tetap merespons.

Simpan image release lama sampai pemilik menerima release baru dan setidaknya satu backup harian sukses berikutnya.

## Rollback

Pilih berdasarkan apa yang sudah terjadi:

| Keadaan                                                         | Tindakan                                                                                                                                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gagal sebelum migrasi (build/checkout)                          | `git checkout --detach $OLD_SHA`, kembalikan `RELEASE_TAG=$OLD_TAG`, start ulang langkah 7 dengan image lama. Tidak ada perubahan data.                                              |
| Migrasi aditif sudah jalan, schema kompatibel dengan image lama | Sama seperti di atas; kolom/tabel baru dibiarkan. Periksa catatan rilis: Bag Filter `0003_batch_cancellations` setelah ada pembatalan dan R22 role-only **tidak** kompatibel mundur. |
| Schema/data tidak kompatibel                                    | Maintenance tetap. Backup keadaan sekarang, ajukan perbaikan maju atau restore ke target terpisah ([backup-restore.md](backup-restore.md)). Butuh keputusan pemilik.                 |
| Image lama sudah terhapus                                       | Rollback = build ulang `$OLD_SHA` serial; perkirakan durasinya ke pemilik.                                                                                                           |

Tanpa down migration, tanpa restore di atas database live, tanpa menghapus kolom/tabel baru.
