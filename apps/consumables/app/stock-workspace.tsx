'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  Icon,
  Input,
  Select,
  Overlay,
  Toast,
  TableSkeleton,
  EmptyState,
  cartKey,
  cartLineKey,
  readCart,
  useDebouncedValue,
} from '@plant/ui';
import { AddToOrder } from './add-to-order';
import {
  canConsume,
  decimalUnits,
  formatDate,
  formatQuantity,
  R22_SHARED_AREA,
  R22_WORK_AREAS,
  workAreaLabel,
  type Identity,
  type Material,
  type InventoryItem,
} from '@plant/contracts';

type StockTab = 'stock' | 'catalog';
type ListPage =
  | { source: 'inventory'; items: InventoryItem[]; nextCursor: string | null; checked: string }
  | { source: 'materials'; items: Material[]; nextCursor: string | null; checked: string };
type ToastState = { message: string; action?: { label: string; onClick: () => void } } | null;

const api = '/consumables/api';
const ALL_AVAILABILITY_CHIPS = [
  ['', 'Semua'],
  ['available', 'Tersedia'],
  ['empty', 'Stok nol'],
  ['uncounted', 'Belum dihitung'],
  ['critical', 'Kritis stok nol'],
] as const;
const CORE_AVAILABILITY_VALUES = new Set(['', 'available', 'empty']);

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(api + path, { cache: 'no-store', signal }),
    d = await r.json();
  if (!r.ok) throw Error(d.error || 'Gagal memuat data.');
  return d as T;
}

function conversionSummary(m: Pick<Material, 'sapUnit' | 'unit' | 'packSize'>) {
  if (m.packSize) return `1 ${m.sapUnit || m.unit} = ${formatQuantity(m.packSize)} ${m.unit}`;
  if ((m.sapUnit || m.unit).toUpperCase() === m.unit.toUpperCase()) return `1 ${m.unit} = 1 ${m.unit}`;
  return `${m.sapUnit || '—'} → ${m.unit} (belum diatur)`;
}

function areaOptionLabel(area: string) {
  if (area === R22_SHARED_AREA) return `${R22_SHARED_AREA} (Stok bersama)`;
  return (R22_WORK_AREAS as readonly string[]).includes(area) ? area : `${area} (nilai lama)`;
}

function readCartSummary(userId: string, lineKey: string) {
  if (typeof window === 'undefined' || !userId) return { consume: '', returnQty: '' };
  const consume =
    readCart(cartKey(userId, 'consume')).lines.find((l) => cartLineKey(l) === lineKey)?.quantity || '';
  const returnQty =
    readCart(cartKey(userId, 'return')).lines.find((l) => cartLineKey(l) === lineKey)?.quantity || '';
  return { consume, returnQty };
}

