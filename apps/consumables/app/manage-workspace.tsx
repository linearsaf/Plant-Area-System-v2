'use client';
import { useState, useEffect, useCallback, useRef, useId } from 'react';
import {
  Button,
  Icon,
  Input,
  Select,
  Textarea,
  Overlay,
  Toast,
  useConfirmation,
  TableSkeleton,
  EmptyState,
  useDebouncedValue,
} from '@plant/ui';
import { AliasInput } from './alias-input';
import {
  formatDate,
  formatQuantity,
  localDecimal,
  decimalUnits,
  decimalString,
  R22_SHARED_AREA,
  R22_WORK_AREAS,
  validateCountQuantity,
  workAreaLabel,
  type Identity,
  type Material,
  type InventoryItem,
  type MaterialSearchResult,
} from '@plant/contracts';

type ManageTab = 'inventory' | 'materials';
type StockSubTab = 'rack' | 'balance';
type ListPage =
  | { source: 'inventory'; items: InventoryItem[]; nextCursor: string | null; checked: string }
  | { source: 'materials'; items: Material[]; nextCursor: string | null; checked: string };
type MasterSheetState = { mode: 'create' } | { mode: 'edit'; material: Material } | null;
type ToastState = { message: string; action?: { label: string; onClick: () => void } } | null;

const api = '/consumables/api';
const countLabels = { opening: 'Saldo awal', adjustment: 'Koreksi' } as const;
const availabilityChips = [
  ['', 'Semua'],
  ['uncounted', 'Belum dihitung'],
  ['available', 'Tersedia'],
  ['empty', 'Stok nol'],
  ['critical', 'Kritis stok nol'],
] as const;

async function get<T = Record<string, unknown>>(path: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(api + path, { cache: 'no-store', signal }),
    d = await r.json();
  if (!r.ok) throw Error(d.error || 'Gagal memuat data.');
  return d as T;
}

async function send<T = Record<string, unknown>>(
  path: string,
  body: unknown,
  method = 'POST',
  key?: string,
): Promise<T> {
  const r = await fetch(api + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) },
      body: JSON.stringify(body),
    }),
    d = await r.json();
  if (!r.ok) throw Error(d.error || 'Gagal menyimpan.');
  return d as T;
}

/** Formats a stored fixed-point decimal string for editing without thousand separators (e.g. 18.000000 -> 18, 1.500000 -> 1,5). */
function editableDecimal(value: string | null | undefined): string {
  if (!value) return '';
  try {
    const [whole, fraction = ''] = decimalString(decimalUnits(value)).split('.');
    const trimmed = fraction.replace(/0+$/, '');
    return trimmed ? `${whole},${trimmed}` : whole;
  } catch {
    return value;
  }
}

function conversionSummary(m: Pick<Material, 'unit' | 'sapUnit' | 'packSize'>): string {
  const sap = m.sapUnit || m.unit;
  if (m.packSize) return `1 ${sap} = ${formatQuantity(m.packSize)} ${m.unit}`;
  if (sap.toUpperCase() === m.unit.toUpperCase()) return `SAP: ${sap}`;
  return `SAP: ${sap} · Belum diatur`;
}

function parseCountInput(
  raw: string,
  decimalAllowed: boolean,
  unit: string,
  currentQuantity?: string,
): { value: string | null; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: 'Masukkan jumlah fisik hasil perhitungan.' };
  try {
    const normalized = validateCountQuantity(localDecimal(trimmed), decimalAllowed);
    if (currentQuantity !== undefined && decimalUnits(normalized) === decimalUnits(currentQuantity)) {
      return {
        value: null,
        error: `Jumlah fisik sama dengan saldo saat ini (${formatQuantity(currentQuantity)} ${unit}).`,
      };
    }
    return { value: normalized, error: '' };
  } catch (e) {
    const msg = (e as Error).message || '';
    if (msg.includes('bulat'))
      return { value: null, error: `Material bersatuan ${unit} hanya menerima bilangan bulat.` };
    if (msg.includes('kapasitas')) return { value: null, error: msg };
    return {
      value: null,
      error: decimalAllowed
        ? 'Masukkan angka nol atau lebih besar (gunakan koma untuk desimal).'
        : 'Masukkan bilangan bulat nol atau lebih besar.',
    };
  }
}

