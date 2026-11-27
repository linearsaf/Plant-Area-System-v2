'use client';
import { useEffect, useId, useMemo, useState } from 'react';
import { Button, Input, Overlay, Select } from '@plant/ui';
import {
  decimalUnits,
  decimalString,
  formatQuantity,
  isSharedWorkArea,
  localDecimal,
  R22_SHARED_AREA,
  validateStockQuantity,
  workAreaLabel,
  type AreaStockOption,
  type MaterialSearchResult,
} from '@plant/contracts';

export type QuantityDialogAddEntry = {
  material: MaterialSearchResult;
  quantity: string;
  borrowedFromArea?: string;
};

function areaMaterial(base: MaterialSearchResult, option: AreaStockOption): MaterialSearchResult {
  return {
    ...base,
    inventoryId: option.inventoryId,
    rack: option.rack,
    quantity: option.quantity,
    initialized: option.initialized,
    inventoryActive: option.inventoryActive,
  };
}

export function QuantityDialog({
  material,
  onClose,
  onAdd,
  onAddMultiple,
  consume = false,
  workArea = '',
  already = '0',
  alreadyByInventory = {},
}: {
  material: MaterialSearchResult | null;
  onClose: () => void;
  onAdd: (m: MaterialSearchResult, q: string, meta?: { borrowedFromArea?: string }) => void;
  onAddMultiple?: (entries: QuantityDialogAddEntry[]) => void;
  consume?: boolean;
  workArea?: string;
  already?: string;
  alreadyByInventory?: Record<string, string>;
}) {
  const [value, setValue] = useState(''),
    [touched, setTouched] = useState(false),
    [submitted, setSubmitted] = useState(false),
    [submitError, setSubmitError] = useState(''),
    [lenderId, setLenderId] = useState(''),
    [splitOwnFirst, setSplitOwnFirst] = useState(true);
  const id = useId();

  const borrowOptions = useMemo(() => {
    if (!consume || !material) return [];
    return (material.otherAreas || [])
      .filter((o) => {
        if (!o.inventoryActive || !o.initialized) return false;
        try {
          return decimalUnits(o.quantity, true) > 0n;
        } catch {
          return false;
        }
      })
      .map((o) => {
        let used = 0n;
        try {
          used = decimalUnits(localDecimal(alreadyByInventory[o.inventoryId] || '0'));
        } catch {}
        const avail = decimalUnits(o.quantity, true) - used;
        return { ...o, availableUnits: avail > 0n ? avail : 0n };
      })
      .filter((o) => o.availableUnits > 0n)
      .sort((a, b) => {
        const sharedDiff = Number(isSharedWorkArea(b.rack)) - Number(isSharedWorkArea(a.rack));
        if (sharedDiff !== 0) return sharedDiff;
        return b.availableUnits > a.availableUnits ? 1 : b.availableUnits < a.availableUnits ? -1 : 0;
      });
  }, [consume, material, alreadyByInventory]);

  useEffect(() => {
    setValue('');
    setTouched(false);
    setSubmitted(false);
    setSubmitError('');
    setSplitOwnFirst(true);
    setLenderId(borrowOptions[0]?.inventoryId || '');
  }, [material?.id, material?.inventoryId, consume]);

  useEffect(() => {
    if (borrowOptions.length && !borrowOptions.some((o) => o.inventoryId === lenderId)) {
      setLenderId(borrowOptions[0].inventoryId);
    }
  }, [borrowOptions, lenderId]);

  let reserved = 0n;
  try {
    reserved = decimalUnits(localDecimal(already));
  } catch {}

  const ownReady = Boolean(
    material && material.inventoryId && material.initialized && material.inventoryActive,
  );
  const ownStockUnits = ownReady && material ? decimalUnits(material.quantity, true) : 0n;
  const ownAvailableUnits = ownStockUnits - reserved > 0n ? ownStockUnits - reserved : 0n;
  const ownAvailableStr = decimalString(ownAvailableUnits);
  const primaryIsShared = Boolean(material && isSharedWorkArea(material.rack));
  const effectiveOwnArea = primaryIsShared ? R22_SHARED_AREA : workArea || workAreaLabel(material?.rack);

  // Borrow-only mode when own area has no available stock but another area (or shared pool) does.
  const borrowOnlyMode = Boolean(consume && material && ownAvailableUnits <= 0n && borrowOptions.length > 0);
  const selectedLender = borrowOptions.find((o) => o.inventoryId === lenderId) || borrowOptions[0] || null;
  const selectedIsShared = Boolean(selectedLender && isSharedWorkArea(selectedLender.rack));

  // Parse raw quantity & determine if it exceeds own available stock (triggering optional borrow/split).
  let parsedUnits: bigint | null = null;
  let parsedCanonical: string | null = null;
  let baseFormatError = '';
  if (material) {
    if (!value.trim()) {
      baseFormatError = 'Masukkan jumlah yang lebih besar dari nol.';
    } else {
      try {
        parsedCanonical = validateStockQuantity(localDecimal(value), material.decimalAllowed);
        parsedUnits = decimalUnits(parsedCanonical);
      } catch (e) {
        baseFormatError = (e as Error).message;
      }
    }
  }

  const needsBorrowBecauseShort = Boolean(
    consume &&
    material &&
    !borrowOnlyMode &&
    ownAvailableUnits > 0n &&
    parsedUnits !== null &&
    parsedUnits > ownAvailableUnits &&
    borrowOptions.length > 0,
  );
  const borrowActive = borrowOnlyMode || needsBorrowBecauseShort;

  // Compute exact own + borrow amounts when borrowActive.
  const takeOwnUnits = needsBorrowBecauseShort && splitOwnFirst ? ownAvailableUnits : 0n;
  const borrowUnits = borrowActive && parsedUnits !== null ? parsedUnits - takeOwnUnits : 0n;

  let fieldError = baseFormatError;
  let validToSubmit = false;
  if (material && !fieldError && parsedCanonical && parsedUnits !== null) {
    if (borrowActive) {
      if (!selectedLender) {
        fieldError = 'Tidak ada Area Kerja lain dengan stok tersedia untuk dipinjam.';
      } else if (borrowUnits > selectedLender.availableUnits) {
        fieldError = `Jumlah (${formatQuantity(decimalString(borrowUnits))} ${material.unit}) melebihi stok tersedia di ${workAreaLabel(selectedLender.rack)} (${formatQuantity(decimalString(selectedLender.availableUnits))} ${material.unit}).`;
      } else {
        validToSubmit = true;
      }
    } else {
      if (!ownReady) {
        fieldError = 'Stok belum siap digunakan. Hubungi admin untuk saldo awal/status material.';
      } else if (consume && parsedUnits > ownAvailableUnits) {
        fieldError = 'Jumlah melebihi stok tersedia setelah isi keranjang.';
      } else {
        validToSubmit = true;
      }
    }
  }

  const showFieldError = (touched || submitted) && !!fieldError;

  const submitButtonLabel = borrowOnlyMode
    ? selectedIsShared
      ? 'Tambah ke keranjang'
      : 'Pinjam & tambah ke keranjang'
    : needsBorrowBecauseShort
      ? splitOwnFirst
        ? selectedIsShared
          ? 'Ambil & tambah ke keranjang'
          : 'Ambil & pinjam ke keranjang'
        : selectedIsShared
          ? 'Tambah ke keranjang'
          : 'Pinjam & tambah ke keranjang'
      : 'Tambah ke keranjang';

  return (
    <Overlay open={!!material} onClose={onClose} title="Tambah jumlah material">
      {material && (
        <form
          noValidate
          className="form-stack r22-manage-form"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSubmitted(true);
            setSubmitError('');
            if (!validToSubmit || !parsedCanonical) {
              document.getElementById(`${id}-qty`)?.focus();
              return;
            }
            try {
              if (borrowActive && selectedLender) {
                const lenderMat = areaMaterial(material, selectedLender);
                const borrowedFromArea = isSharedWorkArea(selectedLender.rack)
                  ? undefined
                  : workAreaLabel(selectedLender.rack);
                if (takeOwnUnits > 0n) {
                  const entries: QuantityDialogAddEntry[] = [
                    { material, quantity: decimalString(takeOwnUnits) },
                    {
                      material: lenderMat,
                      quantity: decimalString(borrowUnits),
                      borrowedFromArea,
                    },
                  ];
                  if (onAddMultiple) {
                    onAddMultiple(entries);
                  } else {
                    for (const entry of entries) {
                      onAdd(
                        entry.material,
                        entry.quantity,
                        entry.borrowedFromArea ? { borrowedFromArea: entry.borrowedFromArea } : undefined,
                      );
                    }
                  }
                } else {
                  onAdd(lenderMat, parsedCanonical, borrowedFromArea ? { borrowedFromArea } : undefined);
                }
              } else {
                const meta =
                  consume && workArea && !isSharedWorkArea(material.rack) && material.rack !== workArea
                    ? { borrowedFromArea: material.rack }
                    : undefined;
                onAdd(material, parsedCanonical, meta);
              }
              onClose();
            } catch (err) {
              setSubmitError((err as Error).message);
            }
          }}
        >
          <div>
            <p className="fine code-text">{material.mmid}</p>
            <h2>{material.commonName || material.description}</h2>
            {material.commonName && material.commonName !== material.description && (
              <p className="muted">{material.description}</p>
            )}
          </div>

          <div className="stock-preview">
            <span>
              {primaryIsShared
                ? `Stok bersama (${R22_SHARED_AREA})`
                : workArea
                  ? `Stok ${workArea}`
                  : 'Stok tersedia'}
            </span>
            <strong className={ownAvailableUnits <= 0n && consume ? 'r22-qty-zero' : undefined}>
              {ownReady ? `${formatQuantity(material.quantity)} ${material.unit}` : `0 ${material.unit}`}
            </strong>
            {primaryIsShared ? (
              <small>Milik bersama semua Area Kerja — diambil langsung tanpa dicatat sebagai pinjaman.</small>
            ) : (
              !workArea && <small>Area Kerja: {workAreaLabel(material.rack)}</small>
            )}
            {consume && reserved > 0n && (
              <small>
                {formatQuantity(decimalString(reserved))} {material.unit} sudah di keranjang (sisa{' '}
                {formatQuantity(ownAvailableStr)} {material.unit})
              </small>
            )}
            {borrowOnlyMode && (
              <small className="r22-qty-zero">
                Stok di {effectiveOwnArea} kosong — pilih sumber stok tersedia di bawah.
              </small>
            )}
          </div>

          {submitError && (
            <p className="notice error" role="alert">
              {submitError}
            </p>
          )}

          <div className="r22-field">
            <label htmlFor={`${id}-qty`}>Jumlah ({material.unit})</label>
            <small id={`${id}-hint`} className="muted">
              {material.decimalAllowed
                ? `Satuan: ${material.unit} (mendukung desimal dengan koma).`
                : `Gunakan jumlah bulat untuk satuan ${material.unit}.`}
            </small>
            <div className="r22-unit-field">
              <Input
                id={`${id}-qty`}
                autoFocus
                required
                inputMode={material.decimalAllowed ? 'decimal' : 'numeric'}
                value={value}
                aria-invalid={showFieldError ? 'true' : 'false'}
                aria-describedby={showFieldError ? `${id}-hint ${id}-err` : `${id}-hint`}
                onChange={(e) => setValue(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="Jumlah positif"
              />
              <span className="r22-unit-suffix" aria-hidden="true">
                {material.unit}
              </span>
            </div>
            {showFieldError && (
              <p id={`${id}-err`} className="r22-field-error">
                {fieldError}
              </p>
            )}
          </div>

          {borrowActive && selectedLender && (
            <div className={selectedIsShared ? 'r22-chained-box' : 'r22-borrow-box'}>
              <div className="r22-borrow-box-head">
                <span className={selectedIsShared ? 'badge neutral' : 'badge orange'}>
                  {selectedIsShared ? `Stok bersama (${R22_SHARED_AREA})` : 'Pinjam dari Area Kerja lain'}
                </span>
                <small>
                  {selectedIsShared
                    ? `Diambil dari stok milik bersama ${R22_SHARED_AREA} tanpa dicatat sebagai pinjaman`
                    : `Tercatat sebagai pinjaman ${effectiveOwnArea} dari ${workAreaLabel(selectedLender.rack)}`}
                </small>
              </div>
              <div className="r22-field">
                <label htmlFor={`${id}-lender`}>
                  {selectedIsShared ? 'Sumber stok' : 'Pinjam dari Area Kerja'}
                </label>
                <Select
                  id={`${id}-lender`}
                  searchable={false}
                  value={selectedLender.inventoryId}
                  onChange={(e) => setLenderId(e.target.value)}
                >
                  {borrowOptions.map((opt) => (
                    <option key={opt.inventoryId} value={opt.inventoryId}>
                      {isSharedWorkArea(opt.rack)
                        ? `${R22_SHARED_AREA} (Stok bersama)`
                        : workAreaLabel(opt.rack)}{' '}
                      — tersedia {formatQuantity(decimalString(opt.availableUnits))} {material.unit}
                    </option>
                  ))}
                </Select>
              </div>
              {needsBorrowBecauseShort && parsedUnits !== null && (
                <label className="r22-checkbox-row">
                  <input
                    type="checkbox"
                    checked={splitOwnFirst}
                    onChange={(e) => setSplitOwnFirst(e.target.checked)}
                  />
                  <span>
                    Habiskan sisa {effectiveOwnArea} ({formatQuantity(ownAvailableStr)} {material.unit}) lalu{' '}
                    {selectedIsShared ? 'ambil' : 'pinjam'}{' '}
                    {formatQuantity(decimalString(parsedUnits - ownAvailableUnits))} {material.unit} dari{' '}
                    {workAreaLabel(selectedLender.rack)}
                  </span>
                </label>
              )}
            </div>
          )}

          <div className="form-actions">
            <Button type="button" className="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button className="primary">{submitButtonLabel}</Button>
          </div>
        </form>
      )}
    </Overlay>
  );
}
