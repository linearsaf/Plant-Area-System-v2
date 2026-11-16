# Drawing Database v1 — PRD dan prompt implementasi

Disusun 14 November 2026 untuk TQ-CMMS (Plant Area System v2). Status: diimplementasikan pada branch `feat/drawing-database` (Fase 1–6, November 2026); hasil aktual di [VALIDATION](VALIDATION.md). Area dihapus atas keputusan pemilik 15 November 2026. Drawing Database menjadi aplikasi operasional kelima pada `/drawings`, memakai SSO, grant, UI dan pola operasional yang sama dengan Bag Filter dan Consumable Room.

Sumber penyusunan:

- **Platform:** repo ini pada commit `957aa0d` (`apps/`, `packages/`, `infra/`, `scripts/`, `docs/`).
- **Referensi alur kerja:** repo terpisah DrafTerra (`C:\Users\a_sfn\@Project\Drawing-Management`, commit `1dabb0d`). Yang diambil hanya logic, alur kerja dan role. Teknologi, tampilan, autentikasi, brand dan pengelolaan user DrafTerra tidak dibawa.
- **Dokumentasi library:** diperiksa lewat Context7. Daftar ID ada di bagian akhir.

Versi terstruktur dokumen ini: [drawing-database-brief.jsonc](design/drawing-database-brief.jsonc). Bila keduanya berbeda, dokumen ini yang berlaku. Bagian 15 adalah prompt yang diserahkan ke developer atau coding agent.

## 1. Keputusan yang sudah dikunci

| #   | Keputusan                                                                                                                                                                                           | Asal                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| K1  | Login, sesi, akun, reset password dan grant tetap dikelola Auth/Portal TQ-CMMS. Drawing Database tidak mempunyai tabel user, halaman login, Request Access atau User Management sendiri.            | Instruksi pemilik                         |
| K2  | UI melebur dengan TQ-CMMS: `@plant/ui`, token, shell, tema dan pola halaman yang sama. Tidak ada Tailwind, palet atau brand DrafTerra.                                                              | Instruksi pemilik                         |
| K3  | Teknologi mengikuti platform: Next.js 16.4.2 App Router, React 19.3.1, Drizzle ORM 0.45.4, MySQL 8.4, zod 4.5.4, Node 26.12.1, pnpm 12.14.0.                                                        | Instruksi pemilik                         |
| K4  | File disimpan di object storage eksternal S3-compatible. Layanannya belum disiapkan, sehingga implementasi memakai abstraksi storage dengan driver `s3` (target) dan `fs` (development, sementara). | Jawaban pemilik, 14 Nov 2026              |
| K5  | Data mulai kosong. Tidak ada migrasi dari database DrafTerra. Drawing lama masuk lewat Upload Old Drawing.                                                                                          | Jawaban pemilik                           |
| K6  | Bukti approval berupa stamp di halaman 1, dibuat satu kali saat revisi Completed dari data approval. File asli tidak diubah. Approver tidak dapat mematikan stamp.                                  | Jawaban pemilik                           |
| K7  | Final Drawing tetap dapat dibuka selama revisi berikutnya diproses.                                                                                                                                 | Jawaban pemilik                           |
| K8  | Maker-checker: pembuat drawing tidak dapat melakukan Check atau Approval atas drawing sendiri, termasuk Admin.                                                                                      | Jawaban pemilik                           |
| K9  | Void dengan alasan menggantikan hapus permanen. Data, file dan audit tidak dihapus.                                                                                                                 | Jawaban pemilik                           |
| K10 | Discipline berupa master yang dikelola admin, bukan teks bebas. Area tidak dipakai; lokasi cukup diwakili HAC/SAC.                                                                                  | Jawaban pemilik; Area dihapus 15 Nov 2026 |
| K11 | PDF viewer dibangun in-page dengan komponen viewer PDF.js (`pdfjs-dist`), bukan iframe.                                                                                                             | Instruksi pemilik + temuan §12            |

## 2. Lingkup

**Termasuk rilis v1:** Drawing Library (cari, filter, detail), Create Drawing, edit draft, Submit to Check, Check, approval plan per revisi, Approval L1, Final Approval, reject dengan catatan dan lampiran gambar, revisi baru dari Final Drawing, Upload Old Drawing (Legacy Ready), Drawing Request (intake → review → assignment → draft), Tugas saya, notifikasi in-app, ringkasan/dashboard, kartu Portal, PDF viewer, print dan download Final Drawing, audit, master Discipline, void dan pembatalan revisi.

**Tidak termasuk:**

- Autentikasi, Request Access publik, reset password, account settings/avatar dan User Management. Semua sudah ditangani Auth/Portal (K1).
- Notifikasi email. Platform tidak memakai SMTP dan jaringan container tidak mempunyai akses keluar.
- Anotasi PDF, pembanding visual antar revisi, tanda tangan digital legal, integrasi SAP/DMS, aplikasi mobile native. Semuanya juga di luar lingkup referensi.
- Migrasi data DrafTerra (K5) dan thumbnail PDF sisi server.

## 3. Peran dan izin

Grant berbentuk `{ appId: "drawings", role }`, satu role per pengguna, diatur admin portal melalui **Kelola akses**. Status admin portal dan jabatan tidak otomatis memberi hak. Tidak ada scope equipment atau lokasi.

| Label        | Role API   | Padanan DrafTerra | Ringkasan hak                                                                 |
| ------------ | ---------- | ----------------- | ----------------------------------------------------------------------------- |
| Viewer       | `viewer`   | CONSUMER          | Membaca, print dan download Final Drawing; membuat Drawing Request            |
| Drafter      | `drafter`  | DRAFTER           | Membuat drawing, mengedit dan submit draft miliknya, menjawab assignment      |
| Draft Leader | `leader`   | DRAFT_LEADER      | Check, menyusun approval plan, review request, Upload Old Drawing             |
| Approver L1  | `approver` | APPROVER_L1       | Approval level 1 untuk revisi yang ditugaskan; membuat Drawing Request        |
| Head         | `head`     | HEAD              | Final Approval untuk revisi yang ditugaskan; membuat Drawing Request          |
| Admin        | `admin`    | ADMIN             | Seluruh hak operasional, void, master, audit; tetap tunduk pada maker-checker |

### Matriks izin

| Aksi                                                  | viewer | drafter                   | leader | approver | head     | admin    |
| ----------------------------------------------------- | ------ | ------------------------- | ------ | -------- | -------- | -------- |
| Lihat, print, download Final Drawing                  | Ya     | Ya                        | Ya     | Ya       | Ya       | Ya       |
| Lihat drawing yang belum final                        | Tidak  | Milik sendiri             | Ya     | Ya       | Ya       | Ya       |
| Buat Drawing Request                                  | Ya     | Tidak                     | Tidak  | Ya       | Ya       | Ya       |
| Review request (assign atau reject)                   | Tidak  | Tidak                     | Ya     | Tidak    | Tidak    | Ya       |
| Terima/tolak assignment request                       | Tidak  | Ditugaskan                | Tidak  | Tidak    | Tidak    | Tidak    |
| Create Drawing, edit draft, Submit to Check           | Tidak  | Milik sendiri             | Tidak  | Tidak    | Tidak    | Ya       |
| Buat revisi baru dari Final Drawing                   | Tidak  | Owner                     | Tidak  | Tidak    | Tidak    | Ya       |
| Batalkan revisi yang belum final                      | Tidak  | Owner                     | Tidak  | Tidak    | Tidak    | Ya       |
| Check dan menyusun approval plan                      | Tidak  | Tidak                     | Ya     | Tidak    | Tidak    | Ya       |
| Ganti approver saat menunggu approval                 | Tidak  | Tidak                     | Ya     | Tidak    | Tidak    | Ya       |
| Approval L1                                           | Tidak  | Tidak                     | Tidak  | Assignee | Tidak    | Assignee |
| Final Approval                                        | Tidak  | Tidak                     | Tidak  | Tidak    | Assignee | Assignee |
| Upload Old Drawing                                    | Tidak  | Tidak                     | Ya     | Tidak    | Tidak    | Ya       |
| Alihkan owner drawing                                 | Tidak  | Tidak                     | Ya     | Tidak    | Tidak    | Ya       |
| Void drawing                                          | Tidak  | Draft belum pernah submit | Tidak  | Tidak    | Tidak    | Ya       |
| Koreksi metadata setelah rilis pertama, master, audit | Tidak  | Tidak                     | Tidak  | Tidak    | Tidak    | Ya       |

