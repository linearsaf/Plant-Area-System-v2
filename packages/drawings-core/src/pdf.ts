// Validasi PDF dan stamp approval (PRD §6.1, §6.4, K6). Geometri stamp dipindahkan dari
// referensi DrafTerra `src/server/storage/pdf-signature.ts`: tinggi 60 pt, lebar 128–168 pt,
// margin 24 pt, jarak 10 pt, satu slot per level, mengikuti rotasi halaman 0/90/180/270.
import { readFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts, degrees, rgb, EncryptedPDFError, type PDFFont } from '@cantoo/pdf-lib';
import { AppError } from '@plant/contracts';

export const STAMP_HEIGHT = 60;
export const STAMP_MARGIN = 24;
export const STAMP_GAP = 10;
export const STAMP_MIN_WIDTH = 128;
export const STAMP_MAX_WIDTH = 168;

export type StampSlot = {
  /** Judul level, mis. "Check", "Approval L1", "Final Approval". */
  title: string;
  name: string;
  role: string;
  decidedAt: Date;
};

// PDF processing is memory heavy; run one job at a time per process (PRD §6.4).
let queue: Promise<unknown> = Promise.resolve();
export function serialPdfJob<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

const wibFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
/** `dd/mm/yyyy HH:mm WIB`, selalu dihitung dalam Asia/Jakarta (bukan zona waktu container). */
export function formatStampTime(value: Date) {
  const parts = Object.fromEntries(wibFormatter.formatToParts(value).map((p) => [p.type, p.value]));
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute} WIB`;
}

/** Mengganti karakter yang tidak dapat dikodekan font standar (WinAnsi) agar stamp tidak gagal. */
export function winAnsiSafe(value: string, font: PDFFont) {
  const supported = new Set(font.getCharacterSet());
  return [...value.normalize('NFC')]
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      if (supported.has(code)) return ch;
      const base = ch.normalize('NFD').replace(/\p{M}/gu, '');
      return base && [...base].every((c) => supported.has(c.codePointAt(0)!)) ? base : '?';
    })
    .join('')
    .replace(/[\u0000-\u001f]/g, ' ');
}

function clampText(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 3))}...`;
}

export function normalizeRotation(angle: number) {
  const value = (((Math.round(angle / 90) * 90) % 360) + 360) % 360;
  return value as 0 | 90 | 180 | 270;
}

/** Lebar slot berdasarkan lebar visual halaman; tiga slot muat berdampingan bila memungkinkan. */
export function stampWidth(visualWidth: number) {
  return Math.min(
    STAMP_MAX_WIDTH,
    Math.max(STAMP_MIN_WIDTH, Math.floor((visualWidth - 2 * STAMP_MARGIN - 2 * STAMP_GAP) / 3)),
  );
}

/**
 * Titik pasang slot (koordinat PDF tak berotasi, relatif terhadap kotak halaman) sehingga
 * slot tampak di kiri-bawah visual dan tegak setelah rotasi halaman diterapkan viewer.
 */
export function stampPlacement(
  box: { x: number; y: number; width: number; height: number },
  rotation: number,
  level: number,
  width: number,
) {
  const along = STAMP_MARGIN + level * (width + STAMP_GAP);
  const across = STAMP_MARGIN;
  switch (normalizeRotation(rotation)) {
    case 90:
      return { x: box.x + box.width - across, y: box.y + along, rotate: 90 };
    case 180:
      return { x: box.x + box.width - along, y: box.y + box.height - across, rotate: 180 };
    case 270:
      return { x: box.x + across, y: box.y + box.height - along, rotate: 270 };
    default:
      return { x: box.x + along, y: box.y + across, rotate: 0 };
  }
}

