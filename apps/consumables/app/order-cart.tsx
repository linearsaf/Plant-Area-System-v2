'use client';
import { useEffect, useMemo, useRef, useState, useId } from 'react';
import {
  TableSkeleton,
  EmptyState,
  Button,
  Input,
  Overlay,
  Select,
  Toast,
  useConfirmation,
  cartKey,
  cartLineKey,
  readCart,
  writeCart,
  removeCart,
  emptyCart,
  type CartDraft,
} from '@plant/ui';
import {
  canConsume,
  isSharedWorkArea,
  normalizeHec,
  HEC_PATTERN,
  R22_SHARED_AREA,
  R22_WORK_AREAS,
  formatQuantity,
  decimalUnits,
  decimalString,
  localDecimal,
  validateStockQuantity,
  workAreaLabel,
  type Identity,
  type MaterialSearchResult,
  type StockLineConflict,
  type DocumentResult,
} from '@plant/contracts';
import { useCartFeedback } from './use-cart-feedback';
import { MaterialSearch } from './material-search';
import { QuantityDialog, type QuantityDialogAddEntry } from './quantity-dialog';
import { stockApi, StockApiError } from './r22-api';

function formatInputQuantity(canonical: string) {
  return canonical.replace(/\.?0+$/, '').replace('.', ',');
}

function areaOptionLabel(area: string) {
  if (area === R22_SHARED_AREA) return `${R22_SHARED_AREA} (Stok bersama)`;
  return (R22_WORK_AREAS as readonly string[]).includes(area) ? area : `${area} (nilai lama)`;
}

function workAreaStorageKey(userId: string) {
  return `r22-work-area:${userId}`;
}

type LineCheck = {
  valid: boolean;
  canonical: string | null;
  error: string;
  immediateError: boolean;
  projected: string | null;
  projectedZero: boolean;
};

function validateCartLine(line: CartDraft['lines'][number], type: 'consume' | 'return'): LineCheck {
  const raw = line.quantity.trim();
  if (!raw) {
    return {
      valid: false,
      canonical: null,
      error: 'Jumlah wajib diisi.',
      immediateError: false,
      projected: null,
      projectedZero: false,
    };
  }
  const normalized = localDecimal(raw);
  let canonical: string;
  try {
    canonical = validateStockQuantity(normalized, line.material.decimalAllowed);
  } catch (e) {
    const message = (e as Error).message;
    const isHard =
      !line.material.decimalAllowed && /^\d+\.\d+$/.test(normalized) ? true : /^0+(\.0+)?$/.test(normalized);
    return {
      valid: false,
      canonical: null,
      error: message,
      immediateError: isHard,
      projected: null,
      projectedZero: false,
    };
  }
  if (!line.material.initialized || !line.material.inventoryActive) {
    return {
      valid: false,
      canonical: null,
      error: 'Stok belum siap digunakan. Hubungi admin.',
      immediateError: true,
      projected: null,
      projectedZero: false,
    };
  }
  const stockUnits = decimalUnits(line.material.quantity, true);
  const reqUnits = decimalUnits(canonical);
  if (type === 'consume' && reqUnits > stockUnits) {
    return {
      valid: false,
      canonical: null,
      error: `Melebihi stok tersedia (${formatQuantity(line.material.quantity)} ${line.material.unit}).`,
      immediateError: true,
      projected: null,
      projectedZero: false,
    };
  }
  const nextUnits = type === 'consume' ? stockUnits - reqUnits : stockUnits + reqUnits;
  return {
    valid: true,
    canonical,
    error: '',
    immediateError: false,
    projected: decimalString(nextUnits),
    projectedZero: nextUnits === 0n,
  };
}

function focusField(elementId: string) {
  requestAnimationFrame(() => {
    const el = document.getElementById(elementId) as HTMLElement | null;
    if (!el) return;
    const behavior: ScrollBehavior = matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth';
    el.scrollIntoView({ block: 'center', behavior });
    el.focus({ preventScroll: true });
  });
}

type PendingOrderConfirm = {
  workArea: string;
  hec: string;
  wo: string;
  note: string;
  sourceRef: string;
  requesterName: string;
  requesterNik: string;
  onbehalf: boolean;
  borrowCount: number;
  body: {
    workArea: string;
    hec: string;
    wo: string;
    note: string;
    sourceRef?: string;
    requester?: { name: string; nik: string };
    lines: { materialId: string; inventoryId?: string; quantity: string }[];
  };
  lines: {
    lineKey: string;
    material: MaterialSearchResult;
    quantity: string;
    projected: string;
    projectedZero: boolean;
    borrowedFromArea: string;
  }[];
};