Aturan tambahan:

- **Assignee wajib.** Approval L1 dan Final Approval hanya dapat diputus oleh pengguna yang ditugaskan pada revisi itu. Admin tidak dapat melewati routing; ia harus menjadi assignee.
- **Maker-checker (K8).** Untuk satu revisi, pengguna yang menjadi owner drawing, pembuat revisi, atau pengirim (submitter) pada siklus berjalan tidak dapat memutus Check, Approval L1 maupun Final Approval. Server menolak dengan 403 `MAKER_CHECKER`, dan pengguna tersebut tidak dapat dipilih sebagai approver. Berlaku juga bagi Admin.
- **Owner.** Owner adalah "Drawn by", pemilik drawing secara bisnis. Hak edit, submit, revisi baru dan pembatalan revisi mengikuti owner, bukan pengunggah.
- **Viewer** hanya melihat revisi final yang sedang berlaku. Revisi obsolete dan revisi dalam proses tidak dapat dibuka Viewer, termasuk lewat URL langsung.
- Izin diperiksa di server pada setiap request memakai identitas dari Auth. Kontrol yang disembunyikan di UI bukan batas keamanan.

## 4. Alur kerja

Alur utama mengikuti referensi:

- `Drawing Request → review Draft Leader → Drafter menerima → Draft → Check → Approval → Final Drawing`
- `Create Drawing → Submit to Check → Check → Approval L1 → (Final Approval) → Final Drawing`
- `Upload Old Drawing → Final Drawing (Legacy Ready)`

### 4.1 Status revisi

| Status API            | Label UI                | Dapat diedit |
| --------------------- | ----------------------- | ------------ |
| `draft`               | Draft                   | Ya           |
| `waiting_check`       | Waiting Check           | Tidak        |
| `check_rejected`      | Check Rejected          | Ya           |
| `waiting_approval_1`  | Waiting Approval L1     | Tidak        |
| `approval_1_rejected` | Approval L1 Rejected    | Ya           |
| `waiting_approval_2`  | Waiting Final Approval  | Tidak        |
| `approval_2_rejected` | Final Approval Rejected | Ya           |
| `completed`           | Completed               | Tidak        |
| `obsolete`            | Obsolete                | Tidak        |
| `cancelled`           | Cancelled               | Tidak        |

| Dari                          | Aksi                                  | Pelaku                      | Ke                    |
| ----------------------------- | ------------------------------------- | --------------------------- | --------------------- |
| (baru)                        | Create Drawing, Save Draft            | drafter, admin              | `draft`               |
| `draft`, tiga status rejected | Submit to Check                       | owner, admin                | `waiting_check`       |
| `waiting_check`               | Check disetujui + approval plan       | leader, admin (bukan maker) | `waiting_approval_1`  |
| `waiting_check`               | Check ditolak                         | leader, admin (bukan maker) | `check_rejected`      |
| `waiting_approval_1`          | Approve, revisi mempunyai assignee L2 | assignee L1                 | `waiting_approval_2`  |
| `waiting_approval_1`          | Approve, tanpa assignee L2            | assignee L1                 | `completed`           |
| `waiting_approval_1`          | Reject                                | assignee L1                 | `approval_1_rejected` |
| `waiting_approval_2`          | Approve                               | assignee L2                 | `completed`           |
| `waiting_approval_2`          | Reject                                | assignee L2                 | `approval_2_rejected` |
| `completed`                   | Revisi berikutnya menjadi Completed   | sistem                      | `obsolete`            |
| `draft`, tiga status rejected | Batalkan revisi (alasan wajib)        | owner, admin                | `cancelled`           |
| (baru)                        | Upload Old Drawing                    | leader, admin               | `completed`           |

Transisi lain ditolak 409 `INVALID_TRANSITION`. Tabel transisi diimplementasikan sebagai fungsi murni di `@plant/contracts` dan diuji unit.

### 4.2 Check dan approval plan

- Check adalah level 0. Saat menyetujui Check, Draft Leader wajib memilih **Approver L1** dan boleh memilih **Head** untuk Final Approval. Tanpa assignee L2, persetujuan L1 langsung menghasilkan Completed.
- Kandidat L1 adalah pengguna aktif dengan role `approver` atau `admin`; kandidat L2 `head` atau `admin`. Kandidat yang terkena maker-checker tidak ditawarkan.
- Draft Leader atau Admin dapat mengganti approver selama revisi menunggu approval. L1 tidak dapat diganti setelah L1 diputus; L2 tidak dapat diganti setelah L2 diputus dan tidak dapat dikosongkan ketika revisi sedang menunggu Final Approval.
- Bila assignee dinonaktifkan atau kehilangan role, langkah tersebut diberi tanda **Approver tidak aktif** bagi Draft Leader/Admin dan masuk daftar tugas mereka untuk diganti.
- Semua reject wajib menyertakan catatan (1–1000 karakter) dan boleh melampirkan maksimal 3 gambar. Reject selalu mengembalikan revisi ke owner.

### 4.3 Reject, perbaikan dan siklus

Setiap Submit menaikkan nomor **siklus** revisi. Keputusan Check/Approval dicatat per siklus bersama ID file yang ditinjau. Setelah reject, owner memperbaiki (boleh mengganti file), lalu Submit lagi; proses kembali dari Check. Stamp dan riwayat "keputusan berlaku" memakai siklus terakhir yang berhasil; keputusan siklus sebelumnya tetap tampil sebagai riwayat.

### 4.4 Revisi baru dan Final Drawing (K7)

- Drawing menyimpan dua penunjuk: `releasedRevisionId` (Final Drawing yang berlaku) dan `currentRevisionId` (revisi yang sedang dikerjakan).
- Membuat revisi baru dari drawing Completed menghasilkan revisi `draft` dengan nomor usulan berikutnya (angka +1, huruf berikutnya, atau sufiks `-1`). Final Drawing lama tetap berlaku dan tetap dapat dibuka, dicetak dan diunduh semua role.
- Ketika revisi baru menjadi Completed, penunjuk rilis berpindah dan revisi sebelumnya menjadi `obsolete` dalam transaksi yang sama.
- Selama revisi baru diproses, halaman detail menampilkan catatan netral **Revisi berikutnya sedang diproses**. Viewer melihat catatan itu tanpa rincian.
- Hanya satu revisi yang boleh aktif dikerjakan per drawing.
- Setelah rilis pertama, metadata drawing (nomor, nama, HAC/SAC, discipline, deskripsi) hanya dapat dikoreksi Admin dengan alasan, karena metadata itu juga tampil pada Final Drawing yang berlaku. Owner mengubah data revisi: nomor revisi, change note dan file.

### 4.5 Upload Old Drawing (Legacy Ready)

Draft Leader atau Admin mengisi nomor, nama, HAC/SAC, discipline, nomor revisi, **Drawn by**, **Legacy Ready Note** (wajib) dan file PDF. Drawn by harus pengguna aktif ber-role `drafter`, atau pengunggah sendiri. Drawing langsung `completed` dengan sumber `legacy`, tanpa approval digital, approval plan maupun stamp, dan diberi badge **Legacy Ready**. Pengunggah tercatat sebagai **Uploaded by**. Revisi berikutnya masuk alur normal.

**Impor arsip massal.** Arsip lama dalam jumlah besar diimpor operator lewat `pnpm drawings:import-legacy` dari manifest di luar repositori. Setiap baris melewati aturan yang sama dengan form ini (validasi isian dan PDF, storage, audit, badge Legacy Ready). Karena pembuat aslinya bukan pengguna sistem, **Drawn by** dicatat sebagai nama dari manifest dan pengunggah tetap menjadi owner; pengecualian ini hanya tersedia bagi skrip impor, tidak lewat API. Langkah operasinya ada di runbook rilis §6.

