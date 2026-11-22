# Migrasi database dan impor data

Sumber: `docs/OPERATIONS.md` (bagian upgrade per rilis, Consumable Room, Drawing Database), `docs/deployment/DRAWING-DATABASE-RELEASE.md` §2, §5–6, `docs/deployment/R22-UPGRADE.md`. Image `plant-tools` berentrypoint `pnpm`, jadi argumen job adalah script `package.json` (`db:migrate`, `consumables:preflight`, `drawings:provision`, ...) atau `exec tsx scripts/<file>.ts`.

Semua pekerjaan di sini butuh perintah eksplisit pemilik, backup terverifikasi sesaat sebelumnya (lihat [backup-restore.md](backup-restore.md)), dan tidak ada DDL yang berjalan bersamaan dengan backup.

## Migrasi schema/data

- Migrasi berada di `packages/{auth,bag,consumables,drawings}-core/migrations/`; checkpoint data di tabel `data_migrations`. Keduanya dikelola migrator; isinya tidak diedit tangan.
- Jalankan: `dc up --no-deps --force-recreate --exit-code-from migrate migrate` atau `dc run --rm --no-deps migrate db:migrate`. Image tools harus dari SHA target (build dulu). Container job lama tidak di-`start`, karena bisa menjalankan seed lama.
- Database baru pada volume lama butuh provisioning sebelum migrasi (`init.sh` hanya berjalan pada volume kosong): `dc run --rm --no-deps migrate drawings:provision`, atau `exec tsx scripts/provision-consumables.ts`.
- Preflight read-only bila rilis menyediakannya (mis. `consumables:preflight`). Blocked = berhenti dan laporkan jumlahnya; data tidak digabung/dihapus untuk meloloskan.
- MySQL DDL ter-commit sebagian. Migrasi error → maintenance tetap, simpan log + `SELECT * FROM <db>.__drizzle_migrations` (hash/created_at saja) ke evidence, berhenti. Tanpa loop ulang, tanpa menandai selesai manual. Lanjut di [incident.md](incident.md#migrasi-gagal).
- Tidak ada down migration. Perubahan destruktif butuh pola tambah → pindah pemakaian → hapus di rilis terpisah.

## Impor master Consumables (instalasi tanpa restore saja)

File privat ditaruh di `/srv/tq-cmms-private/` (root, 0600), checksum dicatat, isinya tidak dicetak.

```bash
F=/srv/tq-cmms-private/catalog.json; sudo sha256sum "$F"
dc run --rm --no-deps --volume "$F":/imports/catalog.json:ro migrate exec tsx scripts/import-consumables.ts /imports/catalog.json --dry-run
# apply hanya setelah dry-run valid DAN pemilik mengonfirmasi file sumber
dc run --rm --no-deps --volume "$F":/imports/catalog.json:ro migrate exec tsx scripts/import-consumables.ts /imports/catalog.json --apply
dc run --rm --no-deps migrate exec tsx scripts/reconcile-consumables.ts
```

Database hasil restore sudah membawa master/saldo; impor ulang tidak dilakukan.

## Drawing Database: rekonsiliasi, storage, impor legacy

- Rekonsiliasi read-only: `dc --profile ops run --rm drawings-ops drawings:reconcile --hash`. `missing`, `sizeMismatch`, `hashMismatch` harus kosong; exit 1 = insiden data, laporkan.
- Pindah `fs` → `s3` (DRAWING-DATABASE-RELEASE §5): isi `DRAWINGS_S3_*` dengan driver masih `fs` → `drawings:storage-copy --dry-run` → `drawings:storage-copy` → ubah `DRAWINGS_STORAGE_DRIVER=s3` → `dc up -d --no-deps drawings` → reconcile bersih. `dc.sh` otomatis menambah `compose.drawings-s3.yaml` setelah driver `s3`; untuk copy sebelum switch tambahkan `-f infra/deploy/compose.drawings-s3.yaml` sendiri. Volume `drawings-files` dipertahankan sebagai cadangan.
- Impor legacy (§6): hanya setelah driver `s3` aktif dan reconcile bersih. Folder impor di `/srv/legacy-import` (di luar repo). Dry-run dulu → `--limit 100` → penuh, di luar jam kerja; `import-report.csv` kolom `failed` harus kosong, lalu reconcile. Uploader ID diberikan pemilik.

## Bukti untuk laporan

Exit code setiap job, nama migrasi/checkpoint yang diterapkan, jumlah baris kunci sebelum/sesudah (users, coordinates, replacement_batches, materials, stock_movements, drawings), hasil reconcile. Tanpa isi baris atau email.
