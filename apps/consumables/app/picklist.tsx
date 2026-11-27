'use client';
import { useEffect, useId, useRef, useState } from 'react';
import {
  TableSkeleton,
  EmptyState,
  Button,
  Input,
  Select,
  Textarea,
  useConfirmation,
  Toast,
  cartKey,
  cartLineKey,
  emptyCart,
  readCart,
  writeCart,
  removeCart,
  type CartDraft,
} from '@plant/ui';
import {
  costCenterLabel,
  decimalUnits,
  decimalString,
  formatQuantity,
  isSharedWorkArea,
  localDecimal,
  R22_COST_CENTERS,
  R22_SHARED_AREA,
  R22_WORK_AREAS,
  sapToR22,
  validateStockQuantity,
  type Identity,
  type MaterialSearchResult,
  type DocumentResult,
  type StockLineConflict,
} from '@plant/contracts';
import { useCartFeedback } from './use-cart-feedback';
import { MaterialSearch } from './material-search';
import { stockApi, StockApiError } from './r22-api';
export function Picklist({ identity }: { identity: Identity }) {
  const [draft, setDraft] = useState<CartDraft>(emptyCart),
    [loaded, setLoaded] = useState(''),
    [areas, setAreas] = useState<string[]>([...R22_WORK_AREAS]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [conflicts, setConflicts] = useState<StockLineConflict[]>([]),
    [success, setSuccess] = useState<DocumentResult | null>(null),
    [focus, setFocus] = useState(''),
    [touchedWo, setTouchedWo] = useState(false),
    [touchedCostCenter, setTouchedCostCenter] = useState(false),
    [submitted, setSubmitted] = useState(false);
  const feedback = useCartFeedback(draft, setDraft, setMessage);
  const confirm = useConfirmation(),
    formId = useId(),
    prefill = useRef(''),
    key = cartKey(identity.id, 'picklist');
  const update = (patch: Partial<CartDraft>) => {
    setDraft((v) => ({ ...v, ...patch }));
    setError('');
  };
  useEffect(() => {
    const c = new AbortController();
    stockApi('/areas', { signal: c.signal })
      .then((d) => {
        if (!c.signal.aborted && Array.isArray(d.items) && d.items.length) setAreas(d.items);
      })
      .catch(() => {});
    return () => c.abort();
  }, []);
  useEffect(() => {
    if (!key) return;
    setDraft(readCart(key));
    setLoaded(key);
    setSuccess(null);
    setConflicts([]);
    setError('');
    setTouchedWo(false);
    setTouchedCostCenter(false);
    setSubmitted(false);
  }, [key]);
  useEffect(() => {
    if (key && loaded === key && !success) writeCart(key, draft);
  }, [key, loaded, draft, success]);
  const add = (material: MaterialSearchResult) => {
    if (draft.lines.some((l) => l.material.id === material.id)) {
      setFocus(material.id);
      return;
    }
    if (draft.lines.length >= 100) {
      setError('Maksimal 100 material dalam satu picklist.');
      return;
    }
    const convertible =
      material.conversionReviewed &&
      (material.packSize || material.sapUnit.toUpperCase() === material.unit.toUpperCase());
    setDraft((v) => ({
      ...v,
      lines: [...v.lines, { material, quantity: '', mode: convertible ? 'sap' : 'base' }],
    }));
    setFocus(material.id);
    feedback.added(cartLineKey({ material }));
    setMessage(`${material.commonName || material.description} ditambahkan`);
  };
  useEffect(() => {
    if (!focus) return;
    document.querySelector<HTMLInputElement>(`[data-r22-quantity="${focus}"]`)?.focus();
    setFocus('');
  }, [draft.lines.length, focus]);
  useEffect(() => {
    if (loaded !== key || prefill.current === key) return;
    const id = new URLSearchParams(window.location.search).get('material');
    if (!id) return;
    prefill.current = key;
    stockApi('/materials/' + encodeURIComponent(id))
      .then((d) => {
        const stock = d.stock;
        add(
          stock || {
            ...d.material,
            inventoryId: null,
            rack: '',
            quantity: '0.000000',
            initialized: false,
            inventoryActive: false,
          },
        );
      })
      .catch((e) => setError(e.message));
  }, [loaded, key]);
  const preview = (line: CartDraft['lines'][number]) => {
    try {
      return line.mode === 'base'
        ? validateStockQuantity(localDecimal(line.quantity), line.material.decimalAllowed)
        : sapToR22(localDecimal(line.quantity), line.material);
    } catch {
      return null;
    }
  };
  const woError = !draft.wo.trim() ? 'Nomor WO wajib diisi.' : '';
  const costCenterError = !draft.costCenter.trim() ? 'Cost Center wajib diisi.' : '';
  const showWoError = (touchedWo || submitted) && !!woError;
  const showCostCenterError = (touchedCostCenter || submitted) && !!costCenterError;
  const hasCustomCostCenter = Boolean(
    draft.costCenter.trim() && !R22_COST_CENTERS.some((cc) => cc.code === draft.costCenter.trim()),
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || loaded !== key) return;
    setSubmitted(true);
    if (woError || costCenterError) {
      const firstErr = woError || costCenterError;
      const firstId = woError ? `${formId}-wo` : `${formId}-cost-center`;
      setError(firstErr);
      const target = document.getElementById(firstId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.focus();
      return;
    }
    try {
      if (!draft.lines.length || draft.lines.length > 100) throw Error('Pilih 1–100 material unik.');
      const body = {
        workArea: draft.workArea.trim(),
        wo: draft.wo.trim(),
        woDescription: draft.note.trim(),
        functionalLocation: draft.functionalLocation.trim(),
        costCenter: draft.costCenter.trim(),
        ...(draft.requiredDate ? { requiredDate: draft.requiredDate } : {}),
        lines: draft.lines.map((l, i) => {
          if (!preview(l)) throw Error(`Baris ${i + 1}: periksa jumlah dan konversi.`);
          if (l.material.inventoryId && (!l.material.initialized || !l.material.inventoryActive))
            throw Error(`Baris ${i + 1}: stok belum dihitung atau nonaktif. Hubungi admin.`);
          return {
            materialId: l.material.id,
            ...(l.material.inventoryId ? { inventoryId: l.material.inventoryId } : {}),
            ...(l.mode === 'base'
              ? { quantity: validateStockQuantity(localDecimal(l.quantity), l.material.decimalAllowed) }
              : {
                  sapQuantity: decimalString(decimalUnits(localDecimal(l.quantity))),
                  materialVersion: l.material.version,
                }),
          };
        }),
      };
      if (
        !(await confirm(
          `Terima picklist WO ${body.wo} · Cost Center ${costCenterLabel(body.costCenter)} · ${body.lines.length} item ke stok R22?`,
          {
            title: 'Konfirmasi Penerimaan Picklist',
            confirmLabel: 'Terima ke Stok R22',
            variant: 'primary',
          },
        ))
      )
        return;
      const fingerprint = JSON.stringify(body),
        id = draft.pending?.fingerprint === fingerprint ? draft.pending.key : crypto.randomUUID(),
        next = { ...draft, pending: { fingerprint, key: id } };
      setDraft(next);
      writeCart(key, next);
      setBusy(true);
      setError('');
      setConflicts([]);
      const result = await stockApi('/picklist-receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': id },
        body: JSON.stringify(body),
      });
      feedback.clear();
      setSuccess(result);
      removeCart(key);
      setDraft(emptyCart());
      setTouchedWo(false);
      setTouchedCostCenter(false);
      setSubmitted(false);
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof StockApiError) setConflicts(e.lines);
    } finally {
      setBusy(false);
    }
  }
  if (success)
    return (
      <section className="panel r22-success" role="status">
        <span className="badge">Picklist diterima</span>
        <h2>Penerimaan Picklist tersimpan</h2>
        <p className="display-lg">{success.document.number}</p>
        <p>
          {success.lines.length} item · WO <span className="code-text">{success.document.wo}</span> · Cost
          Center {costCenterLabel(success.document.costCenter)}
        </p>
        <div className="form-actions">
          <a className="button primary" href={`/consumables/documents/${success.document.id}`}>
            Lihat / Cetak bukti
          </a>
          <Button
            className="secondary"
            onClick={() => {
              setSuccess(null);
              setDraft(emptyCart());
            }}
          >
            Terima picklist baru
          </Button>
        </div>
      </section>
    );
  if (loaded !== key)
    return (
      <section className="panel" role="status">
        <TableSkeleton rows={3} />
      </section>
    );
  return (
    <>
      <form noValidate onSubmit={submit} className="r22-picklist">
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>Informasi picklist</h2>
            </div>
            <span className="badge neutral">Stok masuk</span>
          </div>
          <fieldset className="r22-fieldset" disabled={busy || loaded !== key}>
            <div className="form-grid">
              <div className="r22-field">
                <label htmlFor={`${formId}-wo`}>
                  <span>Nomor WO</span>
                </label>
                <Input
                  id={`${formId}-wo`}
                  required
                  maxLength={100}
                  value={draft.wo}
                  aria-invalid={showWoError ? 'true' : 'false'}
                  aria-describedby={showWoError ? `${formId}-wo-err` : undefined}
                  onBlur={() => setTouchedWo(true)}
                  onChange={(e) => update({ wo: e.target.value })}
                />
                {showWoError && (
                  <p id={`${formId}-wo-err`} className="r22-field-error">
                    {woError}
                  </p>
                )}
              </div>
              <div className="r22-field">
                <label htmlFor={`${formId}-cost-center`}>
                  <span>Cost Center</span>
                </label>
                <Select
                  id={`${formId}-cost-center`}
                  searchable
                  searchPlaceholder="Cari kode atau nama Cost Center…"
                  required
                  value={draft.costCenter}
                  aria-invalid={showCostCenterError ? 'true' : 'false'}
                  aria-describedby={showCostCenterError ? `${formId}-cost-center-err` : undefined}
                  onBlur={() => setTouchedCostCenter(true)}
                  onChange={(e) => {
                    setTouchedCostCenter(true);
                    update({ costCenter: e.target.value });
                  }}
                >
                  <option value="" disabled>
                    Pilih Cost Center
                  </option>
                  {hasCustomCostCenter && (
                    <option value={draft.costCenter.trim()}>{draft.costCenter.trim()}</option>
                  )}
                  {R22_COST_CENTERS.map((cc) => (
                    <option key={cc.code} value={cc.code}>
                      {cc.code} — {cc.description}
                    </option>
                  ))}
                </Select>
                {showCostCenterError && (
                  <p id={`${formId}-cost-center-err`} className="r22-field-error">
                    {costCenterError}
                  </p>
                )}
              </div>
              <div className="r22-field">
                <label htmlFor={`${formId}-area`}>Area Kerja tujuan (opsional)</label>
                <Select
                  id={`${formId}-area`}
                  searchable={false}
                  value={draft.workArea}
                  onChange={(e) => update({ workArea: e.target.value })}
                >
                  <option value="">{R22_SHARED_AREA} (Stok bersama)</option>
                  {areas
                    .filter((item) => !isSharedWorkArea(item))
                    .map((item) => (
                      <option key={item} value={item}>
                        {(R22_WORK_AREAS as readonly string[]).includes(item) ? item : `${item} (nilai lama)`}
                      </option>
                    ))}
                </Select>
              </div>
              <div className="r22-field">
                <label htmlFor={`${formId}-date`}>Tanggal kebutuhan (opsional)</label>
                <Input
                  id={`${formId}-date`}
                  type="date"
                  value={draft.requiredDate}
                  onChange={(e) => update({ requiredDate: e.target.value })}
                />
              </div>
              <div className="r22-field r22-picklist-floc">
                <label htmlFor={`${formId}-floc`}>Lokasi fungsional (opsional)</label>
                <Input
                  id={`${formId}-floc`}
                  maxLength={100}
                  value={draft.functionalLocation}
                  onChange={(e) => update({ functionalLocation: e.target.value })}
                  placeholder="TQ.452-BU1 - deskripsi equipment"
                />
              </div>
              <div className="r22-field r22-span-all">
                <label htmlFor={`${formId}-note`}>Keterangan pekerjaan (opsional)</label>
                <Textarea
                  id={`${formId}-note`}
                  maxLength={500}
                  value={draft.note}
                  onChange={(e) => update({ note: e.target.value })}
                />
              </div>
            </div>
          </fieldset>
        </section>
        <section className="panel">
          <MaterialSearch catalog workArea={draft.workArea} onSelect={add} />
          <div className="section-title r22-cart-title">
            <h2>
              Material picklist <span className="badge neutral">{draft.lines.length} item</span>
            </h2>
            <small>Jumlah SAP dikonversi ke satuan terkecil R22</small>
          </div>
          <div className="r22-picklist-table" role="table" aria-label="Material penerimaan picklist">
            <div className="r22-cart-head" role="row">
              <span role="columnheader">No.</span>
              <span role="columnheader">Material</span>
              <span role="columnheader">Jumlah diminta</span>
              <span role="columnheader">Satuan input</span>
              <span role="columnheader">Jumlah R22</span>
              <span role="columnheader">Aksi</span>
            </div>
            {!draft.lines.length && (
              <div className="r22-table-empty" role="row">
                <div role="cell">
                  <EmptyState
                    title="Picklist masih kosong"
                    description="Cari master material untuk menambahkan baris penerimaan."
                  />
                </div>
              </div>
            )}
            {draft.lines.map((l, i) => {
              const result = preview(l),
                m = l.material,
                problem = conflicts.find((c) => c.materialId === m.id);
              return (
                <div
                  data-cart-material={cartLineKey(l)}
                  className={`r22-cart-row ${problem ? 'has-error' : ''} ${feedback.highlight === cartLineKey(l) ? 'is-new' : ''}`}
                  role="row"
                  key={cartLineKey(l)}
                >
                  <span className="r22-line-no" role="cell">
                    {i + 1}
                  </span>
                  <div className="r22-picklist-material" role="cell">
                    <strong>{m.commonName || m.description}</strong>
                    <small className="r22-picklist-description">
                      <span className="code-text">{m.mmid}</span> · {m.description}
                    </small>
                    <div className="r22-picklist-meta">
                      <small>
                        {m.packSize
                          ? `1 ${m.sapUnit} = ${formatQuantity(m.packSize)} ${m.unit}`
                          : m.sapUnit.toUpperCase() === m.unit.toUpperCase()
                            ? `1 ${m.sapUnit} = 1 ${m.unit}`
                            : 'Konversi belum diatur'}
                      </small>
                      {!m.inventoryId ? (
                        <span className="badge neutral">Akan didaftarkan ke stok R22</span>
                      ) : !m.initialized ? (
                        <span className="error-text">Belum dihitung, hubungi admin</span>
                      ) : (
                        <small>
                          Stok R22: {formatQuantity(m.quantity)} {m.unit}
                        </small>
                      )}
                    </div>
                    {problem && (
                      <p className="error-text" role="alert">
                        {problem.error}
                      </p>
                    )}
                  </div>
                  <div className="r22-picklist-quantity" role="cell">
                    <label className="r22-line-quantity">
                      <span className="r22-picklist-field-label" aria-hidden="true">
                        Jumlah diminta
                      </span>
                      <span className="sr-only">Jumlah diminta {m.mmid}</span>
                      <span className="r22-picklist-quantity-control">
                        <Input
                          required
                          data-r22-quantity={m.id}
                          value={l.quantity}
                          disabled={busy}
                          inputMode={l.mode === 'base' && !m.decimalAllowed ? 'numeric' : 'decimal'}
                          onChange={(e) =>
                            update({
                              lines: draft.lines.map((v, j) =>
                                i === j ? { ...v, quantity: e.target.value } : v,
                              ),
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              document.querySelector<HTMLInputElement>('.r22-search input')?.focus();
                            }
                          }}
                        />
                        <span className="r22-picklist-quantity-unit">
                          {l.mode === 'base' ? m.unit : m.sapUnit}
                        </span>
                      </span>
                    </label>
                  </div>
                  <div className="r22-picklist-unit" role="cell">
                    <label>
                      <span className="r22-picklist-field-label" aria-hidden="true">
                        Satuan input
                      </span>
                      <span className="sr-only">Mode input {m.mmid}</span>
                      <Select
                        searchable={false}
                        value={l.mode || 'sap'}
                        disabled={busy}
                        onChange={(e) =>
                          update({
                            lines: draft.lines.map((v, j) =>
                              i === j ? { ...v, mode: e.target.value as 'base' | 'sap', quantity: '' } : v,
                            ),
                          })
                        }
                      >
                        <option value="sap">SAP · {m.sapUnit}</option>
                        <option value="base">R22 · {m.unit}</option>
                      </Select>
                    </label>
                  </div>
                  <div className="r22-conversion-output" role="cell">
                    <span className="r22-picklist-field-label">Jumlah R22</span>
                    <span className="r22-picklist-result">
                      <strong>{result ? formatQuantity(result) : '—'}</strong>
                      {result && <span>{m.unit}</span>}
                    </span>
                    {l.quantity && !result && <small className="error-text">Periksa jumlah / konversi</small>}
                  </div>
                  <div className="r22-picklist-action" role="cell">
                    <Button
                      type="button"
                      className="secondary small"
                      aria-label={`Hapus ${m.mmid}`}
                      disabled={busy}
                      onClick={() => feedback.remove(i)}
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel r22-picklist-submit">
          <div>
            <strong>{draft.lines.length} item siap ditinjau</strong>
            <p className="fine">
              Seluruh baris diterima dalam satu transaksi. Kuantitas berbeda satuan tidak dijumlahkan.
            </p>
          </div>
          <Button className="primary" busy={busy} disabled={!draft.lines.length || loaded !== key}>
            Terima Picklist
          </Button>
        </section>
      </form>
      <Toast message={message} onDismiss={feedback.dismiss} action={feedback.action} />
    </>
  );
}
