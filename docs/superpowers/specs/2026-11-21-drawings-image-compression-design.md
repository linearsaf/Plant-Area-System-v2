# Desain: kompresi gambar Drawing Database ke WebP

Tanggal: 2026-11-21 · Cakupan: gambar referensi Drawing Request dan lampiran keputusan reject.

## Maksud

Foto referensi diambil dari HP dan saat ini disimpan apa adanya: 3–8 MB per foto, maksimal 3 foto, dan sering ditolak karena melebihi 5 MB. Perubahan ini punya dua tujuan:

1. **Menghemat tagihan storage** (bucket S3 atau volume `fs`) dengan menyimpan gambar dalam WebP yang dikompres.
2. **Mempercepat drafter memuat gambar referensi**: file lebih kecil, thumbnail untuk daftar, dan cache browser yang tetap memeriksa izin.

Pengguna juga mengambil foto dari beberapa sudut, sehingga batas jumlah gambar dinaikkan dari 3 menjadi **10 per item**.

## Tujuan

- Gambar baru disimpan sebagai `image/webp` dengan sisi terpanjang ≤ 2560 px, tanpa metadata EXIF/XMP (termasuk GPS).
- Kompresi pertama dilakukan di browser agar upload dari HP cepat. Server memeriksa hasilnya dan mengonversi bila tidak memenuhi syarat.
- Setiap gambar punya thumbnail WebP ≤ 480 px buatan server untuk daftar gambar.
- Maksimal 10 gambar per request dan per keputusan reject.
- File asli dari HP sampai 25 MB tetap diterima bila kompresi di browser gagal.
- Container `drawings` mendapat anggaran memori dan CPU yang cukup untuk `sharp`.

## Non-goal

- Mengonversi gambar lama (`.jpg`/`.png`) yang sudah tersimpan. Storage bersifat append-only; gambar lama tetap disajikan apa adanya tanpa thumbnail.
- Dukungan HEIC/AVIF sebagai format input atau output.
- Kompresi PDF drawing atau perubahan impor TIFF legacy.

## Anti-goal (gagal walau secara teknis jalan)

- Detail foto (tulisan nameplate, tag equipment) tidak terbaca drafter setelah kompresi.
- Lokasi GPS atau metadata kamera ikut tersimpan.
- Container `drawings` kehabisan memori (OOM) saat beberapa orang mengunggah bersamaan.
- Izin akses gambar melemah demi cache.

## Kondisi saat ini

- Client: [image-upload.tsx](../../../apps/drawings/app/image-upload.tsx) mengirim file mentah ke `POST /drawings/api/uploads?kind=image`, batas 3 dan 5 MB.
- Server: `stageUpload` di [files.ts](../../../packages/drawings-core/src/files.ts) memeriksa magic bytes (`detectImage`), menyimpan body apa adanya dengan key `files/<tahun>/<id>.<ext>`, lalu mencatat `drawing_files` (size, SHA-256).
- Batas jumlah: `IMAGE_MAX_PER_ITEM = 3` ([config.ts](../../../packages/drawings-core/src/config.ts)), `max(3)` di [drawings-requests.ts](../../../packages/contracts/src/drawings-requests.ts) dan [drawings-workflow.ts](../../../packages/contracts/src/drawings-workflow.ts), konstanta `MAX` di client.
- Tampilan: [requests-ui.tsx](../../../apps/drawings/app/requests-ui.tsx) dan [workflow-panel.tsx](../../../apps/drawings/app/workflow-panel.tsx) menampilkan file penuh sebagai thumbnail.
- `serveFile` mengirim `Cache-Control: private, no-store`, sehingga setiap kunjungan mengunduh ulang semua gambar.
- Container VPS `drawings`: `mem_limit: 768m`, `cpus: 0.75`, `--max-old-space-size=512` ([compose.vps.yaml](../../../infra/deploy/compose.vps.yaml)).
- `sharp@0.35.5` sudah ada di lockfile (dependensi Next.js) dan diizinkan di `allowBuilds` pada `pnpm-workspace.yaml`.

## Pendekatan yang dipertimbangkan

| Opsi | Ringkasan | Trade-off |
|---|---|---|
| A | Browser mengecilkan untuk transport; server selalu meng-encode ulang dengan `sharp`. | Hasil seragam dan server tidak memercayai klien; ada kompresi ganda dan CPU server lebih banyak. |
| **B (dipilih)** | Browser membuat WebP final; server menyimpan apa adanya bila lolos pemeriksaan, dan mengonversi bila tidak. | CPU server hemat, tanpa kompresi ganda; ada dua jalur kode dan server harus memeriksa metadata WebP dengan teliti. |
| C | Konversi hanya di server. | Paling sederhana, tetapi upload dari HP tetap lambat; dicoret karena pengguna meminta keduanya. |

Pengguna memilih **B**.

## Desain

### 1. Browser: kompresi sebelum upload

Modul baru `apps/drawings/app/compress-image.ts`, dipanggil oleh `ImageUpload` untuk setiap file sebelum dikirim.

