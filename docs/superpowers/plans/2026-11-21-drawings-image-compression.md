# Kompresi Gambar Drawing Database ke WebP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gambar referensi request dan lampiran reject dikompres di browser, diperiksa/dikonversi di server, disimpan sebagai WebP ≤ 2560 px beserta thumbnail 480 px, dengan batas 10 gambar per item.

**Architecture:** Browser meng-encode WebP lewat canvas (fallback JPEG/file asli). Server (`images.ts`, `sharp`) menyimpan WebP bersih apa adanya dan mengonversi selainnya, lalu selalu membuat thumbnail. Thumbnail disimpan sebagai objek kedua yang dicatat pada kolom baru di baris `drawing_files` yang sama. Gambar disajikan dengan `private, no-cache` + ETag/304; PDF tetap `no-store`.

**Tech Stack:** Next.js 16.4.2, TypeScript, `sharp@0.35.5`, drizzle-orm (MySQL), zod 4, `node:test` via `tsx`, Playwright.

**Spec:** [docs/superpowers/specs/2026-11-21-drawings-image-compression-design.md](../specs/2026-11-21-drawings-image-compression-design.md)

## Global Constraints

- Batas jumlah: **10** gambar per request (`imageIds`) dan per keputusan (`attachmentIds`). Pesan: `Maksimal 10 gambar referensi.` / `Maksimal 10 gambar.`
- Batas body upload gambar mentah: **25 MB** (`25 * 1024 * 1024`).
- Output: `image/webp`, sisi terpanjang ≤ **2560** px, tanpa EXIF/XMP/IPTC; thumbnail ≤ **480** px.
- Pass-through hanya bila: format `webp`, `pages` tidak ada atau 1, tanpa `exif`/`xmp`/`iptc`/`orientation`, `max(w,h) ≤ 2560`, ukuran ≤ **1,5 MB** (`1.5 * 1024 * 1024`).
- `sharp` konversi: `autoOrient: true`, `resize(2560, 2560, { fit: 'inside', withoutEnlargement: true })`, `webp({ quality: 80, effort: 4, smartSubsample: true })`. Thumbnail: `resize(480, 480, { fit: 'inside', withoutEnlargement: true })`, `webp({ quality: 70 })`.
- Input `sharp`: `{ failOn: 'warning' }`; tolak bila `width * height > 120_000_000` dengan 422 `Resolusi gambar terlalu besar.`
- `sharp.cache(false)`, `sharp.concurrency(1)`; maksimal 2 pemrosesan bersamaan, antre maks. 30 detik → 503 `Server sedang memproses gambar lain. Coba lagi.` (code `IMAGE_BUSY`).
- Browser: WebP kualitas `0.82`, fallback JPEG `0.85`; tanpa library tambahan.
- Key storage: `files/<tahun>/<id>.webp` dan `files/<tahun>/<id>.thumb.webp`.
- Respons gambar: `Cache-Control: private, no-cache, no-transform`; PDF tetap `private, no-store, no-transform`.
- Gambar lama (jpg/png, tanpa thumbnail) tidak dimigrasi dan tetap tersaji.
- Teks UI dan pesan error dalam Bahasa Indonesia, mengikuti gaya yang ada.
- Pemeriksaan: `pnpm typecheck`, `pnpm test`; integration/E2E hanya pada `plant-v2-test` sesuai README.

## Review Focus

1. **Foto HP portrait dengan EXIF Orientation 6** harus tersimpan tegak dan tanpa tag orientasi, baik lewat browser maupun upload langsung. → test `converts rotated JPEG upright and strips EXIF` (Task 3).
2. **WebP dari klien yang membawa chunk EXIF/XMP (GPS)** tidak boleh lolos pass-through. → test `webp with exif is converted` (Task 3).
3. **Thumbnail gambar lama** (`thumb_storage_key` null) harus jatuh ke file penuh, bukan 404. → test `variant=thumb falls back to full file for legacy images` (Task 5).
4. **304 tidak boleh melewati pemeriksaan izin**: user tanpa akses dengan `If-None-Match` yang benar tetap 404. → test `If-None-Match does not bypass permission` (Task 5).
5. **Pencatatan database gagal / cleanup staged** harus menghapus kedua objek (penuh + thumbnail), agar tidak ada objek yatim yang ditagih. → test `staged image cleanup removes full and thumbnail objects` (Task 4).

