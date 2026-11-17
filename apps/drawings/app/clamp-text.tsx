'use client';
import { useLayoutEffect, useRef, useState } from 'react';

/** Teks bebas panjang dipotong tiga baris; tombol hanya muncul bila memang ada yang tersembunyi. */
export function ClampText({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null),
    [open, setOpen] = useState(false),
    [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children, open]);
  return (
    <span className={`clamp-text${open ? '' : ' is-clamped'}`}>
      <span ref={ref}>{children}</span>
      {(overflows || open) && (
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? 'Ringkas' : 'Selengkapnya'}
        </button>
      )}
    </span>
  );
}