### 4.6 Drawing Request

| Status                       | Arti                                                           |
| ---------------------------- | -------------------------------------------------------------- |
| `pending_review`             | Menunggu review Draft Leader                                   |
| `review_rejected`            | Ditolak Draft Leader, selesai                                  |
| `waiting_drafter_acceptance` | Ditugaskan, menunggu jawaban Drafter                           |
| `drafter_rejected`           | Ditolak Drafter, kembali ke antrean Draft Leader               |
| `in_progress`                | Diterima; draft drawing sudah dibuat dan sedang dikerjakan     |
| `closed`                     | Selesai: drawing terbit, dibatalkan pemohon, atau drawing void |

1. Viewer, Approver, Head atau Admin mengisi HAC/SAC, Description, Keperluan, dan maksimal 3 gambar referensi. Nomor `DRQ-YYYY-NNNNNN` dibuat server (tahun WIB, sekuens per tahun).
2. Draft Leader (atau Admin) menolak dengan alasan wajib, atau menyetujui dan menugaskan ke satu Drafter aktif.
3. Drafter yang ditugaskan menerima, atau menolak dengan alasan wajib. Penolakan mengembalikan request ke Draft Leader untuk ditugaskan ulang atau ditolak.
4. Saat diterima, sistem membuat drawing `draft` milik Drafter tersebut dengan HAC/SAC dan deskripsi dari request. Nomor drawing, nama, discipline dan file masih kosong dan wajib dilengkapi sebelum Submit. Request menjadi `in_progress`.
5. Request menjadi `closed` ketika revisi pertama drawing itu Completed. Pemohon mendapat notifikasi dengan tautan Final Drawing. Bila drawing di-void, request ditutup dengan alasannya.
6. Pemohon dapat membatalkan request miliknya selama masih `pending_review`.

Pemohon melihat request miliknya; Drafter melihat request yang ditugaskan kepadanya; Draft Leader dan Admin melihat semuanya.

### 4.7 Void dan pembatalan revisi (K9)

- **Void drawing:** Admin, alasan 1–500 karakter. Owner boleh membuang drawing miliknya yang belum pernah di-submit. Drawing void hilang dari Library dan pencarian, kecuali filter **Dibatalkan** milik Admin. Seluruh revisi, file, keputusan dan audit tetap tersimpan. Nomor drawing dapat dipakai lagi. Tidak ada pengaktifan kembali.
- **Batalkan revisi:** untuk revisi lanjutan berstatus draft/rejected pada drawing yang sudah punya Final Drawing. Revisi menjadi `cancelled`; drawing kembali hanya menunjuk Final Drawing yang berlaku.
- Tidak ada endpoint hapus untuk drawing, revisi, keputusan atau audit.

### 4.8 Tugas dan notifikasi

- **Tugas saya** dihitung dari keadaan data saat dibuka, sehingga tidak pernah basi: draft dan revisi rejected milik Drafter (urutan: Final Approval Rejected, Approval L1 Rejected, Check Rejected, Draft), assignment request Drafter, antrean Waiting Check dan request untuk Draft Leader, approval yang ditugaskan bagi Approver/Head, serta approver tidak aktif bagi Draft Leader/Admin.
- **Notifikasi** adalah catatan kejadian per penerima: revisi ditolak (ke owner), drawing Completed (ke owner), ditugaskan sebagai approver, request ditugaskan (ke Drafter), request ditolak/diterima/selesai (ke pemohon). Setiap kejadian memiliki `source_key` unik agar retry tidak menggandakan. Status dibaca disimpan di server.
- Lonceng aktivitas pada shell memuat `/drawings/api/activity`, sama seperti aplikasi lain. Sidebar menampilkan jumlah tugas pada menu **Tugas saya**.

## 5. Data dan aturan bisnis

| Field           | Aturan                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drawing Number  | 1–100 karakter, unik di antara drawing yang tidak void. Boleh kosong hanya pada draft hasil request.                                                                      |
| Drawing Name    | 1–255 karakter                                                                                                                                                            |
| HAC/SAC         | Wajib, 1–40 karakter, di-trim, kapital, prefiks `TQ.` dibuang (`normalizeHec`). Saran dari nilai yang sudah ada.                                                          |
| HAC/SAC lain    | Opsional, maksimal 60 nilai dengan aturan yang sama, untuk drawing yang dipakai di lebih dari satu equipment. Duplikat dan HAC utama dibuang. Ikut dicari dan disarankan. |
| Discipline      | Wajib saat Submit, dari master Discipline                                                                                                                                 |
| Description     | Opsional, maksimal 2000 karakter                                                                                                                                          |
| Revision Number | 1–20 karakter `[A-Za-z0-9.-]`, default `0`, unik per drawing di antara revisi yang tidak cancelled                                                                        |
| Change Note     | Opsional, maksimal 1000 karakter                                                                                                                                          |
| File            | Satu PDF per revisi. Wajib saat Submit dan Upload Old Drawing.                                                                                                            |

Aturan yang dikunci:

1. Revisi baru selalu baris baru; revisi Completed tidak pernah diubah.
2. Approval plan disusun per revisi: L1 wajib, L2 opsional.
3. Reject wajib bercatatan dan selalu kembali ke owner.
4. Legacy import tidak membuat keputusan approval maupun approval plan.
5. Master yang dinonaktifkan tetap tampil pada drawing lama, tetapi tidak dapat dipilih untuk data baru. Discipline diberi nilai awal Mechanical, Piping, Structural, Electrical, Instrumentation, Civil.
6. Actor dan waktu ditentukan server. Waktu disimpan UTC dan ditampilkan WIB. Nama actor disimpan sebagai snapshot; tidak ada foreign key lintas database.
7. Setiap perubahan dicatat pada audit dalam transaksi yang sama.

**Konkurensi dan idempotensi.** Drawing adalah akar agregat dengan kolom `version`. Setiap mutasi mengunci baris drawing, memeriksa `expectedVersion`, lalu menaikkan versi; versi usang menghasilkan 409 `VERSION_CONFLICT`. Request mempunyai versi sendiri. POST yang membuat data atau memindahkan status wajib membawa `Idempotency-Key` (8–128 karakter `[A-Za-z0-9._:-]`), unik per actor: payload sama mengembalikan hasil semula, payload berbeda 409. Izin diperiksa sebelum replay.

## 6. File, storage dan stamp

### 6.1 Upload dua tahap

Body JSON platform dibatasi 128 KB, sehingga file tidak dikirim bersama data.

1. `POST /drawings/api/uploads?kind=pdf|image` dengan body biner, `Content-Type` sesuai file, `Content-Length`, dan `X-File-Name` (percent-encoded). Server mengalirkan body ke file sementara sambil menghitung ukuran dan SHA-256, memvalidasi, menyimpan ke storage, lalu mengembalikan `{ fileId, name, size, sha256, pageCount }` dengan status `staged`.
2. Mutasi JSON (buat/edit drawing, request, keputusan reject) merujuk `fileId`. Server memastikan file masih `staged`, milik actor, dan jenisnya sesuai, lalu menandainya `attached`.

Validasi PDF: tipe dan magic bytes `%PDF-`, ukuran maksimal `DRAWINGS_MAX_PDF_MB` (default 25), dapat di-parse, minimal 1 halaman, tidak terenkripsi atau berpassword, dan lolos **uji stamp** (stamp dicoba di memori lalu dibuang) supaya kegagalan stamp tidak baru muncul saat Final Approval. Gambar: JPEG, PNG atau WebP berdasarkan magic bytes, maksimal 5 MB, maksimal 3 per request atau keputusan. SVG ditolak.

File `staged` yang tidak dipakai dalam 24 jam dan file draft yang diganti sebelum pernah di-submit dibersihkan. File yang pernah di-submit disimpan permanen.

