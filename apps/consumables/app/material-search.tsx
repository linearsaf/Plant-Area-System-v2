'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@plant/ui';
import {
  decimalUnits,
  formatQuantity,
  isSharedWorkArea,
  R22_SHARED_AREA,
  workAreaLabel,
  type AreaStockOption,
  type MaterialSearchResult,
} from '@plant/contracts';
import { stockApi } from './r22-api';

export type MaterialSearchMode = 'consume' | 'return' | 'catalog';

function availableBorrowOptions(m: MaterialSearchResult): AreaStockOption[] {
  return (m.otherAreas || []).filter((o) => {
    if (!o.inventoryActive || !o.initialized) return false;
    try {
      return decimalUnits(o.quantity, true) > 0n;
    } catch {
      return false;
    }
  });
}

function ownStockUnits(m: MaterialSearchResult): bigint {
  if (!m.inventoryId || !m.inventoryActive || !m.initialized) return 0n;
  try {
    return decimalUnits(m.quantity, true);
  } catch {
    return 0n;
  }
}

type OptionAvailability =
  | { selectable: true; borrowOnly: boolean; badge?: string; badgeTone?: 'orange' | 'neutral' }
  | { selectable: false; borrowOnly: false; reason: string };

function evaluateOption(
  m: MaterialSearchResult,
  mode: MaterialSearchMode,
  workArea: string,
): OptionAvailability {
  if (mode === 'catalog') return { selectable: true, borrowOnly: false };

  const borrowOptions = availableBorrowOptions(m);
  const ownUnits = ownStockUnits(m);

  if (mode === 'consume') {
    if (m.inventoryId && m.inventoryActive && m.initialized && ownUnits > 0n) {
      if (isSharedWorkArea(m.rack)) {
        return { selectable: true, borrowOnly: false, badge: 'Stok bersama', badgeTone: 'neutral' };
      }
      return { selectable: true, borrowOnly: false };
    }
    if (borrowOptions.length > 0) {
      const hasShared = borrowOptions.some((o) => isSharedWorkArea(o.rack));
      return {
        selectable: true,
        borrowOnly: true,
        badge: hasShared ? 'Stok bersama' : 'Pinjam tersedia',
        badgeTone: hasShared ? 'neutral' : 'orange',
      };
    }
    if (!m.inventoryId) return { selectable: false, borrowOnly: false, reason: 'Stok nol' };
    if (!m.inventoryActive) return { selectable: false, borrowOnly: false, reason: 'Nonaktif' };
    if (!m.initialized) return { selectable: false, borrowOnly: false, reason: 'Belum dihitung' };
    return { selectable: false, borrowOnly: false, reason: 'Stok nol' };
  }

  // Return mode
  if (!m.inventoryId) {
    return {
      selectable: false,
      borrowOnly: false,
      reason: workArea ? `Belum di ${workArea}` : 'Belum di stok R22',
    };
  }
  if (!m.inventoryActive) return { selectable: false, borrowOnly: false, reason: 'Nonaktif' };
  if (!m.initialized) return { selectable: false, borrowOnly: false, reason: 'Belum dihitung' };
  return {
    selectable: true,
    borrowOnly: false,
    ...(ownUnits <= 0n ? { badge: 'Stok nol', badgeTone: 'orange' as const } : {}),
  };
}

