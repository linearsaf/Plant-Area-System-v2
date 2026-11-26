import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument, degrees } from '@cantoo/pdf-lib';
import {
  FsStorage,
  STAMP_HEIGHT,
  STAMP_MARGIN,
  contentDisposition,
  detectImage,
  fileNameFromHeader,
  formatStampTime,
  maxPdfBytes,
  normalizeRotation,
  parseRange,
  requireContentType,
  requireUpload,
  serveFile,
  serveImage,
  stampPdf,
  stampPlacement,
  stampWidth,
  storageConfig,
  storageKey,
  thumbKey,
  uploadLimit,
  validatePdf,
  type Storage,
} from '@plant/drawings-core';
import { AppError, type DrawingsRole, type Identity } from '@plant/contracts';

let dir: string;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'drawings-files-'));
});
after(async () => {
  await rm(dir, { recursive: true, force: true });
});
async function pdf(
  options: { pages?: number; rotate?: number; size?: [number, number]; password?: string } = {},
) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < (options.pages ?? 1); i++) {
    const page = doc.addPage(options.size ?? [841.89, 595.28]);
    if (options.rotate) page.setRotation(degrees(options.rotate));
  }
  if (options.password)
    doc.encrypt({ userPassword: options.password, ownerPassword: options.password + '-owner' });
  return doc.save();
}
async function file(name: string, bytes: Uint8Array | string) {
  const path = join(dir, name);
  await writeFile(path, bytes);
  return path;
}
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

test('parseRange accepts single ranges and rejects unsatisfiable ones', () => {
  assert.equal(parseRange(null, 100), null);
  assert.deepEqual(parseRange('bytes=0-9', 100), { start: 0, end: 9 });
  assert.deepEqual(parseRange('bytes=90-', 100), { start: 90, end: 99 });
  assert.deepEqual(parseRange('bytes=-10', 100), { start: 90, end: 99 });
  assert.deepEqual(parseRange('bytes=-500', 100), { start: 0, end: 99 });
  assert.deepEqual(parseRange('bytes=95-500', 100), { start: 95, end: 99 });
  assert.equal(parseRange('bytes=0-1,5-6', 100), null);
  for (const invalid of ['bytes=100-', 'bytes=5-2', 'bytes=-0', 'bytes=-', 'items=0-1', 'bytes=a-b'])
    assert.equal(parseRange(invalid, 100), 'invalid', invalid);
});

test('fs storage stores under server keys, never overwrites, and reads byte ranges', async () => {
  const storage = new FsStorage(join(dir, 'store'));
  const key = storageKey('11111111-2222-4333-8444-555555555555', 'pdf', new Date('2026-11-14T00:00:00Z'));
  assert.equal(key, 'files/2026/11111111-2222-4333-8444-555555555555.pdf');
  const source = await file('source.bin', 'abcdefghijklmnopqrstuvwxyz');
  await storage.put(key, source, { size: 26, contentType: 'application/pdf', sha256: '' });
  await assert.rejects(storage.put(key, source, { size: 26, contentType: 'application/pdf', sha256: '' }));
  assert.deepEqual(await storage.head(key), { size: 26 });
  const part = await storage.get(key, { start: 2, end: 5 });
  assert.equal(part.size, 26);
  assert.equal(await new Response(part.body).text(), 'cdef');
  for (const bad of ['../etc/passwd', 'files/2026/x.pdf', 'files/2026/../../a.pdf'])
    await assert.rejects(storage.head(bad));
  await storage.delete(key);
  assert.equal(await storage.head(key), null);
});

