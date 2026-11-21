'use client';
import { useEffect, useState, useRef } from 'react';
import {
  ageStops,
  bagBrands,
  bagAgeScaleDays,
  bagWarningDays,
  compareBagLoad,
  equipment,
  equipmentSideSummary,
  formatDate,
  formatPercent,
  hasWorkOrder,
  type BagPriority,
  type EquipmentCode,
  type Position,
} from '@plant/contracts';
import { Select } from './fields';
import { Heading } from './heading';
import { Icon } from './icon';
import { Overlay } from './overlay';
type UnitLoad = {
  code: EquipmentCode;
  total: number;
  installed: number;
  older1260: number;
  distribution: number[];
};
type Data = {
  serverTime: string;
  year: number;
  currentYear: number;
  total: number;
  installed: number;
  neverInstalled: number;
  older1260: number;
  distribution: number[];
  perEquipment: UnitLoad[];
  compartments: {
    equipmentCode: EquipmentCode;
    side: Position['side'];
    compartment: number;
    label: string;
    installed: number;
    older1260: number;
    warning: number;
  }[];
  woCompliance: { bags: number; bagsWithWo: number; batches: number; batchesWithoutWo: number };
  priority: BagPriority;
  series: { quarter: number; label: string; total: number; brands: Record<string, number> }[];
  periodTotal: number;
  previousTotal: number;
  recent: {
    id: string;
    equipmentCode: string;
    wo: string;
    reason: string;
    brand: string | null;
    actorName: string;
    positionCount: number;
    createdAt: string;
  }[];
};
const n = (v: number) => v.toLocaleString('id-ID');
const brandColors = [
  'var(--primary-500)',
  'var(--highlight)',
  'var(--primary-200)',
  'var(--primary-700)',
  'var(--placeholder)',
];
const warningBucket = ageStops.findIndex((stop) => stop.days === bagWarningDays);
const criticalLabel = `bag ≥ ${n(bagAgeScaleDays)} hari`;
const warningLabel = `${n(bagWarningDays)}–${n(bagAgeScaleDays - 1)} hari`;
const mapHref = (code: string, params: Record<string, string | number> = {}) => {
  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  return `/bag-filter/equipment/${code.toLowerCase()}${query ? `?${query}` : ''}`;
};
const share = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);
/** Grafik memakai kunci API `Belum tercatat` untuk batch tanpa pabrikan. */
const brandLabel = (name: string) => (name === 'Belum tercatat' ? 'Pabrikan belum diisi' : name);
const compartmentCapacity = (code: EquipmentCode) =>
  equipment.find((e) => e.code === code)?.bagsPerCompartment ?? 0;