export function StockWorkspace({ identity }: { identity: Identity }) {
  const [tab, setTab] = useState<StockTab>('stock'),
    [query, setQuery] = useState(''),
    [availability, setAvailability] = useState(''),
    [area, setArea] = useState(''),
    [showInactive, setShowInactive] = useState(false),
    [urlReady, setUrlReady] = useState(false);
  const [result, setResult] = useState<ListPage | null>(null),
    [cursor, setCursor] = useState<string | null>(null),
    [back, setBack] = useState<(string | null)[]>([]),
    [loading, setBusy] = useState(false),
    [error, setError] = useState(''),
    [toast, setToast] = useState<ToastState>(null),
    [refresh, setRefresh] = useState(0);
  const [areas, setAreas] = useState<string[]>([...R22_WORK_AREAS]);
  const [detail, setDetail] = useState<{
      material: Material;
      stock: InventoryItem | null;
      stocks: InventoryItem[];
      activeInventoryId: string;
    } | null>(null),
    [detailLoading, setDetailLoading] = useState(false),
    [cartVersion, setCartVersion] = useState(0);

  const admin = canConsume(identity, 'manage');
  const canSeeInactive = admin || canConsume(identity, 'receive');
  const source: 'inventory' | 'materials' = tab === 'catalog' ? 'materials' : 'inventory';
  const current = result?.source === source ? result : null;
  const items = current?.items ?? [];
  const next = current?.nextCursor ?? null;
  const checked = current?.checked ?? '';
  const ready = !!current;
  const busy = loading || !current;

  const debouncedQuery = useDebouncedValue(query);
  const detailRequest = useRef<AbortController | null>(null);
  useEffect(() => () => detailRequest.current?.abort(), []);

  useEffect(() => {
    const c = new AbortController();
    get<{ items: string[] }>('/areas', c.signal)
      .then((d) => {
        if (!c.signal.aborted && d.items.length) setAreas(d.items);
      })
      .catch(() => {});
    return () => c.abort();
  }, [refresh]);

  const openMaterial = useCallback(async (id: string, preferInventoryId?: string) => {
    detailRequest.current?.abort();
    const c = new AbortController();
    detailRequest.current = c;
    setDetailLoading(true);
    try {
      const value = await get<{
        material: Material;
        stock: InventoryItem | null;
        stocks?: InventoryItem[];
      }>('/materials/' + encodeURIComponent(id), c.signal);
      if (!c.signal.aborted) {
        const list = value.stocks || (value.stock ? [value.stock] : []);
        const chosen =
          (preferInventoryId && list.find((s) => s.inventoryId === preferInventoryId)) ||
          value.stock ||
          list[0] ||
          null;
        setDetail({
          material: value.material,
          stock: chosen,
          stocks: list,
          activeInventoryId: chosen?.inventoryId || '',
        });
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    } finally {
      if (!c.signal.aborted) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('tab') === 'catalog') setTab('catalog');
    if (['available', 'empty', 'uncounted', 'critical'].includes(p.get('availability') || ''))
      setAvailability(p.get('availability')!);
    const initialArea = (p.get('area') || p.get('rack') || '').trim();
    if (initialArea) setArea(initialArea);
    if (p.get('material')) void openMaterial(p.get('material')!);
    setUrlReady(true);
  }, [openMaterial]);

  useEffect(() => {
    if (!urlReady) return;
    const p = new URLSearchParams();
    if (tab === 'catalog') p.set('tab', 'catalog');
    if (tab === 'stock' && availability) p.set('availability', availability);
    if (tab === 'stock' && area) p.set('area', area);
    const nextSearch = p.toString();
    const target = window.location.pathname + (nextSearch ? '?' + nextSearch : '');
    if (window.location.pathname + window.location.search !== target) {
      window.history.replaceState(null, '', target);
    }
  }, [urlReady, tab, availability, area]);

  const load = useCallback(
    async (signal: AbortSignal) => {
      const p = new URLSearchParams({ q: debouncedQuery });
      if (cursor) p.set('cursor', cursor);
      if (source === 'inventory' && availability) p.set('availability', availability);
      if (source === 'inventory' && area) p.set('area', area);
      if (canSeeInactive && showInactive) p.set('active', 'all');
      return get<{ items: InventoryItem[] | Material[]; nextCursor: string | null }>(
        '/' + source + '?' + p,
        signal,
      );
    },
    [source, debouncedQuery, cursor, availability, area, canSeeInactive, showInactive],
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

  const visibleChips = admin
    ? ALL_AVAILABILITY_CHIPS
    : ALL_AVAILABILITY_CHIPS.filter(
        ([value]) => CORE_AVAILABILITY_VALUES.has(value) || value === availability,
      );

  const areaOptions = area && !areas.includes(area) ? [...areas, area] : areas;
  const activeStock =
    detail?.stocks.find((s) => s.inventoryId === detail.activeInventoryId) || detail?.stock || null;
  const cartSummary = activeStock
    ? readCartSummary(identity.id, activeStock.inventoryId || activeStock.id)
    : { consume: '', returnQty: '' };
  void cartVersion;

  const paging = (
    <div className="stock-pagination">
      <Button
        type="button"
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

      <div className="stock-tabs r22-manage-tabs" role="group" aria-label="Tampilan katalog">
        {(
          [
            ['stock', 'Stok R22'],
            ['catalog', 'Katalog master'],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            className={tab === value ? 'primary small' : 'secondary small'}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      <section className="panel">
        <div className="section-title r22-manage-toolbar">
          <div>
            <h2>{tab === 'stock' ? 'Ketersediaan stok R22' : 'Katalog master material'}</h2>
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

        {tab === 'stock' && (
          <div className="r22-manage-chips" role="group" aria-label="Filter kondisi stok">
            {visibleChips.map(([value, label]) => (
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
          className={`stock-filters r22-manage-filters${tab === 'stock' ? ' r22-stock-filters' : ' r22-catalog-filters'}`}
        >
          <label>
            {tab === 'stock' ? 'Cari stok R22' : 'Cari katalog master'}
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === 'stock' ? 'MMID, nama, alias, area kerja…' : 'MMID, nama, alias…'}
            />
          </label>
          {tab === 'stock' && (
            <label>
              Area Kerja
              <Select searchable={false} value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="">Semua area kerja</option>
                {areaOptions.map((v) => (
                  <option key={v} value={v}>
                    {areaOptionLabel(v)}
                  </option>
                ))}
              </Select>
            </label>
          )}
          {canSeeInactive && (
            <label className="r22-checkbox-row r22-filter-checkbox">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Sertakan nonaktif
            </label>
          )}
        </div>

        {tab === 'stock' ? (
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
                  className={`stock-table-row${activeStock?.inventoryId === m.inventoryId ? ' selected' : ''}`}
                  key={m.inventoryId}
                  onClick={() => void openMaterial(m.id, m.inventoryId)}
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
                  title="Tidak ada material sesuai filter."
                  description="Coba ubah kata kunci, kondisi stok, atau filter Area Kerja."
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
                className={`stock-table-row${detail?.material.id === m.id ? ' selected' : ''}`}
                key={m.id}
                onClick={() => void openMaterial(m.id)}
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
                  {(m.critical || !m.active) && (
                    <span className="r22-inline-badges">
                      {m.critical && <span className="badge orange">Kritis</span>}
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
                  title="Material tidak ditemukan."
                  description="Coba kata kunci atau filter lain."
                />
              ))}
          </div>
        )}

        {paging}
        <p className="fine">
          Pengecekan tidak mencadangkan barang. Saldo diperiksa kembali ketika transaksi disimpan.
        </p>
      </section>

      <Overlay
        open={!!detail}
        onClose={() => {
          detailRequest.current?.abort();
          setDetail(null);
          setDetailLoading(false);
        }}
        title={detail ? `${detail.material.mmid} · Detail material` : 'Detail material'}
        kind="sheet"
        className="r22-manage-sheet"
        onNavigate={(direction) => {
          const i = items.findIndex((m) => m.id === detail?.material.id);
          const nextItem = items[i + direction];
          if (i >= 0 && nextItem) void openMaterial(nextItem.id);
        }}
      >
        {detail && (
          <div className="r22-sheet-body" aria-busy={detailLoading}>
            <div className="r22-sheet-summary">
              <div className="r22-sheet-summary-head">
                <div>
                  <h3>{detail.material.commonName || detail.material.description}</h3>
                  <p className="muted">
                    <span className="code-text">{detail.material.mmid}</span>
                    {detail.material.commonName ? ` · ${detail.material.description}` : ''}
                  </p>
                  {(detail.material.critical || !detail.material.active) && (
                    <div className="r22-inline-badges">
                      {detail.material.critical && <span className="badge orange">Kritis</span>}
                      {!detail.material.active && <span className="badge neutral">Nonaktif</span>}
                    </div>
                  )}
                </div>
                {detailLoading && <small className="muted">Memuat…</small>}
              </div>

              {activeStock ? (
                <>
                  {detail.stocks.length > 1 && (
                    <div className="r22-area-switcher" role="group" aria-label="Pilih Area Kerja stok">
                      {detail.stocks.map((st) => (
                        <button
                          key={st.inventoryId}
                          type="button"
                          className="r22-filter-chip"
                          aria-pressed={st.inventoryId === activeStock.inventoryId}
                          onClick={() =>
                            setDetail((prev) =>
                              prev ? { ...prev, stock: st, activeInventoryId: st.inventoryId } : prev,
                            )
                          }
                        >
                          {workAreaLabel(st.rack)} ·{' '}
                          {st.initialized ? `${formatQuantity(st.quantity)} ${st.unit}` : 'Belum dihitung'}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="r22-sheet-stats">
                    <div>
                      <small>Saldo saat ini</small>
                      {activeStock.initialized ? (
                        <strong
                          className={decimalUnits(activeStock.quantity) === 0n ? 'r22-qty-zero' : undefined}
                        >
                          {formatQuantity(activeStock.quantity)} {activeStock.unit}
                        </strong>
                      ) : (
                        <span className="badge orange">Belum dihitung</span>
                      )}
                    </div>
                    <div>
                      <small>Area Kerja</small>
                      <strong>{workAreaLabel(activeStock.rack)}</strong>
                    </div>
                    <div>
                      <small>Status stok</small>
                      <span className={`badge ${activeStock.inventoryActive ? 'success' : 'neutral'}`}>
                        {activeStock.inventoryActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </div>

                  {(cartSummary.consume || cartSummary.returnQty) && (
                    <div className="r22-cart-badges">
                      {cartSummary.consume && (
                        <a className="badge success" href="/consumables/consume">
                          Consume Order: {formatQuantity(cartSummary.consume)} {activeStock.unit} di keranjang
                        </a>
                      )}
                      {cartSummary.returnQty && (
                        <a className="badge neutral" href="/consumables/return">
                          Return Order: {formatQuantity(cartSummary.returnQty)} {activeStock.unit} di
                          keranjang
                        </a>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="muted">Belum terdaftar di stok R22.</p>
              )}
            </div>

            {activeStock && (
              <AddToOrder
                key={activeStock.inventoryId}
                identity={identity}
                item={activeStock}
                onCartChanged={() => setCartVersion((v) => v + 1)}
                onAdded={(message, href) =>
                  setToast({
                    message,
                    action: {
                      label: 'Buka keranjang',
                      onClick: () => window.location.assign(href),
                    },
                  })
                }
              />
            )}

            <dl className="stock-detail-grid r22-stock-meta">
              {[
                ['Satuan R22', detail.material.unit],
                ['Konversi SAP', conversionSummary(detail.material)],
                ['Material kritis', detail.material.critical ? 'Ya' : 'Tidak'],
                ['Status master', detail.material.active ? 'Aktif' : 'Nonaktif'],
                ...(detail.material.category ? [['Kategori', detail.material.category]] : []),
                ...(detail.material.mrpType ? [['Tipe MRP', detail.material.mrpType]] : []),
                ...(detail.material.aliases ? [['Alias', detail.material.aliases]] : []),
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>

            <div className="r22-stock-secondary-actions">
              {detail.stock && canConsume(identity, 'receive') && detail.stock.initialized && (
                <a
                  className="button secondary small"
                  href={`/consumables/picklist?material=${encodeURIComponent(detail.stock.id)}`}
                >
                  Penerimaan Picklist
                </a>
              )}
              {detail.stock && (
                <a
                  className="button secondary small"
                  href={`/consumables/history?material=${encodeURIComponent(detail.stock.id)}`}
                >
                  Riwayat
                </a>
              )}
              {admin && (
                <a
                  className="button secondary small"
                  href={
                    detail.stock
                      ? `/consumables/manage?tab=inventory&material=${encodeURIComponent(detail.material.id)}`
                      : `/consumables/manage?tab=materials&material=${encodeURIComponent(detail.material.id)}`
                  }
                >
                  {detail.stock ? 'Kelola stok & area kerja' : 'Kelola / daftarkan ke R22'}
                </a>
              )}
            </div>
          </div>
        )}
      </Overlay>

      <Toast message={toast?.message || ''} action={toast?.action} onDismiss={() => setToast(null)} />
    </>
  );
}