export function OrderCart({ identity, type }: { identity: Identity; type: 'consume' | 'return' }) {
  const [draft, setDraft] = useState<CartDraft>(emptyCart),
    [loaded, setLoaded] = useState(''),
    [areas, setAreas] = useState<string[]>([...R22_WORK_AREAS]);
  const [error, setError] = useState(''),
    [errorKind, setErrorKind] = useState<'validation' | 'server' | ''>(''),
    [busy, setBusy] = useState(false),
    [conflicts, setConflicts] = useState<StockLineConflict[]>([]),
    [success, setSuccess] = useState<DocumentResult | null>(null),
    [message, setMessage] = useState(''),
    [pendingConfirm, setPendingConfirm] = useState<PendingOrderConfirm | null>(null);
  const [selected, setSelected] = useState<MaterialSearchResult | null>(null),
    [suggestions, setSuggestions] = useState<string[]>([]),
    [touchedWorkArea, setTouchedWorkArea] = useState(false),
    [touchedHec, setTouchedHec] = useState(false),
    [touchedRequester, setTouchedRequester] = useState(false),
    [touchedLines, setTouchedLines] = useState<Record<string, boolean>>({}),
    [submitted, setSubmitted] = useState(false);
  const feedback = useCartFeedback(draft, setDraft, setMessage);
  const confirm = useConfirmation(),
    formId = useId(),
    suggestionId = `${formId}-hec-list`,
    prefill = useRef('');
  const storageKey = cartKey(identity.id, type);
  const canOnbehalf = canConsume(identity, 'onbehalf');

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
    if (!storageKey) {
      setLoaded('');
      return;
    }
    const saved = readCart(storageKey);
    let initialWorkArea = saved.workArea || '';
    if (!initialWorkArea) {
      try {
        initialWorkArea = localStorage.getItem(workAreaStorageKey(identity.id)) || '';
      } catch {}
    }
    if (type === 'consume' && isSharedWorkArea(initialWorkArea)) {
      initialWorkArea = '';
    }
    setDraft({ ...saved, workArea: initialWorkArea });
    setLoaded(storageKey);
    setConflicts([]);
    setSuccess(null);
    setPendingConfirm(null);
    setError('');
    setErrorKind('');
    setTouchedWorkArea(false);
    setTouchedHec(false);
    setTouchedRequester(false);
    setTouchedLines({});
    setSubmitted(false);
  }, [storageKey, identity.id]);

  useEffect(() => {
    if (storageKey && loaded === storageKey && !success) writeCart(storageKey, draft);
  }, [storageKey, loaded, draft, success]);

  useEffect(() => {
    if (loaded !== storageKey || prefill.current === storageKey) return;
    const p = new URLSearchParams(window.location.search);
    const id = p.get('material');
    const targetInvId = p.get('inventory');
    if (!id) return;
    prefill.current = storageKey;
    stockApi('/materials/' + encodeURIComponent(id))
      .then((d) => {
        const list = (d.stocks || (d.stock ? [d.stock] : [])) as MaterialSearchResult[];
        const chosen = (targetInvId && list.find((s) => s.inventoryId === targetInvId)) || d.stock || list[0];
        if (chosen) {
          const otherAreas = list
            .filter((s) => s.inventoryId !== chosen.inventoryId && s.inventoryId)
            .map((s) => ({
              inventoryId: s.inventoryId!,
              rack: s.rack,
              quantity: s.quantity,
              initialized: s.initialized,
              inventoryActive: s.inventoryActive,
            }));
          setSelected({ ...chosen, otherAreas });
          if (chosen.rack && (type === 'return' || !isSharedWorkArea(chosen.rack))) {
            setDraft((prev) => (prev.workArea ? prev : { ...prev, workArea: chosen.rack }));
          }
        } else {
          setError('Material belum terdaftar di stok R22.');
          setErrorKind('server');
        }
      })
      .catch((e) => {
        setError(e.message);
        setErrorKind('server');
      });
  }, [loaded, storageKey]);

  useEffect(() => {
    const c = new AbortController();
    const timer = setTimeout(() => {
      stockApi('/hec-suggestions?q=' + encodeURIComponent(draft.hec), { signal: c.signal })
        .then((d) => setSuggestions(d.items))
        .catch(() => setSuggestions([]));
    }, 200);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [draft.hec]);

  const update = (patch: Partial<CartDraft>) => {
    setDraft((v) => ({ ...v, ...patch }));
    if (patch.workArea !== undefined) {
      try {
        if (patch.workArea && !isSharedWorkArea(patch.workArea)) {
          localStorage.setItem(workAreaStorageKey(identity.id), patch.workArea);
        } else if (!patch.workArea) {
          localStorage.removeItem(workAreaStorageKey(identity.id));
        }
      } catch {}
    }
    setError('');
    setErrorKind('');
  };

  const addEntries = (entries: QuantityDialogAddEntry[]) => {
    if (!entries.length) return;
    let lastKey = '';
    setDraft((v) => {
      let nextLines = [...v.lines];
      for (const entry of entries) {
        const entryKey = entry.material.inventoryId || entry.material.id;
        lastKey = entryKey;
        const existing = nextLines.find((l) => cartLineKey(l) === entryKey);
        if (!existing && nextLines.length >= 50) {
          throw Error('Maksimal 50 baris stok dalam satu order.');
        }
        let prevUnits = 0n;
        if (existing) {
          try {
            prevUnits = decimalUnits(localDecimal(existing.quantity));
          } catch {
            prevUnits = 0n;
          }
        }
        const nextQuantity = formatInputQuantity(decimalString(prevUnits + decimalUnits(entry.quantity)));
        nextLines = existing
          ? nextLines.map((l) =>
              cartLineKey(l) === entryKey
                ? {
                    material: entry.material,
                    quantity: nextQuantity,
                    borrowedFromArea: entry.borrowedFromArea ?? l.borrowedFromArea,
                  }
                : l,
            )
          : [
              ...nextLines,
              {
                material: entry.material,
                quantity: nextQuantity,
                borrowedFromArea: entry.borrowedFromArea,
              },
            ];
      }
      const nextWorkArea =
        v.workArea ||
        (!entries[0].borrowedFromArea &&
        entries[0].material.rack &&
        (type === 'return' || !isSharedWorkArea(entries[0].material.rack))
          ? entries[0].material.rack
          : '');
      return { ...v, workArea: nextWorkArea, lines: nextLines };
    });
    const entryKeys = new Set(entries.map((e) => e.material.inventoryId || e.material.id));
    setConflicts((prev) => prev.filter((c) => !entryKeys.has(c.inventoryId || c.materialId)));
    setError('');
    setErrorKind('');
    if (lastKey) feedback.added(lastKey);
    const label = entries[0].material.commonName || entries[0].material.description;
    const borrowed = entries.find((e) => e.borrowedFromArea)?.borrowedFromArea;
    setMessage(
      entries.length > 1 && borrowed
        ? `${label} ditambahkan (stok sendiri + pinjam dari ${borrowed})`
        : borrowed
          ? `${label} ditambahkan (pinjam dari ${borrowed})`
          : `${label} ditambahkan`,
    );
  };

  const add = (m: MaterialSearchResult, q: string, meta?: { borrowedFromArea?: string }) => {
    addEntries([{ material: m, quantity: q, borrowedFromArea: meta?.borrowedFromArea }]);
  };

  const alreadyByInventory = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of draft.lines) {
      if (l.material.inventoryId) map[l.material.inventoryId] = l.quantity;
    }
    return map;
  }, [draft.lines]);

  const title = type === 'consume' ? 'Consume Order' : 'Return Order';
  const workAreaError =
    type === 'consume' && !draft.workArea.trim() ? 'Pilih Area Kerja peminta terlebih dahulu.' : '';
  const showWorkAreaError = (touchedWorkArea || submitted) && !!workAreaError;

  const normalizedHec = normalizeHec(draft.hec);
  const hecError = !draft.hec.trim()
    ? 'HAC/SAC wajib diisi dengan format XXX-XXX, contoh 452-BU1.'
    : !HEC_PATTERN.test(normalizedHec)
      ? 'Format HAC/SAC harus XXX-XXX, contoh 452-BU1.'
      : '';
  const showHecError = (touchedHec || submitted) && !!hecError;

  const requesterError =
    canOnbehalf && draft.onbehalf && !draft.requesterName.trim()
      ? 'Nama peminta wajib diisi saat mencatat untuk pengguna lain.'
      : '';
  const showRequesterError = (touchedRequester || submitted) && !!requesterError;

  const self = canOnbehalf && draft.onbehalf ? draft.requesterName.trim() : identity.name;
  const lineChecks = draft.lines.map((l) => validateCartLine(l, type));
  const invalidLineCount = lineChecks.filter((c) => !c.valid).length;
  const conflictCount = conflicts.length;

  const lineBorrowArea = (line: CartDraft['lines'][number]) => {
    if (type !== 'consume' || !draft.workArea) return '';
    if (isSharedWorkArea(line.material.rack)) return '';
    if (line.material.rack && line.material.rack !== draft.workArea) return line.material.rack;
    return '';
  };
  const borrowLineCount = draft.lines.filter((l) => !!lineBorrowArea(l)).length;

  const allAreaOptions = useMemo(() => {
    const base = type === 'consume' ? areas.filter((a) => !isSharedWorkArea(a)) : [...areas];
    if (draft.workArea && !base.includes(draft.workArea)) base.push(draft.workArea);
    return base;
  }, [areas, draft.workArea, type]);

  let readiness: { text: string; tone: 'ready' | 'warn' | 'muted' } = {
    text: borrowLineCount > 0 ? `Siap disimpan (${borrowLineCount} pinjam)` : 'Siap disimpan',
    tone: 'ready',
  };
  if (!draft.lines.length) {
    readiness = { text: 'Tambahkan minimal 1 material', tone: 'muted' };
  } else if (invalidLineCount > 0 || conflictCount > 0) {
    const count = Math.max(invalidLineCount, conflictCount);
    readiness = { text: `${count} item perlu diperbaiki`, tone: 'warn' };
  } else if (workAreaError) {
    readiness = { text: 'Pilih Area Kerja peminta', tone: 'warn' };
  } else if (hecError) {
    readiness = { text: 'Isi HAC/SAC (format XXX-XXX)', tone: 'warn' };
  } else if (requesterError) {
    readiness = { text: 'Isi nama peminta', tone: 'warn' };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || loaded !== storageKey) return;
    setSubmitted(true);
    if (workAreaError) {
      setError(workAreaError);
      setErrorKind('validation');
      focusField(`${formId}-area`);
      return;
    }
    if (hecError) {
      setError(hecError);
      setErrorKind('validation');
      focusField(`${formId}-hec`);
      return;
    }
    if (requesterError) {
      setError(requesterError);
      setErrorKind('validation');
      focusField(`${formId}-requester`);
      return;
    }
    if (!draft.lines.length || draft.lines.length > 50) {
      setError('Pilih 1–50 baris stok dalam satu order.');
      setErrorKind('validation');
      return;
    }
    const badIndex = lineChecks.findIndex((c) => !c.valid);
    if (badIndex >= 0) {
      const badLine = draft.lines[badIndex];
      const badCheck = lineChecks[badIndex];
      setError(`Periksa baris ${badIndex + 1} (${badLine.material.mmid}): ${badCheck.error}`);
      setErrorKind('validation');
      focusField(`${formId}-qty-${cartLineKey(badLine)}`);
      return;
    }
    setError('');
    setErrorKind('');
    const body = {
      workArea: draft.workArea.trim(),
      hec: normalizedHec,
      wo: draft.wo.trim(),
      note: draft.note.trim(),
      ...(type === 'return' ? { sourceRef: draft.sourceRef.trim() } : {}),
      ...(canOnbehalf && draft.onbehalf
        ? { requester: { name: draft.requesterName.trim(), nik: draft.requesterNik.trim() } }
        : {}),
      lines: draft.lines.map((l, i) => ({
        materialId: l.material.id,
        ...(l.material.inventoryId ? { inventoryId: l.material.inventoryId } : {}),
        quantity: lineChecks[i].canonical!,
      })),
    };
    const confirmLines = draft.lines.map((l, i) => ({
      lineKey: cartLineKey(l),
      material: l.material,
      quantity: lineChecks[i].canonical!,
      projected: lineChecks[i].projected!,
      projectedZero: lineChecks[i].projectedZero,
      borrowedFromArea: lineBorrowArea(l),
    }));
    setPendingConfirm({
      workArea: draft.workArea.trim(),
      hec: normalizedHec,
      wo: draft.wo.trim(),
      note: draft.note.trim(),
      sourceRef: draft.sourceRef.trim(),
      requesterName: self,
      requesterNik: canOnbehalf && draft.onbehalf ? draft.requesterNik.trim() : '',
      onbehalf: canOnbehalf && draft.onbehalf,
      borrowCount: confirmLines.filter((l) => !!l.borrowedFromArea).length,
      body,
      lines: confirmLines,
    });
  }

  async function finalizeOrder() {
    if (!pendingConfirm || busy || loaded !== storageKey) return;
    try {
      const fingerprint = JSON.stringify(pendingConfirm.body),
        key = draft.pending?.fingerprint === fingerprint ? draft.pending.key : crypto.randomUUID();
      const next = { ...draft, hec: pendingConfirm.hec, pending: { fingerprint, key } };
      setDraft(next);
      writeCart(storageKey, next);
      setBusy(true);
      setError('');
      setErrorKind('');
      setConflicts([]);
      const result = await stockApi(type === 'consume' ? '/consume-orders' : '/return-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify(pendingConfirm.body),
      });
      setPendingConfirm(null);
      feedback.clear();
      setSuccess(result);
      removeCart(storageKey);
      setDraft({ ...emptyCart(), workArea: pendingConfirm.workArea });
      setTouchedWorkArea(false);
      setTouchedHec(false);
      setTouchedRequester(false);
      setTouchedLines({});
      setSubmitted(false);
    } catch (e) {
      setPendingConfirm(null);
      if (e instanceof StockApiError && e.lines.length) {
        setConflicts(e.lines);
        setDraft((v) => ({
          ...v,
          lines: v.lines.map((l) => {
            const c = (e as StockApiError).lines.find((item) =>
              item.inventoryId
                ? item.inventoryId === l.material.inventoryId
                : item.materialId === l.material.id,
            );
            return c ? { ...l, material: { ...l.material, quantity: c.available } } : l;
          }),
        }));
        const firstConflict = e.lines[0];
        focusField(`${formId}-qty-${firstConflict.inventoryId || firstConflict.materialId}`);
      }
      setError((e as Error).message);
      setErrorKind('server');
    } finally {
      setBusy(false);
    }
  }

  if (success)
    return (
      <section className="panel r22-success" role="status">
        <span className="badge">Dokumen final</span>
        <h2>{title} tersimpan</h2>
        <p className="display-lg">{success.document.number}</p>
        <p>
          {success.lines.length} item · HAC/SAC {success.document.hec}
          {success.document.workArea ? ` · Area Kerja ${success.document.workArea}` : ''} ·{' '}
          {success.document.requesterName}
        </p>
        {!!success.loans?.length && (
          <div className="notice r22-loan-success-note">
            <strong>{success.loans.length} pinjaman antar Area Kerja tercatat:</strong>{' '}
            {success.loans.map((ln) => `${ln.number} (${ln.lenderArea})`).join(', ')}
          </div>
        )}
        <div className="form-actions">
          <a className="button primary" href={`/consumables/documents/${success.document.id}`}>
            Lihat / Cetak bukti
          </a>
          {!!success.loans?.length && (
            <a className="button secondary" href="/consumables/history?tab=loans">
              Lihat daftar pinjaman
            </a>
          )}
          <Button
            className="secondary"
            onClick={() => {
              setSuccess(null);
              setDraft((prev) => ({ ...emptyCart(), workArea: prev.workArea }));
              setError('');
              setErrorKind('');
            }}
          >
            Buat order baru
          </Button>
        </div>
      </section>
    );
  if (loaded !== storageKey)
    return (
      <section className="panel" role="status">
        <TableSkeleton rows={3} />
      </section>
    );

  return (
    <>
      {error && (
        <div className="notice error r22-order-alert" role="alert">
          <span>{error}</span>
          {errorKind === 'server' && (
            <Button type="button" className="secondary small" onClick={() => window.location.reload()}>
              Perbarui data
            </Button>
          )}
        </div>
      )}
      <form noValidate onSubmit={handleSubmit} className="r22-order-layout">
        <div className="r22-order-main">
          <section className="panel r22-order-info">
            <div className="section-head">
              <div>
                <h2>Informasi {title}</h2>
              </div>
              <span className="badge neutral">{type === 'consume' ? 'Stok keluar' : 'Stok masuk'}</span>
            </div>
            <fieldset disabled={busy || loaded !== storageKey} className="r22-fieldset">
              <div className="form-grid r22-order-grid r22-order-grid-3">
                <div className="r22-field">
                  <label htmlFor={`${formId}-area`}>
                    <span>{type === 'consume' ? 'Area Kerja' : 'Area Kerja tujuan'}</span>
                  </label>
                  <small id={`${formId}-area-hint`} className="r22-field-hint">
                    {type === 'consume' ? 'Pinjam bila stok kosong' : 'Area penerima stok'}
                  </small>
                  <Select
                    id={`${formId}-area`}
                    searchable={false}
                    required={type === 'consume'}
                    value={draft.workArea}
                    aria-invalid={showWorkAreaError ? 'true' : 'false'}
                    aria-describedby={
                      showWorkAreaError ? `${formId}-area-hint ${formId}-area-err` : `${formId}-area-hint`
                    }
                    onBlur={() => setTouchedWorkArea(true)}
                    onChange={(e) => {
                      setTouchedWorkArea(true);
                      update({ workArea: e.target.value });
                    }}
                  >
                    <option value="">Pilih Area Kerja</option>
                    {allAreaOptions.map((item) => (
                      <option key={item} value={item}>
                        {areaOptionLabel(item)}
                      </option>
                    ))}
                  </Select>
                  {showWorkAreaError && (
                    <p id={`${formId}-area-err`} className="r22-field-error">
                      {workAreaError}
                    </p>
                  )}
                </div>
                <div className="r22-field">
                  <label htmlFor={`${formId}-hec`}>
                    <span>HAC/SAC / Lokasi fungsional</span>
                  </label>
                  <small id={`${formId}-hec-hint`} className="r22-field-hint">
                    Format XXX-XXX (452-BU1)
                  </small>
                  <Input
                    id={`${formId}-hec`}
                    required
                    maxLength={30}
                    value={draft.hec}
                    list={suggestionId}
                    aria-invalid={showHecError ? 'true' : 'false'}
                    aria-describedby={
                      showHecError ? `${formId}-hec-hint ${formId}-hec-err` : `${formId}-hec-hint`
                    }
                    onChange={(e) => update({ hec: e.target.value })}
                    onBlur={() => {
                      setTouchedHec(true);
                      update({ hec: normalizeHec(draft.hec) });
                    }}
                    placeholder="452-BU1"
                  />
                  {showHecError && (
                    <p id={`${formId}-hec-err`} className="r22-field-error">
                      {hecError}
                    </p>
                  )}
                  <datalist id={suggestionId}>
                    {suggestions.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </div>
                <div className="r22-field">
                  <label htmlFor={`${formId}-wo`}>Nomor WO (opsional)</label>
                  <small className="r22-field-hint">Kosongkan bila tanpa WO</small>
                  <Input
                    id={`${formId}-wo`}
                    value={draft.wo}
                    maxLength={100}
                    aria-invalid="false"
                    onChange={(e) => update({ wo: e.target.value })}
                  />
                </div>
                {type === 'return' && (
                  <div className="r22-field r22-span-all">
                    <label htmlFor={`${formId}-source`}>No. Consume Order asal (opsional)</label>
                    <Input
                      id={`${formId}-source`}
                      value={draft.sourceRef}
                      maxLength={100}
                      aria-invalid="false"
                      onChange={(e) => update({ sourceRef: e.target.value })}
                    />
                  </div>
                )}
                <div className="r22-field r22-span-all">
                  <label htmlFor={`${formId}-note`}>Keterangan / deskripsi pekerjaan (opsional)</label>
                  <Input
                    id={`${formId}-note`}
                    value={draft.note}
                    maxLength={500}
                    aria-invalid="false"
                    onChange={(e) => update({ note: e.target.value })}
                    placeholder="Contoh: penggantian bearing atau keperluan kerja"
                  />
                </div>
              </div>
              <div className="r22-requester-bar">
                {canOnbehalf && (
                  <label className="inline r22-onbehalf">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={draft.onbehalf}
                      onChange={(e) => {
                        update({ onbehalf: e.target.checked });
                        if (!e.target.checked) setTouchedRequester(false);
                      }}
                    />
                    Catat untuk pengguna lain
                  </label>
                )}
                {!(canOnbehalf && draft.onbehalf) && (
                  <p className="fine">
                    Dicatat sebagai: <strong>{identity.name}</strong> · Mandiri
                  </p>
                )}
              </div>
              {canOnbehalf && draft.onbehalf && (
                <div className="form-grid r22-onbehalf-fields">
                  <div className="r22-field">
                    <label htmlFor={`${formId}-requester`}>
                      <span>Nama peminta</span>
                    </label>
                    <Input
                      id={`${formId}-requester`}
                      required
                      maxLength={100}
                      value={draft.requesterName}
                      aria-invalid={showRequesterError ? 'true' : 'false'}
                      aria-describedby={showRequesterError ? `${formId}-requester-err` : undefined}
                      onChange={(e) => update({ requesterName: e.target.value })}
                      onBlur={() => setTouchedRequester(true)}
                    />
                    {showRequesterError && (
                      <p id={`${formId}-requester-err`} className="r22-field-error">
                        {requesterError}
                      </p>
                    )}
                  </div>
                  <div className="r22-field">
                    <label htmlFor={`${formId}-nik`}>NIK / Badge (opsional)</label>
                    <Input
                      id={`${formId}-nik`}
                      maxLength={30}
                      value={draft.requesterNik}
                      aria-invalid="false"
                      onChange={(e) => update({ requesterNik: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </fieldset>
          </section>

          <section className="panel">
            <MaterialSearch
              mode={type}
              workArea={draft.workArea}
              onSelect={(m) => {
                const candidateKey = m.inventoryId || m.id;
                if (draft.lines.length >= 50 && !draft.lines.some((l) => cartLineKey(l) === candidateKey)) {
                  setError('Maksimal 50 baris stok dalam satu order.');
                  setErrorKind('validation');
                  return;
                }
                setSelected(m);
              }}
            />
            <div className="section-title r22-cart-title">
              <h2>
                Keranjang <span className="badge neutral">{draft.lines.length} item</span>
                {borrowLineCount > 0 && <span className="badge orange">{borrowLineCount} pinjam</span>}
              </h2>
              {!!draft.lines.length && (
                <Button
                  type="button"
                  className="secondary small"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await confirm('Kosongkan seluruh item dalam keranjang ini?', {
                        title: 'Kosongkan keranjang',
                        confirmLabel: 'Kosongkan',
                        variant: 'danger',
                      })
                    ) {
                      feedback.clear();
                      setConflicts([]);
                      setTouchedLines({});
                      update({ lines: [] });
                    }
                  }}
                >
                  Kosongkan
                </Button>
              )}
            </div>
            <div className="r22-cart-table" role="table" aria-label="Keranjang order">
              <div className="r22-cart-head" role="row">
                <span role="columnheader">No.</span>
                <span role="columnheader">Material</span>
                <span role="columnheader">Jumlah</span>
                <span role="columnheader">Satuan</span>
                <span role="columnheader">Aksi</span>
              </div>
              {!draft.lines.length ? (
                <div className="r22-table-empty" role="row">
                  <div role="cell">
                    <EmptyState
                      title="Keranjang masih kosong"
                      description="Cari material, tentukan jumlah, lalu tambahkan ke order."
                    />
                  </div>
                </div>
              ) : (
                draft.lines.map((l, i) => {
                  const rowKey = cartLineKey(l);
                  const problem = conflicts.find((c) =>
                    c.inventoryId ? c.inventoryId === l.material.inventoryId : c.materialId === l.material.id,
                  );
                  const check = lineChecks[i];
                  const showLineError = Boolean(
                    problem || (check.error && (submitted || touchedLines[rowKey] || check.immediateError)),
                  );
                  const lineErrorText = problem
                    ? `${problem.error}${problem.error.includes('Tersedia') || problem.error.includes('mencukupi') ? '' : ` Tersedia: ${formatQuantity(problem.available)} ${l.material.unit}`}`
                    : check.error;
                  const errId = `${formId}-qty-err-${rowKey}`;
                  const titleText = l.material.commonName || l.material.description;
                  const showDesc = Boolean(
                    l.material.commonName && l.material.commonName !== l.material.description,
                  );
                  const borrowedFrom = lineBorrowArea(l);
                  const sharedPool = isSharedWorkArea(l.material.rack);
                  return (
                    <div
                      data-cart-material={rowKey}
                      className={`r22-cart-row ${showLineError ? 'has-error' : ''} ${feedback.highlight === rowKey ? 'is-new' : ''}`}
                      role="row"
                      key={rowKey}
                    >
                      <span className="r22-line-no" role="cell">
                        {i + 1}
                      </span>
                      <div className="r22-cart-material" role="cell">
                        <div className="r22-cart-material-head">
                          <strong>{titleText}</strong>
                          {borrowedFrom && <span className="badge orange">Pinjam dari {borrowedFrom}</span>}
                          {!borrowedFrom && sharedPool && type === 'consume' && (
                            <span className="badge neutral">Stok bersama</span>
                          )}
                        </div>
                        <small>
                          <span className="code-text">{l.material.mmid}</span>
                          {showDesc ? ` · ${l.material.description}` : ''}
                          {` · Area Kerja: ${workAreaLabel(l.material.rack)}`}
                        </small>
                        <small
                          className={`r22-stock-preview-line ${check.projectedZero ? 'r22-qty-zero' : ''}`}
                        >
                          Stok {workAreaLabel(l.material.rack)}: {formatQuantity(l.material.quantity)}{' '}
                          {l.material.unit}
                          {check.projected !== null && (
                            <>
                              {' '}
                              →{' '}
                              <strong>
                                {formatQuantity(check.projected)} {l.material.unit}
                              </strong>
                            </>
                          )}
                        </small>
                        {showLineError && (
                          <p id={errId} className="r22-field-error">
                            {lineErrorText}
                          </p>
                        )}
                      </div>
                      <label className="r22-line-quantity" role="cell">
                        <span className="sr-only">Jumlah {l.material.mmid}</span>
                        <Input
                          id={`${formId}-qty-${rowKey}`}
                          disabled={busy}
                          inputMode={l.material.decimalAllowed ? 'decimal' : 'numeric'}
                          value={l.quantity}
                          aria-invalid={showLineError ? 'true' : 'false'}
                          aria-describedby={showLineError ? errId : undefined}
                          onBlur={() => setTouchedLines((prev) => ({ ...prev, [rowKey]: true }))}
                          onChange={(e) => {
                            const val = e.target.value;
                            setConflicts((prev) =>
                              prev.filter((c) => (c.inventoryId || c.materialId) !== rowKey),
                            );
                            setError('');
                            setErrorKind('');
                            setDraft((v) => ({
                              ...v,
                              lines: v.lines.map((row, j) => (j === i ? { ...row, quantity: val } : row)),
                            }));
                          }}
                        />
                      </label>
                      <span className="r22-cart-unit" role="cell">
                        {l.material.unit}
                      </span>
                      <div className="r22-cart-action" role="cell">
                        <Button
                          type="button"
                          className="secondary small"
                          aria-label={`Hapus ${l.material.mmid}`}
                          disabled={busy}
                          onClick={() => {
                            setConflicts((prev) =>
                              prev.filter((c) => (c.inventoryId || c.materialId) !== rowKey),
                            );
                            feedback.remove(i);
                          }}
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <aside className="panel r22-cart-summary">
          <p className="r22-sticky-context">
            <strong>
              {draft.lines.length} item{borrowLineCount > 0 ? ` (${borrowLineCount} pinjam)` : ''}
            </strong>
            <span className={readiness.tone === 'warn' ? 'r22-readiness-warn' : ''}>
              {readiness.tone === 'ready'
                ? `${draft.workArea ? `${draft.workArea} · ` : ''}HAC/SAC ${normalizedHec}`
                : readiness.tone === 'warn'
                  ? readiness.text
                  : normalizedHec || 'HAC/SAC belum diisi'}
            </span>
          </p>
          <h2>Ringkasan order</h2>
          <dl>
            <dt>Area Kerja</dt>
            <dd>{draft.workArea || 'Belum dipilih'}</dd>
            <dt>Jumlah item</dt>
            <dd>
              {draft.lines.length} item{borrowLineCount > 0 ? ` · ${borrowLineCount} pinjam` : ''}
            </dd>
            <dt>HAC/SAC</dt>
            <dd className="code-text">{normalizedHec || 'Belum diisi'}</dd>
            <dt>Peminta</dt>
            <dd>{self || 'Belum diisi'}</dd>
          </dl>
          <p className={`r22-readiness is-${readiness.tone}`}>{readiness.text}</p>
          <p className="fine">
            Seluruh item disimpan bersama. Stok diperiksa kembali oleh server saat disimpan.
          </p>
          <Button className="primary" busy={busy} disabled={!draft.lines.length || loaded !== storageKey}>
            Simpan order
          </Button>
          <small>Order langsung final setelah konfirmasi. Tidak ada reservasi stok.</small>
        </aside>
      </form>

      <QuantityDialog
        material={selected}
        onClose={() => setSelected(null)}
        consume={type === 'consume'}
        workArea={draft.workArea}
        already={
          selected
            ? draft.lines.find((l) => cartLineKey(l) === (selected.inventoryId || selected.id))?.quantity ||
              '0'
            : '0'
        }
        alreadyByInventory={alreadyByInventory}
        onAdd={add}
        onAddMultiple={addEntries}
      />

      <Overlay
        open={!!pendingConfirm}
        onClose={() => {
          if (!busy) setPendingConfirm(null);
        }}
        title={`Konfirmasi ${title}`}
      >
        {pendingConfirm && (
          <div className="r22-confirm-dialog">
            <p className="r22-confirm-lead">
              {title} · HAC/SAC <strong className="code-text">{pendingConfirm.hec}</strong> ·{' '}
              {pendingConfirm.lines.length} item
            </p>
            <dl className="r22-confirm-meta">
              <div>
                <dt>Area Kerja</dt>
                <dd>{pendingConfirm.workArea || '—'}</dd>
              </div>
              <div>
                <dt>Nomor WO</dt>
                <dd>{pendingConfirm.wo || '—'}</dd>
              </div>
              <div>
                <dt>Peminta</dt>
                <dd>
                  {pendingConfirm.requesterName}
                  {pendingConfirm.requesterNik ? ` (${pendingConfirm.requesterNik})` : ''}
                  {pendingConfirm.onbehalf ? ' · Atas nama' : ' · Mandiri'}
                </dd>
              </div>
              {type === 'return' && pendingConfirm.sourceRef && (
                <div>
                  <dt>No. Consume Order asal</dt>
                  <dd className="code-text">{pendingConfirm.sourceRef}</dd>
                </div>
              )}
              {pendingConfirm.note && (
                <div className="r22-span-all">
                  <dt>Keterangan</dt>
                  <dd>{pendingConfirm.note}</dd>
                </div>
              )}
            </dl>
            <div className="r22-confirm-section">
              <h3>Daftar material ({pendingConfirm.lines.length})</h3>
              <ul className="r22-confirm-lines">
                {pendingConfirm.lines.map((line) => (
                  <li key={line.lineKey} className="r22-confirm-line">
                    <div className="r22-confirm-line-info">
                      <div className="r22-cart-material-head">
                        <strong>{line.material.commonName || line.material.description}</strong>
                        {line.borrowedFromArea ? (
                          <span className="badge orange">Pinjam dari {line.borrowedFromArea}</span>
                        ) : isSharedWorkArea(line.material.rack) && type === 'consume' ? (
                          <span className="badge neutral">Stok bersama</span>
                        ) : null}
                      </div>
                      <small>
                        <span className="code-text">{line.material.mmid}</span> · Area Kerja:{' '}
                        {workAreaLabel(line.material.rack)}
                      </small>
                    </div>
                    <div className="r22-confirm-line-qty">
                      <strong>
                        {type === 'consume' ? '−' : '+'}
                        {formatQuantity(line.quantity)} {line.material.unit}
                      </strong>
                      <small className={line.projectedZero ? 'r22-qty-zero' : ''}>
                        Stok: {formatQuantity(line.material.quantity)} → {formatQuantity(line.projected)}{' '}
                        {line.material.unit}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {pendingConfirm.borrowCount > 0 && (
              <p className="notice r22-loan-confirm-note">
                {pendingConfirm.borrowCount} item pinjaman akan dicatat pada daftar{' '}
                <strong>Pinjaman antar Area Kerja</strong> untuk {pendingConfirm.workArea} hingga dilunasi.
              </p>
            )}
            <p className="fine">
              Order langsung final dan {type === 'consume' ? 'mengurangi' : 'menambahkan'} stok R22 secara
              permanen.
            </p>
            <div className="form-actions r22-confirm-actions">
              <Button
                type="button"
                className="secondary"
                autoFocus
                disabled={busy}
                onClick={() => setPendingConfirm(null)}
              >
                Batal
              </Button>
              <Button type="button" className="primary" busy={busy} onClick={finalizeOrder}>
                Finalisasi {type === 'consume' ? 'Pemakaian' : 'Pengembalian'}
              </Button>
            </div>
          </div>
        )}
      </Overlay>

      <Toast message={message} onDismiss={feedback.dismiss} action={feedback.action} />
    </>
  );
}