---

### Task 1: Batas 10 gambar dan 25 MB

**Files:**
- Modify: `packages/contracts/src/drawings-requests.ts:78`
- Modify: `packages/contracts/src/drawings-workflow.ts:74`
- Modify: `packages/drawings-core/src/config.ts:14-15`
- Modify: `apps/drawings/app/image-upload.tsx:7,10,34,59`
- Modify: `apps/drawings/app/requests-ui.tsx:185`, `packages/drawings-core/src/approval.ts:137` (komentar)
- Test: `tests/unit/drawings-requests.test.ts`, `tests/unit/drawings-files.test.ts`

**Interfaces:**
- Produces: `IMAGE_MAX_PER_ITEM = 10` diekspor dari `@plant/contracts` (didefinisikan di `drawings-requests.ts`, dipakai `drawings-workflow.ts`); `drawings-core/config.ts` me-re-export dari contracts (hapus definisi lokal). `IMAGE_MAX_BYTES = 25 * 1024 * 1024`.

- [ ] **Step 1: Tulis test gagal**

```ts
test('request and decision schemas accept 10 images and reject 11', () => {
  const ids = Array.from({ length: 11 }, () => randomUUID());
  assert.equal(requestCreateSchema.safeParse({ hac: 'H', description: 'x', purpose: 'y', imageIds: ids.slice(0, 10) }).success, true);
  const bad = requestCreateSchema.safeParse({ hac: 'H', description: 'x', purpose: 'y', imageIds: ids });
  assert.equal(bad.success, false);
  assert.match(bad.error!.issues[0].message, /Maksimal 10 gambar referensi/);
  // ulangi untuk schema keputusan reject yang memakai `attachments` (attachmentIds) dengan pesan /Maksimal 10 gambar/
});
test('image upload limit is 25 MB', () => assert.equal(uploadLimit('image'), 25 * 1024 * 1024));
```
Perbarui test lama di `drawings-requests.test.ts:64` yang mengandalkan batas 3 (4 id duplikat) agar tetap menguji duplikat, bukan batas.

