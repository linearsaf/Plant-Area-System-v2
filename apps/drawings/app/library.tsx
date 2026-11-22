'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, EmptyState, Icon, Input, Select, TableSkeleton, useDebouncedValue } from '@plant/ui';
import {
  revisionStatusLabels,
  revisionStatuses,
  type DrawingListItem,
  type DrawingPage,
  type DrawingsMasters,
  type LibraryTab,
} from '@plant/contracts';
import { formatWib, getJson } from './client-api';
import { DrawingStatusBadge, LegacyBadge } from './status-badge';

type Filters = {
  q: string;
  status: string;
  disciplineId: string;
  drawnBy: string;
  from: string;
  to: string;
};
const empty: Filters = { q: '', status: '', disciplineId: '', drawnBy: '', from: '', to: '' };
const filterKeys = Object.keys(empty) as (keyof Filters)[];
/** Kembali dari detail drawing memulihkan posisi baca dan jumlah halaman yang sudah dimuat. */
const RETURN_KEY = 'drawings-library-return';
type ReturnPoint = { search: string; y: number; count: number };

export type LibraryParams = Partial<Record<keyof Filters | 'tab', string | string[]>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export function Library({
  masters,
  canSeeWip,
  isAdmin,
  initial = {},
}: {
  masters: DrawingsMasters;
  canSeeWip: boolean;
  isAdmin: boolean;
  initial?: LibraryParams;
}) {
  const tabs: { id: LibraryTab; label: string }[] = [
    { id: 'released', label: 'Final' },
    ...(canSeeWip ? [{ id: 'wip' as const, label: 'Proses' }] : []),
    ...(isAdmin ? [{ id: 'void' as const, label: 'Batal' }] : []),
  ];
  const initialTab = tabs.find((t) => t.id === first(initial.tab))?.id ?? 'released';
  const [tab, setTab] = useState<LibraryTab>(initialTab),
    [filters, setFilters] = useState<Filters>(() => {
      const f = { ...empty };
      for (const k of filterKeys) f[k] = first(initial[k]).slice(0, 100);
      if (initialTab === 'released') f.status = '';
      return f;
    }),
    [items, setItems] = useState<DrawingListItem[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [more, setMore] = useState(false),
    [error, setError] = useState(''),
    [view, setView] = useState<'list' | 'cards'>('list'),
    [counts, setCounts] = useState<DrawingPage['counts']>(),
    [owners, setOwners] = useState<string[]>([]),
    [filtersOpen, setFiltersOpen] = useState(() =>
      filterKeys.some((k) => k !== 'q' && k !== 'status' && !!first(initial[k])),
    );
  const restore = useRef<ReturnPoint | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    try {
      if (localStorage.getItem('drawings-library-view') === 'cards') setView('cards');
      const saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) || 'null') as ReturnPoint | null;
      sessionStorage.removeItem(RETURN_KEY);
      if (saved && saved.search === location.search) restore.current = saved;
    } catch {}
  }, []);
  useEffect(() => {
    getJson<{ names: string[] }>('drawing-owners')
      .then((d) => setOwners(d.names))
      .catch(() => undefined);
  }, []);
  const chooseView = (value: 'list' | 'cards') => {
    setView(value);
    try {
      localStorage.setItem('drawings-library-view', value);
    } catch {}
  };
  const debounced = useDebouncedValue(filters, 250);
  // Pencarian tinggal di URL: kembali dari detail, muat ulang, atau bagikan tautan memberi daftar yang sama.
  useEffect(() => {
    const p = new URLSearchParams();
    if (tab !== 'released') p.set('tab', tab);
    for (const k of filterKeys) if (debounced[k].trim()) p.set(k, debounced[k].trim());
    const search = p.toString() ? `?${p}` : '';
    if (search !== location.search) history.replaceState(history.state, '', location.pathname + search);
  }, [tab, debounced]);
  const query = useCallback(
    (next: string | null) => {
      const p = new URLSearchParams({ tab });
      for (const [k, v] of Object.entries(debounced)) if (v.trim()) p.set(k, v.trim());
      if (next) p.set('cursor', next);
      return 'drawings?' + p.toString();
    },
    [tab, debounced],
  );
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError('');
    getJson<DrawingPage>(query(null), abort.signal)
      .then((d) => {
        setItems(d.items);
        setCursor(d.nextCursor);
        setCounts(d.counts);
      })
      .catch((e) => !abort.signal.aborted && setError(e.message))
      .finally(() => !abort.signal.aborted && setLoading(false));
    return () => abort.abort();
  }, [query]);
  const loadMore = useCallback(async () => {
    if (!cursor) return;
    setMore(true);
    try {
      const d = await getJson<DrawingPage>(query(cursor));
      setItems((v) => [...v, ...d.items]);
      setCursor(d.nextCursor);
    } catch (e) {
      setError((e as Error).message);
      restore.current = null;
    } finally {
      setMore(false);
    }
  }, [cursor, query]);
  useEffect(() => {
    const saved = restore.current;
    if (!saved || loading || more) return;
    if (items.length < saved.count && cursor) {
      void loadMore();
      return;
    }
    restore.current = null;
    requestAnimationFrame(() => window.scrollTo({ top: saved.y, behavior: 'instant' }));
  }, [items, loading, more, cursor, loadMore]);
  const remember = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('a')) return;
    try {
      sessionStorage.setItem(
        RETURN_KEY,
        JSON.stringify({ search: location.search, y: window.scrollY, count: items.length }),
      );
    } catch {}
  };
  const set = (field: keyof Filters) => (e: { target: { value: string } }) =>
    setFilters((f) => ({ ...f, [field]: e.target.value }));
  const activeFilters = Object.entries(filters).filter(([k, v]) => k !== 'q' && v).length;
  const filtered = activeFilters > 0;
  // Di tab Final semua baris Completed; kolom status hanya berarti di tab lain.
  const showStatus = tab !== 'released';
  const hasLegacy = items.some((d) => d.source === 'legacy');
  const searching = !!filters.q.trim() || filtered;
  const chooseTab = (id: LibraryTab) => {
    setTab(id);
    setItems([]);
    if (id === 'released') setFilters((f) => ({ ...f, status: '' }));
  };
  const tabKey = (e: React.KeyboardEvent, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + tabs.length) % tabs.length;
    chooseTab(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className="panel drawing-library">
      <div className="library-head">
        <div role="tablist" aria-label="Kelompok drawing" className="segmented">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              tabIndex={tab === t.id ? 0 : -1}
              className={tab === t.id ? 'is-active' : ''}
              onClick={() => chooseTab(t.id)}
              onKeyDown={(e) => tabKey(e, i)}
            >
              {t.label}
              {counts?.[t.id] !== undefined && (
                <span className="tab-count" aria-label={`, ${counts[t.id]} drawing`}>
                  {counts[t.id]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="segmented view-toggle" role="group" aria-label="Tampilan">
          <button
            type="button"
            aria-pressed={view === 'list'}
            className={view === 'list' ? 'is-active' : ''}
            onClick={() => chooseView('list')}
            aria-label="Daftar"
            title="Daftar"
          >
            <Icon name="list" />
          </button>
          <button
            type="button"
            aria-pressed={view === 'cards'}
            className={view === 'cards' ? 'is-active' : ''}
            onClick={() => chooseView('cards')}
            aria-label="Kartu"
            title="Kartu"
          >
            <Icon name="grid" />
          </button>
        </div>
      </div>
      <div className="library-filters">
        <div className="library-search-row">
          <label className="library-search">
            <span className="sr-only">Cari</span>
            <Input
              type="search"
              placeholder="Cari nomor, nama atau HAC/SAC"
              maxLength={100}
              value={filters.q}
              onChange={set('q')}
            />
          </label>
          <button
            type="button"
            className={`secondary filter-toggle${filtered ? ' is-active' : ''}`}
            aria-expanded={filtersOpen}
            aria-controls="library-filter-panel"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <Icon name="filter" />
            <span className="filter-label">Filter</span>
            {filtered && (
              <span className="tab-count" aria-label={`, ${activeFilters} aktif`}>
                {activeFilters}
              </span>
            )}
          </button>
        </div>
        {filtersOpen && (
          <div id="library-filter-panel" className="form-grid library-filter-grid">
            {tab !== 'released' && (
              <label>
                Status
                <Select value={filters.status} onChange={set('status')}>
                  <option value="">Semua status</option>
                  {revisionStatuses.map((s) => (
                    <option key={s} value={s}>
                      {revisionStatusLabels[s]}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            <label>
              Discipline
              <Select value={filters.disciplineId} onChange={set('disciplineId')}>
                <option value="">Semua discipline</option>
                {masters.disciplines.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              Drawn by
              <Select value={filters.drawnBy} onChange={set('drawnBy')}>
                <option value="">Semua drafter</option>
                {owners.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              Dari tanggal (WIB)
              <Input type="date" value={filters.from} onChange={set('from')} />
            </label>
            <label>
              Sampai tanggal (WIB)
              <Input type="date" value={filters.to} onChange={set('to')} />
            </label>
            <div className="full">
              <Button
                type="button"
                className="small secondary"
                onClick={() => {
                  setFilters({ ...empty, q: filters.q });
                  setFiltersOpen(false);
                }}
              >
                Hapus filter
              </Button>
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <TableSkeleton />
      ) : !items.length ? (
        searching ? (
          <EmptyState
            title="Tidak ada drawing yang cocok"
            description="Periksa ejaan nomor atau HAC/SAC, atau longgarkan filter."
          >
            <Button type="button" className="secondary" onClick={() => setFilters(empty)}>
              Hapus pencarian dan filter
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            title={
              tab === 'released'
                ? 'Belum ada Final Drawing'
                : tab === 'wip'
                  ? 'Tidak ada drawing dalam proses'
                  : 'Tidak ada drawing dibatalkan'
            }
            description="Drawing akan tampil di sini."
          />
        )
      ) : view === 'list' ? (
        <div className="table-scroll" role="region" aria-label="Daftar drawing" tabIndex={0}>
          <table className="drawing-table stack-table" onClick={remember}>
            <thead>
              <tr>
                <th scope="col">Drawing Number</th>
                <th scope="col">Rev</th>
                <th scope="col">Drawing Name</th>
                {hasLegacy && (
                  <th scope="col" className="flag-col">
                    Sumber
                  </th>
                )}
                <th scope="col">HAC/SAC</th>
                <th scope="col">Discipline</th>
                {showStatus && <th scope="col">Status</th>}
                <th scope="col">Drawn by</th>
                <th scope="col">{tab === 'released' ? 'Terbit' : 'Diperbarui'}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id}>
                  <td data-cell="num">
                    <a href={`/drawings/library/${d.id}`} className="code-text row-link">
                      {d.number || 'Tanpa nomor'}
                    </a>
                  </td>
                  <td data-cell="rev">{d.revisionNo}</td>
                  <td data-cell="title">
                    {d.title || '–'}
                    {d.revising && <small className="muted block">Revisi berikutnya sedang diproses</small>}
                  </td>
                  {/* Kolom sendiri agar badge sejajar; di layar sempit menjadi titik di sudut kanan atas. */}
                  {hasLegacy && (
                    <td data-cell="flag">
                      {d.source === 'legacy' && (
                        <>
                          <span className="legacy-inline">
                            <LegacyBadge />
                          </span>
                          <span className="legacy-dot" title="Legacy Ready">
                            <span className="sr-only">Legacy Ready</span>
                          </span>
                        </>
                      )}
                    </td>
                  )}
                  <td className="code-text meta-first" data-cell="meta">
                    {d.hac}
                    {d.otherHacs.length > 0 && (
                      <span className="count-pill" title={d.otherHacs.join(', ')}>
                        +{d.otherHacs.length}
                        <span className="sr-only"> HAC/SAC lain: {d.otherHacs.join(', ')}</span>
                      </span>
                    )}
                  </td>
                  <td data-cell="extra">{d.discipline ?? '–'}</td>
                  {showStatus && (
                    <td data-cell="status">
                      <DrawingStatusBadge status={d.status} voided={d.voided} />
                    </td>
                  )}
                  <td data-cell="meta">{d.owner.name}</td>
                  <td data-cell="meta">
                    <WibDate value={tab === 'released' ? d.releasedAt : d.updatedAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasLegacy && (
            <p className="legacy-legend" aria-hidden="true">
              <span className="legacy-dot" /> Legacy Ready
            </p>
          )}
        </div>
      ) : (
        <div className="drawing-cards" onClick={remember}>
          {items.map((d) => (
            <a key={d.id} href={`/drawings/library/${d.id}`} className="drawing-card">
              <strong className="code-text">
                {d.number || 'Tanpa nomor'} · Rev {d.revisionNo}
              </strong>
              <span>{d.title || '–'}</span>
              <span className="muted">
                {d.hac}
                {d.otherHacs.length > 0 && ` +${d.otherHacs.length}`}
              </span>
              <span className="drawing-card-badges">
                <DrawingStatusBadge status={d.status} voided={d.voided} />
                {d.source === 'legacy' && <LegacyBadge />}
              </span>
              {d.revising && <small className="muted">Revisi berikutnya sedang diproses</small>}
            </a>
          ))}
        </div>
      )}
      {cursor && !loading && (
        <div className="form-actions">
          <Button className="secondary" busy={more} onClick={() => void loadMore()}>
            Muat lagi
          </Button>
        </div>
      )}
    </section>
  );
}

/** Tanggal WIB; jam disembunyikan di layar sempit agar metadata muat satu baris. */
function WibDate({ value }: { value: string | null }) {
  const text = formatWib(value);
  const cut = text.lastIndexOf(', ');
  if (cut < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, cut)}
      <span className="date-time">{text.slice(cut)}</span>
    </>
  );
}