export function ManageWorkspace({ identity: _identity }: { identity: Identity }) {
  const [tab, setTab] = useState<ManageTab>('inventory'),
    [query, setQuery] = useState(''),
    [availability, setAvailability] = useState(''),
    [area, setArea] = useState(''),
    [showInactive, setShowInactive] = useState(false);
  const [result, setResult] = useState<ListPage | null>(null),
    [cursor, setCursor] = useState<string | null>(null),
    [back, setBack] = useState<(string | null)[]>([]),
    [loading, setBusy] = useState(false),
    [error, setError] = useState(''),
    [toast, setToast] = useState<ToastState>(null),
    [refresh, setRefresh] = useState(0);
  const [areas, setAreas] = useState<string[]>([...R22_WORK_AREAS]);
  const [selectedStock, setSelectedStock] = useState<InventoryItem | null>(null),
    [masterSheet, setMasterSheet] = useState<MasterSheetState>(null),
    [enrollOpen, setEnrollOpen] = useState(false),
    [enrollPreset, setEnrollPreset] = useState<Material | null>(null);

  const source: ManageTab = tab;
  const current = result?.source === source ? result : null;
  const items = current?.items ?? [];
  const next = current?.nextCursor ?? null;
  const checked = current?.checked ?? '';
  const ready = !!current;
  const busy = loading || !current;

  const debouncedQuery = useDebouncedValue(query);
  const deepLinkRef = useRef<AbortController | null>(null);
  useEffect(() => () => deepLinkRef.current?.abort(), []);

  useEffect(() => {
    const c = new AbortController();
    get<{ items: string[] }>('/areas', c.signal)
      .then((d) => {
        if (!c.signal.aborted && d.items.length) setAreas(d.items);
      })
      .catch(() => {});
    return () => c.abort();
  }, [refresh]);

  const load = useCallback(
    async (signal: AbortSignal) => {
      const p = new URLSearchParams({ q: debouncedQuery });
      if (cursor) p.set('cursor', cursor);
      if (source === 'inventory' && availability) p.set('availability', availability);
      if (source === 'inventory' && area) p.set('area', area);
      if (showInactive) p.set('active', 'all');
      return get<{ items: InventoryItem[] | Material[]; nextCursor: string | null }>(
        '/' + source + '?' + p,
        signal,
      );
    },
    [source, debouncedQuery, cursor, availability, area, showInactive],
  );

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError('');
    load(controller.signal)
      .then((d) => {
        if (controller.signal.aborted) return;
        const checkedAt = new Date().toISOString();
        setResult(
          source === 'inventory'
            ? {
                source: 'inventory',
                items: d.items as InventoryItem[],
                nextCursor: d.nextCursor,
                checked: checkedAt,
              }
            : {
                source: 'materials',
                items: d.items as Material[],
                nextCursor: d.nextCursor,
                checked: checkedAt,
              },
        );
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError((e as Error).message);
          setResult((old) =>
            old?.source === source
              ? old
              : source === 'inventory'
                ? { source: 'inventory', items: [], nextCursor: null, checked: '' }
                : { source: 'materials', items: [], nextCursor: null, checked: '' },
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [load, refresh, source]);

  useEffect(() => {
    setCursor(null);
    setBack([]);
  }, [debouncedQuery, availability, area, showInactive, tab]);

  const openStockByMaterialId = useCallback(async (materialId: string) => {
    deepLinkRef.current?.abort();
    const c = new AbortController();
    deepLinkRef.current = c;
    try {
      const d = await get<{ material: Material; stock: InventoryItem | null }>(
        '/materials/' + encodeURIComponent(materialId),
        c.signal,
      );
      if (c.signal.aborted) return;
      if (d.stock) {
        setTab('inventory');
        setMasterSheet(null);
        setEnrollOpen(false);
        setSelectedStock(d.stock);
      } else {
        setTab('materials');
        setSelectedStock(null);
        setMasterSheet({ mode: 'edit', material: d.material });
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    }
  }, []);

  const openMasterByMaterialId = useCallback(async (materialId: string) => {
    deepLinkRef.current?.abort();
    const c = new AbortController();
    deepLinkRef.current = c;
    try {
      const d = await get<{ material: Material; stock: InventoryItem | null }>(
        '/materials/' + encodeURIComponent(materialId),
        c.signal,
      );
      if (c.signal.aborted) return;
      setSelectedStock(null);
      setEnrollOpen(false);
      setTab('materials');
      setMasterSheet({ mode: 'edit', material: d.material });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const urlTab = p.get('tab');
    const urlAvail = p.get('availability') || '';
    const urlArea = (p.get('area') || p.get('rack') || '').trim();
    const urlMat = p.get('material');
    if (['available', 'empty', 'uncounted', 'critical'].includes(urlAvail)) {
      setTab('inventory');
      setAvailability(urlAvail);
    } else if (urlTab === 'materials') {
      setTab('materials');
    } else if (urlTab === 'inventory') {
      setTab('inventory');
    }
    if (urlArea) setArea(urlArea);
    if (urlMat) {
      if (urlTab === 'materials') void openMasterByMaterialId(urlMat);
      else void openStockByMaterialId(urlMat);
    }
  }, [openMasterByMaterialId, openStockByMaterialId]);

  function switchTab(nextTab: ManageTab) {
    setTab(nextTab);
    setSelectedStock(null);
    setMasterSheet(null);
    setEnrollOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', nextTab);
    if (nextTab === 'materials') {
      url.searchParams.delete('availability');
      url.searchParams.delete('area');
    }
    url.searchParams.delete('material');
    window.history.replaceState(null, '', url.pathname + url.search);
  }

  function showSaved(message: string, action?: { label: string; onClick: () => void }) {
    setToast({ message, action });
    setRefresh((v) => v + 1);
  }

  const paging = (
    <div className="stock-pagination">
      <Button
        type="button"
        className="secondary small"
        disabled={!back.length || busy}
        onClick={() => {
          const prev = [...back];
          setCursor(prev.pop() ?? null);
          setBack(prev);
        }}
      >
        Sebelumnya
      </Button>
      <span className="r22-pagination-meta">
        {items.length} hasil · hal. {back.length + 1}
      </span>
      <Button
        type="button"
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
          <Button type="button" className="secondary small" onClick={() => setRefresh((v) => v + 1)}>
            Coba lagi
          </Button>
        </p>
      )}

      <div className="stock-tabs r22-manage-tabs" role="group" aria-label="Pengelolaan">
        {(
          [
            ['inventory', 'Stok, rak & saldo awal'],
            ['materials', 'Master material'],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            className={tab === value ? 'primary small' : 'secondary small'}
            aria-pressed={tab === value}
            onClick={() => switchTab(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      <section className="panel">
        <div className="section-title r22-manage-toolbar">
          <div>
            <h2>{tab === 'inventory' ? 'Daftar stok R22' : 'Katalog master material'}</h2>
            <small>{checked ? `Diperbarui ${formatDate(checked)} WIB` : ''}</small>
          </div>
          <div className="r22-manage-actions">
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
            {tab === 'inventory' ? (
              <Button
                type="button"
                className="primary small"
                onClick={() => {
                  setEnrollPreset(null);
                  setEnrollOpen(true);
                }}
              >
                <Icon name="plus" />
                Daftarkan material
              </Button>
            ) : (
              <Button
                type="button"
                className="primary small"
                onClick={() => setMasterSheet({ mode: 'create' })}
              >
                <Icon name="plus" />
                Tambah master material
              </Button>
            )}
          </div>
        </div>

        {tab === 'inventory' && (
          <div className="r22-manage-chips" role="group" aria-label="Filter kondisi stok">
            {availabilityChips.map(([value, label]) => (
              <button
                key={value || 'all'}
                type="button"
                className={`r22-filter-chip${availability === value ? ' active' : ''}`}
                aria-pressed={availability === value}
                onClick={() => setAvailability(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div
          className={`stock-filters r22-manage-filters${tab === 'inventory' ? ' r22-stock-filters' : ' r22-catalog-filters'}`}
        >
          <label>
            {tab === 'inventory' ? 'Cari stok R22' : 'Cari master material'}
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === 'inventory' ? 'MMID, nama, alias, area kerja…' : 'MMID, nama, alias…'}
            />
          </label>
          {tab === 'inventory' && (
            <label>
              Area Kerja
              <Select searchable={false} value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="">Semua area kerja</option>
                {(area && !areas.includes(area) ? [...areas, area] : areas).map((v) => (
                  <option key={v} value={v}>
                    {v === R22_SHARED_AREA
                      ? `${R22_SHARED_AREA} (Stok bersama)`
                      : (R22_WORK_AREAS as readonly string[]).includes(v)
                        ? v
                        : `${v} (nilai lama)`}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <label className="r22-checkbox-row r22-filter-checkbox">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Sertakan nonaktif
          </label>
        </div>

        {tab === 'inventory' ? (
          <div className="stock-table" aria-busy={busy}>
            <div className="stock-table-head">
              <span>Material</span>
              <span>Area Kerja</span>
              <span>Saldo</span>
            </div>
            {(items as InventoryItem[]).map((m) => {
              const isZero = m.initialized && decimalUnits(m.quantity) === 0n;
              return (
                <button
                  type="button"
                  className={`stock-table-row${selectedStock?.inventoryId === m.inventoryId ? ' selected' : ''}`}
                  key={m.inventoryId}
                  onClick={() => setSelectedStock(m)}
                >
                  <span>
                    <strong>{m.commonName || m.description}</strong>
                    <span className="r22-row-sub">
                      <span className="code-text">{m.mmid}</span>
                      {m.commonName ? ` · ${m.description}` : ''}
                    </span>
                    {(m.critical || !m.active || !m.inventoryActive) && (
                      <span className="r22-inline-badges">
                        {m.critical && <span className="badge orange">Kritis</span>}
                        {(!m.active || !m.inventoryActive) && <span className="badge neutral">Nonaktif</span>}
                      </span>
                    )}
                  </span>
                  <span data-label="Area Kerja">{workAreaLabel(m.rack)}</span>
                  <span data-label="Saldo">
                    {m.initialized ? (
                      <>
                        <strong className={isZero ? 'r22-qty-zero' : undefined}>
                          {formatQuantity(m.quantity)} <small>{m.unit}</small>
                        </strong>
                        {isZero && <small className="r22-qty-zero-label">Stok nol</small>}
                      </>
                    ) : (
                      <>
                        <span className="badge orange">Belum dihitung</span>
                        <small>Konfirmasi saldo awal</small>
                      </>
                    )}
                  </span>
                </button>
              );
            })}
            {!items.length &&
              (!ready ? (
                <TableSkeleton rows={5} />
              ) : (
                <EmptyState
                  title="Tidak ada material stok sesuai filter."
                  description="Ubah filter pencarian atau klik Daftarkan material untuk menambahkan ke stok R22."
                />
              ))}
          </div>
        ) : (
          <div className="stock-table stock-table-master" aria-busy={busy}>
            <div className="stock-table-head">
              <span>SAP/MMID</span>
              <span>Nama material</span>
              <span>Satuan & konversi</span>
              <span>Status R22</span>
            </div>
            {(items as Material[]).map((m) => (
              <button
                type="button"
                className={`stock-table-row${masterSheet?.mode === 'edit' && masterSheet.material.id === m.id ? ' selected' : ''}`}
                key={m.id}
                onClick={() => setMasterSheet({ mode: 'edit', material: m })}
              >
                <span data-label="SAP/MMID">
                  <strong className="code-text">{m.mmid}</strong>
                </span>
                <span>
                  <strong>{m.commonName || m.description}</strong>
                  {(m.commonName || m.category) && (
                    <span className="r22-row-sub">
                      {[m.commonName ? m.description : '', m.category].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {(m.critical || !m.active || !m.conversionReviewed) && (
                    <span className="r22-inline-badges">
                      {m.critical && <span className="badge orange">Kritis</span>}
                      {!m.conversionReviewed && <span className="badge orange">Perlu tinjauan</span>}
                      {!m.active && <span className="badge neutral">Nonaktif</span>}
                    </span>
                  )}
                </span>
                <span data-label="Satuan">
                  <strong>{m.unit}</strong>
                  <small>{conversionSummary(m)}</small>
                </span>
                <span data-label="Status R22">
                  {m.inStock ? (
                    <span className="badge success">Di R22</span>
                  ) : (
                    <span className="badge neutral">Belum di R22</span>
                  )}
                </span>
              </button>
            ))}
            {!items.length &&
              (!ready ? (
                <TableSkeleton rows={5} />
              ) : (
                <EmptyState
                  title="Master material tidak ditemukan."
                  description="Coba kata kunci lain atau klik Tambah master material."
                />
              ))}
          </div>
        )}

        {paging}
      </section>

      <Overlay
        open={!!selectedStock}
        onClose={() => setSelectedStock(null)}
        title={selectedStock ? `${selectedStock.mmid} · Kelola stok R22` : 'Kelola stok R22'}
        kind="sheet"
        className="r22-manage-sheet"
        onNavigate={
          tab === 'inventory'
            ? (direction) => {
                const list = items as InventoryItem[];
                const i = list.findIndex((m) => m.inventoryId === selectedStock?.inventoryId);
                const target = list[i + direction];
                if (i >= 0 && target) setSelectedStock(target);
              }
            : undefined
        }
      >
        {selectedStock && (
          <StockActionSheet
            key={`${selectedStock.inventoryId}-${selectedStock.inventoryVersion}`}
            item={selectedStock}
            onClose={() => setSelectedStock(null)}
            onEditMaster={() => void openMasterByMaterialId(selectedStock.id)}
            onSaved={(message) => {
              setSelectedStock(null);
              showSaved(message);
            }}
          />
        )}
      </Overlay>

      <Overlay
        open={enrollOpen}
        onClose={() => {
          setEnrollOpen(false);
          setEnrollPreset(null);
        }}
        title="Daftarkan material ke stok R22"
        kind="sheet"
        className="r22-manage-sheet"
      >
        {enrollOpen && (
          <EnrollmentSheet
            preset={enrollPreset}
            onClose={() => {
              setEnrollOpen(false);
              setEnrollPreset(null);
            }}
            onOpenExisting={(m) => {
              setEnrollOpen(false);
              setEnrollPreset(null);
              void openStockByMaterialId(m.id);
            }}
            onEnrolled={(material, withOpening) => {
              setEnrollOpen(false);
              setEnrollPreset(null);
              showSaved(
                withOpening
                  ? `${material.mmid} terdaftar dan saldo awal tersimpan.`
                  : `${material.mmid} terdaftar di stok R22.`,
                withOpening
                  ? undefined
                  : {
                      label: 'Konfirmasi saldo awal',
                      onClick: () => void openStockByMaterialId(material.id),
                    },
              );
            }}
          />
        )}
      </Overlay>

      <Overlay
        open={!!masterSheet}
        onClose={() => setMasterSheet(null)}
        title={
          masterSheet?.mode === 'edit'
            ? `${masterSheet.material.mmid} · Edit master material`
            : 'Tambah master material'
        }
        kind="sheet"
        className="r22-manage-sheet"
        onNavigate={
          tab === 'materials' && masterSheet?.mode === 'edit'
            ? (direction) => {
                const list = items as Material[];
                const i = list.findIndex((m) => m.id === masterSheet.material.id);
                const target = list[i + direction];
                if (i >= 0 && target) setMasterSheet({ mode: 'edit', material: target });
              }
            : undefined
        }
      >
        {masterSheet && (
          <MasterEditorSheet
            key={
              masterSheet.mode === 'edit'
                ? `edit-${masterSheet.material.id}-${masterSheet.material.version}`
                : 'create'
            }
            material={masterSheet.mode === 'edit' ? masterSheet.material : null}
            onClose={() => setMasterSheet(null)}
            onOpenStock={(id) => void openStockByMaterialId(id)}
            onStartEnroll={(m) => {
              setMasterSheet(null);
              setTab('inventory');
              setEnrollPreset(m);
              setEnrollOpen(true);
            }}
            onSaved={(message, createdForOpeningId) => {
              setMasterSheet(null);
              showSaved(
                message,
                createdForOpeningId
                  ? {
                      label: 'Konfirmasi saldo awal',
                      onClick: () => void openStockByMaterialId(createdForOpeningId),
                    }
                  : undefined,
              );
            }}
          />
        )}
      </Overlay>

      <Toast message={toast?.message || ''} action={toast?.action} onDismiss={() => setToast(null)} />
    </>
  );
}

function StockActionSheet({
  item,
  onClose,
  onEditMaster,
  onSaved,
}: {
  item: InventoryItem;
  onClose: () => void;
  onEditMaster: () => void;
  onSaved: (message: string) => void;
}) {
  const [subTab, setSubTab] = useState<StockSubTab>(item.initialized ? 'rack' : 'balance');
  const tabIds = useId();
  const tabs: { id: StockSubTab; label: string }[] = item.initialized
    ? [
        { id: 'rack', label: 'Area Kerja & status' },
        { id: 'balance', label: 'Koreksi saldo' },
      ]
    : [
        { id: 'balance', label: 'Konfirmasi saldo awal' },
        { id: 'rack', label: 'Area Kerja & status' },
      ];

  return (
    <div className="r22-sheet-body">
      <div className="r22-sheet-summary">
        <div className="r22-sheet-summary-head">
          <div>
            <h3>{item.commonName || item.description}</h3>
            <p className="muted">
              <span className="code-text">{item.mmid}</span> · {item.description}
            </p>
          </div>
          <Button type="button" className="secondary small" onClick={onEditMaster}>
            Edit master
          </Button>
        </div>
        <div className="r22-sheet-stats">
          <div>
            <small>Saldo saat ini</small>
            <strong>
              {item.initialized ? `${formatQuantity(item.quantity)} ${item.unit}` : 'Belum dihitung'}
            </strong>
          </div>
          <div>
            <small>Area Kerja</small>
            <strong>{workAreaLabel(item.rack)}</strong>
          </div>
          <div>
            <small>Status</small>
            <span className={`badge ${item.inventoryActive ? 'success' : 'neutral'}`}>
              {item.inventoryActive ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
        </div>
      </div>

      <div className="r22-sheet-tabs" role="tablist" aria-label="Tindakan stok R22">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            id={`${tabIds}-${t.id}`}
            type="button"
            role="tab"
            aria-selected={subTab === t.id}
            tabIndex={subTab === t.id ? 0 : -1}
            onClick={() => setSubTab(t.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const nextTab = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
                setSubTab(nextTab.id);
                document.getElementById(`${tabIds}-${nextTab.id}`)?.focus();
              }
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-labelledby={`${tabIds}-${subTab}`} className="r22-sheet-tabpanel">
        {subTab === 'rack' ? (
          <InventoryEditor
            key={`rack-${item.inventoryId}-${item.inventoryVersion}`}
            item={item}
            onClose={onClose}
            onSaved={onSaved}
          />
        ) : (
          <StockTransactionForm
            key={`balance-${item.inventoryId}-${item.inventoryVersion}`}
            item={item}
            kind={item.initialized ? 'adjustment' : 'opening'}
            onClose={onClose}
            onSaved={onSaved}
          />
        )}
      </div>
    </div>
  );
}

function StockTransactionForm({
  item,
  kind,
  onClose,
  onSaved,
}: {
  item: InventoryItem;
  kind: 'opening' | 'adjustment';
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [amount, setAmount] = useState(''),
    [reason, setReason] = useState(''),
    [qtyTouched, setQtyTouched] = useState(false),
    [reasonTouched, setReasonTouched] = useState(false),
    [submitted, setSubmitted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(false),
    [pending, setPending] = useState<{ fingerprint: string; key: string } | null>(null);
  const confirm = useConfirmation();
  const id = useId();

  const parsed = parseCountInput(
    amount,
    item.decimalAllowed,
    item.unit,
    kind === 'adjustment' ? item.quantity : undefined,
  );
  const after = parsed.value;
  const showQtyError = (qtyTouched || submitted) && !!parsed.error;
  const reasonError = !reason.trim() ? 'Isi alasan atau keterangan hitung fisik.' : '';
  const showReasonError = (reasonTouched || submitted) && !!reasonError;

  const delta =
    after !== null && kind === 'adjustment' ? decimalUnits(after) - decimalUnits(item.quantity) : null;
  const deltaText =
    delta !== null ? `${delta > 0n ? '+' : ''}${formatQuantity(decimalString(delta))} ${item.unit}` : '—';

  return (
    <form
      noValidate
      className="form-stack r22-manage-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || success) return;
        setSubmitted(true);
        if (parsed.error) {
          document.getElementById(`${id}-qty`)?.focus();
          return;
        }
        if (reasonError) {
          document.getElementById(`${id}-reason`)?.focus();
          return;
        }
        const body = {
          materialId: item.id,
          inventoryId: item.inventoryId,
          quantity: localDecimal(amount),
          reason: reason.trim(),
          expectedVersion: item.inventoryVersion,
        };
        const confirmBody =
          kind === 'adjustment'
            ? `Koreksi ${item.mmid}${item.rack ? ` (${item.rack})` : ''} di R22: ubah saldo dari ${formatQuantity(item.quantity)} ${item.unit} menjadi ${formatQuantity(after!)} ${item.unit} (selisih ${deltaText})?`
            : `${countLabels[kind]} ${item.mmid}${item.rack ? ` (${item.rack})` : ''} di R22: jumlah fisik ${formatQuantity(after!)} ${item.unit}?`;
        if (
          !(await confirm(confirmBody, {
            title: `Konfirmasi ${countLabels[kind]}`,
            confirmLabel: `Simpan ${countLabels[kind]}`,
            variant: 'primary',
          }))
        )
          return;
        const fingerprint = JSON.stringify(body),
          key = pending?.fingerprint === fingerprint ? pending.key : crypto.randomUUID();
        setPending({ fingerprint, key });
        setBusy(true);
        setError('');
        try {
          const result = await send<{ movement: { id: string } }>(
            kind === 'opening' ? '/opening-balances' : '/adjustments',
            body,
            'POST',
            key,
          );
          setSuccess(true);
          onSaved(`${countLabels[kind]} tersimpan. ID ${result.movement.id}.`);
        } catch (err) {
          setError(
            (err as Error).message + ' Jika koneksi terputus, key permintaan yang sama tetap digunakan.',
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {kind === 'adjustment' && (
        <p className="read-only">
          Masukkan <strong>total hasil hitung fisik aktual</strong> di rak (bukan angka tambah/kurang). Saldo
          sistem akan disesuaikan ke angka tersebut.
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}

      <div className="r22-field">
        <label htmlFor={`${id}-qty`}>Jumlah fisik</label>
        <small id={`${id}-qty-hint`} className="muted">
          Satuan: {item.unit} (
          {item.decimalAllowed ? 'mendukung desimal dengan koma' : 'hanya bilangan bulat'}).
        </small>
        <div className="r22-unit-field">
          <Input
            id={`${id}-qty`}
            required
            inputMode={item.decimalAllowed ? 'decimal' : 'numeric'}
            value={amount}
            aria-invalid={showQtyError ? 'true' : 'false'}
            aria-describedby={showQtyError ? `${id}-qty-hint ${id}-qty-err` : `${id}-qty-hint`}
            onBlur={() => setQtyTouched(true)}
            onChange={(e) => {
              setAmount(e.target.value);
              setError('');
            }}
            placeholder={kind === 'opening' ? '0 atau hasil hitung fisik' : 'Total fisik aktual'}
          />
          <span className="r22-unit-suffix" aria-hidden="true">
            {item.unit}
          </span>
        </div>
        {showQtyError && (
          <p id={`${id}-qty-err`} className="r22-field-error">
            {parsed.error}
          </p>
        )}
      </div>

      <div className="r22-field">
        <label htmlFor={`${id}-reason`}>Alasan / keterangan hitung fisik</label>
        <Textarea
          id={`${id}-reason`}
          name="reason"
          required
          maxLength={500}
          value={reason}
          aria-invalid={showReasonError ? 'true' : 'false'}
          aria-describedby={showReasonError ? `${id}-reason-err` : undefined}
          onBlur={() => setReasonTouched(true)}
          onChange={(e) => {
            setReason(e.target.value);
            setError('');
          }}
          placeholder={
            kind === 'opening' ? 'Contoh: Hitung fisik awal ruang R22' : 'Contoh: Hasil stock opname rak'
          }
        />
        {showReasonError && (
          <p id={`${id}-reason-err`} className="r22-field-error">
            {reasonError}
          </p>
        )}
      </div>

      <div className="stock-preview">
        {kind === 'adjustment' ? (
          <div className="r22-delta-grid">
            <div>
              <span>Saldo saat ini</span>
              <strong>
                {formatQuantity(item.quantity)} {item.unit}
              </strong>
            </div>
            <div>
              <span>Target fisik</span>
              <strong>{after !== null ? `${formatQuantity(after)} ${item.unit}` : '—'}</strong>
            </div>
            <div>
              <span>Selisih</span>
              <strong
                className={
                  delta !== null && delta < 0n
                    ? 'negative-text'
                    : delta !== null && delta > 0n
                      ? 'positive-text'
                      : ''
                }
              >
                {deltaText}
              </strong>
            </div>
          </div>
        ) : (
          <>
            <span>Saldo sesuai hitung fisik</span>
            <strong>{after !== null ? `${formatQuantity(after)} ${item.unit}` : '—'}</strong>
          </>
        )}
        <small>Saldo dan versi diperiksa kembali oleh server.</small>
      </div>

      <div className="form-actions">
        <Button type="button" className="secondary" onClick={onClose}>
          Batal
        </Button>
        <Button className="primary" busy={busy} disabled={success}>
          Simpan {countLabels[kind].toLowerCase()}
        </Button>
      </div>
    </form>
  );
}

function WorkAreaField({
  value,
  onChange,
  legacyValue = '',
  disabled = false,
  showError = false,
}: {
  value: string;
  onChange: (value: string) => void;
  legacyValue?: string;
  disabled?: boolean;
  showError?: boolean;
}) {
  const errId = useId();
  const hasLegacy = !!legacyValue && !(R22_WORK_AREAS as readonly string[]).includes(legacyValue);

  return (
    <div className="r22-field">
      <label>
        Area Kerja
        <Select
          searchable={false}
          name="rack"
          required
          disabled={disabled}
          value={value}
          aria-invalid={showError ? 'true' : 'false'}
          aria-describedby={showError ? errId : undefined}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>
            Pilih area kerja
          </option>
          {hasLegacy && <option value={legacyValue}>{legacyValue} (nilai lama)</option>}
          {R22_WORK_AREAS.map((area) => (
            <option key={area} value={area}>
              {area === R22_SHARED_AREA ? `${R22_SHARED_AREA} (Stok bersama)` : area}
            </option>
          ))}
        </Select>
      </label>
      {showError && (
        <p id={errId} className="r22-field-error">
          Pilih Area Kerja terlebih dahulu.
        </p>
      )}
    </div>
  );
}

function InventoryEditor({
  item,
  onClose,
  onSaved,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [rack, setRack] = useState(item.rack || ''),
    [active, setActive] = useState(item.inventoryActive),
    [submitted, setSubmitted] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const hasPositiveStock = decimalUnits(item.quantity) > 0n;
  const showAreaError = submitted && !rack.trim();

  return (
    <form
      noValidate
      className="form-stack r22-manage-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitted(true);
        setError('');
        if (!rack.trim()) return;
        setBusy(true);
        try {
          await send(
            '/inventory/' + item.inventoryId,
            {
              materialId: item.id,
              rack: rack.trim(),
              active,
              version: item.inventoryVersion,
            },
            'PATCH',
          );
          onSaved(`Area kerja & status ${item.mmid} tersimpan.`);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <WorkAreaField value={rack} onChange={setRack} legacyValue={item.rack} showError={showAreaError} />
      <div className="r22-field">
        <label className="r22-checkbox-row">
          <input
            type="checkbox"
            name="active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Daftar stok aktif
        </label>
        {hasPositiveStock && (
          <small className="muted">
            Saldo masih {formatQuantity(item.quantity)} {item.unit}. Penonaktifan hanya diperbolehkan saat
            saldo nol.
          </small>
        )}
      </div>
      <div className="form-actions">
        <Button type="button" className="secondary" onClick={onClose}>
          Tutup
        </Button>
        <Button className="primary" busy={busy}>
          Simpan area kerja / status
        </Button>
      </div>
    </form>
  );
}

function CatalogEnrollSearch({
  onSelectNew,
  onOpenExisting,
}: {
  onSelectNew: (m: MaterialSearchResult) => void;
  onOpenExisting: (m: MaterialSearchResult) => void;
}) {
  const [query, setQuery] = useState(''),
    [items, setItems] = useState<MaterialSearchResult[]>([]),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [active, setActive] = useState(0);
  const id = useId(),
    container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dismiss = (e: PointerEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);

  useEffect(() => {
    const c = new AbortController();
    if (!query.trim()) {
      setItems([]);
      setBusy(false);
      return;
    }
    const timer = setTimeout(() => {
      setBusy(true);
      setError('');
      get<{ items: MaterialSearchResult[] }>('/catalog-search?' + new URLSearchParams({ q: query }), c.signal)
        .then((d) => {
          if (c.signal.aborted) return;
          setItems(d.items);
          setActive(0);
          setOpen(true);
        })
        .catch((e) => {
          if ((e as Error).name !== 'AbortError') setError((e as Error).message);
        })
        .finally(() => {
          if (!c.signal.aborted) setBusy(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [query]);

  const pick = (m: MaterialSearchResult) => {
    setOpen(false);
    setQuery('');
    setItems([]);
    onSelectNew(m);
  };

  return (
    <div className="r22-search" ref={container}>
      <label htmlFor={id}>
        Cari master material
        <small>Ketik MMID, nama umum, alias, atau deskripsi SAP</small>
      </label>
      <div className="r22-search-field">
        <Icon name="search" />
        <input
          id={id}
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={query}
          placeholder="Contoh: 10023456 atau Baut M16"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && !!query.trim()}
          aria-controls={`${id}-options`}
          aria-activedescendant={open && items.length ? `${id}-${active}` : undefined}
          onFocus={() => {
            if (items.length) setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && open && query.trim()) {
              setOpen(false);
              e.preventDefault();
              e.stopPropagation();
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setOpen(true);
              setActive((v) =>
                items.length ? (v + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length : 0,
              );
            }
            if (e.key === 'Enter' && open && items[active]) {
              e.preventDefault();
              pick(items[active]);
            }
          }}
        />
        {query && (
          <button
            type="button"
            className="r22-search-clear"
            aria-label="Hapus pencarian"
            onClick={() => {
              setQuery('');
              setItems([]);
              setOpen(false);
              document.getElementById(id)?.focus();
            }}
          >
            <Icon name="x" />
          </button>
        )}
      </div>
      {busy && <small role="status">Mencari katalog master…</small>}
      {error && (
        <p role="alert" className="r22-field-error">
          {error}
        </p>
      )}
      {open && query.trim() && (
        <div
          id={`${id}-options`}
          role="listbox"
          aria-label="Hasil pencarian master material"
          className="r22-search-options"
        >
          {!busy && !items.length ? (
            <p className="empty">Master material tidak ditemukan.</p>
          ) : (
            items.map((m, i) => (
              <div
                role="option"
                id={`${id}-${i}`}
                tabIndex={-1}
                aria-selected={i === active}
                className={i === active ? 'highlight' : ''}
                key={m.id}
                onPointerMove={() => setActive(i)}
                onPointerDown={(e) => {
                  e.preventDefault();
                  pick(m);
                }}
              >
                <div className="r22-search-option-top">
                  <strong>
                    <span className="code-text">{m.mmid}</span> · {m.commonName || m.description}
                  </strong>
                  <span className={`badge ${m.inventoryId ? 'neutral' : 'success'}`}>
                    {m.inventoryId ? 'Tambah area lain' : 'Belum di R22'}
                  </span>
                </div>
                <small>{m.description}</small>
                <span>
                  {m.inventoryId
                    ? `Sudah ada di ${[m.rack, ...(m.otherAreas || []).map((o) => o.rack)].filter(Boolean).join(', ') || 'R22'} · Klik untuk daftarkan di Area Kerja lain`
                    : `Satuan R22: ${m.unit}`}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function EnrollmentSheet({
  preset,
  onClose,
  onOpenExisting,
  onEnrolled,
}: {
  preset: Material | null;
  onClose: () => void;
  onOpenExisting: (m: MaterialSearchResult) => void;
  onEnrolled: (m: Material, withOpening: boolean) => void;
}) {
  const [selected, setSelected] = useState<Material | null>(preset),
    [rack, setRack] = useState(''),
    [withOpening, setWithOpening] = useState(false),
    [amount, setAmount] = useState(''),
    [reason, setReason] = useState(''),
    [submitted, setSubmitted] = useState(false),
    [enrolledId, setEnrolledId] = useState<string | null>(null),
    [pending, setPending] = useState<{ fingerprint: string; key: string } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const confirm = useConfirmation();
  const id = useId();

  const parsed =
    selected && withOpening ? parseCountInput(amount, selected.decimalAllowed, selected.unit) : null;
  const showAreaError = submitted && !rack.trim();
  const showQtyError = submitted && withOpening && !!parsed?.error;
  const reasonError = withOpening && !reason.trim() ? 'Isi alasan atau keterangan hitung fisik.' : '';
  const showReasonError = submitted && !!reasonError;

  return (
    <form
      noValidate
      className="form-stack r22-manage-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setSubmitted(true);
        setError('');
        if (!selected) {
          setError('Pilih master material yang belum terdaftar di R22 terlebih dahulu.');
          return;
        }
        if (!rack.trim()) return;
        if (withOpening && (parsed?.error || reasonError)) return;

        if (withOpening) {
          const ok = await confirm(
            `Daftarkan ${selected.mmid} ke stok R22 (Area Kerja ${rack.trim()}) dan konfirmasi saldo awal ${formatQuantity(parsed!.value!)} ${selected.unit}?`,
            {
              title: 'Konfirmasi pendaftaran & saldo awal',
              confirmLabel: 'Daftarkan & simpan saldo',
              variant: 'primary',
            },
          );
          if (!ok) return;
        }

        setBusy(true);
        try {
          let targetInvId = enrolledId;
          if (!targetInvId) {
            const inv = await send<{ id: string }>('/inventory', {
              materialId: selected.id,
              rack: rack.trim(),
              active: true,
            });
            targetInvId = inv.id;
            setEnrolledId(inv.id);
          }
          if (withOpening) {
            const body = {
              materialId: selected.id,
              inventoryId: targetInvId,
              quantity: localDecimal(amount),
              reason: reason.trim(),
              expectedVersion: 1,
            };
            const fp = JSON.stringify(body),
              key = pending?.fingerprint === fp ? pending.key : crypto.randomUUID();
            setPending({ fingerprint: fp, key });
            await send('/opening-balances', body, 'POST', key);
          }
          onEnrolled(selected, withOpening);
        } catch (err) {
          setError(
            enrolledId
              ? `Material sudah terdaftar di stok R22, tetapi konfirmasi saldo awal gagal: ${(err as Error).message}`
              : (err as Error).message,
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="muted">
        Pilih material dari katalog master untuk didaftarkan ke suatu Area Kerja di ruang stok R22. Material
        yang sama dapat didaftarkan pada beberapa Area Kerja dengan saldo terpisah.
      </p>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}

      {!selected ? (
        <CatalogEnrollSearch onSelectNew={(m) => setSelected(m)} onOpenExisting={onOpenExisting} />
      ) : (
        <div className="r22-selected-card">
          <div>
            <small className="code-text">{selected.mmid}</small>
            <strong>{selected.commonName || selected.description}</strong>
            <small className="muted">
              {selected.description} · Satuan {selected.unit}
            </small>
          </div>
          {!enrolledId && (
            <Button
              type="button"
              className="secondary small"
              onClick={() => {
                setSelected(null);
                setError('');
              }}
            >
              Ganti
            </Button>
          )}
        </div>
      )}

      <WorkAreaField value={rack} onChange={setRack} disabled={!!enrolledId} showError={showAreaError} />

      {selected && (
        <>
          <label className="r22-checkbox-row">
            <input
              type="checkbox"
              checked={withOpening}
              disabled={!!enrolledId && withOpening}
              onChange={(e) => setWithOpening(e.target.checked)}
            />
            Sekalian konfirmasi saldo awal sekarang
          </label>

          {withOpening && (
            <div className="r22-chained-box">
              <div className="r22-field">
                <label htmlFor={`${id}-open-qty`}>Jumlah fisik</label>
                <small id={`${id}-open-hint`} className="muted">
                  Satuan: {selected.unit} (
                  {selected.decimalAllowed ? 'mendukung desimal dengan koma' : 'hanya bilangan bulat'}).
                </small>
                <div className="r22-unit-field">
                  <Input
                    id={`${id}-open-qty`}
                    required
                    inputMode={selected.decimalAllowed ? 'decimal' : 'numeric'}
                    value={amount}
                    aria-invalid={showQtyError ? 'true' : 'false'}
                    aria-describedby={showQtyError ? `${id}-open-hint ${id}-open-err` : `${id}-open-hint`}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0 atau hasil hitung fisik"
                  />
                  <span className="r22-unit-suffix" aria-hidden="true">
                    {selected.unit}
                  </span>
                </div>
                {showQtyError && (
                  <p id={`${id}-open-err`} className="r22-field-error">
                    {parsed?.error}
                  </p>
                )}
              </div>

              <div className="r22-field">
                <label htmlFor={`${id}-open-reason`}>Alasan / keterangan hitung fisik</label>
                <Textarea
                  id={`${id}-open-reason`}
                  required
                  maxLength={500}
                  value={reason}
                  aria-invalid={showReasonError ? 'true' : 'false'}
                  aria-describedby={showReasonError ? `${id}-open-reason-err` : undefined}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Hitung fisik awal saat pendaftaran rak R22"
                />
                {showReasonError && (
                  <p id={`${id}-open-reason-err`} className="r22-field-error">
                    {reasonError}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div className="form-actions">
        <Button type="button" className="secondary" onClick={onClose}>
          Batal
        </Button>
        <Button className="primary" busy={busy}>
          {enrolledId
            ? 'Ulangi simpan saldo awal'
            : withOpening
              ? 'Daftarkan & simpan saldo awal'
              : 'Daftarkan material'}
        </Button>
      </div>
    </form>
  );
}

function MasterEditorSheet({
  material,
  onClose,
  onOpenStock,
  onStartEnroll,
  onSaved,
}: {
  material: Material | null;
  onClose: () => void;
  onOpenStock: (materialId: string) => void;
  onStartEnroll: (m: Material) => void;
  onSaved: (message: string, createdForOpeningId?: string) => void;
}) {
  const [mmid, setMmid] = useState(material?.mmid || ''),
    [description, setDescription] = useState(material?.description || ''),
    [unit, setUnit] = useState(material?.unit || ''),
    [sapUnit, setSapUnit] = useState(material?.sapUnit || ''),
    [packSize, setPackSize] = useState(editableDecimal(material?.packSize)),
    [decimalAllowed, setDecimalAllowed] = useState(material?.decimalAllowed ?? false),
    [critical, setCritical] = useState(material?.critical ?? false),
    [active, setActive] = useState(material?.active ?? true),
    [reviewed, setReviewed] = useState(material?.conversionReviewed ?? true);
  const [alsoEnroll, setAlsoEnroll] = useState(false),
    [rack, setRack] = useState(''),
    [createdId, setCreatedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const showAreaError = submitted && !material && alsoEnroll && !rack.trim();

  let conversionNote = `1 ${sapUnit || 'satuan SAP'} = N ${unit || 'satuan R22'}. Kosong berarti 1 hanya jika kedua satuan sama.`;
  if (packSize.trim()) {
    try {
      const normalized = decimalString(decimalUnits(localDecimal(packSize)));
      conversionNote = `1 ${sapUnit || 'satuan SAP'} = ${formatQuantity(normalized)} ${unit || 'satuan R22'}.`;
    } catch {
      conversionNote = 'Masukkan angka positif (gunakan koma untuk desimal).';
    }
  }

  return (
    <form
      noValidate
      className="form-stack r22-manage-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setSubmitted(true);
        setError('');
        const f = new FormData(e.currentTarget);
        const aliasesValue = String(f.get('aliases') ?? '');
        if (!mmid.trim() || !description.trim() || !sapUnit.trim() || !unit.trim()) {
          setError(
            'Lengkapi seluruh kolom wajib (MMID, Nama / deskripsi material, Satuan SAP, dan Satuan R22).',
          );
          return;
        }
        if (!material && alsoEnroll && !rack.trim()) return;
        let normalizedPack: string | null = null;
        if (packSize.trim()) {
          try {
            const p = decimalUnits(localDecimal(packSize));
            if (p <= 0n) throw Error();
            normalizedPack = localDecimal(packSize);
          } catch {
            setError('Konversi SAP harus berupa angka lebih besar dari nol.');
            return;
          }
        }

        const body = {
          mmid: material?.mmid || mmid.trim(),
          description: description.trim(),
          commonName: material ? material.commonName : '',
          unit: unit.trim(),
          sapUnit: sapUnit.trim(),
          aliases: aliasesValue,
          decimalAllowed,
          category: material ? material.category : '',
          mrpType: material ? material.mrpType : '',
          critical,
          active: material ? active : true,
          packSize: normalizedPack,
          ...(material ? { version: material.version } : {}),
        };

        setBusy(true);
        try {
          let targetId = material?.id || createdId;
          if (!targetId) {
            const savedMat = await send<{ id: string }>('/materials', body, 'POST');
            targetId = savedMat.id;
            setCreatedId(targetId);
          } else if (material) {
            await send('/materials/' + material.id, body, 'PATCH');
          }

          if (!material && alsoEnroll && targetId) {
            await send('/inventory', {
              materialId: targetId,
              rack: rack.trim(),
              active: true,
            });
            onSaved(`Master ${body.mmid} tersimpan dan didaftarkan ke stok R22.`, targetId);
            return;
          }

          onSaved(material ? `Master ${material.mmid} diperbarui.` : `Master ${body.mmid} ditambahkan.`);
        } catch (err) {
          setError(
            !material && createdId
              ? `Master material sudah tersimpan, tetapi pendaftaran stok R22 gagal: ${(err as Error).message}`
              : (err as Error).message,
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {material && (
        <div className="r22-master-shortcut">
          <div>
            <span className={`badge ${material.inStock ? 'success' : 'neutral'}`}>
              {material.inStock ? 'Terdaftar di stok R22' : 'Belum di stok R22'}
            </span>
          </div>
          {material.inStock ? (
            <div className="r22-manage-actions">
              <Button type="button" className="secondary small" onClick={() => onOpenStock(material.id)}>
                Kelola stok
              </Button>
              <Button type="button" className="secondary small" onClick={() => onStartEnroll(material)}>
                + Area Kerja lain
              </Button>
            </div>
          ) : (
            <Button type="button" className="secondary small" onClick={() => onStartEnroll(material)}>
              Daftarkan ke stok R22
            </Button>
          )}
        </div>
      )}

      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}

      <div className="form-grid">
        <label className="r22-span-all">
          <span>MMID</span>
          <Input
            name="mmid"
            required
            maxLength={80}
            className="code-text"
            value={mmid}
            disabled={!!material || !!createdId}
            aria-invalid={submitted && !mmid.trim() ? 'true' : 'false'}
            onChange={(e) => setMmid(e.target.value)}
            placeholder="Contoh: 10023456"
          />
          {material && <small>MMID tidak dapat diubah.</small>}
        </label>

        <label className="r22-span-all">
          <span>Nama / deskripsi material</span>
          <Input
            name="description"
            required
            maxLength={160}
            disabled={!!createdId}
            value={description}
            aria-invalid={submitted && !description.trim() ? 'true' : 'false'}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Nama resmi sesuai katalog SAP"
          />
        </label>

        <AliasInput initial={material?.aliases || ''} />

        <label>
          <span>Satuan SAP</span>
          <Input
            name="sapUnit"
            required
            maxLength={30}
            disabled={!!createdId}
            value={sapUnit}
            aria-invalid={submitted && !sapUnit.trim() ? 'true' : 'false'}
            onChange={(e) => setSapUnit(e.target.value)}
            placeholder="BOX, SET, PAIL, PCS…"
          />
        </label>

        <label>
          <span>Satuan R22</span>
          <Input
            name="unit"
            required
            maxLength={30}
            value={unit}
            disabled={!!material?.unitLocked || !!createdId}
            aria-invalid={submitted && !unit.trim() ? 'true' : 'false'}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="PCS, KG, L…"
          />
          <small>
            {material?.unitLocked ? 'Terkunci setelah transaksi pertama.' : 'Satuan pakai di ruang R22.'}
          </small>
        </label>

        <label className="r22-span-all">
          Konversi SAP (opsional)
          <Input
            name="packSize"
            inputMode="decimal"
            disabled={!!createdId}
            value={packSize}
            onChange={(e) => setPackSize(e.target.value)}
            placeholder="Belum diatur"
          />
          <small>{conversionNote}</small>
        </label>
      </div>

      <div className="r22-checkbox-group">
        <label className="r22-checkbox-row">
          <input
            type="checkbox"
            name="decimalAllowed"
            disabled={!!createdId}
            checked={decimalAllowed}
            onChange={(e) => setDecimalAllowed(e.target.checked)}
          />
          Izinkan desimal
        </label>
        <label className="r22-checkbox-row">
          <input
            type="checkbox"
            name="critical"
            disabled={!!createdId}
            checked={critical}
            onChange={(e) => setCritical(e.target.checked)}
          />
          Material kritis
        </label>
        {material && (
          <label className="r22-checkbox-row">
            <input
              type="checkbox"
              name="active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Aktif
          </label>
        )}
      </div>

      {material && !material.conversionReviewed && (
        <label className="r22-checkbox-row r22-review-confirm">
          <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
          Saya telah memeriksa satuan SAP dan faktor konversi lama.
        </label>
      )}

      {!material && (
        <div className="r22-chained-box">
          <label className="r22-checkbox-row">
            <input
              type="checkbox"
              checked={alsoEnroll}
              disabled={!!createdId && alsoEnroll}
              onChange={(e) => setAlsoEnroll(e.target.checked)}
            />
            Sekalian daftarkan ke stok R22
          </label>
          {alsoEnroll && <WorkAreaField value={rack} onChange={setRack} showError={showAreaError} />}
        </div>
      )}

      <div className="form-actions">
        <Button type="button" className="secondary" onClick={onClose}>
          Batal
        </Button>
        <Button className="primary" busy={busy} disabled={!reviewed}>
          {createdId
            ? 'Ulangi daftarkan ke R22'
            : !material && alsoEnroll
              ? 'Simpan & daftarkan ke R22'
              : 'Simpan master material'}
        </Button>
      </div>
    </form>
  );
}
