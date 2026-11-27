'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Icon,
  Input,
  Select,
  Overlay,
  TableSkeleton,
  EmptyState,
  useDebouncedValue,
} from '@plant/ui';
import { formatDate, formatQuantity, type Identity, type Movement } from '@plant/contracts';

type AuditItem = { id: string; action: string; actorName: string; createdAt: string; details: string };
type ListItem = Movement | AuditItem;
type ListSource = 'movements' | 'audit';
type ListPage = { source: ListSource; items: ListItem[]; nextCursor: string | null; checked: string };
const api = '/consumables/api';
const labels: Record<Movement['type'], string> = {
  opening: 'Saldo awal',
  receipt: 'Penerimaan',
  issue: 'Pemakaian',
  return: 'Return Order',
  adjustment: 'Koreksi',
  loan_out: 'Pelunasan pinjaman (keluar)',
  loan_in: 'Pelunasan pinjaman (masuk)',
  loan_return: 'Pengembalian fisik pinjaman',
};

async function get(path: string, signal?: AbortSignal) {
  const r = await fetch(api + path, { cache: 'no-store', signal }),
    d = await r.json();
  if (!r.ok) throw Error(d.error || 'Gagal memuat data.');
  return d;
}

const quantity = (n: string) => formatQuantity(n);