export function MaterialSearch({
  catalog = false,
  mode,
  workArea = '',
  onSelect,
}: {
  catalog?: boolean;
  mode?: MaterialSearchMode;
  workArea?: string;
  onSelect: (m: MaterialSearchResult) => void;
}) {
  const effectiveMode: MaterialSearchMode = mode ?? (catalog ? 'catalog' : 'return');
  const useCatalog = catalog || effectiveMode === 'catalog';
  const [query, setQuery] = useState(''),
    [settledQuery, setSettledQuery] = useState(''),
    [items, setItems] = useState<MaterialSearchResult[]>([]),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [active, setActive] = useState(0);
  const id = useId(),
    container = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    chooseRef = useRef(onSelect);
  chooseRef.current = onSelect;
  const choose = (m: MaterialSearchResult) => {
    if (!evaluateOption(m, effectiveMode, workArea).selectable) return;
    setOpen(false);
    setQuery('');
    setSettledQuery('');
    setItems([]);
    chooseRef.current(m);
  };
  useEffect(() => {
    const dismiss = (e: PointerEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  useEffect(() => {
    const c = new AbortController();
    const trimmed = query.trim();
    if (!trimmed) {
      setItems([]);
      setSettledQuery('');
      setBusy(false);
      return;
    }
    const timer = setTimeout(() => {
      setBusy(true);
      setError('');
      const params = new URLSearchParams({ q: query });
      if (workArea) params.set('workArea', workArea);
      stockApi(`/${useCatalog ? 'catalog-search' : 'search'}?` + params, {
        signal: c.signal,
      })
        .then((d) => {
          if (c.signal.aborted) return;
          const nextItems = d.items as MaterialSearchResult[];
          const exact = nextItems.find(
            (m: MaterialSearchResult) => m.mmid.toLowerCase() === trimmed.toLowerCase(),
          );
          if (exact && evaluateOption(exact, effectiveMode, workArea).selectable) {
            setOpen(false);
            setQuery('');
            setSettledQuery('');
            setItems([]);
            chooseRef.current(exact);
            return;
          }
          setItems(nextItems);
          setSettledQuery(trimmed);
          const firstSelectable = nextItems.findIndex(
            (m) => evaluateOption(m, effectiveMode, workArea).selectable,
          );
          setActive(firstSelectable >= 0 ? firstSelectable : 0);
          setOpen(true);
          requestAnimationFrame(() => {
            const box = container.current;
            if (!box) return;
            const rect = box.getBoundingClientRect();
            if (rect.bottom > window.innerHeight - 200) {
              box.scrollIntoView({
                block: 'start',
                behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
              });
            }
          });
        })
        .catch((e) => {
          if (!c.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!c.signal.aborted) setBusy(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [query, useCatalog, effectiveMode, workArea]);

  const moveActive = (delta: 1 | -1) => {
    if (!items.length) return;
    setActive((prev) => {
      for (let step = 1; step <= items.length; step++) {
        const idx = (prev + delta * step + items.length) % items.length;
        if (evaluateOption(items[idx], effectiveMode, workArea).selectable) return idx;
      }
      return (prev + delta + items.length) % items.length;
    });
  };

  return (
    <div className="r22-search" ref={container}>
      <label htmlFor={id}>
        Cari material
        <small>
          {workArea && effectiveMode === 'consume'
            ? `MMID, nama, atau deskripsi — memprioritaskan stok ${workArea} (opsi pinjam muncul bila stok kosong)`
            : 'MMID, nama, deskripsi, atau Area Kerja'}
        </small>
      </label>
      <div className="r22-search-field">
        <Icon name="search" />
        <input
          id={id}
          ref={input}
          type="text"
          value={query}
          placeholder="Contoh: baut M16, MMID, atau Area Kerja"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && !!query.trim()}
          aria-controls={id + '-options'}
          aria-activedescendant={open && items.length ? `${id}-${active}` : undefined}
          onFocus={() => {
            if (items.length && query.trim()) setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              if (open) {
                setOpen(false);
                e.preventDefault();
              } else if (query) {
                setQuery('');
                setSettledQuery('');
                setItems([]);
                e.preventDefault();
              }
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setOpen(true);
              moveActive(e.key === 'ArrowDown' ? 1 : -1);
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              if (
                open &&
                items[active] &&
                evaluateOption(items[active], effectiveMode, workArea).selectable
              ) {
                choose(items[active]);
              }
            }
          }}
        />
        {query && (
          <button
            type="button"
            className="r22-search-clear"
            aria-label="Hapus pencarian material"
            onClick={() => {
              setQuery('');
              setSettledQuery('');
              setItems([]);
              setOpen(false);
              input.current?.focus();
            }}
          >
            <Icon name="x" />
          </button>
        )}
      </div>
      {busy && <small role="status">Mencari material…</small>}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {open && query.trim() && (items.length > 0 || (!busy && settledQuery === query.trim())) && (
        <div
          id={id + '-options'}
          role="listbox"
          aria-label="Hasil pencarian material"
          className="r22-search-options"
        >
          {!busy && !items.length ? (
            <p className="empty">Material tidak ditemukan pada {useCatalog ? 'master' : 'stok R22'}.</p>
          ) : (
            items.map((m, i) => {
              const state = evaluateOption(m, effectiveMode, workArea);
              const disabled = !state.selectable;
              const borrowOptions = availableBorrowOptions(m);
              const titleText = m.commonName || m.description;
              const showDesc = Boolean(m.commonName && m.commonName !== m.description);
              const areaLabel = m.rack || workArea || 'R22';
              return (
                <div
                  role="option"
                  id={`${id}-${i}`}
                  tabIndex={-1}
                  aria-selected={i === active && !disabled}
                  aria-disabled={disabled ? 'true' : undefined}
                  className={`${i === active && !disabled ? 'highlight' : ''} ${disabled ? 'is-unavailable' : ''}`.trim()}
                  key={`${m.id}:${m.inventoryId || areaLabel}`}
                  onPointerMove={() => {
                    if (!disabled) setActive(i);
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (!disabled) choose(m);
                  }}
                >
                  <div className="r22-search-option-top">
                    <strong>
                      <span className="code-text">{m.mmid}</span> · {titleText}
                    </strong>
                    {!state.selectable ? (
                      <span
                        className={`badge ${state.reason === 'Stok nol' || state.reason === 'Belum dihitung' ? 'orange' : 'neutral'}`}
                      >
                        {state.reason}
                      </span>
                    ) : state.badge ? (
                      <span className={`badge ${state.badgeTone || 'neutral'}`}>{state.badge}</span>
                    ) : null}
                  </div>
                  {showDesc && <small>{m.description}</small>}
                  <span>
                    {state.selectable && state.borrowOnly ? (
                      <>
                        Stok {workArea || 'area sendiri'}: 0 {m.unit} · Tersedia di{' '}
                        {borrowOptions
                          .map((o) => `${workAreaLabel(o.rack)} (${formatQuantity(o.quantity)} ${m.unit})`)
                          .join(', ')}
                      </>
                    ) : (
                      <>
                        {m.inventoryId
                          ? m.initialized
                            ? `Stok: ${formatQuantity(m.quantity)} ${m.unit}`
                            : 'Belum dihitung'
                          : useCatalog
                            ? `Baru di stok ${workArea || R22_SHARED_AREA}`
                            : `Belum terdaftar di ${workArea || R22_SHARED_AREA}`}
                        {m.inventoryId ? ` · Area Kerja: ${workAreaLabel(m.rack)}` : ''}
                        {effectiveMode === 'consume' && borrowOptions.length > 0
                          ? ` · Area lain: ${borrowOptions
                              .map((o) => `${workAreaLabel(o.rack)} (${formatQuantity(o.quantity)})`)
                              .join(', ')}`
                          : ''}
                        {disabled ? ' · Tidak dapat dipilih' : ''}
                      </>
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