### 6.2 Storage (K4)

Satu antarmuka (`put`, `get` dengan rentang byte, `head`, `delete`) dengan dua driver:

- **`s3`** — target produksi. `@aws-sdk/client-s3` dengan `endpoint`, `region`, `forcePathStyle`, dan `requestChecksumCalculation`/`responseChecksumValidation` bernilai `WHEN_REQUIRED` agar kompatibel dengan penyedia non-AWS. Bucket privat, tanpa ACL publik, tanpa presigned URL ke browser.
- **`fs`** — development, CI, dan sementara sampai bucket siap. Volume Docker `drawings-files` di `/data/drawings`, di luar folder `public`.

Key dibuat server (`files/<tahun>/<fileId>.pdf`), tidak pernah ditimpa, dan tidak memuat input pengguna. Database menyimpan key, nama asli, MIME, ukuran, SHA-256 dan jumlah halaman.

Konsekuensi yang harus disiapkan:

- Jaringan `private` pada Compose bersifat `internal`, tanpa akses keluar. Driver `s3` membutuhkan jaringan tambahan `egress` yang hanya dipasang pada layanan `drawings`, tanpa port terbuka. Akses keluar container itu sebaiknya dibatasi firewall host ke alamat penyedia.
- Perpindahan `fs → s3` memakai `pnpm drawings:storage-copy` yang menyalin setiap objek, memverifikasi SHA-256, dan dapat diulang. Setelah lolos, ubah environment dan restart.
- `pnpm drawings:reconcile` membandingkan tabel file dengan isi storage (keberadaan, ukuran, opsional hash) secara read-only.

### 6.3 Penyajian file

`GET /drawings/api/revisions/:id/file` memeriksa izin, memilih file (issued untuk Completed/Obsolete, file kerja untuk status lain), lalu mengalirkannya dari storage tanpa memuat seluruh file ke memori.

- Mendukung `Range: bytes=a-b` → 206 dengan `Content-Range`; rentang tidak valid 416. Header: `Accept-Ranges: bytes`, `Content-Length`, `ETag` dari SHA-256, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, tanpa `Content-Encoding`.
- `disposition=inline|attachment` dan `intent=view|print|download`. Nama unduhan `<DrawingNumber>_Rev-<n>.pdf`.
- Download dan print hanya untuk revisi Completed. Setiap klik dicatat pada audit (`file.downloaded`, `file.printed`). Permintaan rentang dari viewer (`intent=view`) tidak dicatat.
- Gambar lampiran disajikan lewat `GET /drawings/api/attachments/:id` dengan pemeriksaan izin terhadap induknya.

### 6.4 Stamp approval (K6)

Saat revisi sumber `standard` menjadi Completed, sistem membuat file **issued**: salinan file asli dengan blok stamp di kiri-bawah halaman 1. Geometri dipindahkan dari `src/server/storage/pdf-signature.ts` referensi: tinggi 60 pt, lebar 128–168 pt, margin 24 pt, jarak 10 pt, satu slot per level (Check, Approval L1, Final Approval bila dipakai), mengikuti rotasi halaman 0/90/180/270. Isi tiap slot: judul level, nama, role, dan waktu keputusan dalam WIB.

- Sumber data adalah keputusan siklus terakhir. Catatan keputusan tidak dicetak pada stamp.
- Zona waktu dihitung eksplisit sebagai Asia/Jakarta, tidak memakai zona waktu container.
- Font standar PDF hanya mendukung WinAnsi; karakter di luar itu pada nama diganti agar stamp tidak gagal.
- Urutan aman: validasi izin → buat file issued di storage → transaksi (kunci, periksa ulang status/versi, simpan keputusan, status, penunjuk rilis, obsolete, audit, notifikasi) → bila transaksi gagal, file issued menjadi yatim dan dibersihkan. Tidak ada I/O file di dalam transaksi database.
- Pemrosesan PDF (validasi, stamp) dijalankan satu per satu per proses agar memori terkendali.

Library: referensi memakai `pdf-lib` 1.17.1. Bandingkan dengan fork terpelihara `@cantoo/pdf-lib` saat implementasi dan pin versi persisnya.

## 7. PDF viewer (K11)

Dibangun sebagai Client Component in-page dari komponen resmi `pdfjs-dist/web/pdf_viewer` (`PDFViewer`, `EventBus`, `PDFLinkService`), mengikuti contoh `simpleviewer` PDF.js. `react-pdf` tidak dipakai karena hanya menyediakan render halaman dan skala; pan dan virtualisasi harus dibuat sendiri. Pencarian teks di dalam PDF tidak disediakan (keputusan pengguna, 15 Nov 2026); teks tetap dapat dipilih dan disalin melalui text layer.

| Aspek         | Ketentuan                                                                                                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pemuatan      | `getDocument({ url })` ke endpoint file same-origin dengan range request; progres ditampilkan. `cMapUrl`, `standardFontDataUrl`, `wasmUrl` menunjuk aset lokal. `enableXfa` mati, tanpa scripting. |
| Render        | Hanya halaman terlihat yang dirender (antrean render bawaan). Text layer aktif. Zoom tinggi memakai mekanisme detail view bawaan, bukan memperbesar kanvas penuh.                                  |
| Zoom          | 10%–800%, preset Otomatis, Fit lebar, Fit halaman, 100%. Ctrl/Cmd+scroll dan pinch berpusat di kursor. Tombol `+`, `-`, `0`.                                                                       |
| Navigasi      | Indikator dan lompat halaman, sebelumnya/berikutnya, PgUp/PgDn, Home/End. Geser dengan drag saat diperbesar.                                                                                       |
| Fitur         | Putar 90°, layar penuh, buka di tab baru, download dan print sesuai izin.                                                                                                                          |
| Watermark     | Overlay CSS non-interaktif untuk revisi belum final, Obsolete dan Cancelled. File tidak diubah.                                                                                                    |
| Print         | Membuka file Completed di tab baru (`disposition=inline&intent=print`) agar pencetakan memakai PDF asli berbasis vektor.                                                                           |
| State         | Skeleton saat memuat, pesan khusus untuk 403/404/413/503 dan PDF rusak, tombol coba lagi, state kosong bila revisi belum berfile.                                                                  |
| Tema          | Toolbar dan latar mengikuti token terang/gelap. Kertas tetap putih.                                                                                                                                |
| Aksesibilitas | Toolbar dapat dioperasikan keyboard, setiap tombol berlabel, fokus terlihat, target sentuh ≥ 44 px, menghormati reduced motion. Tidak menimpa Ctrl/Cmd+K dan Ctrl/Cmd+B milik shell.               |
| Siklus hidup  | `loadingTask` dan dokumen di-destroy saat unmount atau ganti revisi. Tidak ada render di server.                                                                                                   |

Teknis:

- Dimuat dengan `next/dynamic` `{ ssr: false }` dari Client Component. Worker: `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` (build platform memakai webpack).
- Aset `cmaps`, `standard_fonts`, `wasm` dan `iccs` disalin dari `node_modules/pdfjs-dist` ke `apps/drawings/public/pdfjs/` oleh skrip yang dijalankan di awal `dev` dan `build`. Folder hasil salinan tidak di-commit.
- CSP gateway saat ini belum mengizinkan WebAssembly. Lokasi `/drawings` memerlukan CSP sendiri (§8.4). Tanpa itu dekoder WebAssembly PDF.js (JPEG 2000, JBIG2, manajemen warna) tidak dapat dijalankan; sebagian hanya mempunyai jalur cadangan JavaScript yang lebih lambat.
- Pin versi `pdfjs-dist` persis. Referensi memakai 5.6.205; pada versi itu folder `cmaps`, `iccs`, `standard_fonts`, `wasm` serta opsi `enableDetailCanvas`, `maxCanvasPixels` dan `maxCanvasDim` tersedia. Nama opsi dapat berubah antar versi mayor, jadi periksa lewat Context7 untuk versi yang dipin.

## 8. Arsitektur dan integrasi platform

