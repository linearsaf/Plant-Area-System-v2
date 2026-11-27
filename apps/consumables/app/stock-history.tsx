'use client';
import { useEffect, useState, useRef } from 'react';
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
import {
  costCenterLabel,
  formatDate,
  formatQuantity,
  stockDocumentLabels,
  stockLoanStatusLabels,
  type Identity,
  type StockDocument,
  type DocumentResult,
} from '@plant/contracts';
import { stockApi } from './r22-api';
import { ConsumablesWorkspace } from './workspace';
import { LoansPanel } from './loans-panel';

export function StockHistory({ identity }: { identity: Identity }) {
  const [mode, setMode] = useState<'documents' | 'ledger' | 'loans'>('documents'),
    [query, setQuery] = useState(''),
    [type, setType] = useState(''),
    [borrowedOnly, setBorrowedOnly] = useState(false),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [ledgerType, setLedgerType] = useState(''),
    [activeLoanCount, setActiveLoanCount] = useState(0);
  const [items, setItems] = useState<StockDocument[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [back, setBack] = useState<(string | null)[]>([]),
    [next, setNext] = useState<string | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(''),
    [reload, setReload] = useState(0),
    [detail, setDetail] = useState<DocumentResult | null>(null);
  const debouncedQuery = useDebouncedValue(query);
  const detailRequest = useRef<AbortController | null>(null);
  useEffect(() => () => detailRequest.current?.abort(), []);
  useEffect(() => {
    const c = new AbortController();
    stockApi('/loans?status=active&limit=1', { signal: c.signal })
      .then((d) => {
        if (!c.signal.aborted && d.counts) setActiveLoanCount(Number(d.counts.active || 0));
      })
      .catch(() => {});
    return () => c.abort();
  }, [reload]);
  useEffect(() => {
    const controller = new AbortController();
    const p = new URLSearchParams(window.location.search);
    if (p.get('tab') === 'loans' || p.get('loan')) setMode('loans');
    else if (p.get('movement') || p.get('material') || p.get('tab') === 'ledger') setMode('ledger');
    if (p.get('document'))
      stockApi('/documents/' + encodeURIComponent(p.get('document')!), { signal: controller.signal })
        .then((d) => {
          if (!controller.signal.aborted) setDetail(d);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    setCursor(null);
    setBack([]);
  }, [debouncedQuery, type, borrowedOnly, from, to]);
  useEffect(() => {
    if (mode !== 'documents') return;
    const c = new AbortController();
    setBusy(true);
    setError('');
    const p = new URLSearchParams({ q: debouncedQuery });
    if (type) p.set('type', type);
    if (borrowedOnly) p.set('borrowed', '1');
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (cursor) p.set('cursor', cursor);
    stockApi('/documents?' + p, { signal: c.signal })
      .then((d) => {
        if (!c.signal.aborted) {
          setItems(d.items);
          setNext(d.nextCursor);
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setBusy(false);
      });

    return () => {
      c.abort();
    };
  }, [mode, debouncedQuery, type, borrowedOnly, from, to, cursor, reload]);
  async function open(id: string) {
    try {
      detailRequest.current?.abort();
      const c = new AbortController();
      detailRequest.current = c;
      const d = await stockApi('/documents/' + id, { signal: c.signal });
      if (!c.signal.aborted) setDetail(d);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="stock-tabs" role="group" aria-label="Jenis riwayat">
        <Button
          className={mode === 'documents' ? 'primary small' : 'secondary small'}
          aria-pressed={mode === 'documents'}
          onClick={() => setMode('documents')}
        >
          Dokumen
        </Button>
        <Button
          className={mode === 'loans' ? 'primary small' : 'secondary small'}
          aria-pressed={mode === 'loans'}
          onClick={() => setMode('loans')}
        >
          Pinjaman{activeLoanCount > 0 ? ` (${activeLoanCount})` : ''}
        </Button>
        <Button
          className={mode === 'ledger' ? 'primary small' : 'secondary small'}
          aria-pressed={mode === 'ledger'}
          onClick={() => setMode('ledger')}
        >
          Pergerakan stok
        </Button>
      </div>
      {mode === 'loans' ? (
        <LoansPanel identity={identity} onCountsChange={setActiveLoanCount} />
      ) : mode === 'ledger' ? (
        <ConsumablesWorkspace key={ledgerType} identity={identity} view="history" initialType={ledgerType} />
      ) : (
        <section className="panel">
          <div className="section-title">
            <div>
              <h2>Order dan penerimaan</h2>
            </div>
            <Button
              type="button"
              className="secondary small r22-refresh-button"
              aria-label="Perbarui"
              title="Perbarui"
              busy={busy}
              onClick={() => setReload((v) => v + 1)}
            >
              <Icon name="rotate" />
            </Button>
          </div>
          <div className="stock-filters">
            <label>
              Cari dokumen
              <Input
                type="search"
                value={query}
                maxLength={200}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nomor, HAC/SAC, WO, Area Kerja, peminta…"
              />
            </label>
            <label>
              Jenis
              <Select
                value={type}
                onChange={(e) => {
                  const value = e.target.value;
                  if (['opening', 'adjustment'].includes(value)) {
                    setLedgerType(value);
                    setMode('ledger');
                  } else setType(value);
                }}
              >
                <option value="">Semua dokumen</option>
                {Object.entries(stockDocumentLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
                <option value="opening">Saldo awal · ledger</option>
                <option value="adjustment">Koreksi · ledger</option>
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
            <label className="inline">
              <input
                type="checkbox"
                checked={borrowedOnly}
                onChange={(e) => setBorrowedOnly(e.target.checked)}
              />
              Hanya yang meminjam
            </label>
          </div>
          {error && (
            <p className="notice error" role="alert">
              {error}{' '}
              <Button className="secondary small" onClick={() => setReload((v) => v + 1)}>
                Coba lagi
              </Button>
            </p>
          )}
          <div className="stock-table r22-documents-list" aria-busy={busy}>
            <div className="stock-table-head">
              <span>Dokumen / peminta</span>
              <span>Konteks pekerjaan</span>
              <span>Item / waktu</span>
            </div>
            {items.map((d) => (
              <button
                type="button"
                key={d.id}
                className={`stock-table-row${detail?.document.id === d.id ? ' selected' : ''}`}
                onClick={() => open(d.id)}
              >
                <span>
                  <strong className="code-text">{d.number}</strong>
                  <small>
                    {stockDocumentLabels[d.type]}
                    {d.workArea ? ` · ${d.workArea}` : ''} · {d.requesterName}
                  </small>
                  {!!d.borrowCount && (
                    <span className="r22-inline-badges">
                      <span className="badge orange">{d.borrowCount} pinjam antar area</span>
                    </span>
                  )}
                </span>
                <span>
                  <span className="code-text">
                    {d.hec || (d.type === 'picklist' && d.costCenter ? d.costCenter : 'R22')}
                  </span>
                  <small>
                    WO <span className="code-text">{d.wo || '—'}</span>
                    {d.reservationNo ? ' · Reservasi ' + d.reservationNo : ''}
                  </small>
                </span>
                <span>
                  <strong>{d.lineCount} item</strong>
                  <small>
                    {formatDate(d.createdAt)} WIB · {d.actorName}
                  </small>
                </span>
              </button>
            ))}
            {!items.length &&
              (busy ? (
                <TableSkeleton rows={5} />
              ) : (
                <EmptyState
                  title="Belum ada dokumen sesuai filter"
                  description="Riwayat lama tersedia pada tab Pergerakan stok."
                />
              ))}
          </div>
          <div className="stock-pagination">
            <Button
              className="secondary small"
              disabled={!back.length || busy}
              onClick={() => {
                const value = [...back];
                setCursor(value.pop() || null);
                setBack(value);
              }}
            >
              Sebelumnya
            </Button>
            <span>
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
        </section>
      )}
      <Overlay
        open={!!detail}
        onClose={() => {
          detailRequest.current?.abort();
          setDetail(null);
        }}
        title="Detail dokumen R22"
        kind="sheet"
        onNavigate={(direction) => {
          const i = items.findIndex((d) => d.id === detail?.document.id);
          if (i >= 0 && items[i + direction]) void open(items[i + direction].id);
        }}
      >
        {detail && (
          <>
            <div className="r22-inline-badges">
              <span className="badge neutral">{stockDocumentLabels[detail.document.type]}</span>
              {!!detail.document.borrowCount && (
                <span className="badge orange">{detail.document.borrowCount} pinjam antar area</span>
              )}
            </div>
            <h2 className="code-text">{detail.document.number}</h2>
            <dl className="stock-detail-grid">
              {[
                ...(detail.document.workArea
                  ? [['Area Kerja', detail.document.workArea, false] as const]
                  : []),
                ['HAC/SAC', detail.document.hec || '—', true],
                ['WO', detail.document.wo || '—', true],
                ['Keterangan', detail.document.note || '—', false],
                ['Peminta', detail.document.requesterName, false],
                ['NIK', detail.document.requesterNik || '—', true],
                ['Pencatat', detail.document.actorName, false],
                ['Waktu WIB', formatDate(detail.document.createdAt), false],
                ...(detail.document.costCenter
                  ? [['Cost Center', costCenterLabel(detail.document.costCenter), false] as const]
                  : []),
                ...(detail.document.reservationNo
                  ? [['Reservasi', detail.document.reservationNo, true] as const]
                  : []),
              ].map(([label, value, code]) => (
                <div key={String(label)}>
                  <dt>{label}</dt>
                  <dd className={code ? 'code-text' : undefined}>{value}</dd>
                </div>
              ))}
            </dl>
            <h3>{detail.lines.length} item</h3>
            {detail.lines.map((l) => {
              const linkedLoan = l.loanId ? detail.loans?.find((ln) => ln.id === l.loanId) : undefined;
              return (
                <article key={l.id} className="stock-detail-location">
                  <div className="r22-cart-material-head">
                    <strong>
                      {l.lineNo}. {l.commonName || l.description}
                    </strong>
                    {l.borrowedFromArea && (
                      <span className="badge orange">Pinjam dari {l.borrowedFromArea}</span>
                    )}
                  </div>
                  <small>
                    <span className="code-text">{l.mmid}</span> · {l.description}
                    {l.workArea ? ` · Area Kerja: ${l.workArea}` : ''}
                  </small>
                  <span>
                    {formatQuantity(l.quantity.replace('-', ''))} {l.unit}
                  </span>
                  <small>
                    Saldo setelah pencatatan: {formatQuantity(l.balanceAfter)} {l.unit}
                  </small>
                  {linkedLoan && (
                    <small>
                      Pinjaman <span className="code-text">{linkedLoan.number}</span> (
                      {stockLoanStatusLabels[linkedLoan.status]}) ·{' '}
                      <a href={`/consumables/history?tab=loans&loan=${encodeURIComponent(linkedLoan.id)}`}>
                        Kelola / lunasi
                      </a>
                    </small>
                  )}
                </article>
              );
            })}
            <div className="form-actions">
              <a className="button primary" href={`/consumables/documents/${detail.document.id}`}>
                Lihat / Cetak bukti
              </a>
              {!!detail.loans?.length && (
                <a className="button secondary" href="/consumables/history?tab=loans">
                  Lihat daftar pinjaman
                </a>
              )}
            </div>
          </>
        )}
      </Overlay>
    </>
  );
}
