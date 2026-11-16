# Plant Area System v2

[![Platform checks](https://github.com/linearsaf/Plant-Area-System-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/linearsaf/Plant-Area-System-v2/actions/workflows/ci.yml)

Platform web untuk operasi area pabrik: satu portal dengan single sign-on dan tiga aplikasi kerja, yaitu pencatatan Bag Filter, stok Consumable Room R22, dan Drawing Database.

Dibangun dengan Node.js 26, Next.js 16, React 19, Better Auth, MySQL 8.4, Drizzle ORM, dan Nginx, lalu dijalankan sebagai layanan terpisah lewat Docker Compose.

## Daftar isi

- [Aplikasi](#aplikasi)
- [Arsitektur](#arsitektur)
- [Struktur repositori](#struktur-repositori)
- [Prasyarat](#prasyarat)
- [Development lokal](#development-lokal)
- [Pemeriksaan dan pengujian](#pemeriksaan-dan-pengujian)
- [Deployment](#deployment)
- [Panduan per aplikasi](#panduan-per-aplikasi)
- [Dokumentasi](#dokumentasi)
- [Keamanan dan data](#keamanan-dan-data)

## Aplikasi

| Aplikasi         | Path           | Fungsi                                                                                                 |
| ---------------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| Portal           | `/`            | Pintu masuk SSO, ringkasan tiap aplikasi, dan **Kelola akses** untuk akun, role, dan scope             |
| Auth             | `/auth`        | Login, sesi, penggantian password, dan direktori pengguna internal                                     |
| Bag Filter       | `/bag-filter`  | Peta dan riwayat penggantian bag untuk enam equipment (561, 562, 421, 422, L61, L62)                   |
| Consumable Room  | `/consumables` | Stok R22: Consume/Return, Penerimaan Picklist, riwayat, dan bukti cetak                                |
| Drawing Database | `/drawings`    | Drawing Library, alur Check dan approval dengan stamp, revisi, Drawing Request, dan PDF viewer in-page |

Tidak ada registrasi publik. Akun dibuat admin melalui **Kelola akses**, dan migrasi tidak membuat transaksi demo.

Antarmuka semua aplikasi memakai design system yang sama (`@plant/ui`):

- Tema **Terang/Gelap/Sistem** dari ikon Tema di topbar dan form Auth. Default mengikuti perangkat, dan pilihan tersimpan di browser untuk seluruh aplikasi.
- Sidebar yang dapat diciutkan, dashboard data aktual, pencarian cepat (**Ctrl/Cmd+K**), dan notifikasi aktivitas sesuai scope.
- Form pencatatan dalam sheet.
- Peta Bag Filter dengan skala umur lime–kuning–oranye–merah dan seleksi double ring yang tidak mengubah warna umur.

Acuan visual ada di [brief UI](docs/design/UI-REFRESH.md) dan [tema UI](docs/UI-THEME.md).

## Arsitektur

- **Gateway:** Nginx menerima HTTPS dan meneruskan tiap prefix path ke aplikasinya.
- **Aplikasi:** lima aplikasi Next.js yang dibangun dan dijalankan sebagai container terpisah.
- **Database:** satu server MySQL 8.4 dengan database terpisah per domain (Auth, Bag Filter, Consumables, Drawings). Skema dan migrasi dikelola Drizzle.
- **File drawing:** object storage lewat driver `fs` (volume `drawings-files`, bawaan) atau `s3` (S3-compatible).
- **Backup:** layanan `backup` di Compose; prosedurnya ada di [panduan operasional](docs/OPERATIONS.md).

Port saat menjalankan `pnpm dev` tanpa gateway: Portal 3000, Auth 3001, Bag Filter 3002, Consumables 3003, Drawings 3004.

## Struktur repositori

```text
apps/        Aplikasi Next.js: portal, auth, bag-filter, consumables, drawings
packages/    Package bersama: contracts, auth-core, bag-core, consumables-core,
             drawings-core, server, ui
infra/       Dockerfile, konfigurasi Nginx dan MySQL, override deployment
scripts/     Migrasi, bootstrap, runtime development, impor, dan tes operasi
tests/       Tes unit, integrasi, dan E2E (Playwright)
docs/        PRD, kontrak API, operasi, runbook deployment, dan brief desain
```

Edit package bersama langsung di `packages/*`. Jangan mengedit `node_modules/@plant/*`; pnpm menghubungkannya ke source workspace.

Ekspor lama tersimpan di `.arsip/` hanya pada workspace asal karena memuat data internal. Folder itu tidak diterbitkan ke GitHub.

## Prasyarat

| Kebutuhan | Versi                           |
| --------- | ------------------------------- |
| Node.js   | **26.12.1**                     |
| pnpm      | **12.14.0**                     |
| Docker    | Linux containers dengan Compose |

```sh
npm install --global pnpm@12.14.0
pnpm install --frozen-lockfile
```

<details>
<summary>Windows: aktivasi Node dan pnpm lokal workspace</summary>

Workspace Windows ini menyediakan runtime lokal `.tools/node-v26.12.1-win-x64/node.exe` (diabaikan version control). Launcher pnpm milik NVM dapat menghasilkan `error: CommandNotFound` jika pnpm belum tersedia pada versi Node yang aktif. Jalankan aktivasi pada setiap terminal PowerShell baru:

```powershell
. .\scripts\activate-dev.ps1
node --version
pnpm --version
```

Hasilnya harus Node `v26.12.1` dan pnpm `12.14.0`. Jika pnpm lokal belum terpasang, instal sekali dengan runtime lokal lalu ulangi aktivasi:

```powershell
& .\.tools\node-v26.12.1-win-x64\node.exe .\.tools\node-v26.12.1-win-x64\node_modules\npm\bin\npm-cli.js install --global --prefix .tools/pnpm pnpm@12.14.0 --allow-scripts=pnpm
. .\scripts\activate-dev.ps1
```

Aktivasi hanya mengubah PATH terminal tersebut dan mendahulukan runtime project. Instalasi Node/NVM global tetap dapat dipakai project lain.

</details>

## Development lokal

Dengan Node dan pnpm yang dipin serta Docker Engine lokal aktif, jalankan dari root workspace:

```sh
pnpm dev:setup
pnpm dev:up
pnpm dev:status
pnpm dev:smoke
```

Buka **https://localhost:9443**. Sertifikat localhost bersifat self-signed dan belum dipercaya browser/OS, sehingga browser dapat menampilkan peringatan sertifikat.

**Login awal.** Email `developer@example.test` dan `BOOTSTRAP_PASSWORD` dalam `.deploy/dev/stack.env`, lalu wajib mengganti password. Setelah `pnpm dev:smoke` atau verifikasi awal dijalankan pada perangkat tersebut, kredensial development terakhir tersedia secara privat dalam `.deploy/dev/login.env`; lihat juga `.deploy/dev/DEV-HANDOVER.md`. Gunakan password terbaru Anda setelah menggantinya lagi.

**Runtime `plant-v2-dev`.**

- Memakai volume baru, kredensial sendiri, dan binding loopback: HTTPS 9443, HTTP 9080, dan MySQL 14306.
- Tidak memakai akun/data VPS atau database arsip `plant-v2-test`.
- Data awal kosong, selain admin, katalog aplikasi, dan konfigurasi enam equipment.
- Seluruh rahasia, sertifikat, dan generated override berada di `.deploy/dev/`, yang diabaikan Git dan Docker.
- Script menolak Docker context remote dan tidak memasang trust certificate ke OS.
- Telah diuji pada PC Windows (`x86_64`) dan MacBook Apple Silicon (`arm64`).

**Perintah sehari-hari.**

| Perintah          | Fungsi                                                                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev:up`     | Menjalankan runtime. Diperlukan lagi setelah perubahan dependency atau migrasi, untuk membangun ulang tools dan menjalankan migrator                                   |
| `pnpm dev:down`   | Menghentikan runtime tanpa menghapus volume                                                                                                                            |
| `pnpm dev:status` | Menampilkan status layanan                                                                                                                                             |
| `pnpm dev:logs`   | Menampilkan log terakhir                                                                                                                                               |
| `pnpm dev:smoke`  | Memverifikasi SSO, keenam peta Bag Filter, Consumable Room, health dan rute Drawing Database, WebSocket HMR (`/…/_next/hmr`), tema, dan mobile terhadap `plant-v2-dev` |
| `pnpm dev:setup`  | Menyiapkan runtime. Setup ulang mempertahankan kredensial dan sertifikat                                                                                               |

Source `apps/*/app` dan `packages/*/src` mendukung hot reload.

`pnpm dev` menjalankan kelima aplikasi langsung tanpa Compose. Lingkungan itu harus memasok env tiap layanan dan gateway HTTPS yang meneruskan prefix/host dengan konfigurasi setara; Compose adalah cara menjalankan SSO lengkap yang telah diuji. Script Node tidak memuat `.env` otomatis; gunakan `node --env-file=... --import tsx ...`.

Untuk MacBook, setup dapat diserahkan kepada Claude Code memakai [prompt development MacBook](docs/deployment/CLAUDE-CODE-MACBOOK.md), termasuk environment lokal, SSO HTTPS, hot reload, dan verifikasi.

## Pemeriksaan dan pengujian

Pemeriksaan yang aman dijalankan di mana saja:

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm check:export # opsional; memeriksa arsip jika tersedia di workspace lokal
```

Suite integrasi, E2E, dan operasi memerlukan lingkungan uji terpisah di bawah. Jangan menjalankannya terhadap database development atau arsip nyata.

### Lingkungan uji lokal terpisah

> [!WARNING]
> **Khusus PC sumber migrasi:** project `plant-v2-test` lama berisi data nyata dan tetap dibekukan sesudah cutover. Jangan menjalankan blok di bawah pada Docker Engine yang masih mempunyai project tersebut, termasuk dari clone lain: nama project dan sebagian port/nama container masih tetap dalam script uji. Suite lengkap dapat berjalan pada runner CI terpisah.

Environment pengujian memakai project Compose **plant-v2-test**, volume sendiri, hostname localhost, HTTPS 8443, serta MySQL 13306 hanya pada loopback. Script uji tidak boleh diarahkan ke produksi.

```sh
node --import tsx scripts/prepare-test.ts
docker compose --env-file .test-runtime/stack.env -p plant-v2-test -f compose.yaml -f .test-runtime/compose.yaml up -d --wait mysql
node --env-file=.test-runtime/host.env --import tsx scripts/migrate.ts
node --env-file=.test-runtime/host.env --import tsx scripts/bootstrap.ts
```

Untuk sertifikat localhost, hanya pada workspace pengujian yang belum mempunyai sertifikat organisasi:

```sh
docker run --rm -v "${PWD}/infra/certs:/certs" --entrypoint openssl mysql:8.4 req -x509 -newkey rsa:2048 -nodes -keyout /certs/tls.key -out /certs/tls.crt -days 7 -subj /CN=localhost -addext subjectAltName=DNS:localhost,IP:127.0.0.1
docker compose --env-file .test-runtime/stack.env -p plant-v2-test -f compose.yaml -f .test-runtime/compose.yaml up -d --build nginx backup
```

Buka **https://localhost:8443**. Sertifikat pengujian tidak dipercaya browser secara otomatis. Kredensial bootstrap lokal ada di `.test-runtime/stack.env`; file ini diabaikan version control.

Stack uji memuat layanan S3-compatible (`s3`, SeaweedFS) untuk uji driver `s3` Drawing Database; jalankan `up -d --wait mysql s3` sebelum suite integrasi.

### Suite integrasi, E2E, dan operasi

```sh
node --env-file=.test-runtime/host.env --import tsx --test --test-concurrency=1 tests/integration/*.test.ts
pnpm exec playwright install chromium
pnpm test:e2e
node --env-file=.test-runtime/host.env --import tsx scripts/test-operations.ts
node --env-file=.test-runtime/host.env --import tsx scripts/test-gateway-recovery.ts
```

- Suite browser mengubah password akun pilot menjadi nilai khusus fixture di `tests/e2e/platform.spec.ts`.
- Tes operasi me-restart MySQL, Bag Filter, Consumable Room, dan Drawing Database (termasuk persistensi file volume), menghentikan sementara Auth, dan membuat server restore sementara pada project uji. Jangan menjalankannya saat pengujian browser masih berlangsung.
- Laporan browser ada di `playwright-report/` dan screenshot di `test-results/`; keduanya lokal dan tidak dikomit.
- Untuk mengembalikan keadaan kosong, gunakan script reset hanya pada database uji lalu jalankan bootstrap lagi. Ini menghapus akun dan transaksi uji.

Hasil pemeriksaan aktual tiap rilis dicatat di [hasil validasi](docs/VALIDATION.md).

## Deployment

### Instalasi baru

1. Salin `.env.example` menjadi `.env`. Isi `PUBLIC_ORIGIN` dengan origin HTTPS tanpa trailing slash, enam rahasia independen, dan akun bootstrap. Gunakan random hex 32 byte untuk password database dan secret layanan, misalnya `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Jangan memakai nilai contoh.
2. Pasang sertifikat organisasi `infra/certs/tls.crt` dan private key `infra/certs/tls.key`. DNS hostname harus menunjuk ke server ini. Lindungi `.env`, key, dan folder backup dari akses pengguna lain.
3. Jalankan urutan berikut dari root repositori:

   ```sh
   docker compose build
   docker compose up -d mysql
   docker compose run --rm migrate
   docker compose --profile setup run --rm bootstrap
   docker compose up -d auth portal bag-filter nginx backup
   docker compose ps
   ```

4. Buka `PUBLIC_ORIGIN`, login dengan akun bootstrap, dan ganti password sementara. Setelah itu buat akun dan scope melalui **Kelola akses**.
5. Hapus `BOOTSTRAP_PASSWORD` dari `.env` dan simpan password baru di pengelola password organisasi.

Akun bootstrap adalah admin portal, admin Consumable Room, admin Drawing Database, serta admin Bag Filter untuk enam equipment (semuanya BF1). Bootstrap yang dijalankan ulang tidak mengubah akun yang sudah ada. Untuk upgrade dari katalog empat equipment, ikuti bagian migrasi equipment di [panduan operasional](docs/OPERATIONS.md).

> [!CAUTION]
> Jangan memakai `docker compose down -v` pada deployment berisi data.

### VPS `tq-cmms.com`

VPS ini memakai **Nginx host yang sudah ada**. Runbook memakai override khusus agar gateway Docker hanya membuka port loopback dan tidak berebut port 80/443 dengan website lain.

| Keperluan                                | Panduan                                                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instalasi di VPS                         | [Runbook VPS](docs/deployment/VPS-TQ-CMMS.md) dan [handover OpenClaw](docs/deployment/OPENCLAW-HANDOVER.md)                                             |
| Membawa data aktual dari Docker lokal    | [Migrasi/backup restore](docs/deployment/DATABASE-LOCAL-TO-VPS.md) dan [prompt OpenClaw khusus database](docs/deployment/OPENCLAW-DATABASE-HANDOVER.md) |
| Pengembangan PC/Mac sampai pembaruan VPS | [Alur development ke VPS](docs/deployment/DEVELOPMENT-TO-VPS.md)                                                                                        |

Restore mempertahankan ketiga database, akun, dan izin; jalur ini tidak memakai bootstrap atau impor master ulang.

Setelah VPS live, folder `plant-area-system` pada PC tetap menjadi workspace aktif dan Mac memakai clone GitHub sendiri. Runtime dan database development dipisahkan dari arsip sumber migrasi dan produksi. Fitur dirilis melalui GitHub dan SHA yang lolos CI; workflow CI saat ini belum mempunyai job deploy otomatis.

### Memperbarui satu aplikasi

Build terpisah per aplikasi:

```sh
pnpm --filter @plant/portal build
pnpm --filter @plant/auth build
pnpm --filter @plant/bag-filter build
pnpm --filter @plant/consumables build
pnpm --filter @plant/drawings build # menyalin aset PDF.js ke apps/drawings/public/pdfjs/ (tidak dikomit)
```

Dockerfile menerima `--build-arg APP=portal|auth|bag-filter|consumables|drawings`. Untuk memperbarui satu aplikasi, build image baru lalu jalankan `docker compose up -d --no-deps bag-filter` (sesuaikan nama layanan). Pada VPS gunakan fungsi `dc` dan override produksi sesuai runbook. Simpan image/tag lama untuk rollback.

### Sebelum go-live

- Hostname dan sertifikat organisasi.
- Rahasia deployment.
- Salinan backup di luar host.
- Uji orientasi oleh operator.
- Restore drill pada server tujuan.

## Panduan per aplikasi

### Bag Filter

Admin Bag Filter dalam cakupan equipment dapat [membatalkan record penggantian yang salah](docs/BAG-FILTER-CANCELLATION.md). Fitur ini memerlukan migrasi Bag Filter `0003_batch_cancellations`; baca prosedur upgrade/rollback pada [panduan operasional](docs/OPERATIONS.md).

### Consumable Room v1.1 (R22)

Satu stok R22 pada `/consumables`, tanpa pengelolaan lokasi. Rak tetap opsional.

- Consume/Return memakai HAC/SAC wajib dan keranjang multi-item persisten.
- Penerimaan Picklist mendukung konversi SAP → satuan terkecil R22 serta bukti cetak bernomor.
- Role Viewer, Client, R22 Cashier, dan Admin mengatur tindakan; semua grant melihat stok dan riwayat yang sama.

Mulai dari [PRD R22](docs/CONSUMABLE-ROOM-PRD.md), [kontrak API](docs/API.md), serta [upgrade R22 dan handover OpenClaw](docs/deployment/R22-UPGRADE.md). Migrasi aditif `0002`/`0003` mempertahankan master dan history. Preflight menolak data yang perlu digabungkan dan tidak mereset database. Produksi harus diperbarui melalui SHA teruji dan checkpoint backup/maintenance.

```sh
pnpm consumables:preflight
pnpm consumables:import-naming /private/naming.csv --dry-run
pnpm consumables:import-naming /private/naming.csv --apply
pnpm consumables:reconcile
```

Impor master tidak membawa saldo SAP. Saldo R22 dikonfirmasi melalui hitung fisik; detail format CSV dan aturan replay ada di runbook R22.

### Drawing Database v1

Aplikasi kelima pada `/drawings`:

- Drawing Library, Create Drawing, dan Upload Old Drawing (Legacy Ready).
- Check dan approval L1/Final dengan stamp di halaman 1.
- Revisi baru tanpa mematikan Final Drawing yang berlaku.
- Drawing Request, Tugas saya, notifikasi in-app, dan ringkasan.
- PDF viewer in-page (PDF.js).

Role Viewer, Drafter, Draft Leader, Approver L1, Head, dan Admin diberikan lewat **Kelola akses**. Pembuat drawing tidak dapat memutus Check/Approval atas drawing sendiri.

Persyaratan ada di [PRD Drawing Database](docs/DRAWING-DATABASE-PRD.md), kontrak di [API](docs/API.md#drawing-database-v1), operasi di [OPERATIONS](docs/OPERATIONS.md#drawing-database-instalasi-upgrade-dan-operasi), dan rilis di [runbook](docs/deployment/DRAWING-DATABASE-RELEASE.md).

Perintah operator:

```sh
pnpm drawings:provision            # database/user plant_drawings pada volume MySQL lama
pnpm drawings:reconcile --hash     # tabel file vs storage, read-only
pnpm drawings:storage-copy --dry-run
pnpm drawings:import-legacy --dir <folder> --dry-run --offline   # impor arsip Legacy Ready
```

Impor arsip massal (`drawings:import-legacy`) membaca `manifest.csv`, `conversion.csv`, dan `pdf/` yang disiapkan di luar repositori, lalu membuat satu drawing Legacy Ready per baris lewat aturan yang sama dengan form Upload Old Drawing. Langkah lengkap ada di [runbook](docs/deployment/DRAWING-DATABASE-RELEASE.md#6-impor-arsip-legacy-ready).

## Dokumentasi

| Dokumen                                              | Isi                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| [PRD v2](docs/PRD-v2.md)                             | Tujuan platform, akun dan akses, Bag Filter, dan arsitektur |
| [PRD Consumable Room](docs/CONSUMABLE-ROOM-PRD.md)   | Persyaratan Consumable Room R22                             |
| [PRD Drawing Database](docs/DRAWING-DATABASE-PRD.md) | Persyaratan Drawing Database                                |
| [Kontrak API](docs/API.md)                           | Endpoint dan bentuk data tiap aplikasi                      |
| [Tema UI](docs/UI-THEME.md)                          | Shell, komponen, peta bag, dan aturan kontras               |
| [Panduan operasional](docs/OPERATIONS.md)            | Topologi, health, backup, restore, dan prosedur upgrade     |
| [Runbook deployment](docs/deployment/)               | VPS, migrasi database, R22, dan rilis Drawing Database      |
| [Rencana implementasi](docs/IMPLEMENTATION-PLAN.md)  | Struktur dan keputusan implementasi                         |
| [Audit](docs/AUDIT.md)                               | Audit baseline dan penanganannya di v2                      |
| [Hasil validasi](docs/VALIDATION.md)                 | Pemeriksaan aktual per rilis                                |
| [Panduan agen](AGENTS.md)                            | Aturan kerja untuk agen AI di repositori ini                |

## Keamanan dan data

- Rahasia, sertifikat privat, dump, backup, dan data perusahaan tidak pernah masuk Git atau image. `.gitignore` dan `.dockerignore` mengatur pengecualiannya.
- CSV penamaan, katalog, PPTX, dump, serta arsip drawing perusahaan tetap privat di luar repositori.
- `.env`, `infra/certs/`, `.deploy/`, dan `.test-runtime/` hanya ada di mesin masing-masing.
- Script uji tidak boleh diarahkan ke produksi, dan suite integrasi tidak boleh dijalankan terhadap database development atau arsip nyata.
