# Backup, offsite, restore

Sumber: `docs/deployment/VPS-TQ-CMMS.md` §14, `docs/OPERATIONS.md` "Backup harian", "Restore", dan "Drawing Database: Backup/Restore". Target pilot: RPO harian, RTO 4 jam.

## Yang dibuat sidecar `backup`

`infra/mysql/backup.sh` membuat dump seluruh database (`plant_drawings` ikut bila ada) ke `backups/plant-<UTC>.sql.gz`. Dengan driver `fs` ia juga membuat `backups/drawings-files-<UTC>.tar.gz`. Retensi lokal 14 hari, setiap 86.400 detik sejak container start. File berisi hash password dan sesi, jadi bersifat rahasia (root, 0600).

## Backup sesuai permintaan

```bash
dc run --rm --no-deps -e RUN_ONCE=true backup
F=$(sudo ls -1t backups/plant-*.sql.gz | head -1); sudo gzip -t "$F" && sudo sha256sum "$F" && sudo stat -c '%s %y' "$F"
```

Backup selesai bila file baru lulus `gzip -t` dan checksum/ukuran tercatat di log.

## Offsite

Tujuan yang disepakati: OneDrive `backup-vps`, terenkripsi (`age` dengan recipient publik pemilik; private key **tidak** ada di VPS). Mekanisme konkretnya (timer, script, remote, fingerprint recipient) tercatat di `.deploy/HANDOVER-RESULT.md`, atau temukan dengan `systemctl list-timers --all | grep -i tq-cmms`. Pakai mekanisme itu apa adanya.

- Verifikasi: salinan remote terbaru cocok dengan nama/ukuran/checksum ciphertext lokal, dan umurnya ≤ 26 jam. Bila `HANDOVER-RESULT.md` tidak memuat perintah verifikasi remote, status offsite PENDING; minta pemilik melengkapinya.
- Mekanisme tidak ditemukan atau gagal → status `BACKUP_OFFSITE_PENDING`. Laporkan ke pemilik dan jangan klaim "backup lengkap". Membuat mekanisme baru butuh tujuan, credential, dan recipient dari pemilik.
- Arsip konfigurasi terenkripsi (`.env`, `infra/certs/`, `.deploy/`) ikut offsite setelah perubahan rahasia/sertifikat.

## Restore drill (target terpisah)

Ikuti `VPS-TQ-CMMS.md` §14 "Restore drill" persis: container `tq-cmms-restore-check` pada network `--internal` sendiri, `--memory 1280m`, tanpa port. Ada nama yang sudah dipakai → tinjau sisa drill lama, jangan timpa.

- RAM tersedia < ~1,5 GiB → jalankan saat maintenance dengan aplikasi project berhenti, atau minta host lain.
- Bandingkan jumlah: users, app_grants, coordinates, replacement_batches, installations, batch_cancellations, materials, inventory, stock_movements, stock_documents, drawings, drawing_files. Query `differences` (saldo vs ledger) harus 0.
- Bersihkan hanya resource drill: `sudo docker stop tq-cmms-restore-check; sudo docker network rm tq-cmms-restore-check; rm .deploy/restore.env`.
- Catat: file backup + checksum, durasi, jumlah per tabel, hasil `differences`.

## Pemulihan sebenarnya

Keputusan pemilik. Urutan (`OPERATIONS.md` "Restore" langkah 1–7):

1. Maintenance aktif.
2. Backup keadaan sekarang dulu bila MySQL masih hidup.
3. Restore ke MySQL kosong atau terpisah.
4. Verifikasi jumlah dan rekonsiliasi.
5. `DELETE FROM plant_auth.sessions` pada target.
6. Provision user runtime (`drawings:provision` dan seterusnya).
7. Ekstrak `drawings-files-*.tar.gz` dengan `chown 1000:1000`.
8. Migrasi bila image memerlukannya.
9. Start Auth → aplikasi → gateway.
10. Smoke test.

Database live yang berisi transaksi lebih baru dari backup tidak ditimpa. Transaksi sesudah titik backup harus direkonsiliasi pemilik.
