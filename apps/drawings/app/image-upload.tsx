'use client';
import { useEffect, useState } from 'react';
import { IMAGE_MAX_PER_ITEM } from '@plant/contracts';
import { Button } from '@plant/ui';
import { FileDrop } from './file-drop';

type Item = { fileId: string; name: string };
const MAX = IMAGE_MAX_PER_ITEM;
const MAX_BYTES = 25 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Unggah maksimal 10 gambar JPEG/PNG/WebP (≤ 25 MB) sebagai lampiran; server memeriksa magic bytes. */
export function ImageUpload({
  onChange,
  label = 'Lampiran gambar (opsional)',
}: {
  onChange: (ids: string[]) => void;
  label?: string;
}) {
  const [items, setItems] = useState<Item[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => onChange(items.map((i) => i.fileId)), [items, onChange]);
  async function add(list: FileList | null) {
    if (!list) return;
    setError('');
    const files = [...list].slice(0, MAX - items.length);
    if (list.length > files.length) setError(`Maksimal ${MAX} gambar.`);
    setBusy(true);
    try {
      for (const file of files) {
        if (!TYPES.includes(file.type))
          throw Error(`${file.name}: gunakan JPEG, PNG atau WebP. SVG tidak diterima.`);
        if (file.size > MAX_BYTES) throw Error(`${file.name}: melebihi 25 MB.`);
        const r = await fetch('/drawings/api/uploads?kind=image', {
          method: 'POST',
          headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) },
          body: file,
        });
        const body = await r.json().catch(() => ({}));
        if (r.status !== 201) throw Error(body.error || 'Unggahan gambar gagal.');
        setItems((v) => [...v, { fileId: body.fileId, name: body.name }]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="form-stack">
      <FileDrop
        label={label}
        hint={
          busy
            ? 'Mengunggah gambar…'
            : items.length >= MAX
              ? `Batas ${MAX} gambar tercapai. Hapus satu untuk mengganti.`
              : `Pilih atau tarik gambar ke sini · maks. ${MAX}, JPEG/PNG/WebP ≤ 25 MB`
        }
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={!mounted || busy || items.length >= MAX}
        onFiles={(files) => void add(files)}
      />
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {!!items.length && (
        <ul className="attachment-list">
          {items.map((i) => (
            <li key={i.fileId}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/drawings/api/uploads/${i.fileId}/file`} alt={i.name} />
              <Button
                type="button"
                className="small ghost"
                onClick={() => setItems((v) => v.filter((x) => x.fileId !== i.fileId))}
              >
                Hapus
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