// Pola dekoratif statis; tidak mewakili data.
const mosaicStops = [0, 1, 0, 2, 1, 0, 3, 1, 0, 4, 1, 5, 2, 1, 6, 0];
export function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value),
    previous = useRef(value);
  const presentation = useRef(value);
  useEffect(() => {
    if (value === previous.current || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      previous.current = value;
      presentation.current = value;
      return;
    }
    const from = presentation.current;
    previous.current = value;
    const start = performance.now();
    const duration = Math.min(
      300,
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--duration-data')) || 280,
    );
    let frame = 0;
    const tick = (time: number) => {
      const f = Math.min(1, (time - start) / duration);
      presentation.current = Math.round(from + (value - from) * (1 - (1 - f) ** 3));
      setDisplay(presentation.current);
      if (f < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <span className="animated-number" aria-label={n(value)}>
      {n(display)}
    </span>
  );
}
function MapMenu({ codes, loads }: { codes: EquipmentCode[]; loads?: UnitLoad[] }) {
  const [open, setOpen] = useState(false),
    trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="secondary map-menu-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Icon name="grid" />
        Buka peta
        <Icon name="chevron" />
      </button>
      <Overlay
        open={open}
        onClose={() => setOpen(false)}
        title="Buka peta equipment"
        kind="menu"
        placement="bottom-end"
        anchor={trigger}
        className="overlay-menu-map"
      >
        {codes.map((code) => {
          const critical = loads?.find((l) => l.code === code)?.older1260 ?? 0;
          return (
            <a key={code} href={mapHref(code)} className="menu-item">
              <span className="code-text">{code}</span>
              {critical > 0 && (
                <small className="badge danger" aria-label={`${n(critical)} ${criticalLabel}`}>
                  {n(critical)} kritis
                </small>
              )}
            </a>
          );
        })}
      </Overlay>
    </>
  );
}
function EquipmentCards({ codes, data }: { codes: EquipmentCode[]; data: Data | null }) {
  return (
    <>
      <div className="section-title">
        <h2>Equipment</h2>
        <small>Sesuai cakupan Anda</small>
      </div>
      <div className="equipment-grid">
        {equipment
          .filter((e) => codes.includes(e.code))
          .map((e) => {
            const live = data?.perEquipment.find((u) => u.code === e.code);
            return (
              <a key={e.code} href={mapHref(e.code)} className="equipment-card">
                <div className="card-top">
                  <div>
                    <p className="eyebrow">BAG FILTER</p>
                    <h2>{e.code}</h2>
                  </div>
                  <span>↗</span>
                </div>
                <span className="big-number">
                  {n(e.compartments * e.bagsPerCompartment)} <small>posisi bag</small>
                </span>
                <p>
                  {e.compartments} kompartemen · {equipmentSideSummary(e)}
                </p>
                {live ? (
                  <div className="equipment-live">
                    <p>
                      {live.installed ? (
                        <>
                          <strong className={live.older1260 ? 'negative-text' : ''}>
                            {n(live.older1260)}
                          </strong>{' '}
                          {criticalLabel}
                        </>
                      ) : (
                        'Belum ada bag terpasang'
                      )}
                    </p>
                    <div
                      className="distribution-bar distribution-bar-mini"
                      role="img"
                      aria-label={`Distribusi umur ${n(live.installed)} bag terpasang di ${e.code}`}
                    >
                      {live.installed ? (
                        live.distribution.map((count, i) =>
                          count ? (
                            <span key={i} style={{ flex: count, background: ageStops[i].color }} />
                          ) : null,
                        )
                      ) : (
                        <span className="placeholder" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="equipment-live" aria-hidden="true">
                    <span className="skeleton equipment-live-skeleton" />
                  </div>
                )}
              </a>
            );
          })}
      </div>
    </>
  );
}
export function Dashboard({ equipmentCodes }: { equipmentCodes: EquipmentCode[] }) {
  const [year, setYear] = useState<number | null>(null),
    [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(true),
    [active, setActive] = useState(-1);
  useEffect(() => {
    const abort = new AbortController();
    setBusy(true);
    setError('');
    void fetch(`/bag-filter/api/dashboard${year === null ? '' : `?year=${year}`}`, {
      cache: 'no-store',
      signal: abort.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error || 'Ringkasan belum dapat dimuat.');
        return d;
      })
      .then((d) => {
        setData(d);
        setActive(
          d.year === d.currentYear
            ? Math.floor(new Date(Date.parse(d.serverTime) + 7 * 3600000).getUTCMonth() / 3)
            : 3,
        );
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setError(e.message);
          setData(null);
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setBusy(false);
      });
    return () => abort.abort();
  }, [year, revision]);
  const heading = (
    <Heading
      eyebrow="EQUIPMENT PROCESS / BAG FILTER"
      title="Bag Filter"
      description="Pantau umur bag dan telusuri penggantian di setiap koordinat."
    >
      <div className="heading-actions">
        {equipmentCodes.length > 0 && <MapMenu codes={equipmentCodes} loads={data?.perEquipment} />}
        <span className="badge">Data aktual</span>
      </div>
    </Heading>
  );
  if (error)
    return (
      <>
        {heading}
        <section className="panel dashboard-error">
          <Icon name="info" />
          <h2>Ringkasan belum tersedia</h2>
          <p className="muted">{error}</p>
          <button className="secondary" onClick={() => setRevision((v) => v + 1)}>
            Coba lagi
          </button>
        </section>
        <EquipmentCards codes={equipmentCodes} data={null} />
      </>
    );
  if (!data)
    return (
      <>
        {heading}
        <div className="dashboard-skeleton" aria-label="Memuat ringkasan" role="status">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="panel skeleton" key={i} />
          ))}
        </div>
        <EquipmentCards codes={equipmentCodes} data={null} />
      </>
    );
  const max = Math.max(4, Math.ceil(Math.max(...data.series.map((s) => s.total)) / 4) * 4),
    slot = data.series[Math.max(0, active)];
  const brandNames = [...bagBrands, 'Belum tercatat'];
  // Satu urutan (compareBagLoad) untuk Prioritas tertinggi, Beban umur kritis, dan link KPI.
  const loads = data.perEquipment
    .map((u) => ({
      ...u,
      warning: u.distribution[warningBucket],
      critical: share(u.older1260, u.installed),
      warned: share(u.distribution[warningBucket], u.installed),
    }))
    .sort(compareBagLoad);
  const warningCount = data.distribution[warningBucket],
    criticalUnit = loads.find((u) => u.older1260 > 0),
    warningUnit = [...loads]
      .sort((a, b) => b.warned - a.warned || b.warning - a.warning)
      .find((u) => u.warning > 0);
  const healthy = data.installed - data.older1260,
    health = share(healthy, data.installed);
  const wo = data.woCompliance,
    woShare = share(wo.bagsWithWo, wo.bags);
  const unrecorded = data.perEquipment
    .map((u) => ({ code: u.code, missing: u.total - u.installed }))
    .filter((u) => u.missing > 0)
    .sort((a, b) => b.missing - a.missing);
  const priority = data.priority;
  const fallbackCode = data.perEquipment[0]?.code;
  return (
    <>
      {heading}
      {data.neverInstalled > 0 && (
        <section className="panel unrecorded-banner" role="status">
          <Icon name="info" />
          <p>
            <strong>{n(data.neverInstalled)} posisi</strong> belum punya catatan pemasangan.
          </p>
          <ul aria-label="Posisi belum tercatat per equipment">
            {unrecorded.map((u) => (
              <li key={u.code}>
                <a href={mapHref(u.code)}>
                  <span className="code-text">{u.code}</span> <b>{n(u.missing)}</b>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="dashboard-grid" aria-busy={busy}>
        <div className="dashboard-main">
          <section className="panel hero-chart-card">
            <div className="chart-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">PEMASANGAN BAG</p>
                  <strong className="display-xl">
                    <AnimatedNumber value={data.periodTotal} />
                    <small> bag</small>
                  </strong>
                  <p className="muted">Per kuartal berdasarkan tanggal pemasangan (WIB)</p>
                </div>
                <label className="sr-label">
                  Tahun grafik
                  <Select
                    searchable={false}
                    aria-label="Tahun grafik"
                    value={year ?? data.year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  >
                    {Array.from({ length: data.currentYear - 1999 }, (_, i) => data.currentYear - i).map(
                      (value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ),
                    )}
                  </Select>
                </label>
              </div>
              <div className="chart-legend">
                {brandNames.map((name, i) => (
                  <span key={name}>
                    <i style={{ background: brandColors[i] }} />
                    {brandLabel(name)}
                  </span>
                ))}
              </div>
              <div
                className="bar-chart"
                role="figure"
                aria-label={`Pemasangan per kuartal ${data.year}: ${data.periodTotal} bag`}
              >
                <div className="chart-grid-lines">
                  {[1, 0.75, 0.5, 0.25, 0].map((v) => (
                    <span key={v}>
                      <small>{n(Math.round(max * v))}</small>
                    </span>
                  ))}
                </div>
                <div className="bar-slots">
                  {data.series.map((quarter, i) => (
                    <button
                      type="button"
                      key={quarter.quarter}
                      className={`bar-slot${i === active ? ' is-active' : ''}`}
                      aria-label={`${quarter.label} ${data.year}: ${quarter.total} bag`}
                      aria-pressed={i === active}
                      onPointerEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onClick={() => setActive(i)}
                    >
                      <span className="bar-stack">
                        {quarter.total ? (
                          brandNames
                            .filter((name) => quarter.brands[name])
                            .map((name) => (
                              <i
                                key={name}
                                className={i === active ? 'hatched' : ''}
                                style={{
                                  height: `${(quarter.brands[name] / max) * 100}%`,
                                  background:
                                    i === active
                                      ? brandColors[brandNames.indexOf(name)]
                                      : 'var(--placeholder)',
                                }}
                              />
                            ))
                        ) : (
                          <i className="empty-bar" />
                        )}
                      </span>
                      <small>{quarter.label}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="chart-tooltip" aria-live="polite">
                <span>
                  {slot?.label} {data.year} ·{' '}
                  {['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Okt–Des'][slot?.quarter - 1]}
                </span>
                <strong>{n(slot?.total || 0)} bag</strong>
                {slot &&
                  Object.entries(slot.brands).map(([brand, count]) => (
                    <small key={brand}>
                      {brandLabel(brand)} <b>{n(count)}</b>
                    </small>
                  ))}
              </div>
              <p className="fine">
                {data.year === data.currentYear
                  ? 'Tahun berjalan: data sampai saat ini.'
                  : `Total pemasangan tahun ${data.year}.`}
                {!data.periodTotal ? ' Belum ada pemasangan pada tahun ini.' : ''}
              </p>
              <p className="trend-row">
                {data.previousTotal ? (
                  <>
                    <Icon name="arrow" />
                    <span
                      className={data.periodTotal >= data.previousTotal ? 'positive-text' : 'negative-text'}
                    >
                      {data.periodTotal >= data.previousTotal ? '↑' : '↓'}{' '}
                      {formatPercent(
                        Math.abs(((data.periodTotal - data.previousTotal) / data.previousTotal) * 100),
                      )}
                    </span>{' '}
                    dibanding total tahun {data.year - 1}
                  </>
                ) : (
                  `Belum ada pembanding pada tahun ${data.year - 1}.`
                )}
              </p>
            </div>
            <div className="kpi-rail">
              <article className="metric-block">
                <span>Total posisi</span>
                <strong>
                  <AnimatedNumber value={data.total} />
                </strong>
                <small>Dalam cakupan Anda</small>
              </article>
              {warningUnit ? (
                <a
                  className="metric-block metric-block-link"
                  href={mapHref(warningUnit.code, { age: bagWarningDays })}
                >
                  <span>Mendekati batas</span>
                  <strong className="warning-text">
                    <AnimatedNumber value={warningCount} />
                  </strong>
                  <small>{warningLabel}</small>
                </a>
              ) : (
                <article className="metric-block">
                  <span>Mendekati batas</span>
                  <strong>
                    <AnimatedNumber value={warningCount} />
                  </strong>
                  <small>{warningLabel}</small>
                </article>
              )}
              {criticalUnit ? (
                <a
                  className="metric-block metric-block-link"
                  href={mapHref(criticalUnit.code, { age: bagAgeScaleDays })}
                >
                  <span>Umur ≥ {n(bagAgeScaleDays)} hari</span>
                  <strong className="negative-text">
                    <AnimatedNumber value={data.older1260} />
                  </strong>
                  <small>Dalam cakupan Anda</small>
                </a>
              ) : (
                <article className="metric-block">
                  <span>Umur ≥ {n(bagAgeScaleDays)} hari</span>
                  <strong>
                    <AnimatedNumber value={data.older1260} />
                  </strong>
                  <small>Dalam cakupan Anda</small>
                </article>
              )}
            </div>
          </section>
          <div className="dashboard-row two-columns">
            <section className="panel wo-card">
              <div className="section-head">
                <h2>Kepatuhan WO</h2>
                <span className="badge">{data.year}</span>
              </div>
              {wo.bags ? (
                <>
                  <strong className="display-lg">{formatPercent(woShare)}</strong>
                  <div
                    className="capacity-track"
                    role="meter"
                    aria-label="Bag dipasang dengan WO"
                    aria-valuenow={wo.bagsWithWo}
                    aria-valuemin={0}
                    aria-valuemax={wo.bags}
                    aria-valuetext={formatPercent(woShare)}
                  >
                    <span className="hatched" style={{ transform: `scaleX(${woShare / 100})` }} />
                  </div>
                  <p className="fine">
                    {n(wo.bagsWithWo)} dari {n(wo.bags)} bag dipasang dengan WO
                    {wo.batchesWithoutWo ? ` · ${n(wo.batchesWithoutWo)} batch tanpa WO` : ''}.
                  </p>
                </>
              ) : (
                <>
                  <strong className="display-lg">—</strong>
                  <p className="fine">Belum ada pemasangan pada {data.year}.</p>
                </>
              )}
            </section>
            <section className="panel tip-card critical-compartments">
              <div>
                <h2>Kompartemen paling kritis</h2>
                {data.compartments.length ? (
                  <ol>
                    {data.compartments.map((c) => (
                      <li key={`${c.equipmentCode}-${c.side}-${c.compartment}`}>
                        <a
                          href={mapHref(c.equipmentCode, {
                            compartment: c.label,
                            age: c.older1260 ? bagAgeScaleDays : bagWarningDays,
                          })}
                        >
                          <span>
                            <span className="code-text">{c.equipmentCode}</span> · Comp. {c.label}
                          </span>
                          <small>
                            {c.older1260 ? (
                              <b className="negative-text">
                                {n(c.older1260)}/{n(compartmentCapacity(c.equipmentCode))} kritis
                              </b>
                            ) : null}
                            {c.older1260 && c.warning ? ' · ' : ''}
                            {c.warning ? (
                              <b className="warning-text">
                                {n(c.warning)}/{n(compartmentCapacity(c.equipmentCode))} mendekati
                              </b>
                            ) : null}
                          </small>
                        </a>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>Tidak ada kompartemen dengan bag ≥ {n(bagWarningDays)} hari.</p>
                )}
              </div>
              <div className="mosaic" aria-hidden="true">
                {mosaicStops.map((stop, i) => (
                  <i
                    key={i}
                    className={i % 4 ? 'hatched' : ''}
                    style={{ background: ageStops[stop].color }}
                  />
                ))}
              </div>
            </section>
          </div>
          <div className="dashboard-row three-columns">
            <section className="panel distribution-card">
              <h2>Distribusi umur</h2>
              <p className="fine">Bag terpasang saat ini</p>
              <div
                className="distribution-bar"
                role="img"
                aria-label={`Distribusi ${data.installed} bag terpasang`}
              >
                {data.installed ? (
                  data.distribution.map((count, i) =>
                    count ? <span key={i} style={{ flex: count, background: ageStops[i].color }} /> : null,
                  )
                ) : (
                  <span className="placeholder" />
                )}
              </div>
              <div className="distribution-legend">
                {ageStops.map((stop, i) => (
                  <div key={stop.days}>
                    <i style={{ background: stop.color }} />
                    <span>
                      {i === ageStops.length - 1
                        ? `≥ ${stop.days} hari`
                        : `${stop.days}–${ageStops[i + 1].days - 1}`}
                    </span>
                    <strong>{n(data.distribution[i])}</strong>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel gauge-card">
              <h2>Indeks kesehatan bag</h2>
              <svg
                viewBox="0 0 240 150"
                role="img"
                aria-label={
                  data.installed
                    ? `${formatPercent(health)} bag terpasang berumur di bawah ${n(bagAgeScaleDays)} hari`
                    : 'Belum ada bag terpasang'
                }
              >
                <defs>
                  <linearGradient id="health-gradient">
                    <stop stopColor="var(--highlight)" />
                    <stop offset=".45" stopColor="var(--primary-300)" />
                    <stop offset="1" stopColor="var(--primary-500)" />
                  </linearGradient>
                  <pattern
                    id="health-hatch"
                    width="6"
                    height="6"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <path d="M0 0v6" stroke="white" strokeOpacity=".22" strokeWidth="1.5" />
                  </pattern>
                </defs>
                <path
                  d="M30 120a90 90 0 0 1 180 0"
                  fill="none"
                  stroke="var(--placeholder)"
                  strokeWidth="30"
                  pathLength="100"
                  strokeDasharray="23.5 2"
                />
                <path
                  d="M30 120a90 90 0 0 1 180 0"
                  fill="none"
                  stroke="url(#health-gradient)"
                  strokeWidth="30"
                  pathLength="100"
                  strokeDasharray={`${health} 100`}
                />
                <path
                  d="M30 120a90 90 0 0 1 180 0"
                  fill="none"
                  stroke="url(#health-hatch)"
                  strokeWidth="30"
                  pathLength="100"
                  strokeDasharray={`${health} 100`}
                />
              </svg>
              <strong className="display-md">{data.installed ? formatPercent(health) : '—'}</strong>
              <p className="fine">
                {data.installed
                  ? `${n(healthy)} dari ${n(data.installed)} bag terpasang di bawah ${n(bagAgeScaleDays)} hari`
                  : 'Belum ada bag terpasang.'}
              </p>
            </section>
            <section className="panel progress-card">
              <h2>Beban umur kritis</h2>
              <p className="fine">Bag kritis dan porsinya dari bag terpasang</p>
              <div className="age-load-legend" aria-hidden="true">
                <span>
                  <i style={{ background: ageStops[ageStops.length - 1].color }} />≥ {n(bagAgeScaleDays)} hari
                </span>
                <span>
                  <i style={{ background: ageStops[warningBucket].color }} />
                  {warningLabel}
                </span>
              </div>
              <div className="progress-list">
                {loads.map((e) => (
                  <a href={mapHref(e.code, { age: bagAgeScaleDays })} key={e.code}>
                    <div>
                      <strong className="code-text">{e.code}</strong>
                      <span>
                        {e.installed ? (
                          <>
                            {n(e.older1260)} <small>· {formatPercent(e.critical)}</small>
                          </>
                        ) : (
                          <small>Belum ada bag terpasang</small>
                        )}
                      </span>
                    </div>
                    <div
                      className="progress-track age-load-track"
                      role="img"
                      aria-label={`${e.code}: ${n(e.older1260)} ${criticalLabel} (${formatPercent(e.critical)}), ${n(e.warning)} bag mendekati batas (${formatPercent(e.warned)})`}
                    >
                      <i
                        style={{ width: `${e.critical}%`, background: ageStops[ageStops.length - 1].color }}
                      />
                      <i style={{ width: `${e.warned}%`, background: ageStops[warningBucket].color }} />
                    </div>
                  </a>
                ))}
              </div>
            </section>
          </div>
        </div>
        <aside className="dashboard-rail">
          <section
            className={`feature-widget priority-widget is-${priority.level}`}
            onPointerMove={(e) => {
              if (matchMedia('(prefers-reduced-motion: reduce)').matches || e.pointerType !== 'mouse') return;
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.transform = `perspective(800px) rotateY(${((e.clientX - r.left - r.width / 2) / r.width) * 4}deg) rotateX(${(-(e.clientY - r.top - r.height / 2) / r.height) * 4}deg)`;
            }}
            onPointerLeave={(e) => (e.currentTarget.style.transform = '')}
          >
            <p className="eyebrow">
              <span className="priority-pill">
                <i aria-hidden="true" />
                PRIORITAS TERTINGGI
              </span>
            </p>
            <div className="feature-contours" aria-hidden="true" />
            {priority.code ? (
              <>
                <h2 className="code-text">{priority.code}</h2>
                <strong className="display-xl">{n(priority.count)}</strong>
                <p>
                  {priority.level === 'critical' ? criticalLabel : `bag ${warningLabel}`} ·{' '}
                  {formatPercent(share(priority.count, priority.installed))} dari bag terpasang
                </p>
                <a
                  href={mapHref(priority.code, {
                    age: priority.level === 'critical' ? bagAgeScaleDays : bagWarningDays,
                  })}
                >
                  Buka peta <Icon name="arrow" />
                </a>
              </>
            ) : (
              <>
                <h2>{data.installed ? 'Semua unit sehat' : 'Belum ada bag terpasang'}</h2>
                <p>
                  {data.installed
                    ? `Semua bag terpasang berumur di bawah ${n(bagWarningDays)} hari.`
                    : 'Catat pemasangan pertama dari peta equipment.'}
                </p>
                {fallbackCode && (
                  <a href={mapHref(fallbackCode)}>
                    Buka peta <Icon name="arrow" />
                  </a>
                )}
              </>
            )}
          </section>
          <section className="panel recent-card">
            <div className="section-head">
              <h2>Aktivitas terbaru</h2>
              <Icon name="clock" />
            </div>
            <div className="activity-scroll">
              {data.recent.length ? (
                data.recent.map((item) => (
                  <a
                    key={item.id}
                    className="activity-row"
                    href={mapHref(item.equipmentCode, { batch: item.id })}
                  >
                    <span className="app-icon">
                      <Icon name="grid" />
                    </span>
                    <span>
                      <span className="activity-title">
                        <strong>
                          <span className="code-text">{item.equipmentCode}</span> · {n(item.positionCount)}{' '}
                          bag
                        </strong>
                        {hasWorkOrder(item.wo) ? (
                          <span className="code-text activity-wo">{item.wo}</span>
                        ) : (
                          <span className="badge orange">Tanpa WO</span>
                        )}
                      </span>
                      <small>
                        {item.brand || 'Pabrikan belum diisi'} · {item.actorName}
                      </small>
                      <small>{formatDate(item.createdAt)} WIB</small>
                    </span>
                  </a>
                ))
              ) : (
                <div className="empty">
                  <Icon name="clock" />
                  <p>Belum ada aktivitas batch.</p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
      <EquipmentCards codes={equipmentCodes} data={data} />
    </>
  );
}