async function stampPage(slot: StampSlot, width: number) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([width, STAMP_HEIGHT]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const padding = 8;
  const ink = rgb(0.23, 0.31, 0.59);
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height: STAMP_HEIGHT,
    color: rgb(0.97, 0.98, 1),
    borderColor: ink,
    borderWidth: 0.7,
    opacity: 0.4,
    borderOpacity: 0.4,
  });
  page.drawRectangle({ x: 0, y: STAMP_HEIGHT - 18, width, height: 18, color: ink, opacity: 0.4 });
  page.drawText(winAnsiSafe(clampText(slot.title, 28), bold), {
    x: padding,
    y: STAMP_HEIGHT - 13,
    size: 8,
    font: bold,
    color: rgb(1, 1, 1),
    opacity: 0.8,
  });
  const lines = [
    `Nama: ${clampText(slot.name, 22)}`,
    `Role: ${clampText(slot.role, 20)}`,
    `Waktu: ${formatStampTime(slot.decidedAt)}`,
  ];
  lines.forEach((line, i) =>
    page.drawText(winAnsiSafe(line, regular), {
      x: padding,
      y: STAMP_HEIGHT - 28 - i * 9,
      size: 7,
      font: regular,
      color: rgb(0.13, 0.15, 0.16),
      opacity: 0.8,
    }),
  );
  return doc.save();
}

/** Menyalin PDF dan menambahkan blok stamp di kiri-bawah halaman 1. Input tidak diubah. */
export async function stampPdf(source: Uint8Array, slots: StampSlot[]) {
  if (!slots.length || slots.length > 3) throw Error('Stamp memerlukan 1–3 slot.');
  const doc = await PDFDocument.load(source, { updateMetadata: false });
  const page = doc.getPage(0);
  const rotation = normalizeRotation(page.getRotation().angle);
  const box = page.getCropBox();
  const width = stampWidth(rotation === 90 || rotation === 270 ? box.height : box.width);
  for (const [level, slot] of slots.entries()) {
    const [embedded] = await doc.embedPdf(await stampPage(slot, width), [0]);
    const at = stampPlacement(box, rotation, level, width);
    page.drawPage(embedded, {
      x: at.x,
      y: at.y,
      width,
      height: STAMP_HEIGHT,
      rotate: degrees(at.rotate),
    });
  }
  return doc.save({ useObjectStreams: false });
}

const invalid = (message: string) => new AppError(422, message, 'FILE_INVALID');

/**
 * Memvalidasi PDF: magic bytes, dapat di-parse, ≥ 1 halaman, tidak terenkripsi/berpassword,
 * dan lolos uji stamp di memori (hasil dibuang). Mengembalikan jumlah halaman.
 */
export async function validatePdf(path: string): Promise<{ pageCount: number }> {
  return serialPdfJob(async () => {
    const bytes = await readFile(path);
    if (bytes.subarray(0, 1024).indexOf('%PDF-') === -1) throw invalid('File bukan PDF.');
    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(bytes, { updateMetadata: false });
    } catch (e) {
      if (e instanceof EncryptedPDFError)
        throw invalid('PDF terenkripsi atau berpassword tidak dapat diterima.');
      throw invalid('PDF rusak atau tidak dapat dibaca.');
    }
    if (doc.isEncrypted) throw invalid('PDF terenkripsi atau berpassword tidak dapat diterima.');
    let pageCount: number;
    try {
      // pdf-lib parses leniently; a missing catalog/page tree only fails here.
      pageCount = doc.getPageCount();
      doc.getPage(0);
    } catch {
      throw invalid('PDF rusak atau tidak mempunyai halaman.');
    }
    if (pageCount < 1) throw invalid('PDF tidak mempunyai halaman.');
    try {
      await stampPdf(bytes, [
        { title: 'Check', name: 'Uji stamp', role: 'Draft Leader', decidedAt: new Date() },
        { title: 'Approval L1', name: 'Uji stamp', role: 'Approver L1', decidedAt: new Date() },
        { title: 'Final Approval', name: 'Uji stamp', role: 'Head', decidedAt: new Date() },
      ]);
    } catch {
      throw invalid('PDF tidak dapat diberi stamp approval. Simpan ulang PDF lalu unggah lagi.');
    }
    return { pageCount };
  });
}

/** Mendeteksi jenis gambar dari magic bytes. SVG dan format lain ditolak. */
export function detectImage(head: Uint8Array): { mime: string; extension: 'jpg' | 'png' | 'webp' } | null {
  const b = Buffer.from(head);
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    return { mime: 'image/jpeg', extension: 'jpg' };
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: 'image/png', extension: 'png' };
  if (b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP')
    return { mime: 'image/webp', extension: 'webp' };
  return null;
}
