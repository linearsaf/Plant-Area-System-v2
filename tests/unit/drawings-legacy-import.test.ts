import { test } from 'node:test';
import assert from 'node:assert/strict';
import { legacyImportKey, legacyImportRow, parseCsv } from '@plant/drawings-core';

const sha = 'a'.repeat(64);
const manifest = (over: Record<string, string> = {}) => ({
  number: '61008683',
  title: 'Substation main station',
  hac: 'tq.471-gq1/471-GQ2',
  revision_no: 'D',
  discipline: 'Mechanical',
  drawn_by: 'POL',
  legacy_note: 'Arsip Polysius.',
  description: 'Jenis: General arrangement drawing. Format: A0.',
  page_count: '2',
  output_pdf: 'pdf/61008683.pdf',
  ...over,
});
const conversion = (over: Record<string, string> = {}) => ({
  number: '61008683',
  output_pdf: 'pdf/61008683.pdf',
  status: 'dibuat',
  detail: '',
  pages: '2',
  size: '1030328',
  sha256: sha,
  ...over,
});

test('parseCsv handles BOM, quotes, commas, embedded newlines and CRLF', () => {
  const rows = parseCsv('﻿number,title,note\r\n1,"Chute, ""A""","line 1\nline 2"\r\n2,Plain,\r\n');
  assert.deepEqual(rows, [
    { number: '1', title: 'Chute, "A"', note: 'line 1\nline 2' },
    { number: '2', title: 'Plain', note: '' },
  ]);
  assert.deepEqual(parseCsv(''), []);
  assert.throws(() => parseCsv('a,b\n1,"open'), /kutip/);
  assert.throws(() => parseCsv('a,b\n1,2,3\n'), /baris 2/);
});

test('legacyImportRow applies the Upload Old Drawing rules', () => {
  const outcome = legacyImportRow(manifest(), conversion());
  assert.ok(outcome.ok);
  assert.deepEqual(outcome.row, {
    number: '61008683',
    title: 'Substation main station',
    hac: '471-GQ1/471-GQ2', // prefix TQ. dibuang, huruf kapital
    description: 'Jenis: General arrangement drawing. Format: A0.',
    revisionNo: 'D',
    legacyNote: 'Arsip Polysius.',
    discipline: 'Mechanical',
    drawnBy: 'POL',
    outputPdf: 'pdf/61008683.pdf',
    pageCount: 2,
    size: 1030328,
    sha256: sha,
  });
});

test('legacyImportRow reports the first problem per row without throwing', () => {
  const error = (m: Record<string, string>, c: Record<string, string> | null = conversion()) => {
    const outcome = legacyImportRow(m, c ?? undefined);
    assert.equal(outcome.ok, false);
    return outcome.ok ? '' : outcome.error;
  };
  assert.match(error(manifest({ title: ' ' })), /Drawing Name/);
  assert.match(error(manifest({ hac: 'X'.repeat(41) })), /HAC/);
  assert.match(error(manifest({ revision_no: 'rev 1' })), /revisi/i);
  assert.match(error(manifest({ legacy_note: '' })), /Legacy Ready Note/);
  assert.match(error(manifest({ discipline: '' })), /Discipline/);
  assert.match(error(manifest({ drawn_by: 'x'.repeat(101) })), /Drawn by/);
  assert.match(error(manifest({ output_pdf: '../secret.pdf' })), /output_pdf/);
  assert.match(error(manifest({ output_pdf: 'pdf/a/b.pdf' })), /output_pdf/);
  assert.match(error(manifest({ page_count: '0' })), /page_count/);
  assert.match(error(manifest(), null), /conversion/);
  assert.match(error(manifest(), conversion({ status: 'GAGAL', detail: 'rusak' })), /rusak/);
  assert.match(error(manifest(), conversion({ pages: '3' })), /halaman/);
  assert.match(error(manifest(), conversion({ sha256: 'zz' })), /SHA-256/);
  assert.match(error(manifest(), conversion({ size: '' })), /Ukuran/);
  assert.match(error(manifest(), conversion({ output_pdf: 'pdf/lain.pdf' })), /output_pdf/);
});

test('legacyImportKey is stable and a valid Idempotency-Key', () => {
  assert.equal(legacyImportKey('61008683'), 'legacy-import:61008683');
  assert.match(legacyImportKey('A/1 B'.padEnd(200, 'x')), /^[A-Za-z0-9._:-]{8,128}$/);
});