### 8.1 Bagian baru dan yang berubah

| Bagian                     | Perubahan                                                                                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/drawings`            | Baru. Next.js standalone, `basePath: '/drawings'`, port dev 3004, header keamanan seperti aplikasi lain.                                                                                                                                    |
| `packages/drawings-core`   | Baru. Schema Drizzle, migrasi, koneksi, service transaksi, storage, stamp, idempotensi, audit.                                                                                                                                              |
| `packages/contracts`       | `drawings.ts`: role, label, status, tabel transisi, `canDraw`, `nextRevisionNo`, schema zod, tipe DTO. `Grant` ditambah `DrawingsGrant`. `appCatalog` `drawings` menjadi `active` dengan `path` dan `portalSummary`.                        |
| `packages/auth-core`       | `decodeGrant`, `setAppGrant` dan `setApplicationStatus` menerima `drawings`. Fungsi direktori pengguna per aplikasi/role.                                                                                                                   |
| `apps/auth`                | `internal/verify` mengenali `drawings`. Endpoint internal baru `GET /auth/internal/directory?app=drawings` (token layanan) berisi id, nama, jabatan dan role pengguna aktif.                                                                |
| `packages/server`          | Helper pembaca body biner beraliran dengan batas ukuran.                                                                                                                                                                                    |
| `packages/ui`              | `Workspace`: `active` menerima `drawings`, grup navigasi baru, sumber activity/discovery. Komponen khusus drawing (viewer, status badge, panel keputusan) ditempatkan di aplikasi kecuali dipakai ulang.                                    |
| `apps/portal`              | Form **Akses Drawing Database** pada Kelola akses; kartu Portal aktif.                                                                                                                                                                      |
| `compose.yaml`, `infra/`   | Layanan `drawings`, database dan user `plant_drawings`, volume `drawings-files`, route dan CSP Nginx, batas upload, backup, Dockerfile menyiapkan `/data/drawings` milik user `node`.                                                       |
| `scripts/`                 | Provisioning database untuk volume MySQL yang sudah ada (pola `provisionConsumables`), `migrate.ts`, `bootstrap.ts`, `dev.ts`, `prepare-test.ts`, backup, uji operasi, `drawings:storage-copy`, `drawings:reconcile`, penyalin aset PDF.js. |
| `.github/workflows/ci.yml` | Log diagnosis dan stack uji memuat `drawings`; layanan S3-compatible (SeaweedFS; image MinIO tidak lagi tersedia) hanya pada stack uji untuk driver `s3`.                                                                                   |

Migrasi data Auth `drawings-v1` (pola `migrateConsumablesCatalog`): mengubah status katalog `planned → active`, mengisi path, dan memberi role `admin` kepada akun bootstrap. Pengguna lain diatur lewat Kelola akses.

### 8.2 Database `plant_drawings`

Kredensial runtime hanya DML; migrasi memakai kredensial DDL lewat job `migrate`. ID `varchar(36)`, waktu `timestamp(3)` UTC.

| Tabel                     | Isi utama                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disciplines`             | Nama unik, aktif, urutan, versi                                                                                                                                  |
| `drawings`                | Nomor, nama, HAC/SAC, discipline, deskripsi, owner, uploader, sumber, legacy note, penunjuk revisi kerja dan rilis, status kerja, request asal, data void, versi |
| `drawing_revisions`       | Drawing, nomor revisi, status, siklus, file kerja, file issued, change note, submitter, waktu submit/completed/obsolete, data pembatalan                         |
| `revision_approval_steps` | Revisi, level (1/2), assignee, penugas, waktu; unik per revisi+level                                                                                             |
| `approval_actions`        | Revisi, siklus, level (0/1/2), keputusan, catatan, actor, role actor, file yang ditinjau; unik per revisi+siklus+level                                           |
| `drawing_hacs`            | HAC/SAC lain per drawing (relasi banyak) beserta urutannya; HAC utama tetap di `drawings`                                                                        |
| `drawing_files`           | Jenis, tujuan, key storage, nama asli, MIME, ukuran, SHA-256, jumlah halaman, status (`staged`/`attached`/`orphaned`), pemilik, rujukan induk                    |
| `drawing_requests`        | Nomor, pemohon, HAC/SAC, deskripsi, keperluan, status, reviewer, drafter, catatan, drawing hasil, alasan tutup, versi                                            |
| `drawing_sequences`       | Sekuens nomor request per tahun                                                                                                                                  |
| `drawing_notifications`   | Penerima, jenis, judul, isi, tautan, `source_key` unik, waktu dibaca                                                                                             |
| `drawing_audit`           | Actor, aksi, target, drawing terkait, detail JSON, waktu                                                                                                         |
| `drawing_idempotency`     | Actor, key, hash payload, respons tersimpan; unik per actor+key                                                                                                  |

Keunikan nomor drawing di antara yang tidak void dan nomor revisi di antara yang tidak cancelled memakai kolom generated (`generatedAlwaysAs`) berindeks unik, karena MySQL tidak mempunyai partial index. Indeks lain mengikuti kueri daftar: status+waktu, owner, HAC/SAC, assignee+level, penerima+waktu.

### 8.3 API

Base `/drawings/api`. Mengikuti kontrak platform: identitas dari cookie sesi, `Origin` sama dengan `PUBLIC_ORIGIN` untuk operasi tulis, respons `no-store`, galat `{ error, code }`, tanggal ISO UTC, daftar berpaginasi cursor 50.

| Method     | Path                                                                                                  | Keterangan                                                |
| ---------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| GET        | `/portal-summary`, `/dashboard?year=`, `/activity`, `/discovery?q=`                                   | Kartu Portal, ringkasan, lonceng, command palette         |
| GET        | `/tasks`, `/tasks/count`                                                                              | Tugas saya                                                |
| GET        | `/drawings?tab=&q=&status=&disciplineId=&ownerId=&revision=&from=&to=&cursor=`                        | Library; `tab` = `released`, `wip`, `void`                |
| GET        | `/drawings/:id`, `/drawings/:id/timeline?cursor=`                                                     | Detail, revisi, approval plan, riwayat, izin actor; audit |
| GET        | `/revisions/:id/file`, `/attachments/:id`                                                             | Biner; lihat §6.3                                         |
| GET        | `/requests?scope=&status=&cursor=`, `/requests/:id`                                                   | Drawing Request                                           |
| GET        | `/people?for=`, `/masters`, `/hac-suggestions?q=`, `/notifications?filter=&cursor=`, `/audit?cursor=` | Kandidat, master, saran, notifikasi, audit admin          |
| POST       | `/uploads?kind=`                                                                                      | Upload biner                                              |
| POST       | `/drawings`, `/drawings/legacy`                                                                       | Create Drawing (opsi `submit`), Upload Old Drawing        |
| PATCH      | `/drawings/:id`                                                                                       | Edit draft atau koreksi admin                             |
| POST       | `/drawings/:id/revisions`, `/drawings/:id/void`, `/drawings/:id/owner`                                | Revisi baru, void, alih owner                             |
| POST       | `/revisions/:id/submit`, `/check`, `/approve-l1`, `/approve-l2`, `/cancel`                            | Transisi alur                                             |
| PATCH      | `/revisions/:id/approval-plan`                                                                        | Ganti approver                                            |
| POST       | `/requests`, `/requests/:id/review`, `/requests/:id/drafter-decision`, `/requests/:id/cancel`         | Alur request                                              |
| POST       | `/notifications/read`                                                                                 | Tandai dibaca                                             |
| POST/PATCH | `/masters/disciplines[/:id]`                                                                          | Master                                                    |

Kode galat khusus: `VERSION_CONFLICT`, `INVALID_TRANSITION`, `NOT_ASSIGNEE`, `MAKER_CHECKER`, `FILE_REQUIRED`, `FILE_INVALID`, `STORAGE_UNAVAILABLE`. Kontrak rinci ditambahkan ke `docs/API.md` saat implementasi.

### 8.4 Gateway

