// Pembacaan manifest impor arsip Legacy Ready (scripts/drawings-import-legacy.ts).
// Murni tanpa I/O supaya dapat diuji tanpa database maupun storage.
import { cleanOtherHacs, legacyCreateSchema } from '@plant/contracts';

/** Parser CSV RFC 4180: kutip ganda, koma dan baris baru di dalam kutip, BOM di awal. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = '',
    quoted = false;
  const source = text.replace(/^﻿/, '');
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (source[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && source[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else field += c;
  }
  if (quoted) throw Error('CSV tidak valid: kutip tidak ditutup.');
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.length > 1 || r[0] !== '');
  if (!header) return [];
  return body.map((r, n) => {
    if (r.length !== header.length)
      throw Error(`CSV tidak valid: baris ${n + 2} berisi ${r.length} kolom, seharusnya ${header.length}.`);
    return Object.fromEntries(header.map((name, i) => [name.trim(), r[i]]));
  });
}

const fieldsSchema = legacyCreateSchema.omit({ disciplineId: true, ownerId: true, fileId: true });
const SHA256 = /^[0-9a-f]{64}$/;
const OUTPUT = /^pdf\/[A-Za-z0-9._-]{1,120}\.pdf$/;

export type LegacyImportRow = {
  number: string;
  title: string;
  /** HAC utama. */
  hac: string;
  /** HAC lain dari kolom `hac_all` (dipisah `|`), tanpa HAC utama. */
  otherHacs: string[];
  description: string;
  revisionNo: string;
  legacyNote: string;
  discipline: string;
  drawnBy: string;
  /** Path relatif terhadap folder manifest, selalu `pdf/<nama>.pdf`. */
  outputPdf: string;
  pageCount: number;
  size: number;
  sha256: string;
};
export type LegacyImportOutcome =
  { ok: true; row: LegacyImportRow } | { ok: false; number: string; error: string };

/**
 * Menggabungkan satu baris `manifest.csv` dengan baris `conversion.csv`-nya dan memvalidasinya
 * memakai aturan form Upload Old Drawing. Tidak pernah melempar; kegagalan dilaporkan per baris.
 */
export function legacyImportRow(
  manifest: Record<string, string>,
  conversion: Record<string, string> | undefined,
): LegacyImportOutcome {
  const number = (manifest.number ?? '').trim();
  const fail = (error: string): LegacyImportOutcome => ({ ok: false, number, error });
  const parsed = fieldsSchema.safeParse({
    number,
    title: manifest.title,
    hac: manifest.hac,
    otherHacs: (manifest.hac_all ?? '').split('|').filter((h) => h.trim()),
    description: manifest.description ?? '',
    revisionNo: manifest.revision_no,
    legacyNote: manifest.legacy_note,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Isian tidak valid.');
  const discipline = (manifest.discipline ?? '').trim();
  if (!discipline) return fail('Discipline wajib diisi.');
  const drawnBy = (manifest.drawn_by ?? '').trim();
  if (!drawnBy || drawnBy.length > 100) return fail('Drawn by harus 1–100 karakter.');
  const outputPdf = (manifest.output_pdf ?? '').trim();
  if (!OUTPUT.test(outputPdf)) return fail('output_pdf harus berbentuk pdf/<nama>.pdf.');
  const pageCount = Number(manifest.page_count);
  if (!Number.isInteger(pageCount) || pageCount < 1) return fail('page_count tidak valid.');
  if (!conversion) return fail('Tidak ada baris conversion.csv untuk drawing ini.');
  if (conversion.status === 'GAGAL')
    return fail(`Konversi gagal: ${conversion.detail || 'tanpa keterangan'}.`);
  if (conversion.output_pdf !== outputPdf) return fail('output_pdf berbeda antara manifest dan conversion.');
  if (Number(conversion.pages) !== pageCount)
    return fail('Jumlah halaman berbeda antara manifest dan conversion.');
  const size = Number(conversion.size);
  if (!Number.isInteger(size) || size < 1) return fail('Ukuran PDF tidak valid.');
  if (!SHA256.test(conversion.sha256 ?? '')) return fail('SHA-256 PDF tidak valid.');
  return {
    ok: true,
    row: {
      ...parsed.data,
      otherHacs: cleanOtherHacs(parsed.data.hac, parsed.data.otherHacs),
      discipline,
      drawnBy,
      outputPdf,
      pageCount,
      size,
      sha256: conversion.sha256,
    },
  };
}

/**
 * Idempotency-Key per percobaan impor: nomor drawing dan file staged-nya. File staged baru dibuat
 * pada setiap percobaan, sehingga nomor yang pernah diimpor lalu di-void dapat diimpor lagi.
 * Pengulangan impor dilindungi oleh pemeriksaan nomor yang sudah ada, bukan oleh key ini.
 */
export function legacyImportKey(number: string, fileId: string) {
  const safe = number.replace(/[^A-Za-z0-9._:-]/g, '_').slice(0, 70);
  return `legacy-import:${safe}:${fileId}`;
}