export function ConsumablesWorkspace({
  identity: _identity,
  view,
  initialType = '',
}: {
  identity: Identity;
  view: string;
  initialType?: string;
}) {
  const [query, setQuery] = useState(''),
    [type, setType] = useState(initialType),
    [from, setFrom] = useState(''),
    [to, setTo] = useState('');
  const [result, setResult] = useState<ListPage | null>(null),
    [cursor, setCursor] = useState<string | null>(null),
    [back, setBack] = useState<(string | null)[]>([]),
    [loading, setBusy] = useState(false),
    [error, setError] = useState(''),
    [refresh, setRefresh] = useState(0);
  const [movement, setMovement] = useState<Movement | null>(null);

  const source: ListSource = view === 'audit' ? 'audit' : 'movements';
  // Retain rows for same-source filters, never across incompatible table shapes.
  const current = result?.source === source ? result : null,
    items = current?.items ?? [],
    next = current?.nextCursor ?? null,
    checked = current?.checked ?? '',
    ready = !!current,
    busy = loading || !current;

  const debouncedQuery = useDebouncedValue(query);

  const load = useCallback(
    async (signal: AbortSignal) => {
      const p = new URLSearchParams({ q: debouncedQuery });
      if (cursor) p.set('cursor', cursor);
      if (type) p.set('type', type);
      if (from) p.set('from', from);
      if (to) p.set('to', to);
      return get('/' + source + '?' + p, signal);
    },
    [source, debouncedQuery, cursor, type, from, to],
  );

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError('');
    load(controller.signal)
      .then((d) => {
        if (controller.signal.aborted) return;
        setResult({ source, items: d.items, nextCursor: d.nextCursor, checked: new Date().toISOString() });
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e.message);
          setResult((old) =>
            old?.source === source ? old : { source, items: [], nextCursor: null, checked: '' },
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => {
      controller.abort();
    };
  }, [load, refresh, source]);

  useEffect(() => {
    setCursor(null);
    setBack([]);
  }, [debouncedQuery, type, from, to]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('movement'))
      get('/movements/' + encodeURIComponent(p.get('movement')!))
        .then((d) => setMovement(d.movement))
        .catch((e) => setError(e.message));
    if (p.get('material') && view === 'history')
      get('/materials/' + encodeURIComponent(p.get('material')!))
        .then((d) => setQuery(d.material.mmid))
        .catch((e) => setError(e.message));
  }, [view]);

  const filters = (
    <div className="stock-filters">
      <label>
        Cari transaksi
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="MMID, nama material, WO, referensi…"
        />
      </label>
      <label>
        Jenis
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Semua transaksi</option>
          {Object.entries(labels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </label>
      <label>
        Dari tanggal (WIB)
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </label>
      <label>
        Sampai tanggal (WIB)
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </label>
    </div>
  );

  const paging = (
    <div className="stock-pagination">
      <Button
        className="secondary small"
        disabled={!back.length || busy}
        onClick={() => {
          const p = [...back];
          setCursor(p.pop() ?? null);
          setBack(p);
        }}
      >
        Sebelumnya
      </Button>
      <span className="r22-pagination-meta">
        {items.length} hasil · halaman {back.length + 1}
      </span>
      <Button
        className="secondary small"
        disabled={!next || busy}
        onClick={() => {
          setBack((v) => [...v, cursor]);
          setCursor(next);
        }}
      >
        Berikutnya
      </Button>
    </div>
  );

  return (
    <>
      {error && (
        <p className="notice error" role="alert">
          {error}{' '}
          <Button className="secondary small" onClick={() => setRefresh((v) => v + 1)}>
            Coba lagi
          </Button>
        </p>
      )}
      <section className="panel">
        <div className="section-title">
          <div>
            <h2>{view === 'audit' ? 'Audit aplikasi' : 'Pergerakan stok'}</h2>
            <small>{checked ? `Diperbarui ${formatDate(checked)} WIB` : ''}</small>
          </div>
          <Button
            type="button"
            className="secondary small r22-refresh-button"
            aria-label="Perbarui"
            title="Perbarui"
            busy={busy}
            onClick={() => setRefresh((v) => v + 1)}
          >
            <Icon name="rotate" />
          </Button>
        </div>
        {view !== 'audit' && filters}
        {view === 'audit' ? (
          <div className="stock-audit-list" aria-busy={busy} role="list">
            {(items as AuditItem[]).map((v) => (
              <article className="stock-audit-row" key={v.id} role="listitem">
                <div>
                  <strong>
                    {(
                      {
                        'stock.opening': 'Saldo awal',
                        'stock.receipt': 'Penerimaan',
                        'stock.issue': 'Pemakaian',
                        'stock.adjustment': 'Koreksi',
                        'stock.loan_out': 'Pelunasan pinjaman (keluar)',
                        'stock.loan_in': 'Pelunasan pinjaman (masuk)',
                        'stock.loan_return': 'Pengembalian fisik pinjaman',
                        'loan.created': 'Pinjaman antar area dicatat',
                        'loan.repaid': 'Pinjaman antar area dilunasi',
                        'material.saved': 'Master material diperbarui',
                        'location.saved': 'Lokasi diperbarui',
                        'inventory.saved': 'Daftar stok diperbarui',
                        'catalog.imported': 'Impor katalog',
                      } as Record<string, string>
                    )[v.action] || v.action}
                  </strong>
                  <small>
                    {formatDate(v.createdAt)} WIB · {v.actorName}
                  </small>
                </div>
                <details>
                  <summary>Detail audit</summary>
                  <pre className="stock-audit-details">{JSON.stringify(JSON.parse(v.details), null, 2)}</pre>
                </details>
              </article>
            ))}
            {!items.length && (
              <>
                {!ready ? (
                  <TableSkeleton rows={5} />
                ) : (
                  <EmptyState title="Belum ada audit." description="Coba kata kunci atau filter lain." />
                )}
              </>
            )}
          </div>
        ) : (
          <MovementRows
            items={items as Movement[]}
            busy={busy}
            ready={ready}
            onSelect={setMovement}
            selected={movement?.id}
          />
        )}
        {paging}
      </section>

      <Overlay
        open={!!movement}
        onClose={() => setMovement(null)}
        title="Detail transaksi"
        kind="sheet"
        onNavigate={(direction) => {
          const i = items.findIndex((m) => m.id === movement?.id);
          if (i >= 0 && items[i + direction]) setMovement(items[i + direction] as Movement);
        }}
      >
        {movement && (
          <>
            <span className="badge neutral">{labels[movement.type]}</span>
            <h2>
              <span className="code-text">{movement.mmid}</span> · {movement.description}
            </h2>
            <dl className="stock-detail-grid">
              {[
                ...(movement.workArea ? [['Area Kerja', movement.workArea]] : []),
                ...(movement.borrowedFromArea ? [['Pinjam / Area terkait', movement.borrowedFromArea]] : []),
                ['Perubahan stok', quantity(movement.quantity) + ' ' + movement.unit],
                ['Saldo sesudah pencatatan', quantity(movement.balanceAfter) + ' ' + movement.unit],
                [
                  'Kemasan',
                  movement.packs
                    ? `${movement.packs} kemasan × ${quantity(movement.packSize!)} ${movement.unit}`
                    : 'Satuan dasar',
                ],
                ['Referensi', movement.reference || '—'],
                ['Pekerjaan', movement.job || '—'],
                ['WO', movement.wo || '—'],
                ['Alasan', movement.reason || '—'],
                ['Pencatat', movement.actorName],
                ['Waktu WIB', formatDate(movement.createdAt)],
                ['ID transaksi', movement.id],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </Overlay>
    </>
  );
}

function MovementRows({
  items,
  busy,
  ready,
  onSelect,
  selected,
}: {
  items: Movement[];
  busy: boolean;
  ready: boolean;
  onSelect: (m: Movement) => void;
  selected?: string;
}) {
  return (
    <div className="stock-table" aria-busy={busy}>
      <div className="stock-table-head">
        <span>Material</span>
        <span>Transaksi</span>
        <span>Jumlah</span>
      </div>
      {items.map((m) => (
        <button
          type="button"
          className={`stock-table-row${selected === m.id ? ' selected' : ''}`}
          key={m.id}
          onClick={() => onSelect(m)}
        >
          <span>
            <strong>
              <span className="code-text">{m.mmid}</span> · {m.description}
            </strong>
            <small>{m.reference || m.job || m.reason}</small>
          </span>
          <span data-label="Transaksi">
            {labels[m.type]}
            <small>
              {formatDate(m.createdAt)} · {m.actorName}
            </small>
          </span>
          <strong data-label="Jumlah">
            {quantity(m.quantity)} {m.unit}
          </strong>
        </button>
      ))}
      {!items.length && (
        <>
          {!ready ? (
            <TableSkeleton rows={5} />
          ) : (
            <EmptyState
              title="Belum ada transaksi sesuai filter."
              description="Coba kata kunci atau filter lain."
            />
          )}
        </>
      )}
    </div>
  );
}