- Route mengikuti pola Consumables: upstream, `/_verify_drawings`, `/drawings/_next/`, `/drawings/favicon.svg`, `/drawings/api/`, halaman, serta blokir `/drawings/internal` dan `/drawings/health`.
- **Batas body.** Gateway dan Nginx host VPS (`infra/deploy/nginx-host.https.conf`) sama-sama memakai `client_max_body_size 128k`. Tambahkan lokasi persis `/drawings/api/uploads` dengan batas 30 MB dan timeout baca lebih panjang pada keduanya. Batas tepat tetap ditegakkan aplikasi.
- **CSP.** Lokasi `/drawings` memakai kebijakan global ditambah `'wasm-unsafe-eval'` pada `script-src`, `worker-src 'self' blob:`, `img-src 'self' data: blob:` dan `font-src 'self' data:`. Kebijakan ini juga dipasang pada `/drawings/_next/`, karena worker memakai CSP dari respons skrip worker. `add_header` pada sebuah lokasi membatalkan pewarisan, jadi seluruh header keamanan dideklarasikan ulang di sana (pakai satu file `include`). Pertahankan teks `connect-src 'self'` karena `scripts/dev.ts` menggantinya untuk HMR.
- `X-Frame-Options: DENY` dan `frame-ancestors 'none'` tetap berlaku. Viewer tidak memakai iframe.

## 9. UI

Semua halaman memakai `Shell`, `Heading`, `Select`, `Input`, `Textarea`, `Overlay`, `Toast`, `useConfirmation`, skeleton dan token yang ada. Istilah domain mengikuti panduan kata DrafTerra (Drawing Library, Create Drawing, Upload Old Drawing, Current Revision, Final Drawing, Check, Approval, Final Approval, Legacy Ready, Uploaded by, Drawn by); kalimat penjelas berbahasa Indonesia.

| Menu sidebar       | Path                 | Tampil untuk        |
| ------------------ | -------------------- | ------------------- |
| Ringkasan          | `/drawings`          | Semua               |
| Drawing Library    | `/drawings/library`  | Semua               |
| Tugas saya         | `/drawings/tasks`    | Semua selain viewer |
| Drawing Requests   | `/drawings/requests` | Semua               |
| Create Drawing     | `/drawings/new`      | drafter, admin      |
| Upload Old Drawing | `/drawings/legacy`   | leader, admin       |
| Pengelolaan        | `/drawings/manage`   | admin               |
| Audit              | `/drawings/audit`    | admin               |

Halaman lain: detail `/drawings/library/[id]`, edit `/drawings/library/[id]/edit`, ruang tinjau Check/Approval `/drawings/library/[id]/review`, viewer penuh `/drawings/view/[revisionId]`, `/drawings/requests/new`, `/drawings/requests/[id]`.

- **Ringkasan** memakai `.dashboard-grid`: hero grafik Final Drawing terbit per kuartal (tahun WIB, pilihan tahun), KPI (Final Drawing, dalam proses, menunggu tindakan, ditolak), antrean tugas, dan aktivitas terbaru. Viewer hanya melihat angka Final Drawing.
- **Drawing Library**: tab Final / Dalam proses (dan Dibatalkan untuk admin), pencarian nomor/nama/HAC/SAC (termasuk HAC/SAC lain), filter status, discipline, owner, revisi dan rentang tanggal WIB. Daftar ringkas sebagai bawaan, tampilan kartu sebagai pilihan yang diingat browser.
- **Detail**: metadata, Current Revision, panel viewer, riwayat revisi, riwayat approval (dengan thumbnail lampiran), jejak aktivitas, dan tombol aksi sesuai izin. Form memakai sheet kanan/bawah; keputusan dan aksi destruktif memakai dialog konfirmasi; hasil memakai toast.
- **Ruang tinjau**: viewer besar berdampingan dengan panel keputusan (ringkasan, pemilihan approver saat Check, catatan, lampiran reject). Di bawah 960 px tersusun vertikal.
- **Status** tidak menambah palet: Draft netral; Waiting netral dengan ikon jam; Rejected memakai warna perhatian (pumpkin); Completed lime; Obsolete dan Cancelled teredam. Arti selalu dibawa label teks, bukan warna saja.
- Terang/gelap, desktop/mobile 390 px, keyboard, focus dan reduced motion mengikuti `docs/UI-THEME.md`.

## 10. Operasional

- **Environment baru:** `DRAWINGS_DB_PASSWORD`, `DRAWINGS_DATABASE_URL`, `DRAWINGS_MIGRATION_DATABASE_URL`, `DRAWINGS_STORAGE_DRIVER`, `DRAWINGS_STORAGE_PATH`, `DRAWINGS_S3_ENDPOINT`, `DRAWINGS_S3_REGION`, `DRAWINGS_S3_BUCKET`, `DRAWINGS_S3_ACCESS_KEY_ID`, `DRAWINGS_S3_SECRET_ACCESS_KEY`, `DRAWINGS_S3_FORCE_PATH_STYLE`, `DRAWINGS_MAX_PDF_MB`.
- **Anggaran VPS:** layanan `drawings` diberi `mem_limit: 768m` dan `--max-old-space-size=512`, lebih besar dari aplikasi lain (512m/320) karena memproses PDF. Uji dengan PDF 25 MB sebelum menetapkan angka akhir.
- **Backup:** `plant_drawings` ditambahkan ke `infra/mysql/backup.sh`, `scripts/database-backup.mjs` dan uji restore. File: versioning dan retensi bucket pada driver `s3`; arsip harian volume dengan retensi 14 hari pada driver `fs`. File bersifat append-only, sehingga restore database ke waktu T tetap konsisten dengan storage yang lebih baru.
- **Health:** `/drawings/health/live` dan `/drawings/health/ready` (database + Auth). Kegagalan storage tidak menjatuhkan readiness; operasi file menjawab 503 `STORAGE_UNAVAILABLE`.
- **Rilis:** runbook `docs/deployment/DRAWING-DATABASE-RELEASE.md` mencakup backup awal, provisioning database pada volume yang sudah ada, migrasi aditif, perubahan Nginx gateway dan host, penambahan `.env`, urutan `up`, smoke test, dan rollback. Produksi diperbarui lewat SHA yang lolos CI.

## 11. Kriteria penerimaan

**Akses**

- SSO, logout, sesi kedaluwarsa dan akun nonaktif berlaku di `/drawings`. Tanpa grant → 403 pada halaman dan API. Header identitas palsu diabaikan.
- Setiap sel matriks izin §3 terbukti lewat uji, termasuk akses URL langsung ke file dan lampiran.

**Alur**

- Jalur lengkap tanpa L2 dan dengan L2 mencapai Completed. Reject pada tiap level kembali ke owner dan dapat di-submit ulang; siklus bertambah.
- Maker-checker menolak owner, pembuat revisi dan submitter pada ketiga level, termasuk Admin.
- Bukan assignee ditolak. Aturan ganti approver sesuai §4.2.
- Revisi baru: Final Drawing lama tetap dapat dibuka, dicetak dan diunduh Viewer sampai revisi baru Completed; setelah itu menjadi Obsolete dan tidak dapat dibuka Viewer.
- Legacy langsung Completed tanpa stamp dan tanpa keputusan approval.
- Request melewati semua cabang; `in_progress` tertutup saat drawing terbit.
- Void dan pembatalan revisi mempertahankan data, file dan audit; nomor drawing dapat dipakai lagi.

**Integritas**

- Dua keputusan bersamaan pada revisi yang sama: satu berhasil, satu 409. Retry dengan key sama tidak menggandakan; payload berbeda 409.
- Kegagalan di tengah transaksi tidak meninggalkan perubahan sebagian.

**File dan viewer**