test('serveFile returns 200, 206 and 416 with streaming-safe headers', async () => {
  const storage = new FsStorage(join(dir, 'serve'));
  const key = storageKey('21111111-2222-4333-8444-555555555555', 'pdf');
  const bytes = Buffer.from('%PDF-1.7 0123456789');
  await storage.put(key, await file('serve.pdf', bytes), { size: bytes.length, contentType: '', sha256: '' });
  process.env.DRAWINGS_STORAGE_DRIVER = 'fs';
  process.env.DRAWINGS_STORAGE_PATH = join(dir, 'serve');
  const meta = { storageKey: key, size: bytes.length, sha256: sha(bytes), mime: 'application/pdf' };
  const full = await serveFile(new Request('https://x/'), meta, { name: 'Gambar ö.pdf' });
  assert.equal(full.status, 200);
  assert.equal(full.headers.get('content-length'), String(bytes.length));
  assert.equal(full.headers.get('accept-ranges'), 'bytes');
  assert.equal(full.headers.get('etag'), `"${sha(bytes)}"`);
  assert.match(full.headers.get('cache-control')!, /private, no-store/);
  assert.equal(full.headers.get('content-encoding'), null);
  assert.equal(full.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(Buffer.from(await full.arrayBuffer()).equals(bytes), true);
  const part = await serveFile(new Request('https://x/', { headers: { range: 'bytes=9-12' } }), meta, {
    name: 'a.pdf',
  });
  assert.equal(part.status, 206);
  assert.equal(part.headers.get('content-range'), `bytes 9-12/${bytes.length}`);
  assert.equal(part.headers.get('content-length'), '4');
  assert.equal(await part.text(), '0123');
  const bad = await serveFile(new Request('https://x/', { headers: { range: 'bytes=999-' } }), meta, {
    name: 'a.pdf',
  });
  assert.equal(bad.status, 416);
  assert.equal(bad.headers.get('content-range'), `bytes */${bytes.length}`);
});

test('PDF validation accepts multi-page and rotated PDFs and rejects invalid files', async () => {
  assert.deepEqual(await validatePdf(await file('ok.pdf', await pdf({ pages: 3 }))), { pageCount: 3 });
  for (const rotate of [90, 180, 270])
    assert.deepEqual(await validatePdf(await file(`r${rotate}.pdf`, await pdf({ rotate }))), {
      pageCount: 1,
    });
  const reject = async (name: string, bytes: Uint8Array | string, message: RegExp) =>
    assert.rejects(validatePdf(await file(name, bytes)), (e: Error & { code?: string; status?: number }) => {
      assert.equal(e.code, 'FILE_INVALID');
      assert.equal(e.status, 422);
      assert.match(e.message, message);
      return true;
    });
  await reject('svg.pdf', '<svg xmlns="http://www.w3.org/2000/svg"/>', /bukan PDF/);
  await reject('broken.pdf', '%PDF-1.7\nnot really a pdf', /rusak|halaman/);
  await reject('locked.pdf', await pdf({ password: 'secret-password' }), /terenkripsi/);
});

test('stamp keeps the source intact and places slots bottom-left upright for every rotation', async () => {
  const source = await pdf({ rotate: 90 });
  const before = sha(source);
  const issued = await stampPdf(source, [
    {
      title: 'Check',
      name: 'Łukasz Šimić 李',
      role: 'Draft Leader',
      decidedAt: new Date('2026-11-14T17:30:00Z'),
    },
    { title: 'Approval L1', name: 'Budi', role: 'Approver L1', decidedAt: new Date() },
  ]);
  assert.equal(sha(source), before);
  assert.notEqual(sha(issued), before);
  assert.equal((await PDFDocument.load(issued)).getPageCount(), 1);
  // Visual coordinates after the viewer applies /Rotate (clockwise).
  const W = 595,
    H = 842;
  const visual = (r: number, x: number, y: number) =>
    r === 90 ? [y, W - x] : r === 180 ? [W - x, H - y] : r === 270 ? [H - y, x] : [x, y];
  const direction = (r: number, dx: number, dy: number) =>
    r === 90 ? [dy, -dx] : r === 180 ? [-dx, -dy] : r === 270 ? [-dy, dx] : [dx, dy];
  for (const r of [0, 90, 180, 270]) {
    const width = stampWidth(r % 180 ? H : W);
    for (const level of [0, 1, 2]) {
      const at = stampPlacement({ x: 0, y: 0, width: W, height: H }, r, level, width);
      const t = (at.rotate * Math.PI) / 180;
      const [vx, vy] = visual(r, at.x, at.y).map(Math.round);
      assert.equal(vy, STAMP_MARGIN, `bottom margin r=${r}`);
      assert.equal(vx, STAMP_MARGIN + level * (width + 10), `left offset r=${r} level=${level}`);
      assert.deepEqual(
        direction(r, Math.cos(t), Math.sin(t)).map((v) => Math.round(v) + 0),
        [1, 0],
        `text upright r=${r}`,
      );
      assert.deepEqual(
        direction(r, -Math.sin(t), Math.cos(t)).map((v) => Math.round(v) + 0),
        [0, 1],
        `stamp up r=${r}`,
      );
      assert.ok(vy + STAMP_HEIGHT < (r % 180 ? W : H) / 2);
    }
  }
  assert.equal(normalizeRotation(-90), 270);
  assert.equal(normalizeRotation(450), 90);
});

test('stamp time is written in WIB regardless of container time zone', () => {
  assert.equal(formatStampTime(new Date('2026-11-14T17:30:00Z')), '15/11/2026 00:30 WIB');
  assert.equal(formatStampTime(new Date('2026-12-31T16:59:00Z')), '31/12/2026 23:59 WIB');
});

test('image detection uses magic bytes and rejects SVG', () => {
  assert.equal(detectImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.mime, 'image/jpeg');
  assert.equal(detectImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.mime, 'image/png');
  assert.equal(detectImage(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))?.mime, 'image/webp');
  assert.equal(detectImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">')), null);
  assert.equal(detectImage(Buffer.from('GIF89a')), null);
});

test('file names and dispositions are sanitized', () => {
  assert.equal(fileNameFromHeader(encodeURIComponent('C:\\tmp\\Gambar "A".pdf'), 'pdf'), 'Gambar A.pdf');
  assert.equal(fileNameFromHeader(encodeURIComponent('drawing'), 'pdf'), 'drawing.pdf');
  assert.equal(fileNameFromHeader(encodeURIComponent('x'.repeat(300) + '.pdf'), 'pdf').length, 200);
  assert.throws(() => fileNameFromHeader('%E0%A4%A', 'pdf'));
  assert.throws(() => fileNameFromHeader(null, 'image'));
  assert.equal(
    contentDisposition('attachment', 'DWG-01_Rev-ö.pdf'),
    `attachment; filename="DWG-01_Rev-_.pdf"; filename*=UTF-8''DWG-01_Rev-%C3%B6.pdf`,
  );
});

test('storage and size configuration validate environment', () => {
  assert.equal(maxPdfBytes({}), 25 * 1024 * 1024);
  assert.equal(maxPdfBytes({ DRAWINGS_MAX_PDF_MB: '30' }), 30 * 1024 * 1024);
  assert.throws(() => maxPdfBytes({ DRAWINGS_MAX_PDF_MB: '0.5' }));
  assert.deepEqual(storageConfig({ DRAWINGS_STORAGE_PATH: '/data/drawings' }), {
    driver: 'fs',
    path: '/data/drawings',
  });
  assert.throws(() => storageConfig({ DRAWINGS_STORAGE_DRIVER: 's3' }), /S3/);
  assert.throws(() => storageConfig({ DRAWINGS_STORAGE_DRIVER: 'ftp' }));
  const s3 = storageConfig({
    DRAWINGS_STORAGE_DRIVER: 's3',
    DRAWINGS_S3_ENDPOINT: 'https://s3.example.test/',
    DRAWINGS_S3_REGION: 'id-1',
    DRAWINGS_S3_BUCKET: 'drawings',
    DRAWINGS_S3_ACCESS_KEY_ID: 'key',
    DRAWINGS_S3_SECRET_ACCESS_KEY: 'secret',
  });
  assert.equal(s3.driver === 's3' && s3.endpoint, 'https://s3.example.test');
  assert.equal(s3.driver === 's3' && s3.forcePathStyle, true);
});

test('stamp output can be read back from disk', async () => {
  const path = await file(
    'read.pdf',
    await stampPdf(await pdf(), [{ title: 'Check', name: 'A', role: 'B', decidedAt: new Date() }]),
  );
  assert.equal((await readFile(path)).subarray(0, 5).toString(), '%PDF-');
});

test('upload kinds follow the role matrix; SVG is never an accepted image type', () => {
  const as = (role: DrawingsRole): Identity => ({
    id: 'u-' + role,
    name: role,
    email: role + '@example.test',
    position: '',
    portalAdmin: false,
    mustChangePassword: false,
    grants: [{ appId: 'drawings', role }],
  });
  const status = (fn: () => unknown) => {
    try {
      fn();
      return 200;
    } catch (e) {
      return e instanceof AppError ? e.status : 500;
    }
  };
  // Images are Drawing Request / review attachments; Drafter cannot create requests.
  assert.equal(
    status(() => requireUpload(as('drafter'), 'image')),
    403,
  );
  assert.equal(
    status(() => requireUpload(as('viewer'), 'pdf')),
    403,
  );
  for (const role of ['viewer', 'leader', 'approver', 'head', 'admin'] as const)
    assert.equal(requireUpload(as(role), 'image'), 'image', role);
  for (const role of ['drafter', 'leader', 'admin'] as const)
    assert.equal(requireUpload(as(role), 'pdf'), 'pdf', role);
  assert.equal(
    status(() => requireUpload(as('admin'), 'svg')),
    400,
  );
  assert.equal(
    status(() => requireContentType('image', 'image/svg+xml')),
    415,
  );
  assert.equal(requireContentType('image', 'image/png'), 'image/png');
});

test('image upload limit is 25 MB', () => assert.equal(uploadLimit('image'), 25 * 1024 * 1024));

async function imageFixture() {
  const storage = new FsStorage(join(dir, 'images'));
  const id = '31111111-2222-4333-8444-555555555555';
  const full = Buffer.from('RIFF full image bytes'),
    thumb = Buffer.from('RIFF thumb');
  const row = {
    storageKey: storageKey(id, 'webp'),
    size: full.length,
    sha256: sha(full),
    mime: 'image/webp',
    thumbStorageKey: thumbKey(id),
    thumbSize: thumb.length,
    thumbSha256: sha(thumb),
  };
  if (!(await storage.head(row.storageKey))) {
    await storage.put(row.storageKey, await file('full.webp', full), {
      size: full.length,
      contentType: '',
      sha256: '',
    });
    await storage.put(row.thumbStorageKey, await file('thumb.webp', thumb), {
      size: thumb.length,
      contentType: '',
      sha256: '',
    });
  }
  return { storage, row, full, thumb };
}

test('revalidate cache returns 304 on matching If-None-Match without touching storage', async () => {
  const { storage, row } = await imageFixture();
  const failing = {
    ...storage,
    driver: 'fs',
    get: () => Promise.reject(Error('tidak boleh dibaca')),
  } as unknown as Storage;
  const request = new Request('https://x/', { headers: { 'if-none-match': `"${row.sha256}"` } });
  const res = await serveFile(request, row, { name: 'a.webp', cache: 'revalidate', storage: failing });
  assert.equal(res.status, 304);
  assert.equal(res.headers.get('cache-control'), 'private, no-cache, no-transform');
  assert.equal(res.headers.get('etag'), `"${row.sha256}"`);
  const other = await serveFile(new Request('https://x/', { headers: { 'if-none-match': '"zzz"' } }), row, {
    name: 'a.webp',
    cache: 'revalidate',
    storage,
  });
  assert.equal(other.status, 200);
  assert.equal(other.headers.get('cache-control'), 'private, no-cache, no-transform');
});

test('pdf responses stay no-store by default and revalidate supports 304 and ranged 206', async () => {
  const { storage, row, full } = await imageFixture();
  const pdfRow = { ...row, mime: 'application/pdf' };
  const noStoreRes = await serveFile(
    new Request('https://x/', { headers: { 'if-none-match': `"${row.sha256}"` } }),
    pdfRow,
    {
      name: 'a.pdf',
      storage,
    },
  );
  assert.equal(noStoreRes.status, 200);
  assert.equal(noStoreRes.headers.get('cache-control'), 'private, no-store, no-transform');
  assert.equal(Buffer.from(await noStoreRes.arrayBuffer()).equals(full), true);

  const failing = {
    ...storage,
    driver: 'fs',
    get: () => Promise.reject(Error('tidak boleh dibaca')),
  } as unknown as Storage;
  const reval304 = await serveFile(
    new Request('https://x/', { headers: { 'if-none-match': `"${row.sha256}"` } }),
    pdfRow,
    {
      name: 'a.pdf',
      cache: 'revalidate',
      storage: failing,
    },
  );
  assert.equal(reval304.status, 304);
  assert.equal(reval304.headers.get('cache-control'), 'private, no-cache, no-transform');

  const ranged206 = await serveFile(
    new Request('https://x/', { headers: { 'if-none-match': `"${row.sha256}"`, range: 'bytes=0-3' } }),
    pdfRow,
    {
      name: 'a.pdf',
      cache: 'revalidate',
      storage,
    },
  );
  assert.equal(ranged206.status, 206);
  assert.equal(ranged206.headers.get('cache-control'), 'private, no-cache, no-transform');
  assert.equal(await ranged206.text(), 'RIFF');
});

test('serveImage serves the thumbnail variant', async () => {
  const { storage, row, thumb } = await imageFixture();
  const res = await serveImage(new Request('https://x/'), row, { name: 'a.webp', variant: 'thumb', storage });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/webp');
  assert.equal(res.headers.get('content-length'), String(thumb.length));
  assert.equal(res.headers.get('etag'), `"${row.thumbSha256}"`);
  assert.equal(res.headers.get('cache-control'), 'private, no-cache, no-transform');
  assert.match(res.headers.get('content-disposition')!, /^inline;/);
  assert.equal(Buffer.from(await res.arrayBuffer()).equals(thumb), true);
});

test('variant=thumb falls back to full file for legacy images', async () => {
  const { storage, row, full } = await imageFixture();
  const legacy = { ...row, mime: 'image/png', thumbStorageKey: null, thumbSize: null, thumbSha256: null };
  const res = await serveImage(new Request('https://x/'), legacy, {
    name: 'a.png',
    variant: 'thumb',
    storage,
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
  assert.equal(res.headers.get('etag'), `"${row.sha256}"`);
  assert.equal(Buffer.from(await res.arrayBuffer()).equals(full), true);
});
