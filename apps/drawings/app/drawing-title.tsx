'use client';
import { useState } from 'react';
import { Icon } from '@plant/ui';

/**
 * Judul detail: Drawing Name sebagai default, Drawing Number · Rev sebagai baris kedua.
 * Klik judul menukar keduanya, untuk pembaca yang mencari berdasarkan nomor.
 */
export function DrawingTitle({
  name,
  number,
  children,
}: {
  name: string | null;
  number: string;
  children?: React.ReactNode;
}) {
  const [byNumber, setByNumber] = useState(false);
  const main = byNumber || !name ? number : name,
    sub = byNumber || !name ? name : number;
  return (
    <div className="heading drawing-heading">
      <div>
        <p className="eyebrow">Drawing Library</p>
        <h1 className={`drawing-title${main === number ? ' code-text' : ''}`}>
          {name ? (
            <button
              type="button"
              className="title-swap"
              title={byNumber ? 'Tampilkan Drawing Name' : 'Tampilkan Drawing Number'}
              onClick={() => setByNumber((v) => !v)}
            >
              <span>{main}</span>
              <Icon name="swap" />
            </button>
          ) : (
            main
          )}
        </h1>
        <p className={`muted${sub === number ? ' code-text' : ''}`}>{sub ?? 'Nama drawing belum diisi.'}</p>
      </div>
      {children}
    </div>
  );
}