- Upload 25 MB berhasil melalui gateway; lebih besar ditolak dengan pesan jelas; bukan PDF, PDF terenkripsi dan SVG ditolak.
- Range request menghasilkan 206 yang benar pada driver `fs` dan `s3`.
- Stamp benar pada halaman berotasi 0/90/180/270 dan waktu tertulis WIB; SHA-256 file asli tidak berubah.
- Viewer: PDF multi-halaman dan lembar A1/A0 dapat di-zoom sampai 800% tanpa membekukan tab; rotasi, layar penuh dan keyboard berfungsi; tidak ada pelanggaran CSP pada konsol; berjalan di Chromium dan WebKit, terang/gelap, 390 px dan 1440 px.
- Print dan download hanya untuk Completed dan tercatat di audit. Membuka file di tab baru berfungsi di Chrome, Edge, Firefox dan Safari dengan header keamanan gateway.

**Operasi**

- Upgrade dari deployment berisi data Bag Filter dan Consumables tanpa mengubah datanya. Backup/restore mencakup `plant_drawings`. Restart layanan tidak menghilangkan file.
- `pnpm typecheck`, `pnpm test`, integrasi MySQL, E2E, uji operasi dan `format:check` lulus. Hasil aktual dicatat di `docs/VALIDATION.md`.

## 12. Perbedaan terhadap referensi DrafTerra

| Perilaku referensi (terverifikasi di source)                                                                                                               | Di TQ-CMMS                                                                     | Alasan                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| Visibilitas Consumer/Drafter memakai `currentStatus`; begitu revisi baru dibuat status menjadi DRAFT dan drawing hilang dari Consumer.                     | Penunjuk rilis terpisah dari revisi kerja.                                     | K7                                             |
| `deleteDrawing` menghapus drawing, file, dan audit log terkait.                                                                                            | Void tanpa penghapusan.                                                        | K9                                             |
| Discipline teks bebas.                                                                                                                                     | Master.                                                                        | K10                                            |
| Tidak ada pemeriksaan pembuat ≠ pemutus. Admin dapat membuat drawing lalu melakukan Check, dan Approval bila menjadi assignee.                             | Maker-checker.                                                                 | K8                                             |
| Stamp ditulis ke salinan file pada setiap approval, di dalam transaksi database; approver dapat mematikannya.                                              | Stamp sekali saat Completed, di luar transaksi, selalu aktif, tanpa catatan.   | K6                                             |
| File berada di `public/uploads` dan route `/uploads/[...path]` menyajikannya tanpa pemeriksaan sesi.                                                       | Storage privat, semua akses lewat API berizin.                                 | Keamanan dokumen                               |
| Lampiran reject menerima SVG; gambar referensi menerima semua `image/*`.                                                                                   | JPEG/PNG/WebP dengan pemeriksaan magic bytes.                                  | SVG dapat membawa skrip                        |
| Viewer berupa `pdfjs-viewer.html` di dalam iframe: mengunduh seluruh file, merender semua halaman setiap ganti zoom, zoom 60–200%, tanpa cari/navigasi.    | Viewer in-page §7.                                                             | K11; iframe diblokir `X-Frame-Options: DENY`   |
| Print memakai iframe tersembunyi berisi blob.                                                                                                              | Tab baru dengan PDF asli.                                                      | Kebijakan frame gateway; kualitas vektor       |
| Daftar drawing dan request dipaginasi di memori setelah seluruh baris dimuat.                                                                              | Filter dan pagination cursor di server.                                        | Pola platform                                  |
| Saat Drafter menerima request: dibuat PDF placeholder, nomor `REQ-…`, discipline "Pending", dan request langsung CLOSED. Status IN_PROGRESS tidak dipakai. | Draft tanpa file dan tanpa nomor; request `in_progress` sampai drawing terbit. | Menghindari data palsu; pemohon dapat memantau |
| Revisi baru dan edit memeriksa `createdBy` (pengunggah), sehingga Drafter pemilik drawing legacy tidak dapat merevisi.                                     | Hak mengikuti owner (Drawn by); owner dapat dialihkan.                         | Sesuai maksud "Drawn by"                       |
| Hanya Draft Leader yang dapat mereview request.                                                                                                            | Admin juga dapat, sebagai cadangan.                                            | Konsisten dengan peran Admin                   |
| Keputusan hanya dijaga `expectedStatus`; tanpa idempotensi.                                                                                                | `expectedVersion` + `Idempotency-Key`.                                         | Pola platform                                  |
| `download_logs` terpisah dari audit.                                                                                                                       | Satu tabel audit (`file.downloaded`, `file.printed`).                          | Penyederhanaan                                 |
| Notifikasi antrean disebar ke semua Draft Leader.                                                                                                          | Antrean dihitung dari state; notifikasi hanya untuk penerima perorangan.       | Tidak ada tabel user lokal                     |
| Login, Request Access, reset password, account settings, User Management, email.                                                                           | Tidak dibuat.                                                                  | K1                                             |

## 13. Saran lanjutan (belum masuk lingkup)

1. Metadata per revisi (nama, discipline ikut versi), bila judul sering berubah antar revisi.
2. Satu orang hanya boleh memutus satu tahap pada revisi yang sama (lebih ketat dari K8).
3. Field WO opsional pada request dan drawing, seperti Bag Filter dan Consumables.
4. Ukuran kertas, skala dan jenis drawing sebagai metadata dan filter.
5. Batas waktu approval dengan pengingat, dan delegasi approver saat cuti.
6. Notifikasi email setelah kebijakan egress dan SMTP diputuskan.
7. Lembar approval terpisah sebagai alternatif bila stamp menutupi title block.
8. Tautan dari HAC/SAC ke equipment Bag Filter atau dokumen Consumables.

## 14. Hal yang masih perlu keputusan

Nilai bawaan di bawah dipakai sampai ada keputusan lain.

| #   | Pertanyaan                                                                                                         | Bawaan dokumen ini                                   |
| --- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Q1  | Penyedia object storage, region, kredensial dan kebijakan egress. Bolehkah go-live sementara dengan driver `fs`?   | Development dengan `fs`; produksi menunggu keputusan |
| Q2  | Apakah HAC/SAC wajib berformat `XXX-XXX` seperti Consumables? Drawing umum/area mungkin tidak punya kode tersebut. | Format bebas ternormalisasi, 1–40 karakter           |
| Q3  | Batas ukuran PDF dan anggaran memori VPS.                                                                          | 25 MB; 768 MB                                        |
| Q4  | (Dihapus 15 Nov 2026: Area tidak dipakai.)                                                                         | –                                                    |
| Q5  | Penyesuaian §12 yang bukan K7–K10 (alur request, owner, admin review).                                             | Diterapkan seperti tertulis                          |

## 15. Prompt implementasi untuk developer

> Serahkan bagian ini beserta seluruh dokumen kepada developer atau coding agent.

### 15.1 Peran dan tujuan

Kamu adalah senior full-stack engineer di monorepo **Plant Area System v2 / TQ-CMMS** (pnpm, Next.js App Router, TypeScript, Drizzle/MySQL 8.4, Nginx, Docker Compose). Bangun aplikasi baru **Drawing Database** pada `/drawings` sesuai PRD ini. Repo `C:\Users\a_sfn\@Project\Drawing-Management` (DrafTerra) hanya referensi logic, alur kerja dan role. Jangan menyalin stack, komponen UI, autentikasi, tabel user, brand atau asetnya, dan jangan menjadikannya dependency.

### 15.2 Bacaan wajib sebelum menulis kode

1. Dokumen ini dan `docs/design/drawing-database-brief.jsonc`.
2. `README.md`, `AGENTS.md`, `docs/PRD-v2.md`, `docs/API.md`, `docs/UI-THEME.md`, `docs/OPERATIONS.md`, `docs/CONSUMABLE-ROOM-PRD.md`.
3. Pola platform yang ditiru:
   - `packages/contracts/src/index.ts` dan `consumables.ts` (grant, izin, `appCatalog`, `PortalSummary`, `AppError`).
   - `packages/server/src/index.ts` (`apiIdentity`, `pageIdentity`, `verifyOrigin`, `readJson`, `failure`).
   - `packages/auth-core/src/index.ts`, `apps/auth/app/internal/*`, `apps/auth/app/manage/[...segments]/route.ts`.
   - `packages/consumables-core/src/{schema,database,support,documents}.ts` (transaksi, kunci baris, idempotensi, sekuens, cursor, audit).
   - `apps/consumables/` (konfigurasi Next, layout, route API, health).
   - `packages/ui/src/{workspace,sidebar-navigation,overlay,fields,confirm,dashboard}.tsx`, `tokens.css`.
   - `compose.yaml`, `infra/nginx/default.conf.template`, `infra/deploy/*`, `infra/mysql/*`, `infra/Dockerfile`.
   - `scripts/{migrate,bootstrap,consumables-migration,dev,prepare-test,database-backup,test-operations}.*`, `.github/workflows/ci.yml`.