- Tanpa library tambahan. `browser-image-compression` secara default memuat worker dari CDN jsDelivr yang diblokir CSP `script-src 'self'`; API bawaan browser sudah cukup.
- Langkah:
  1. `createImageBitmap(file, { imageOrientation: 'from-image' })` agar orientasi EXIF diterapkan.
  2. Hitung ukuran target: sisi terpanjang ≤ 2560 px, tanpa memperbesar.
  3. Gambar ke canvas, lalu `toBlob('image/webp', 0.82)`.
  4. Bila `blob.type !== 'image/webp'` (browser tidak bisa encode WebP, kemungkinan Safari iOS), ulangi dengan `toBlob('image/jpeg', 0.85)`. Server akan mengonversinya ke WebP.
  5. Bila hasil lebih besar dari file asli dan file asli sudah ≤ 2560 px, kirim file asli.
  6. Bila langkah mana pun gagal (decode gagal, canvas terlalu besar, kehabisan memori), kirim file asli. Server tetap mengonversi.
- Nama file: ekstensi diganti sesuai format hasil (`foto.jpg` → `foto.webp`).
- Validasi client: tipe JPEG/PNG/WebP, file asli ≤ 25 MB, maksimal 10 gambar.
- Hint/progres: `Memproses gambar 3/10…` lalu `Mengunggah…`. Upload tetap berurutan seperti sekarang.
- Pratinjau setelah upload memakai thumbnail (`/drawings/api/uploads/<id>/file?variant=thumb`).

Hasil encode canvas tidak membawa EXIF/XMP, sehingga jalur normal di browser modern menghasilkan WebP yang lolos pemeriksaan server tanpa encode ulang.

### 2. Server: periksa, konversi bila perlu, buat thumbnail

Modul baru `packages/drawings-core/src/images.ts` dengan `sharp` sebagai dependensi langsung `@plant/drawings-core` (versi sama dengan lockfile, `0.35.5`). Cabang `kind === 'image'` pada `stageUpload` memanggilnya.

**Konfigurasi `sharp`** (sekali saat modul dimuat): `sharp.cache(false)`, `sharp.concurrency(1)`. Semaphore di dalam proses membatasi **2 pemrosesan gambar bersamaan**; permintaan lain menunggu maksimal 30 detik, lalu mendapat 503 `Server sedang memproses gambar lain. Coba lagi.`

**Opsi input** untuk semua pemanggilan: `{ failOn: 'warning', limitInputPixels: 120_000_000 }` (cukup untuk kamera HP 108 MP). Gambar di atas batas ditolak 422 `Resolusi gambar terlalu besar.`

**Alur:**

1. Validasi yang ada tetap berjalan: `Content-Type` JPEG/PNG/WebP, magic bytes harus sesuai tipe yang dideklarasikan, SVG ditolak. Batas body mentah menjadi **25 MB** (`IMAGE_MAX_BYTES`).
2. `sharp(path).metadata()`. Gagal dibaca menjadi 422 `Gambar harus JPEG, PNG atau WebP yang valid.`
3. **Syarat simpan apa adanya (pass-through)**, semuanya harus benar:
   - `format === 'webp'`
   - tidak beranimasi (`pages` tidak ada atau 1)
   - tidak ada `exif`, `xmp`, `iptc`, dan tidak ada `orientation`
   - `max(width, height) ≤ 2560`
   - ukuran file ≤ 1,5 MB (`IMAGE_PASSTHROUGH_MAX_BYTES`)
   
   Logika ini berupa fungsi murni `needsConversion(metadata, size)` agar mudah diuji unit.
4. Bila tidak lolos, konversi ke file sementara:
   `sharp(path, { autoOrient: true, ... }).resize(2560, 2560, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80, effort: 4, smartSubsample: true }).toFile(tmp)`.
   Metadata dibuang secara default oleh `sharp` (tanpa `keepMetadata()`). Gambar beranimasi hanya mengambil frame pertama.
5. **Thumbnail** dari file final (pass-through atau hasil konversi):
   `resize(480, 480, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 70 })`. Langkah ini juga men-decode seluruh gambar, sehingga file pass-through yang rusak tetap tertolak.
6. Size dan SHA-256 dihitung ulang dari file final dan thumbnail, bukan dari body upload.
7. Simpan dua objek: `files/<tahun>/<id>.webp` dan `files/<tahun>/<id>.thumb.webp`. `storageKey`/`assertKey` di [storage.ts](../../../packages/drawings-core/src/storage.ts) diperluas untuk varian thumbnail.
8. Catat `drawing_files` dengan `mime = 'image/webp'`, `originalName` berekstensi `.webp`, beserta kolom thumbnail. Audit `file.staged` menambah `converted` (boolean) dan `uploadedSize`.
9. Bila pencatatan database gagal, kedua objek dihapus. File sementara selalu dihapus di `finally`.

### 3. Skema

Migrasi `packages/drawings-core/migrations/0006_image_thumbnails.sql`, menambah kolom nullable pada `drawing_files`:

| Kolom | Tipe |
|---|---|
| `thumb_storage_key` | `varchar(200)` unique, null |
| `thumb_size` | `bigint`, null |
| `thumb_sha256` | `char(64)`, null |