- [ ] **Step 2: Jalankan, pastikan gagal** — `pnpm test` → FAIL pada dua test baru.
- [ ] **Step 3: Implementasi** — konstanta di contracts, `.max(IMAGE_MAX_PER_ITEM, …)` di kedua schema, `IMAGE_MAX_BYTES` 25 MB, client `MAX = 10`, cek ukuran client 25 MB, hint `maks. 10, JPEG/PNG/WebP ≤ 25 MB`, komentar yang menyebut "3" dan "5 MB".
- [ ] **Step 4: Jalankan** — `pnpm test` dan `pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** — `feat(drawings): allow 10 images up to 25 MB per item`

---

### Task 2: Aturan murni gambar dan key thumbnail

**Files:**
- Create: `packages/drawings-core/src/images.ts` (bagian murni saja di task ini)
- Modify: `packages/drawings-core/src/storage.ts:42-49`, `packages/drawings-core/src/config.ts`, `packages/drawings-core/src/index.ts`
- Test: `tests/unit/drawings-images.test.ts` (baru)

**Interfaces:**
- Produces (dari `images.ts`, diekspor lewat `index.ts`):
  - `type ImageFacts = { format?: string; width?: number; height?: number; pages?: number; exif?: unknown; xmp?: unknown; iptc?: unknown; orientation?: number }`
  - `needsConversion(facts: ImageFacts, size: number): boolean`
  - `webpName(name: string): string` — ganti ekstensi terakhir dengan `.webp` (tambahkan bila tidak ada), hasil ≤ 200 karakter dengan ekstensi tetap utuh.
- Produces (dari `config.ts`): `IMAGE_MAX_SIDE = 2560`, `THUMB_MAX_SIDE = 480`, `IMAGE_PASSTHROUGH_MAX_BYTES = 1.5 * 1024 * 1024`, `IMAGE_MAX_INPUT_PIXELS = 120_000_000`.
- Produces (dari `storage.ts`): `thumbKey(id: string, now?: Date): string` → `files/<UTC year>/<id>.thumb.webp`; `KEY_PATTERN` menerima `.thumb.webp`.

- [ ] **Step 1: Tulis test gagal**

```ts
const clean = { format: 'webp', width: 2560, height: 1440 };
test('clean small webp passes through', () => assert.equal(needsConversion(clean, 1_000_000), false));
test('needsConversion flags every disqualifier', () => {
  for (const facts of [
    { ...clean, format: 'jpeg' }, { ...clean, pages: 2 }, { ...clean, exif: Buffer.from('x') },
    { ...clean, xmp: Buffer.from('x') }, { ...clean, iptc: Buffer.from('x') }, { ...clean, orientation: 6 },
    { ...clean, width: 2561 }, { ...clean, height: 2561 },
  ]) assert.equal(needsConversion(facts, 1000), true, JSON.stringify(facts));
  assert.equal(needsConversion(clean, 1.5 * 1024 * 1024 + 1), true);
  assert.equal(needsConversion({ ...clean, pages: 1 }, 1000), false);
});
test('webpName swaps or appends the extension within 200 chars', () => {
  assert.equal(webpName('foto.JPG'), 'foto.webp');
  assert.equal(webpName('scan'), 'scan.webp');
  assert.equal(webpName('a.b.png'), 'a.b.webp');
  const long = webpName('x'.repeat(199) + '.jpg');
  assert.equal(long.length, 200); assert.ok(long.endsWith('.webp'));
});
test('thumbKey sits beside the full key and passes key validation', () => {
  const id = randomUUID(), now = new Date('2026-03-01T00:00:00Z');
  assert.equal(thumbKey(id, now), `files/2026/${id}.thumb.webp`);
  assert.throws(() => assertKey(`files/2026/${id}.thumb.png`));
});
```
(`assertKey` perlu diekspor dari `index.ts` bila belum.)

- [ ] **Step 2: Jalankan** — `pnpm test` → FAIL (simbol belum ada).
- [ ] **Step 3: Implementasi** sesuai Interfaces. `needsConversion` mengembalikan `true` bila salah satu syarat pass-through di Global Constraints tidak terpenuhi (termasuk `width`/`height` tidak diketahui).
- [ ] **Step 4: Jalankan** — `pnpm test` → PASS.
- [ ] **Step 5: Commit** — `feat(drawings): add webp pass-through rules and thumbnail keys`

---

### Task 3: Pemrosesan gambar dengan sharp

**Files:**
- Modify: `packages/drawings-core/src/images.ts`, `packages/drawings-core/src/index.ts`
- Modify: `packages/drawings-core/package.json` (dependency `"sharp": "0.35.5"`), `package.json` root (devDependency `"sharp": "0.35.5"` untuk fixture test), `pnpm-lock.yaml` via `pnpm install`
- Test: `tests/unit/drawings-images.test.ts`

**Interfaces:**
- Consumes: Task 2 (`needsConversion`, konstanta config).
- Produces:
  - `type ProcessedFile = { path: string; size: number; sha256: string }`
  - `type ProcessedImage = { full: ProcessedFile; thumb: ProcessedFile; converted: boolean }`
  - `processImage(input: ProcessedFile): Promise<ProcessedImage>` — `input` adalah body upload (`path`, `size`, `sha256`). Bila pass-through, `full` = `input`. Bila dikonversi, `full.path = input.path + '.webp'`. Thumbnail selalu di `input.path + '.thumb.webp'`. Pemanggil yang menghapus semua path.
  - `withImageSlot<T>(fn: () => Promise<T>, options?: { slots?: number; waitMs?: number }): Promise<T>` — default `slots: 2`, `waitMs: 30_000`; antre FIFO; timeout → `AppError(503, 'Server sedang memproses gambar lain. Coba lagi.', 'IMAGE_BUSY')`. Satu antrean modul-level untuk default; test boleh memanggil dengan opsi kecil (gunakan instance terpisah: ekspor juga `createImageSlots(slots: number, waitMs: number)` yang mengembalikan fungsi `run<T>(fn)`; `withImageSlot` memakai instance default).
- Error dari `processImage`: metadata gagal dibaca atau decode gagal → `AppError(422, 'Gambar harus JPEG, PNG atau WebP yang valid.', 'FILE_INVALID')`; piksel > `IMAGE_MAX_INPUT_PIXELS` → `AppError(422, 'Resolusi gambar terlalu besar.', 'FILE_INVALID')`.

- [ ] **Step 1: Tulis test gagal** (fixture dibuat dengan `sharp({ create: … })` ke `dir` sementara; helper `facts(path)` = `sharp(path).metadata()`)

```ts
test('clean webp passes through byte-identical with a thumbnail', async () => {
  const input = await fixture(sharp({ create: { width: 1200, height: 800, channels: 3, background: '#4a7' } }).webp({ quality: 80 }));
  const out = await processImage(input);
  assert.equal(out.converted, false);
  assert.equal(out.full.path, input.path); assert.equal(out.full.sha256, input.sha256);
  const t = await sharp(out.thumb.path).metadata();
  assert.equal(t.format, 'webp'); assert.equal(Math.max(t.width!, t.height!), 480);
});
test('converts rotated JPEG upright and strips EXIF', async () => {
  // 4000x3000 JPEG dengan withExif({ IFD0: { Orientation: '6' } }) / withMetadata({ orientation: 6 })
  const out = await processImage(input);
  const m = await sharp(out.full.path).metadata();
  assert.equal(out.converted, true); assert.equal(m.format, 'webp');
  assert.deepEqual([m.width, m.height], [1920, 2560]); // tegak setelah autoOrient
  assert.equal(m.exif, undefined); assert.equal(m.orientation, undefined);
  assert.equal(out.full.sha256, sha(await readFile(out.full.path)));
});
test('webp with exif is converted', async () => { /* webp 800x600 + withExif(...) → converted true, exif undefined */ });
test('oversized and animated webp are converted to a single 2560px frame', async () => { /* 3000x1000 webp → 2560x853; webp animasi 2 frame → pages undefined/1 */ });
test('png with alpha becomes webp and keeps alpha', async () => { /* channels 4 → m.hasAlpha true */ });
test('corrupt image is rejected as FILE_INVALID', async () => { /* header JPEG + byte acak → AppError 422 FILE_INVALID */ });
test('images over 120 megapixels are rejected', async () => { /* PNG 11000x11000 hitam (kecil terkompresi) → 422 /Resolusi gambar terlalu besar/ */ });
test('image slots run at most N at once and time out waiting callers', async () => {
  const run = createImageSlots(1, 50);
  let release!: () => void;
  const first = run(() => new Promise<void>((r) => (release = r)));
  await assert.rejects(run(async () => 1), (e) => e instanceof AppError && e.status === 503 && e.code === 'IMAGE_BUSY');
  release(); await first;
  assert.equal(await run(async () => 2), 2);
});
```

- [ ] **Step 2: Jalankan** — `pnpm test` → FAIL.
- [ ] **Step 3: Tambah dependency** — `pnpm --filter @plant/drawings-core add sharp@0.35.5` dan `pnpm add -D -w sharp@0.35.5`; pastikan lockfile tetap memakai 0.35.5 yang sudah ada.
- [ ] **Step 4: Implementasi** `processImage`/`withImageSlot`/`createImageSlots` sesuai Global Constraints. Urutan: `metadata()` → cek piksel → `needsConversion` → konversi (bila perlu) ke `input.path + '.webp'` → thumbnail dari file final (decode penuh, sekaligus validasi pass-through) → hitung size/SHA-256 dari file yang ditulis. `sharp.cache(false)` dan `sharp.concurrency(1)` dipanggil sekali saat modul dimuat.
- [ ] **Step 5: Jalankan** — `pnpm test` dan `pnpm typecheck` → PASS.
- [ ] **Step 6: Commit** — `feat(drawings): convert images to webp with sharp and build thumbnails`

---

### Task 4: Simpan hasil konversi dan thumbnail

**Files:**
- Create: `packages/drawings-core/migrations/0006_image_thumbnails.sql` + snapshot/journal via `pnpm db:generate:drawings`
- Modify: `packages/drawings-core/src/schema.ts:259-285`, `packages/drawings-core/src/files.ts:86-196`, `packages/drawings-core/src/index.ts`
- Modify: `scripts/drawings-reconcile.ts`, `scripts/drawings-storage-copy.ts`
- Test: `tests/integration/drawings-files.test.ts`

**Interfaces:**
- Consumes: Task 3 `processImage`, `withImageSlot`; Task 2 `thumbKey`, `webpName`.
- Produces:
  - Kolom `files.thumbStorageKey` (`thumb_storage_key varchar(200)` unique, null), `files.thumbSize` (`thumb_size bigint` mode number, null), `files.thumbSha256` (`thumb_sha256 char(64)`, null).
  - `fileObjects(row: Pick<FileRow, 'storageKey' | 'size' | 'sha256' | 'mime' | 'thumbStorageKey' | 'thumbSize' | 'thumbSha256'>): { key: string; size: number; sha256: string; mime: string }[]` — objek penuh, lalu thumbnail bila ada (mime thumbnail `image/webp`).
  - `stageUpload` untuk `kind === 'image'`: memanggil `withImageSlot(() => processImage(body))`, menyimpan `full` ke `storageKey(id, 'webp', now)` dan `thumb` ke `thumbKey(id, now)`, mencatat `mime: 'image/webp'`, `originalName: webpName(name)`, size/sha dari `full`, kolom thumb dari `thumb`. `StagedFile` mengembalikan `name`, `size`, `sha256` dari hasil final. Audit `file.staged` menambah `converted` dan `uploadedSize: body.size`.
  - Magic-byte check `detectImage` vs `declaredType` tetap sebelum `processImage`.

- [ ] **Step 1: Tulis test integration gagal**

```ts
test('staged JPEG is stored as webp with a thumbnail and audited as converted', async () => {
  const staged = await stageUpload(owner, 'image', 'foto lapangan.jpg', 'image/jpeg', await body(jpeg4000x3000));
  assert.equal(staged.mime, 'image/webp'); assert.equal(staged.name, 'foto lapangan.webp');
  const [row] = await db.select().from(files).where(eq(files.id, staged.fileId));
  assert.match(row.storageKey, /\.webp$/); assert.match(row.thumbStorageKey!, /\.thumb\.webp$/);
  assert.equal(row.size, staged.size); assert.equal(row.sha256, staged.sha256);
  // kedua objek ada di storage dengan size sesuai catatan; audit details.converted === true, uploadedSize === input size
});
test('clean webp is stored unchanged', async () => { /* sha256 tersimpan === sha256 input; audit converted false */ });
test('staged image cleanup removes full and thumbnail objects', async () => {
  // stage gambar, mundurkan createdAt 25 jam, cleanupStagedFiles() → status orphaned, storage.head(full) dan head(thumb) null
});
test('database failure after storing removes both objects', async () => {
  // paksa insert gagal (mis. stub getDrawingsDb transaksi melempar / id bentrok) → tidak ada objek tersisa di root storage
});
```
Perbarui test SVG-ditolak (`drawings-files.test.ts:106`) bila pesannya berubah — seharusnya tidak.

- [ ] **Step 2: Jalankan** — integration test sesuai README (`plant-v2-test`) → FAIL.
- [ ] **Step 3: Skema + migrasi** — tambah kolom di `schema.ts`, `pnpm db:generate:drawings`, beri nama file `0006_image_thumbnails.sql`, periksa SQL hanya `ALTER TABLE drawing_files ADD …` + unique index.
- [ ] **Step 4: Implementasi `stageUpload` dan cleanup** — rollback storage menghapus semua `fileObjects`; `finally` menghapus `body.path`, `body.path + '.webp'`, `body.path + '.thumb.webp'` (force). `cleanupStagedFiles` memilih kolom thumb dan menghapus semua `fileObjects(row)`.
- [ ] **Step 5: Script ops** — `drawings-reconcile.ts` dan `drawings-storage-copy.ts` beriterasi atas `fileObjects(row)` per baris; `byKey` reconcile memetakan kedua key ke baris yang sama; laporan tetap memakai `row.id` (tambahkan sufiks `:thumb` untuk objek thumbnail).
- [ ] **Step 6: Jalankan** — `pnpm typecheck`, `pnpm test`, integration `drawings-files` dan `drawings-workflow` → PASS.
- [ ] **Step 7: Commit** — `feat(drawings): store webp images with thumbnails`

---

### Task 5: Penyajian thumbnail dan cache gambar

**Files:**
- Modify: `packages/drawings-core/src/files.ts:229-270`, `packages/drawings-core/src/index.ts`
- Modify: `apps/drawings/app/api/[...path]/route.ts:121-143`
- Test: `tests/unit/drawings-files.test.ts`, `tests/integration/drawings-files.test.ts`

**Interfaces:**
- Consumes: Task 4 kolom thumb, `fileObjects`.
- Produces:
  - `serveFile(request, file, { disposition?, name, storage?, cache?: 'no-store' | 'revalidate' })` — default `'no-store'` (perilaku sekarang). `'revalidate'` → `Cache-Control: private, no-cache, no-transform`; bila `If-None-Match` memuat `"<sha256>"` → `304` dengan `ETag` dan `Cache-Control`, tanpa membaca storage.
  - `serveImage(request: Request, file: FileRow, { name: string; variant: 'full' | 'thumb'; storage?: Storage }): Promise<Response>` — `variant === 'thumb'` dan `thumbStorageKey` ada → sajikan thumbnail (`mime: 'image/webp'`, size/sha thumb); selain itu file penuh. Selalu `cache: 'revalidate'`, `disposition: 'inline'`.
  - Route: `variant = params.get('variant') === 'thumb' ? 'thumb' : 'full'`. `/attachments/:id` memakai `serveImage`. `/uploads/:id/file` memakai `serveImage` bila `file.kind === 'image'`, selain itu `serveFile` seperti sekarang. Pemeriksaan izin (`attachmentFile`/`requestImage`/`stagedFileForOwner`) tetap terjadi sebelum `serveImage`.

- [ ] **Step 1: Tulis test gagal**

```ts
test('revalidate cache returns 304 on matching If-None-Match without touching storage', async () => {
  const failing = { ...fsStorage, get: () => { throw Error('tidak boleh dibaca'); } } as Storage;
  const res = await serveFile(new Request('https://x/', { headers: { 'if-none-match': `"${meta.sha256}"` } }), meta, { name: 'a.webp', cache: 'revalidate', storage: failing });
  assert.equal(res.status, 304); assert.equal(res.headers.get('cache-control'), 'private, no-cache, no-transform');
});
test('pdf responses stay no-store', async () => { /* default → 'private, no-store, no-transform' */ });
test('serveImage serves the thumbnail variant', async () => { /* Content-Type image/webp, Content-Length = thumbSize, ETag = thumbSha256 */ });
test('variant=thumb falls back to full file for legacy images', async () => { /* row tanpa thumbStorageKey, mime image/png → 200, Content-Type image/png */ });
```
Integration: `If-None-Match does not bypass permission` — gambar request milik user lain: `requestImage(stranger, id)` melempar 404 sebelum `serveImage` dipanggil (uji lewat jalur yang sama dengan route, atau E2E di Task 6).

- [ ] **Step 2: Jalankan** — `pnpm test` → FAIL.
- [ ] **Step 3: Implementasi** sesuai Interfaces.
- [ ] **Step 4: Jalankan** — `pnpm test`, `pnpm typecheck`, integration `drawings-files` → PASS.
- [ ] **Step 5: Commit** — `feat(drawings): serve image thumbnails with revalidating cache`

---

### Task 6: Kompresi di browser dan thumbnail di UI

**Files:**
- Create: `apps/drawings/app/compress-image.ts`
- Modify: `apps/drawings/app/image-upload.tsx`, `apps/drawings/app/requests-ui.tsx:397-399`, `apps/drawings/app/workflow-panel.tsx:176-178`
- Test: `tests/unit/drawings-compress.test.ts` (baru), `tests/e2e/drawings.spec.ts`

**Interfaces:**
- Produces:
  - `fitWithin(width: number, height: number, max: number): { width: number; height: number }` — skala proporsional, dibulatkan, tanpa memperbesar.
  - `compressImage(file: File): Promise<File>` — sesuai spec §1: `createImageBitmap(file, { imageOrientation: 'from-image' })` → `fitWithin(…, 2560)` → canvas → `toBlob('image/webp', 0.82)`; bila `blob.type !== 'image/webp'` → `toBlob('image/jpeg', 0.85)`; bila hasil lebih besar dari `file` dan dimensi asli sudah ≤ 2560 → kembalikan `file`; error apa pun → kembalikan `file`. Nama hasil: ekstensi diganti sesuai tipe (`.webp`/`.jpg`). `bitmap.close()` selalu dipanggil.
- Consumes: Task 5 `?variant=thumb`.

- [ ] **Step 1: Tulis test gagal**

```ts
test('fitWithin keeps aspect ratio and never upscales', () => {
  assert.deepEqual(fitWithin(4000, 3000, 2560), { width: 2560, height: 1920 });
  assert.deepEqual(fitWithin(3000, 4000, 2560), { width: 1920, height: 2560 });
  assert.deepEqual(fitWithin(800, 600, 2560), { width: 800, height: 600 });
});
```
E2E (`drawings.spec.ts`, Chromium):
- Unggah 10 gambar lewat form request di UI (fixture PNG/JPEG 3000×2000 dibuat dengan `sharp` di setup test): request tersimpan dengan 10 gambar; `Content-Type` setiap `/attachments/:id` = `image/webp`; `<img>` daftar memakai `?variant=thumb`.
- Gambar ke-11 ditolak dengan pesan `Maksimal 10 gambar.`
- `If-None-Match does not bypass permission`: viewer tanpa akses ke request → `GET /drawings/api/attachments/:id?variant=thumb` dengan header `If-None-Match: "<sha>"` → 404.
- Perbarui helper `upload()` dan expectation lama yang mengandalkan `image/png` tersimpan apa adanya.

- [ ] **Step 2: Jalankan** — `pnpm test` → FAIL (`fitWithin` belum ada).
- [ ] **Step 3: Implementasi** `compress-image.ts`; `ImageUpload.add()` memanggil `compressImage` sebelum validasi ukuran akhir dan fetch, hint `Memproses gambar i/n…` lalu `Mengunggah gambar…`; pratinjau `uploads/<id>/file?variant=thumb`; daftar di `requests-ui.tsx` dan `workflow-panel.tsx` memakai `?variant=thumb` pada `<img>` (tautan tetap ke file penuh). Cek tampilan 10 thumbnail 72 px di lebar 390 px dan desktop.
- [ ] **Step 4: Jalankan** — `pnpm test`, `pnpm typecheck`, `pnpm --filter ./apps/drawings build`, E2E drawings sesuai README → PASS.
- [ ] **Step 5: Commit** — `feat(drawings): compress images in the browser before upload`

---

### Task 7: Anggaran container, build image, dokumentasi

**Files:**
- Modify: `infra/deploy/compose.vps.yaml:48-54`
- Modify: `docs/DRAWING-DATABASE-PRD.md` (baris 128, 160, 216, 242, 381), `docs/API.md:167,170`
- Modify (bila perlu): `apps/drawings/next.config.ts` (`outputFileTracingIncludes` untuk `sharp`/`@img`)
- Graph: `graphify-out/*` sesuai AGENTS.md

- [ ] **Step 1: Infra** — `drawings`: `mem_limit: 1536m`, `cpus: 1.5`, `NODE_OPTIONS` tetap `--max-old-space-size=512`; perbarui komentar (PDF + sharp).
- [ ] **Step 2: Build image** — `docker compose build drawings` lalu `docker run --rm plant-drawings:local node -e "require('sharp')"` dari `/workspace/apps/drawings` (atau `import('sharp')`) → keluar 0. Bila gagal, tambahkan `outputFileTracingIncludes` untuk `node_modules/sharp/**` dan `node_modules/@img/**`, ulangi.
- [ ] **Step 3: Uji beban memori** di stack `plant-v2-test` dengan batas VPS: dua upload bersamaan JPEG 25 MB dan PNG resolusi tinggi (≤ 120 MP); catat puncak `docker stats` — harus jauh di bawah 1536 MB dan container tidak restart.
- [ ] **Step 4: Dokumentasi** — PRD: 10 gambar (reject & request), aturan upload gambar (25 MB input, WebP output ≤ 2560 px, metadata dibuang, thumbnail 480 px, pass-through), cache gambar `no-cache` + 304, anggaran VPS 1536m/1.5 CPU. API.md: `?variant=thumb`, 304, batas 25 MB / 10 gambar, `IMAGE_BUSY` 503. `pnpm format:check` → PASS.
- [ ] **Step 5: Graph** — `graphify reflect --if-stale` lalu pembaruan inkremental untuk `images.ts`, `compress-image.ts`, perubahan `files.ts`/`storage.ts`/schema sesuai skill graphify.
- [ ] **Step 6: Commit** — `chore(drawings): raise container budget for sharp and document image rules`

---

## Pemeriksaan manual sebelum go-live

- iPhone Safari dan Android sungguhan: unggah foto kamera; catat format yang dikirim (WebP/JPEG), ukuran tersimpan, orientasi, dan keterbacaan tulisan nameplate di file penuh.
