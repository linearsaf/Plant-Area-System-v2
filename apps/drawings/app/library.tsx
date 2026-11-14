'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button, EmptyState, Input, Select, TableSkeleton, useDebouncedValue } from '@plant/ui';
import {
  revisionStatusLabels,
  revisionStatuses,
  type DrawingListItem,
  type DrawingPage,
  type DrawingsMasters,
  type LibraryTab,
} from '@plant/contracts';
import { formatWib, getJson } from './client-api';
import { LegacyBadge, StatusBadge } from './status-badge';

type Filters = {
  q: string;
  status: string;
  areaId: string;
  disciplineId: string;
  revision: string;
  from: string;
  to: string;
};
const empty: Filters = { q: '', status: '', areaId: '', disciplineId: '', revision: '', from: '', to: '' };

export function Library({
  masters,
  canSeeWip,
  isAdmin,
}: {
  masters: DrawingsMasters;
  canSeeWip: boolean;
  isAdmin: boolean;
}) {
  const tabs: { id: LibraryTab; label: string }[] = [
    { id: 'released', label: 'Final' },
    ...(canSeeWip ? [{ id: 'wip' as const, label: 'Dalam proses' }] : []),
    ...(isAdmin ? [{ id: 'void' as const, label: 'Dibatalkan' }] : []),
  ];
  const [tab, setTab] = useState<LibraryTab>('released'),
    [filters, setFilters] = useState<Filters>(empty),
    [items, setItems] = useState<DrawingListItem[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [more, setMore] = useState(false),
    [error, setError] = useState(''),
    [view, setView] = useState<'list' | 'cards'>('list');
  useEffect(() => {
    try {
      if (localStorage.getItem('drawings-library-view') === 'cards') setView('cards');
    } catch {}
  }, []);
  const chooseView = (value: 'list' | 'cards') => {
    setView(value);
    try {
      localStorage.setItem('drawings-library-view', value);
    } catch {}
  };
  const debounced = useDebouncedValue(filters, 250);
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
      })
      .catch((e) => !abort.signal.aborted && setError(e.message))
      .finally(() => !abort.signal.aborted && setLoading(false));
    return () => abort.abort();
  }, [query]);
  const loadMore = async () => {
    if (!cursor) return;
    setMore(true);
    try {
      const d = await getJson<DrawingPage>(query(cursor));
      setItems((v) => [...v, ...d.items]);
      setCursor(d.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMore(false);
    }
  };
  const set = (field: keyof Filters) => (e: { target: { value: string } }) =>
    setFilters((f) => ({ ...f, [field]: e.target.value }));
  const filtered = Object.entries(filters).some(([k, v]) => k !== 'q' && v);

  return (
    <section className="panel drawing-library">
      <div className="library-head">
        <div role="tablist" aria-label="Kelompok drawing" className="segmented">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'is-active' : ''}
              onClick={() => {
                setTab(t.id);
                setItems([]);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="segmented" aria-label="Tampilan">
          <button
            type="button"
            aria-pressed={view === 'list'}
            className={view === 'list' ? 'is-active' : ''}
            onClick={() => chooseView('list')}
          >
            Daftar
          </button>
          <button
            type="button"
            aria-pressed={view === 'cards'}
            className={view === 'cards' ? 'is-active' : ''}
            onClick={() => chooseView('cards')}
          >
            Kartu
          </button>
        </div>
      </div>
      <div className="library-filters">
        <label className="library-search">
          <span className="sr-only">Cari</span>
          <Input
            type="search"
            placeholder="Cari nomor, nama, HAC/SAC atau area"
            maxLength={100}
            value={filters.q}
            onChange={set('q')}
          />
        </label>
        <details open={filtered}>
          <summary>Filter{filtered ? ' (aktif)' : ''}</summary>
          <div className="form-grid library-filter-grid">
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
            <label>
              Area
              <Select value={filters.areaId} onChange={set('areaId')}>
                <option value="">Semua area</option>
                {masters.areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </label>
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
              Revisi
              <Input
                maxLength={20}
                value={filters.revision}
                onChange={set('revision')}
                placeholder="mis. 0, A"
              />
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
                onClick={() => setFilters({ ...empty, q: filters.q })}
              >
                Hapus filter
              </Button>
            </div>
          </div>
        </details>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <TableSkeleton />
      ) : !items.length ? (
        <EmptyState
          title={
            tab === 'released'
              ? 'Belum ada Final Drawing'
              : tab === 'wip'
                ? 'Tidak ada drawing dalam proses'
                : 'Tidak ada drawing dibatalkan'
          }
          description={
            filters.q || filtered
              ? 'Tidak ada drawing yang cocok dengan pencarian atau filter.'
              : 'Drawing akan tampil di sini.'
          }
        />
      ) : view === 'list' ? (
        <div className="table-scroll">
          <table className="drawing-table">
            <thead>
              <tr>
                <th scope="col">Drawing Number</th>
                <th scope="col">Drawing Name</th>
                <th scope="col">HAC/SAC</th>
                <th scope="col">Area</th>
                <th scope="col">Rev</th>
                <th scope="col">Status</th>
                <th scope="col">Drawn by</th>
                <th scope="col">{tab === 'released' ? 'Terbit' : 'Diperbarui'}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id}>
                  <td>
                    <a href={`/drawings/library/${d.id}`} className="code-text">
                      {d.number || 'Tanpa nomor'}
                    </a>
                  </td>
                  <td>
                    {d.title || '–'} {d.source === 'legacy' && <LegacyBadge />}
                    {d.revising && <small className="muted block">Revisi berikutnya sedang diproses</small>}
                  </td>
                  <td className="code-text">{d.hac}</td>
                  <td>{d.area}</td>
                  <td>{d.revisionNo}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td>{d.owner.name}</td>
                  <td>{formatWib(tab === 'released' ? d.releasedAt : d.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="drawing-cards">
          {items.map((d) => (
            <a key={d.id} href={`/drawings/library/${d.id}`} className="drawing-card">
              <strong className="code-text">{d.number || 'Tanpa nomor'}</strong>
              <span>{d.title || '–'}</span>
              <span className="muted">
                {d.hac} · {d.area} · Rev {d.revisionNo}
              </span>
              <span className="drawing-card-badges">
                <StatusBadge status={d.status} />
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
