'use client';
import { useEffect, useState } from 'react';
import { AnimatedNumber, Button, Icon, QuarterlyChart, Select, type ChartSeries } from '@plant/ui';
import type { DrawingsDashboard, TaskItem } from '@plant/contracts';
import { formatWib, getJson } from './client-api';
import { ToneBadge } from './status-badge';

const series: ChartSeries[] = [
  { key: 'released', label: 'Lewat approval', color: 'var(--series-1)' },
  { key: 'legacy', label: 'Legacy Ready', color: 'var(--series-2)', hatch: true },
];
const n = (v: number) => v.toLocaleString('id-ID');

/** Ringkasan Drawing Database (PRD §9). Viewer hanya melihat angka Final Drawing. */
export function DrawingsSummary({ action }: { action: { label: string; href: string } | null }) {
  const [year, setYear] = useState<number | null>(null),
    [data, setData] = useState<DrawingsDashboard | null>(null),
    [tasks, setTasks] = useState<TaskItem[]>([]),
    [active, setActive] = useState(0),
    [error, setError] = useState(''),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setError('');
    getJson<DrawingsDashboard>('dashboard' + (year ? `?year=${year}` : ''), abort.signal)
      .then((d) => {
        setData(d);
        setActive(
          d.year === d.currentYear ? Math.floor(new Date(Date.now() + 7 * 3600000).getUTCMonth() / 3) : 3,
        );
      })
      .catch((e) => !abort.signal.aborted && setError(e.message));
    return () => abort.abort();
  }, [year, reload]);
  useEffect(() => {
    getJson<{ items: TaskItem[] }>('tasks')
      .then((d) => setTasks(d.items))
      .catch(() => undefined);
  }, []);
  if (!data)
    return error ? (
      <div className="panel dashboard-error" role="alert">
        <Icon name="info" />
        <h2>Ringkasan belum tersedia</h2>
        <p>{error}</p>
        <Button className="secondary" onClick={() => setReload((v) => v + 1)}>
          Coba lagi
        </Button>
      </div>
    ) : (
      <div className="dashboard-grid" role="status" aria-label="Memuat ringkasan Drawing Database">
        <div className="dashboard-main">
          <div className="panel skeleton drawings-loading-hero" />
        </div>
        <div className="dashboard-rail">
          <div className="panel skeleton drawings-loading-rail" />
        </div>
      </div>
    );
  const total = data.series.reduce((s, q) => s + q.released + q.legacy, 0);
  const viewer = data.inProgress === null;
  const metrics: [string, number, string][] = [['Final Drawing', data.final, '/drawings/library']];
  if (!viewer)
    metrics.push(
      ['Dalam proses', data.inProgress ?? 0, '/drawings/library'],
      ['Menunggu tindakan', data.waiting ?? 0, '/drawings/tasks'],
      ['Ditolak', data.rejected ?? 0, '/drawings/tasks'],
    );
  return (
    <section aria-label="Ringkasan Drawing Database">
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="panel hero-chart-card">
            <div className="chart-panel">
              <div className="section-head">
                <div>
                  <h2>Final Drawing terbit</h2>
                  <span className="display-xl">
                    <AnimatedNumber value={total} />
                    <small> drawing</small>
                  </span>
                </div>
                <label className="sr-label">
                  Tahun
                  <Select
                    aria-label="Tahun terbit"
                    value={data.year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  >
                    {Array.from(
                      { length: Math.min(10, data.currentYear - 1999) },
                      (_, i) => data.currentYear - i,
                    ).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>
              <p className="muted">Per kuartal berdasarkan waktu revisi Completed (WIB).</p>
              <QuarterlyChart
                year={data.year}
                quarters={data.series.map((q) => ({ quarter: q.quarter, values: [q.released, q.legacy] }))}
                series={series}
                active={active}
                onSelect={setActive}
                unit="drawing"
                legendLabel="Jenis rilis"
              />
            </div>
            <div className={`kpi-rail${viewer ? ' is-compact' : ''}`}>
              <p className="fine">Kondisi saat ini</p>
              {metrics.map(([label, value, href]) => (
                <a className="metric-block" key={label} href={href}>
                  <span>{label}</span>
                  <strong>
                    <AnimatedNumber value={value} />
                  </strong>
                </a>
              ))}
            </div>
          </section>
          {!viewer && (
            <section className="panel">
              <div className="section-head">
                <h2>Antrean tugas</h2>
                <a className="stock-inline-link" href="/drawings/tasks">
                  Semua tugas <Icon name="arrow" />
                </a>
              </div>
              {!tasks.length ? (
                <p className="muted">Tidak ada drawing yang menunggu tindakan Anda.</p>
              ) : (
                <ul className="task-list">
                  {tasks.slice(0, 5).map((t) => (
                    <li key={t.key}>
                      <a href={t.href}>
                        <span className="revision-row">
                          <strong className="code-text">{t.number || 'Tanpa nomor'}</strong>
                          {t.revisionNo && <span>Rev {t.revisionNo}</span>}
                          <ToneBadge label={t.statusLabel} tone={t.tone} status={t.status} />
                        </span>
                        <small className="muted">{t.title || 'Nama drawing belum diisi'}</small>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
        <aside className="dashboard-rail" aria-label="Aksi dan rilis terbaru">
          {action && (
            <section className="panel stock-action-card">
              <h2>Aksi cepat</h2>
              <a className="button primary" href={action.href}>
                {action.label}
                <Icon name="arrow" />
              </a>
              <a href="/drawings/library">
                Drawing Library
                <Icon name="chevron" />
              </a>
            </section>
          )}
          <section className="panel">
            <h2>Rilis terbaru</h2>
            {!data.recent.length ? (
              <p className="muted">Belum ada Final Drawing.</p>
            ) : (
              <ul className="timeline-list">
                {data.recent.map((r) => (
                  <li key={r.id}>
                    <a href={`/drawings/library/${r.id}`} className="code-text">
                      {r.number ?? 'Drawing'} · Rev {r.revisionNo}
                    </a>
                    <small className="muted">
                      {r.title} · {formatWib(r.releasedAt)}
                      {r.legacy ? ' · Legacy Ready' : ''}
                    </small>
                  </li>
                ))}
              </ul>
            )}
            <p className="fine">{n(data.final)} Final Drawing berlaku.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}
