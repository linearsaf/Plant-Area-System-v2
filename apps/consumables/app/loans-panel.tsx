'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Button,
  EmptyState,
  Icon,
  Input,
  Overlay,
  Select,
  TableSkeleton,
  Toast,
  useConfirmation,
  useDebouncedValue,
} from '@plant/ui';
import {
  canConsume,
  decimalString,
  decimalUnits,
  formatDate,
  formatQuantity,
  isSharedWorkArea,
  loanRepaymentMethodLabels,
  localDecimal,
  R22_WORK_AREAS,
  stockLoanStatusLabels,
  validateStockQuantity,
  type Identity,
  type LoanRepaymentMethod,
  type StockLoan,
  type StockLoanDetail,
} from '@plant/contracts';
import { stockApi } from './r22-api';

const STATUS_CHIPS = [
  ['active', 'Aktif'],
  ['open', 'Belum lunas'],
  ['partial', 'Sebagian'],
  ['settled', 'Lunas'],
  ['all', 'Semua'],
] as const;

function editableDecimal(value: string): string {
  try {
    const [whole, fraction = ''] = decimalString(decimalUnits(value)).split('.');
    const trimmed = fraction.replace(/0+$/, '');
    return trimmed ? `${whole},${trimmed}` : whole;
  } catch {
    return value;
  }
}

function areaOptionLabel(area: string) {
  return (R22_WORK_AREAS as readonly string[]).includes(area) ? area : `${area} (nilai lama)`;
}

