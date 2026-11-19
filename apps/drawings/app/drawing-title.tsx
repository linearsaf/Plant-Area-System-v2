'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@plant/ui';

/**
 * Judul detail: Drawing Name sebagai judul tetap (selaras dengan daftar), Drawing Number · Rev
 * sebagai baris kedua. Nomor dapat disalin dengan satu ketukan untuk dikutip di WO atau chat.
 */
export function DrawingTitle({
  name,
  number,
  copyValue,
  children,
}: {
  name: string | null;
  /** Baris nomor yang ditampilkan, termasuk revisi berlaku. */
  number: string;
  /** Drawing Number tanpa revisi; tombol salin hanya tampil bila ada. */
  copyValue?: string | null;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
    } catch {}
  };
  const copyButton = copyValue ? (
    <button
      type="button"
      className="icon-button ghost copy-number"
      aria-label={copied ? 'Drawing Number disalin' : `Salin Drawing Number ${copyValue}`}
      title={copied ? 'Disalin' : 'Salin Drawing Number'}
      onClick={() => void copy()}
    >
      <Icon name={copied ? 'check' : 'copy'} />
    </button>
  ) : null;
  return (
    <div className="heading drawing-heading">
      <div>
        <a
          className="eyebrow back-link"
          href="/drawings/library"
          onClick={(e) => {
            // Back from the Library keeps its search, tab and scroll; a direct link still navigates.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            try {
              const from = new URL(document.referrer);
              if (from.origin !== location.origin || from.pathname !== '/drawings/library') return;
            } catch {
              return;
            }
            e.preventDefault();
            history.back();
          }}
        >
          <Icon name="arrow" />
          Drawing Library
        </a>
        {name ? (
          <>
            <h1 className="drawing-title">{name}</h1>
            <p className="drawing-number muted">
              <span className="code-text">{number}</span>
              {copyButton}
            </p>
          </>
        ) : (
          <>
            <h1 className="drawing-title drawing-number">
              <span className="code-text">{number}</span>
              {copyButton}
            </h1>
            <p className="muted">Nama drawing belum diisi.</p>
          </>
        )}
        <span className="sr-only" role="status">
          {copied ? 'Drawing Number disalin.' : ''}
        </span>
      </div>
      {children}
    </div>
  );
}
