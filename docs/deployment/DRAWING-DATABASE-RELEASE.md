# Runbook rilis Drawing Database v1

Untuk operator yang memperbarui deployment TQ-CMMS yang sudah berjalan (Portal, Auth, Bag Filter, Consumable Room) agar memuat Drawing Database pada `/drawings`. Persyaratan: [PRD](../DRAWING-DATABASE-PRD.md), [operasional](../OPERATIONS.md#drawing-database-instalasi-upgrade-dan-operasi). Pada VPS gunakan fungsi `dc` dan override produksi sesuai [runbook VPS](VPS-TQ-CMMS.md); contoh di bawah menulis `docker compose` biasa.

Rilis hanya dari SHA yang lolos CI. Jangan memakai `down -v`, script reset uji, atau data perusahaan di luar server tujuan.

## 1. Persiapan (tanpa downtime)

1. Pastikan versi Compose ≥ 2.24.4 dan ruang disk cukup untuk image baru, backup, dan volume file (perkiraan: ukuran PDF rata-rata × jumlah drawing × 2 untuk file kerja dan file issued).
2. Tambahkan ke `.env` (nilai acak URL-safe 24–128 karakter untuk password):

   ```dotenv
   DRAWINGS_DB_PASSWORD=<random hex 64>
   DRAWINGS_STORAGE_DRIVER=fs
   DRAWINGS_MAX_PDF_MB=25
   ```

   Driver `s3` hanya setelah penyedia object storage diputuskan (PRD Q1): isi `DRAWINGS_S3_ENDPOINT`, `DRAWINGS_S3_REGION`, `DRAWINGS_S3_BUCKET`, `DRAWINGS_S3_ACCESS_KEY_ID`, `DRAWINGS_S3_SECRET_ACCESS_KEY`, `DRAWINGS_S3_FORCE_PATH_STYLE`, dan tambahkan `-f infra/deploy/compose.drawings-s3.yaml`. Bucket privat, versioning aktif, tanpa ACL publik.

3. Perbarui Nginx host (`infra/deploy/nginx-host.https.conf`): lokasi `= /drawings/api/uploads` dengan `client_max_body_size 30m`. Uji dengan `sudo nginx -t` lalu `sudo systemctl reload nginx`. Perubahan ini tidak memengaruhi aplikasi lain.
4. Build image baru dari SHA yang lolos CI:

   ```sh
   docker compose build migrate auth portal bag-filter consumables drawings
   ```

   Seluruh image dibangun ulang karena paket bersama (`contracts`, `auth-core`, `server`, `ui`) berubah secara aditif.

## 2. Jendela rilis

```sh
# 2.1 Backup awal (database lama; plant_drawings belum ada dan dilewati otomatis)
docker compose run --rm -e RUN_ONCE=true backup

# 2.2 Hentikan penulis
docker compose stop nginx portal bag-filter consumables auth

# 2.3 Provisioning database dan user plant_drawings pada volume MySQL yang sudah ada
docker compose run --rm --no-deps migrate drawings:provision

# 2.4 Migrasi aditif (plant_drawings 0000–0004) dan data migration Auth drawings-v1
docker compose up --no-deps --force-recreate --exit-code-from migrate migrate

# 2.5 Jalankan layanan, termasuk drawings
docker compose up -d --wait auth portal bag-filter consumables drawings
docker compose up -d --no-deps --force-recreate nginx backup
docker compose exec nginx nginx -t
```

Hentikan urutan bila langkah 2.3 atau 2.4 gagal; jalankan rollback (§4). `init.sh` MySQL hanya berjalan pada volume kosong, sehingga langkah 2.3 wajib pada deployment lama. Nginx gateway perlu dibuat ulang karena template, include `plant-drawings-headers.conf`, dan dependensi layanan berubah.

Migrasi `drawings-v1` mengaktifkan katalog `drawings`, mengisi path, dan memberi role **Admin** kepada akun bootstrap aktif sekali. Pengguna lain diatur admin portal lewat **Kelola akses → Akses Drawing Database**. Status admin portal tidak otomatis memberi hak.

## 3. Smoke test setelah rilis

1. `docker compose ps`: `drawings` healthy; `nginx` berjalan.
2. Login sebagai akun bootstrap; Portal menampilkan kartu Drawing Database dengan angka nol.
3. `/drawings` menampilkan Ringkasan; menu sesuai role Admin.
4. Pengelolaan: Discipline awal (Mechanical, Piping, Structural, Electrical, Instrumentation, Civil) tampil.
5. Upload Old Drawing satu PDF uji yang boleh disimpan; buka di viewer, download dan print. Konsol browser tanpa pelanggaran CSP.
6. Pengguna tanpa grant: `/drawings` → 403; tanpa login → halaman login.
7. Bag Filter dan Consumable Room tetap terbuka seperti sebelumnya.
8. `docker compose --profile ops run --rm drawings-ops drawings:reconcile --hash` → `missing`, `sizeMismatch`, `hashMismatch` kosong.
9. Backup berikutnya (`RUN_ONCE=true`) mencatat `plant_drawings` dan membuat arsip `drawings-files-*.tar.gz` bila volume berisi file.

Catat hasil, SHA, dan waktu pada log rilis.

## 4. Rollback

- **Gagal sebelum 2.5:** jalankan image lama untuk layanan yang ada. Database `plant_drawings` dan user baru boleh dibiarkan; tidak dipakai versi lama. Katalog Auth: bila `drawings-v1` sudah berjalan, nonaktifkan aplikasi lewat **Kelola akses → Katalog aplikasi** atau biarkan; versi lama tidak membaca grant `drawings`.
- **Gagal setelah 2.5:** nonaktifkan Drawing Database di Katalog aplikasi (akses semua pengguna tertutup, grant tetap), lalu kembalikan image/tag lama dan template Nginx lama. Jangan menghapus database, volume `drawings-files`, atau backup.
- Migrasi Drawing Database bersifat aditif terhadap database lain; `0002` hanya menghapus struktur Area milik `plant_drawings` sebelum ada data produksi.

## 5. Pindah driver `fs` → `s3` (setelah go-live)

1. Siapkan bucket privat dengan versioning dan retensi; buka egress hanya ke alamat penyedia (firewall host).
2. Isi variabel `DRAWINGS_S3_*` di `.env`, biarkan `DRAWINGS_STORAGE_DRIVER=fs`.
3. Salin dan verifikasi (dapat diulang; objek yang sudah sama dilewati):

   ```sh
   docker compose -f compose.yaml -f infra/deploy/compose.drawings-s3.yaml --profile ops run --rm drawings-ops drawings:storage-copy --dry-run
   docker compose -f compose.yaml -f infra/deploy/compose.drawings-s3.yaml --profile ops run --rm drawings-ops drawings:storage-copy
   ```

4. Ubah `DRAWINGS_STORAGE_DRIVER=s3`, lalu `docker compose -f compose.yaml -f infra/deploy/compose.drawings-s3.yaml up -d --no-deps drawings`.
5. `drawings:reconcile --hash` dengan driver `s3` harus bersih. Volume `drawings-files` dipertahankan sebagai cadangan sampai backup bucket terbukti.