4. Referensi DrafTerra: `docs/Drawing_Management_APP-PRD.md`, `docs/roles/*.md`, `docs/UI_WORDING_GUIDE.md`, `src/lib/utils/permissions.ts`, `src/lib/db/schema.ts`, `src/server/services/{approval,approval-plan,drawing,revision,drawing-request,notification,dashboard}.service.ts`, `src/server/storage/pdf-signature.ts`.

Setelah membaca, tulis rencana singkat (file yang disentuh per fase, urutan migrasi, risiko) dan minta persetujuan sebelum mulai Fase 1.

### 15.3 Aturan kerja

- Ikuti K1–K11. Bila PRD bertentangan dengan referensi, PRD yang berlaku. Bila menemukan hal yang belum diputuskan, pakai bawaan §14 dan catat di laporan.
- Pakai Context7 sebelum memakai API library (`/vercel/next.js`, `/mozilla/pdf.js`, `/drizzle-team/drizzle-orm-docs`, `/aws/aws-sdk-js-v3`, `/cantoo-scribe/pdf-lib` atau `/hopding/pdf-lib`, `/websites/nginx_en`). Pin versi persis untuk setiap dependency baru.
- Jangan mengubah perilaku Bag Filter, Consumables, Auth atau Portal selain yang tercantum di §8.1. Perubahan pada `packages/ui` dan `packages/contracts` harus aditif dan tidak mengubah tampilan aplikasi lain.
- Migrasi bersifat aditif. Jangan mereset database, jangan menyentuh VPS, arsip `plant-v2-test` milik PC sumber, atau data nyata. Ikuti aturan lingkungan uji di README.
- Logic domain (izin, transisi, penomoran) berupa fungsi murni di `@plant/contracts` dengan unit test. Service di `@plant/drawings-core`. Route handler hanya memetakan HTTP.
- Tidak ada I/O file atau panggilan jaringan di dalam transaksi database.
- Rahasia, dump, sertifikat dan file perusahaan tidak masuk Git atau image.
- Satu commit per langkah yang lolos pemeriksaan. Jangan commit hasil salinan aset PDF.js atau file uji besar.

### 15.4 Fase

Setiap fase berakhir dalam keadaan dapat dijalankan dan lolos `pnpm typecheck`, `pnpm test`, serta build aplikasi yang disentuh.

**Fase 1 — Fondasi dan akses.** Kontrak role/grant/katalog; `auth-core` (grant, verify, direktori); database, user, provisioning dan migrasi kosong; `apps/drawings` dengan layout, Shell, health dan halaman Ringkasan kosong; layanan Compose; route Nginx; form akses di Portal; stack dev dan uji. _Selesai bila:_ login → `/drawings` tampil dengan navigasi sesuai role; tanpa grant 403; aplikasi lain tidak berubah; uji integrasi dan E2E platform yang ada tetap lulus.

**Fase 2 — File dan viewer.** Abstraksi storage dengan driver `fs` dan `s3` (uji `s3` terhadap layanan S3-compatible pada stack uji); upload dua tahap; endpoint file dengan Range; batas body Nginx gateway dan host; CSP `/drawings`; viewer §7. _Selesai bila:_ PDF contoh dapat diunggah dan dibuka di viewer lewat gateway HTTPS tanpa pelanggaran CSP; kriteria file dan viewer §11 lulus kecuali stamp.

**Fase 3 — Drawing inti.** Master Discipline; Create Drawing dan edit draft; Upload Old Drawing; Library dengan filter dan pagination; detail dengan riwayat revisi dan jejak aktivitas; void; alih owner; audit. _Selesai bila:_ drawing legacy tampil bagi Viewer dan dapat dicetak/diunduh; aturan visibilitas per role lulus uji integrasi.

**Fase 4 — Alur approval.** Submit, Check dan approval plan, Approval L1, Final Approval, reject dengan lampiran, siklus, maker-checker, ganti approver, stamp dan file issued, obsolete, revisi baru, pembatalan revisi, Tugas saya. _Selesai bila:_ kriteria alur dan integritas §11 lulus, termasuk uji konkurensi.

**Fase 5 — Request, notifikasi dan ringkasan.** Alur Drawing Request lengkap; notifikasi; dashboard; `portal-summary`; `activity` dan `discovery` terhubung ke shell; kartu Portal aktif. _Selesai bila:_ seluruh cabang request lulus dan Portal menampilkan kartu Drawing Database dengan data nyata.

**Fase 6 — Pengerasan dan rilis.** Halaman audit; `drawings:reconcile` dan `drawings:storage-copy`; backup/restore dan uji operasi; E2E penuh (role, tema, mobile, WebKit); pembaruan `README.md`, `AGENTS.md`, `docs/PRD-v2.md`, `docs/API.md`, `docs/UI-THEME.md`, `docs/OPERATIONS.md`, `.env.example`; runbook rilis; catatan hasil aktual di `docs/VALIDATION.md`; pembaruan graph Graphify. _Selesai bila:_ seluruh §11 lulus pada stack uji bersih dan pada upgrade dari data yang sudah ada.

### 15.5 Hal yang sering salah

- `init.sh` MySQL hanya berjalan pada volume kosong. Deployment yang sudah ada membutuhkan provisioning eksplisit sebelum migrasi.
- `migrate.ts` hanya memperbarui nama katalog; perubahan status `planned → active` harus lewat migrasi data.
- Volume bernama dimiliki root, sedangkan image berjalan sebagai `node`. Siapkan direktori dan kepemilikannya di Dockerfile.
- Worker PDF.js memakai CSP dari respons skripnya sendiri. CSP `/drawings` harus dipasang juga pada `/drawings/_next/`.
- `add_header` di tingkat lokasi menghapus header yang diwarisi.
- Kompresi atau buffering pada respons file merusak range request. Pastikan tidak ada `Content-Encoding`.
- `request.formData()` memuat seluruh file ke memori. Pakai aliran body.
- Font standar `pdf-lib` gagal pada karakter di luar WinAnsi.
- Container tidak memakai zona waktu WIB.

### 15.6 Laporan akhir tiap fase

Ringkas perubahan, daftar file, hasil pemeriksaan yang benar-benar dijalankan (perintah dan angkanya), hal yang belum diverifikasi, penyimpangan dari PRD beserta alasannya, dan pertanyaan terbuka. Jangan menyatakan lulus tanpa bukti.

## Referensi dokumentasi

Context7: `/vercel/next.js` (streaming file dan `formData` pada Route Handler, `next/dynamic` tanpa SSR), `/mozilla/pdf.js` (komponen viewer, opsi `getDocument`, antrean render, CSP viewer), `/wojtekmaj/react-pdf` (pembanding), `/cantoo-scribe/pdf-lib` (penanganan enkripsi), `/drizzle-team/drizzle-orm-docs` (generated column MySQL), `/aws/aws-sdk-js-v3` (endpoint kustom, checksum, Range), `/websites/nginx_en` (`client_max_body_size`, pewarisan `add_header`).

Belum diverifikasi saat dokumen ini ditulis: versi terbaru `pdfjs-dist`, `pdf-lib`/`@cantoo/pdf-lib` dan `@aws-sdk/client-s3` di registry npm, perilaku tab PDF bawaan tiap browser terhadap header keamanan gateway, serta kebutuhan memori nyata untuk PDF 25 MB. Ketiganya menjadi butir verifikasi Fase 2 dan Fase 4.
