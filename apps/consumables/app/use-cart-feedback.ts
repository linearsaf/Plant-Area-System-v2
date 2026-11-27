'use client';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { cartLineKey, type CartDraft, type CartLine } from '@plant/ui';
/** A single reversible removal; document fields are never rolled back by undo. */
export function useCartFeedback(
  draft: CartDraft,
  setDraft: Dispatch<SetStateAction<CartDraft>>,
  setMessage: (message: string) => void,
) {
  const [removed, setRemoved] = useState<{ line: CartLine; index: number } | null>(null);
  const [highlight, setHighlight] = useState('');
  const revision = useRef(0);
  const [change, setChange] = useState(0);
  useEffect(() => {
    if (!highlight) return;
    const frame = requestAnimationFrame(() => {
      const row = document.querySelector<HTMLElement>(`[data-cart-material="${CSS.escape(highlight)}"]`);
      if (!row) return;
      const r = row.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight - 160)
        row.scrollIntoView({
          block: 'center',
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        });
    });
    const duration =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--duration-feedback')) || 600;
    const timer = setTimeout(() => setHighlight(''), duration);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [highlight, change]);
  const added = (key: string) => {
    setRemoved(null);
    setHighlight(key);
    setChange(++revision.current);
  };
  return {
    highlight,
    added,
    clear: () => {
      setRemoved(null);
      setHighlight('');
      setMessage('');
    },
    dismiss: () => {
      setMessage('');
      setRemoved(null);
    },
    remove: (index: number) => {
      const line = draft.lines[index];
      if (!line) return;
      const lineKey = cartLineKey(line);
      setRemoved({ line, index });
      setDraft((v) => ({ ...v, lines: v.lines.filter((l) => cartLineKey(l) !== lineKey) }));
      setMessage('Item dihapus');
    },
    action: removed
      ? {
          label: 'Urungkan',
          onClick: () => {
            const removedKey = cartLineKey(removed.line);
            setDraft((v) => {
              if (v.lines.some((l) => cartLineKey(l) === removedKey)) return v;
              const lines = [...v.lines];
              lines.splice(Math.min(removed.index, lines.length), 0, removed.line);
              return { ...v, lines };
            });
            added(removedKey);
            setMessage('Item dipulihkan');
          },
        }
      : undefined,
  };
}