export function LoansPanel({
  identity,
  onCountsChange,
}: {
  identity: Identity;
  onCountsChange?: (activeCount: number) => void;
}) {
  const [status, setStatus] = useState<string>('active'),
    [query, setQuery] = useState(''),
    [borrowerArea, setBorrowerArea] = useState(''),
    [lenderArea, setLenderArea] = useState(''),
    [areas, setAreas] = useState<string[]>(R22_WORK_AREAS.filter((a) => !isSharedWorkArea(a)));
  const [items, setItems] = useState<StockLoan[]>([]),
    [counts, setCounts] = useState({ active: 0, open: 0, partial: 0, settled: 0 }),
    [cursor, setCursor] = useState<string | null>(null),
    [back, setBack] = useState<(string | null)[]>([]),
    [next, setNext] = useState<string | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(''),
    [reload, setReload] = useState(0),
    [detail, setDetail] = useState<StockLoanDetail | null>(null),
    [detailBusy, setDetailBusy] = useState(false),
    [toast, setToast] = useState('');

  const debouncedQuery = useDebouncedValue(query);
  const detailRequest = useRef<AbortController | null>(null);
  useEffect(() => () => detailRequest.current?.abort(), []);

  useEffect(() => {
    const c = new AbortController();
    stockApi('/areas', { signal: c.signal })
      .then((d) => {
        if (!c.signal.aborted && Array.isArray(d.items) && d.items.length) {
          setAreas(d.items.filter((a: string) => !isSharedWorkArea(a)));
        }
      })
      .catch(() => {});
    return () => c.abort();
  }, [reload]);

  useEffect(() => {
    setCursor(null);
    setBack([]);
  }, [status, debouncedQuery, borrowerArea, lenderArea]);

  useEffect(() => {
    const c = new AbortController();
    setBusy(true);
    setError('');
    const p = new URLSearchParams({ status });
    if (debouncedQuery.trim()) p.set('q', debouncedQuery.trim());
    if (borrowerArea) p.set('borrowerArea', borrowerArea);
    if (lenderArea) p.set('lenderArea', lenderArea);
    if (cursor) p.set('cursor', cursor);
    stockApi('/loans?' + p, { signal: c.signal })
      .then((d) => {
        if (c.signal.aborted) return;
        setItems(d.items || []);
        setNext(d.nextCursor ?? null);
        if (d.counts) {
          setCounts(d.counts);
          onCountsChange?.(d.counts.active);
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) setError((e as Error).message);
      })
      .finally(() => {
        if (!c.signal.aborted) setBusy(false);
      });
    return () => c.abort();
  }, [status, debouncedQuery, borrowerArea, lenderArea, cursor, reload, onCountsChange]);

  const openLoan = useCallback(async (id: string) => {
    detailRequest.current?.abort();
    const c = new AbortController();
    detailRequest.current = c;
    setDetailBusy(true);
    try {
      const d = (await stockApi('/loans/' + encodeURIComponent(id), {
        signal: c.signal,
      })) as StockLoanDetail;
      if (!c.signal.aborted) setDetail(d);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    } finally {
      if (!c.signal.aborted) setDetailBusy(false);
    }
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('loan');
    if (id) void openLoan(id);
  }, [openLoan]);

  const canRepay = canConsume(identity, 'return');

  return (
    <>
      <section className="panel">
        <div className="section-title r22-manage-toolbar">
          <div>
            <h2>Pinjaman antar Area Kerja</h2>
            <small>
              {counts.active > 0
                ? `${counts.active} pinjaman aktif menunggu pelunasan`
                : 'Semua pinjaman antar Area Kerja telah lunas'}
            </small>
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

        <div className="r22-manage-chips" role="group" aria-label="Filter status pinjaman">
          {STATUS_CHIPS.map(([val, label]) => {
            const count =
              val === 'active'
                ? counts.active
                : val === 'open'
                  ? counts.open
                  : val === 'partial'
                    ? counts.partial
                    : val === 'settled'
                      ? counts.settled
                      : null;
            return (
              <button
                key={val}
                type="button"
                className="r22-filter-chip"
                aria-pressed={status === val}
                onClick={() => setStatus(val)}
              >
                {label}
                {count !== null && count > 0 ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>

        <div className="stock-filters r22-manage-filters">
          <label>
            Cari pinjaman
            <Input
              type="search"
              value={query}
              maxLength={200}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="No. pinjaman, MMID, nama, HAC/SAC, peminta…"
            />
          </label>
          <label>
            Area peminjam
            <Select searchable={false} value={borrowerArea} onChange={(e) => setBorrowerArea(e.target.value)}>
              <option value="">Semua area</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {areaOptionLabel(a)}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Area pemberi
            <Select searchable={false} value={lenderArea} onChange={(e) => setLenderArea(e.target.value)}>
              <option value="">Semua area</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {areaOptionLabel(a)}
                </option>
              ))}
            </Select>
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

        <div className="stock-table r22-loans-table" aria-busy={busy}>
          <div className="stock-table-head">
            <span>Material / Pinjaman</span>
            <span>Area & Dokumen</span>
            <span>Sisa / Status</span>
          </div>
          {items.map((ln) => (
            <button
              type="button"
              key={ln.id}
              className={`stock-table-row${detail?.loan.id === ln.id ? ' selected' : ''}`}
              onClick={() => void openLoan(ln.id)}
            >
              <span>
                <strong>{ln.commonName || ln.description}</strong>
                <span className="r22-row-sub">
                  <span className="code-text">{ln.mmid}</span> ·{' '}
                  <span className="code-text">{ln.number}</span>
                </span>
                <small>
                  {formatDate(ln.createdAt)} WIB · {ln.requesterName}
                </small>
              </span>
              <span data-label="Area & Dokumen">
                <strong>
                  {ln.borrowerArea} ← {ln.lenderArea}
                </strong>
                <small>
                  HAC/SAC <span className="code-text">{ln.hec || '—'}</span>
                  {ln.documentNumber ? ` · ${ln.documentNumber}` : ''}
                </small>
              </span>
              <span data-label="Sisa / Status">
                <strong>
                  {ln.status === 'settled'
                    ? `${formatQuantity(ln.quantity)} ${ln.unit}`
                    : `Sisa ${formatQuantity(ln.remainingQuantity)} ${ln.unit}`}
                </strong>
                <span className={`badge ${ln.status === 'settled' ? 'success' : 'orange'}`}>
                  {stockLoanStatusLabels[ln.status]}
                </span>
                {ln.status === 'partial' && (
                  <small>
                    Dilunasi {formatQuantity(ln.returnedQuantity)} / {formatQuantity(ln.quantity)} {ln.unit}
                  </small>
                )}
              </span>
            </button>
          ))}
          {!items.length &&
            (busy ? (
              <TableSkeleton rows={5} />
            ) : (
              <EmptyState
                title={status === 'active' ? 'Tidak ada pinjaman aktif' : 'Tidak ada pinjaman sesuai filter'}
                description="Pinjaman antar Area Kerja tercatat otomatis saat Consume Order meminjam stok dari area lain."
              />
            ))}
        </div>

        <div className="stock-pagination">
          <Button
            className="secondary small"
            disabled={!back.length || busy}
            onClick={() => {
              const prev = [...back];
              setCursor(prev.pop() || null);
              setBack(prev);
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
      </section>

      <Overlay
        open={!!detail}
        onClose={() => {
          detailRequest.current?.abort();
          setDetail(null);
        }}
        title={detail ? `${detail.loan.number} · Detail pinjaman` : 'Detail pinjaman'}
        kind="sheet"
        className="r22-manage-sheet"
      >
        {detail && (
          <LoanDetailSheet
            key={`${detail.loan.id}-${detail.loan.returnedQuantity}-${detail.loan.status}`}
            detail={detail}
            busy={detailBusy}
            canRepay={canRepay}
            onSettled={(updated, msg) => {
              setDetail(updated);
              setToast(msg);
              setReload((v) => v + 1);
            }}
          />
        )}
      </Overlay>

      <Toast message={toast} onDismiss={() => setToast('')} />
    </>
  );
}

function LoanDetailSheet({
  detail,
  busy,
  canRepay,
  onSettled,
}: {
  detail: StockLoanDetail;
  busy: boolean;
  canRepay: boolean;
  onSettled: (updated: StockLoanDetail, message: string) => void;
}) {
  const { loan, repayments, borrowerStock, lenderStock } = detail;
  const borrowerReady = Boolean(borrowerStock && borrowerStock.initialized && borrowerStock.inventoryActive);
  const borrowerAvailUnits = borrowerReady && borrowerStock ? decimalUnits(borrowerStock.quantity) : 0n;
  const defaultMethod: LoanRepaymentMethod = borrowerAvailUnits > 0n ? 'transfer' : 'physical_return';

  const [method, setMethod] = useState<LoanRepaymentMethod>(defaultMethod),
    [qtyInput, setQtyInput] = useState(editableDecimal(loan.remainingQuantity)),
    [note, setNote] = useState(''),
    [touchedQty, setTouchedQty] = useState(false),
    [submitted, setSubmitted] = useState(false),
    [saving, setSaving] = useState(false),
    [submitError, setSubmitError] = useState(''),
    [pendingKey, setPendingKey] = useState<{ fingerprint: string; key: string } | null>(null);

  const confirm = useConfirmation();
  const id = useId();

  const remainingUnits = decimalUnits(loan.remainingQuantity);
  const decimalAllowed = loan.decimalAllowed ?? true;

  let parsedQty: string | null = null;
  let qtyError = '';
  if (!qtyInput.trim()) {
    qtyError = 'Masukkan jumlah pelunasan.';
  } else {
    try {
      const canonical = validateStockQuantity(localDecimal(qtyInput), decimalAllowed);
      const payUnits = decimalUnits(canonical);
      if (payUnits > remainingUnits) {
        qtyError = `Melebihi sisa pinjaman (${formatQuantity(loan.remainingQuantity)} ${loan.unit}).`;
      } else if (method === 'transfer') {
        if (!borrowerStock) {
          qtyError = `Material belum terdaftar di stok ${loan.borrowerArea}. Pilih "Pengembalian fisik" atau terima Picklist ke ${loan.borrowerArea} terlebih dahulu.`;
        } else if (!borrowerReady) {
          qtyError = `Stok ${loan.borrowerArea} belum siap (belum dihitung atau nonaktif).`;
        } else if (payUnits > borrowerAvailUnits) {
          qtyError = `Stok ${loan.borrowerArea} hanya tersedia ${formatQuantity(borrowerStock.quantity)} ${loan.unit}.`;
        } else {
          parsedQty = canonical;
        }
      } else {
        parsedQty = canonical;
      }
    } catch (e) {
      qtyError = (e as Error).message;
    }
  }
  const showQtyError = (touchedQty || submitted) && !!qtyError;

  async function handleRepay(e: React.FormEvent) {
    e.preventDefault();
    if (saving || loan.status === 'settled') return;
    setSubmitted(true);
    setSubmitError('');
    if (!parsedQty) {
      document.getElementById(`${id}-qty`)?.focus();
      return;
    }
    const actionDesc =
      method === 'transfer'
        ? `Transfer ${formatQuantity(parsedQty)} ${loan.unit} dari stok ${loan.borrowerArea} ke ${loan.lenderArea}?`
        : `Catat pengembalian fisik ${formatQuantity(parsedQty)} ${loan.unit} langsung ke stok ${loan.lenderArea}?`;
    const ok = await confirm(actionDesc, {
      title: 'Konfirmasi pelunasan pinjaman',
      confirmLabel: 'Simpan pelunasan',
      variant: 'primary',
    });
    if (!ok) return;

    const payload = {
      method,
      quantity: parsedQty,
      ...(method === 'transfer' && borrowerStock ? { borrowerInventoryId: borrowerStock.inventoryId } : {}),
      note: note.trim(),
    };
    const fingerprint = JSON.stringify(payload);
    const key = pendingKey?.fingerprint === fingerprint ? pendingKey.key : crypto.randomUUID();
    setPendingKey({ fingerprint, key });
    setSaving(true);
    try {
      const updated = (await stockApi(`/loans/${encodeURIComponent(loan.id)}/repayments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify(payload),
      })) as StockLoanDetail;
      setPendingKey(null);
      onSettled(
        updated,
        updated.loan.status === 'settled'
          ? `Pinjaman ${loan.number} telah lunas.`
          : `Pelunasan ${formatQuantity(parsedQty)} ${loan.unit} tersimpan.`,
      );
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="r22-sheet-body" aria-busy={busy}>
      <div className="r22-sheet-summary">
        <div className="r22-sheet-summary-head">
          <div>
            <h3>{loan.commonName || loan.description}</h3>
            <p className="muted">
              <span className="code-text">{loan.mmid}</span>
              {loan.commonName && loan.commonName !== loan.description ? ` · ${loan.description}` : ''}
            </p>
          </div>
          <span className={`badge ${loan.status === 'settled' ? 'success' : 'orange'}`}>
            {stockLoanStatusLabels[loan.status]}
          </span>
        </div>

        <div className="r22-sheet-stats">
          <div>
            <small>Peminjam ← Pemberi</small>
            <strong>
              {loan.borrowerArea} ← {loan.lenderArea}
            </strong>
          </div>
          <div>
            <small>Sudah dilunasi</small>
            <strong>
              {formatQuantity(loan.returnedQuantity)} / {formatQuantity(loan.quantity)} {loan.unit}
            </strong>
          </div>
          <div>
            <small>Sisa pinjaman</small>
            <strong className={loan.status !== 'settled' ? 'r22-qty-zero' : undefined}>
              {formatQuantity(loan.remainingQuantity)} {loan.unit}
            </strong>
          </div>
        </div>
      </div>

      <dl className="stock-detail-grid r22-stock-meta">
        <div>
          <dt>Dokumen asal</dt>
          <dd>
            <a href={`/consumables/documents/${loan.documentId}`} className="code-text">
              {loan.documentNumber || loan.documentId}
            </a>
          </dd>
        </div>
        <div>
          <dt>HAC/SAC / WO</dt>
          <dd className="code-text">
            {loan.hec || '—'}
            {loan.wo ? ` · WO ${loan.wo}` : ''}
          </dd>
        </div>
        <div>
          <dt>Peminta</dt>
          <dd>
            {loan.requesterName}
            {loan.requesterNik ? ` (${loan.requesterNik})` : ''}
          </dd>
        </div>
        <div>
          <dt>Saldo {loan.borrowerArea} saat ini</dt>
          <dd>
            {borrowerStock
              ? borrowerStock.initialized
                ? `${formatQuantity(borrowerStock.quantity)} ${loan.unit}`
                : 'Belum dihitung'
              : 'Belum terdaftar'}
          </dd>
        </div>
        <div>
          <dt>Saldo {loan.lenderArea} saat ini</dt>
          <dd>
            {lenderStock
              ? lenderStock.initialized
                ? `${formatQuantity(lenderStock.quantity)} ${loan.unit}`
                : 'Belum dihitung'
              : '—'}
          </dd>
        </div>
        <div>
          <dt>Waktu pinjam (WIB)</dt>
          <dd>{formatDate(loan.createdAt)}</dd>
        </div>
      </dl>

      {loan.status !== 'settled' && canRepay && (
        <form noValidate onSubmit={handleRepay} className="form-stack r22-manage-form r22-repay-form">
          <h3>Lunasi / Kembalikan pinjaman</h3>
          {submitError && (
            <p className="notice error" role="alert">
              {submitError}
            </p>
          )}
          <div className="r22-method-grid" role="radiogroup" aria-label="Metode pelunasan">
            <label className={`r22-method-card ${method === 'transfer' ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name={`${id}-method`}
                value="transfer"
                checked={method === 'transfer'}
                onChange={() => setMethod('transfer')}
              />
              <div>
                <strong>Transfer dari stok {loan.borrowerArea}</strong>
                <small>
                  Potong stok {loan.borrowerArea} → tambah stok {loan.lenderArea}.{' '}
                  {borrowerReady && borrowerStock
                    ? `Saldo ${loan.borrowerArea}: ${formatQuantity(borrowerStock.quantity)} ${loan.unit}.`
                    : `Stok ${loan.borrowerArea} belum tersedia.`}
                </small>
              </div>
            </label>
            <label className={`r22-method-card ${method === 'physical_return' ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name={`${id}-method`}
                value="physical_return"
                checked={method === 'physical_return'}
                onChange={() => setMethod('physical_return')}
              />
              <div>
                <strong>Pengembalian fisik ke {loan.lenderArea}</strong>
                <small>
                  Tambah langsung ke stok {loan.lenderArea} tanpa memotong {loan.borrowerArea} (barang tidak
                  terpakai / diganti langsung).
                </small>
              </div>
            </label>
          </div>

          <div className="r22-field">
            <label htmlFor={`${id}-qty`}>Jumlah pelunasan ({loan.unit})</label>
            <small id={`${id}-hint`} className="muted">
              Maksimal {formatQuantity(loan.remainingQuantity)} {loan.unit} (mendukung pelunasan sebagian atau
              penuh).
            </small>
            <div className="r22-unit-field">
              <Input
                id={`${id}-qty`}
                required
                inputMode={decimalAllowed ? 'decimal' : 'numeric'}
                value={qtyInput}
                aria-invalid={showQtyError ? 'true' : 'false'}
                aria-describedby={showQtyError ? `${id}-hint ${id}-err` : `${id}-hint`}
                onChange={(e) => setQtyInput(e.target.value)}
                onBlur={() => setTouchedQty(true)}
              />
              <span className="r22-unit-suffix" aria-hidden="true">
                {loan.unit}
              </span>
            </div>
            {showQtyError && (
              <p id={`${id}-err`} className="r22-field-error">
                {qtyError}
              </p>
            )}
          </div>

          <div className="r22-field">
            <label htmlFor={`${id}-note`}>Keterangan pelunasan (opsional)</label>
            <Input
              id={`${id}-note`}
              maxLength={500}
              value={note}
              aria-invalid="false"
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: penggantian setelah Picklist diterima atau sisa tidak terpakai"
            />
          </div>

          <div className="form-actions">
            <Button className="primary" busy={saving}>
              Simpan pelunasan
            </Button>
          </div>
        </form>
      )}

      <div className="r22-repayment-history">
        <h3>Riwayat pelunasan ({repayments.length})</h3>
        {!repayments.length ? (
          <p className="fine">Belum ada pelunasan tercatat.</p>
        ) : (
          <ul className="r22-confirm-lines">
            {repayments.map((r) => (
              <li key={r.id} className="r22-confirm-line">
                <div className="r22-confirm-line-info">
                  <strong>{loanRepaymentMethodLabels[r.method]}</strong>
                  <small>
                    {formatDate(r.createdAt)} WIB · {r.actorName}
                  </small>
                  {r.note && <small>{r.note}</small>}
                </div>
                <div className="r22-confirm-line-qty">
                  <strong>
                    +{formatQuantity(r.quantity)} {loan.unit}
                  </strong>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
