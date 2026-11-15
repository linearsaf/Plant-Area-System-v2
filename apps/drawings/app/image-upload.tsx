'use client';
import { useEffect, useState } from 'react';
import { Button } from '@plant/ui';

type Item = { fileId: string; name: string };
const MAX = 3;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Unggah maksimal 3 gambar JPEG/PNG/WebP (≤ 5 MB) sebagai lampiran; server memeriksa magic bytes. */
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
        if (file.size > 5 * 1024 * 1024) throw Error(`${file.name}: melebihi 5 MB.`);
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
      <label>
        {label} — maks. {MAX}, JPEG/PNG/WebP ≤ 5 MB
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={!mounted || busy || items.length >= MAX}
          onChange={(e) => {
            void add(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
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