Thumbnail disimpan sebagai kolom pada baris yang sama, bukan baris `drawing_files` terpisah, agar satu gambar tetap satu baris dan status `staged → attached → orphaned` tidak perlu disinkronkan antar-baris. Konsekuensinya, `cleanupStagedFiles`, `drawings-reconcile.ts` dan `drawings-storage-copy.ts` harus ikut menangani `thumb_storage_key`.

### 4. Penyajian dan cache

- `GET /drawings/api/attachments/:id?variant=thumb` dan `GET /drawings/api/uploads/:id/file?variant=thumb`. Bila `thumb_storage_key` kosong (gambar lama), sajikan file penuh.
- Untuk respons **gambar**: `Cache-Control: private, no-cache, no-transform` dengan ETag dari SHA-256 varian yang disajikan. Izin diperiksa lebih dulu; bila `If-None-Match` cocok, server membalas `304` tanpa membaca storage.
- PDF tetap `private, no-store` seperti sekarang.
- Daftar gambar di `requests-ui.tsx` dan `workflow-panel.tsx` memakai `?variant=thumb`; tautan ke gambar penuh tetap. Grid `.attachment-list` harus rapi untuk 10 gambar di HP dan desktop.

### 5. Batas jumlah gambar

`IMAGE_MAX_PER_ITEM = 10` dipakai sebagai satu sumber kebenaran di `drawings-core`, schema contracts (`max(10, …)` untuk `imageIds` dan `attachmentIds`), dan `MAX` di client. Pesan: `Maksimal 10 gambar.`

### 6. Infra

[compose.vps.yaml](../../../infra/deploy/compose.vps.yaml) layanan `drawings`:

- `mem_limit: 768m` → **`1536m`**
- `cpus: 0.75` → **`1.5`**
- `NODE_OPTIONS: --max-old-space-size=512` tetap; memori libvips berada di luar heap V8.

Total `mem_limit` semua container naik dari sekitar 4,5 GB menjadi sekitar 5,2 GB, masih di bawah RAM VPS 9 GB dengan sisa bebas 3–5 GB saat ini.

Dockerfile memakai `node:*-bookworm-slim` (glibc), sehingga binary prebuilt `@img/sharp-linux-x64` dapat dipakai. Output `standalone` Next.js harus menyertakan `sharp` dan paket `@img/*`; hal ini diverifikasi pada build image.

### 7. Dokumentasi

- [PRD Drawing Database](../../DRAWING-DATABASE-PRD.md): batas 10 gambar (§ reject, § request), aturan gambar di § upload (25 MB input, WebP output, 2560 px, thumbnail, metadata dibuang), aturan cache gambar, anggaran memori VPS.
- [API.md](../../API.md): parameter `variant=thumb`, respons 304, batas baru.
- Graph Graphify diperbarui secara inkremental setelah implementasi.

## Pengujian

- **Unit:** `needsConversion`, penggantian ekstensi nama, key thumbnail, schema contracts menerima 10 dan menolak 11.
- **Integration** (`plant-v2-test`, driver `fs` dan `s3`):
  - JPEG besar dengan EXIF GPS dan orientasi diputar → tersimpan WebP, ≤ 2560 px, tanpa EXIF, orientasi benar, ada thumbnail.
  - WebP bersih ≤ 2560 px → SHA-256 tersimpan sama dengan input (pass-through).
  - WebP dengan EXIF, WebP beranimasi, WebP > 2560 px → dikonversi.
  - Gambar rusak dan gambar > 120 MP → 422.
  - Cleanup staged menghapus file penuh dan thumbnail.
  - `If-None-Match` → 304; tanpa izin tetap 404.
- **E2E:** unggah 10 gambar, gambar ke-11 ditolak; thumbnail tampil di detail request dan panel workflow.
- **Manual:** iPhone (Safari) dan Android sungguhan, memeriksa hasil format, ukuran dan keterbacaan tulisan nameplate pada foto lapangan.
- **Beban memori:** pada container dengan batas VPS, dua upload bersamaan JPEG 25 MB dan PNG resolusi tinggi sambil memantau `docker stats`; puncak memori harus jauh di bawah 1536 MB.

## Keputusan builder (dibuat saat desain, dapat dikoreksi)

- Kualitas browser WebP 0,82 / JPEG 0,85; server WebP 80 effort 4 dengan `smartSubsample`; thumbnail 70.
- Batas pass-through 1,5 MB dan resolusi input 120 MP.
- Semaphore 2 slot dengan antrean 30 detik.
- Thumbnail sebagai kolom, bukan baris terpisah.
- Animasi diambil frame pertamanya, bukan ditolak.

## Diserahkan ke builder

- Kompresi browser di main thread atau di worker `OffscreenCanvas` (CSP sudah mengizinkan `worker-src 'self' blob:`).
- Detail tata letak grid untuk 10 gambar.
- Cara terbaik memastikan `sharp` ikut dalam output `standalone` (tracing otomatis atau `outputFileTracingIncludes`).
