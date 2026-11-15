'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@plant/ui';
import { PdfViewer } from './pdf-viewer';

export type Staged = { fileId: string; name: string; size: number; sha256: string; pageCount: number | null };
const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
    : `${Math.ceil(bytes / 1024)} KB`;

/** Unggah PDF ke tahap `staged` (POST biner) lalu pratinjau lewat viewer. */
export function PdfUpload({
  maxMb,
  onStaged,
  label = 'File PDF',
}: {
  maxMb: number;
  onStaged?: (file: Staged | null) => void;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null),
    [error, setError] = useState(''),
    [staged, setStaged] = useState<Staged | null>(null),
    [mounted, setMounted] = useState(false);
  // A file chosen before hydration would never reach onChange; enable the input once mounted.
  useEffect(() => setMounted(true), []);
  function upload(file: File) {
    setError('');
    if (file.type && file.type !== 'application/pdf') return setError('File harus PDF.');
    if (file.size > maxMb * 1024 * 1024) return setError(`File melebihi batas ${maxMb} MB.`);
    if (!file.size) return setError('File kosong.');
    const request = new XMLHttpRequest();
    request.open('POST', '/drawings/api/uploads?kind=pdf');
    request.setRequestHeader('Content-Type', 'application/pdf');
    request.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    request.upload.onprogress = (e) =>
      e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    request.onload = () => {
      setProgress(null);
      let body: { error?: string } & Partial<Staged> = {};
      try {
        body = JSON.parse(request.responseText);
      } catch {}
      if (request.status === 201 && body.fileId) {
        setStaged(body as Staged);
        onStaged?.(body as Staged);
      } else
        setError(
          body.error ||
            (request.status === 413 ? `File melebihi batas ${maxMb} MB.` : 'Unggahan gagal. Coba lagi.'),
        );
    };
    request.onerror = () => {
      setProgress(null);
      setError('Koneksi terputus saat mengunggah. Coba lagi.');
    };
    setProgress(0);
    request.send(file);
  }
  return (
    <div className="upload-drop">
      <div className="form-stack">
        <label>
          {label} (maksimal {maxMb} MB)
          <input
            ref={input}
            type="file"
            accept="application/pdf,.pdf"
            disabled={!mounted || progress !== null}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
          />
        </label>
        {progress !== null && (
          <div role="status" aria-live="polite">
            <p className="fine">Mengunggah dan memeriksa PDF… {progress}%</p>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i style={{ transform: `scaleX(${progress / 100})` }} />
            </div>
          </div>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
      </div>
      {staged && (
        <>
          <div className="upload-meta" aria-label="Detail file">
            <span>
              <strong>{staged.name}</strong>
            </span>
            <span>{formatSize(staged.size)}</span>
            <span>{staged.pageCount} halaman</span>
            <span>
              SHA-256 <code>{staged.sha256.slice(0, 16)}…</code>
            </span>
            <Button
              className="small secondary"
              onClick={() => {
                setStaged(null);
                onStaged?.(null);
                if (input.current) input.current.value = '';
              }}
            >
              Ganti file
            </Button>
          </div>
          <PdfViewer
            url={`/drawings/api/uploads/${staged.fileId}/file`}
            title={staged.name}
            watermark="Draft"
          />
        </>
      )}
    </div>
  );
}
