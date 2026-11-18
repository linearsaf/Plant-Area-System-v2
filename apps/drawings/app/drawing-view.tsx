'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, Icon, Overlay, Select, Textarea, Toast, useConfirmation } from '@plant/ui';
import {
  revisionStatusLabels,
  type DrawingDetail,
  type RevisionSummary,
  type TimelineEntry,
} from '@plant/contracts';
import { formatWib, getJson, newKey, sendJson } from './client-api';
import { actionLabels } from './action-labels';
import { ClampText } from './clamp-text';
import { PdfViewer } from './pdf-viewer';
import { LegacyBadge, StatusBadge } from './status-badge';
import { WorkflowPanel } from './workflow-panel';

type Person = { id: string; name: string; position: string };

/** Revisi yang ditampilkan: Final Drawing berlaku, atau revisi kerja bila belum ada rilis. */
function shown(d: DrawingDetail): RevisionSummary | null {
  return d.released ?? d.current;
}

export function DrawingView({ drawing }: { drawing: DrawingDetail }) {
  const confirm = useConfirmation();
  const primary = shown(drawing);
  const [selected, setSelected] = useState<RevisionSummary | null>(primary),
    [timeline, setTimeline] = useState<TimelineEntry[]>([]),
    [toast, setToast] = useState(''),
    [error, setError] = useState(''),
    [sheet, setSheet] = useState<'void' | 'owner' | null>(null),
    [reason, setReason] = useState(''),
    [owner, setOwner] = useState(''),
    [people, setPeople] = useState<Person[]>([]),
    [busy, setBusy] = useState(false),
    [key, setKey] = useState(newKey());
  const p = drawing.permissions;
  const [menu, setMenu] = useState(false);
  // Phone layout only: viewer and data share one column, so tabs switch between them.
  const [pane, setPane] = useState<'drawing' | 'info'>('drawing');
  const paneTabs = useRef<(HTMLButtonElement | null)[]>([]);
  const panes = [
    { id: 'drawing', label: 'Gambar' },
    { id: 'info', label: 'Info & Revisi' },
  ] as const;
  const choosePane = (id: 'drawing' | 'info') => {
    setPane(id);
    paneTabs.current[id === 'drawing' ? 0 : 1]?.focus();
  };
  const menuButton = useRef<HTMLButtonElement>(null);
  const hasActions = p.edit || p.correct || p.transferOwner || p.void;
  useEffect(() => {
    if (!p.timeline) return;
    getJson<{ items: TimelineEntry[] }>(`drawings/${drawing.id}/timeline`)
      .then((d) => setTimeline(d.items))
      .catch(() => undefined);
  }, [drawing.id, p.timeline]);
  useEffect(() => {
    if (sheet !== 'owner') return;
    getJson<{ people: Person[] }>('people?for=owner')
      .then((d) => setPeople(d.people.filter((x) => x.id !== drawing.owner.id)))
      .catch((e) => setError(e.message));
  }, [sheet, drawing.owner.id]);
  const fileUrl = (r: RevisionSummary, intent = 'view') =>
    `/drawings/api/revisions/${r.id}/file?intent=${intent}${intent === 'download' ? '&disposition=attachment' : ''}`;
  const isFinal = selected?.status === 'completed' && !drawing.voided;
  const watermark =
    selected && selected.status !== 'completed'
      ? selected.status === 'obsolete'
        ? 'Obsolete'
        : selected.status === 'cancelled'
          ? 'Cancelled'
          : 'Belum final'
      : drawing.voided
        ? 'Dibatalkan'
        : undefined;

  async function run(path: string, body: Record<string, unknown>, success: string) {
    setBusy(true);
    setError('');
    try {
      await sendJson('POST', path, { expectedVersion: drawing.version, ...body }, key);
      setToast(success);
      setSheet(null);
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <div role="tablist" aria-label="Bagian drawing" className="segmented detail-tabs">
        {panes.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              paneTabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`pane-tab-${t.id}`}
            aria-controls={`pane-${t.id}`}
            aria-selected={pane === t.id}
            tabIndex={pane === t.id ? 0 : -1}
            className={pane === t.id ? 'is-active' : ''}
            onClick={() => setPane(t.id)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
              e.preventDefault();
              choosePane(panes[(i + 1) % 2].id);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {drawing.voided && (
        <p className="notice error" role="status">
          Drawing dibatalkan {formatWib(drawing.voided.at)} oleh {drawing.voided.by.name}. Alasan:{' '}
          {drawing.voided.reason}
        </p>
      )}
      {drawing.revising && <p className="notice">Revisi berikutnya sedang diproses.</p>}
      {selected && primary && selected.id !== primary.id && (
        <div className="notice revision-notice" role="status">
          <span>
            Anda melihat Rev {selected.revisionNo} ({revisionStatusLabels[selected.status]}).{' '}
            {drawing.released
              ? `Final Drawing berlaku: Rev ${primary.revisionNo}.`
              : `Revisi kerja saat ini: Rev ${primary.revisionNo}.`}
          </span>
          <Button
            className="small secondary"
            onClick={() => {
              setSelected(primary);
              setPane('drawing');
            }}
          >
            Tampilkan Rev {primary.revisionNo}
          </Button>
        </div>
      )}
      <div className="drawing-detail" data-pane={pane}>
        <section
          className="panel viewer-panel"
          id="pane-drawing"
          role="tabpanel"
          aria-labelledby="pane-tab-drawing"
        >
          {selected ? (
            <PdfViewer
              url={selected.hasFile ? fileUrl(selected) : null}
              title={`${drawing.number ?? 'Drawing'} Rev ${selected.revisionNo}`}
              watermark={watermark}
              downloadUrl={isFinal ? fileUrl(selected, 'download') : undefined}
              printUrl={isFinal ? fileUrl(selected, 'print') : undefined}
            />
          ) : (
            <p className="muted">Belum ada revisi yang dapat ditampilkan.</p>
          )}
        </section>
        <div className="detail-side" id="pane-info" role="tabpanel" aria-labelledby="pane-tab-info">
          <section className="panel">
            <div className="panel-head">
              <h2>Data drawing</h2>
              {hasActions && (
                <>
                  <button
                    ref={menuButton}
                    type="button"
                    className="icon-button ghost"
                    aria-label="Aksi drawing"
                    aria-haspopup="menu"
                    aria-expanded={menu}
                    title="Aksi drawing"
                    onClick={() => setMenu(true)}
                  >
                    <Icon name="more" strokeWidth={3} />
                  </button>
                  <Overlay
                    open={menu}
                    onClose={() => setMenu(false)}
                    title="Aksi drawing"
                    kind="menu"
                    placement="bottom-end"
                    anchor={menuButton}
                    hideTitle
                  >
                    <div className="menu-list" role="menu" aria-label="Aksi drawing">
                      {p.edit && (
                        <a
                          className="menu-item"
                          role="menuitem"
                          href={`/drawings/library/${drawing.id}/edit`}
                        >
                          <Icon name="drawing" />
                          <span>Edit draft</span>
                        </a>
                      )}
                      {p.correct && !p.edit && (
                        <a
                          className="menu-item"
                          role="menuitem"
                          href={`/drawings/library/${drawing.id}/edit?correct=1`}
                        >
                          <Icon name="settings" />
                          <span>Koreksi metadata</span>
                        </a>
                      )}
                      {p.transferOwner && (
                        <button
                          type="button"
                          className="menu-item"
                          role="menuitem"
                          onClick={() => (setMenu(false), setKey(newKey()), setSheet('owner'))}
                        >
                          <Icon name="user" />
                          <span>Alihkan owner</span>
                        </button>
                      )}
                      {p.void && (
                        <button
                          type="button"
                          className="menu-item is-danger"
                          role="menuitem"
                          onClick={() => (setMenu(false), setKey(newKey()), setSheet('void'))}
                        >
                          <Icon name="x" />
                          <span>Batalkan drawing</span>
                        </button>
                      )}
                    </div>
                  </Overlay>
                </>
              )}
            </div>
            <dl className="meta-list">
              <dt>Drawing Number</dt>
              <dd className="code-text">{drawing.number || 'Belum diisi'}</dd>
              <dt>Drawing Name</dt>
              <dd>{drawing.title || 'Belum diisi'}</dd>
              <dt>HAC/SAC</dt>
              <dd className="code-text">{drawing.hac}</dd>
              {drawing.otherHacs.length > 0 && (
                <>
                  <dt>HAC/SAC lain</dt>
                  <dd className="code-text">{drawing.otherHacs.join(', ')}</dd>
                </>
              )}
              <dt>Discipline</dt>
              <dd>{drawing.discipline ?? 'Belum diisi'}</dd>
              <dt>Drawn by</dt>
              <dd>{drawing.owner.name}</dd>
              {drawing.source === 'legacy' && (
                <>
                  <dt>Uploaded by</dt>
                  <dd>{drawing.uploadedBy.name}</dd>
                  <dt>Sumber</dt>
                  <dd>
                    <LegacyBadge />
                  </dd>
                  <dt className="is-stacked">Legacy Ready Note</dt>
                  <dd className="is-stacked">
                    {drawing.legacyNote ? <ClampText>{drawing.legacyNote}</ClampText> : '–'}
                  </dd>
                </>
              )}
              {drawing.description && (
                <>
                  <dt className="is-stacked">Description</dt>
                  <dd className="is-stacked">
                    <ClampText>{drawing.description}</ClampText>
                  </dd>
                </>
              )}
            </dl>
          </section>
          <WorkflowPanel
            drawing={drawing}
            onDone={(message) => {
              setToast(message);
              setTimeout(() => location.reload(), 600);
            }}
          />
          <section className="panel">
            <h2>{p.seeWip ? 'Riwayat revisi' : 'Current Revision'}</h2>
            <ul className="revision-list">
              {drawing.revisions.map((r) => (
                <li key={r.id}>
                  <div className="revision-row">
                    <strong>Rev {r.revisionNo}</strong>
                    <StatusBadge status={r.status} />
                    {r.id === drawing.released?.id && <span className="badge success">Final Drawing</span>}
                    {r.hasFile && (
                      <Button
                        className="small ghost"
                        aria-pressed={selected?.id === r.id}
                        onClick={() => {
                          setSelected(r);
                          setPane('drawing');
                        }}
                      >
                        {selected?.id === r.id ? (
                          <>
                            <Icon name="check" /> Ditampilkan
                          </>
                        ) : (
                          'Tampilkan'
                        )}
                      </Button>
                    )}
                  </div>
                  <small className="muted">
                    {r.completedAt
                      ? `Completed ${formatWib(r.completedAt)}`
                      : `Dibuat ${formatWib(r.createdAt)}`}{' '}
                    · {r.pageCount ? `${r.pageCount} halaman` : 'Belum ada file'}
                  </small>
                  {r.changeNote && <small>{r.changeNote}</small>}
                </li>
              ))}
            </ul>
          </section>
          {p.timeline && (
            <section className="panel">
              <h2>Jejak aktivitas</h2>
              {!timeline.length ? (
                <p className="muted">Belum ada aktivitas.</p>
              ) : (
                <ul className="timeline-list">
                  {timeline.map((t) => (
                    <li key={t.id}>
                      <strong>{actionLabels[t.action] ?? t.action}</strong>
                      <small className="muted">
                        {t.actor.name} · {formatWib(t.createdAt)}
                      </small>
                      {typeof t.details.reason === 'string' && t.details.reason && (
                        <small>Alasan: {t.details.reason}</small>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
      <Overlay open={sheet === 'void'} onClose={() => setSheet(null)} title="Batalkan drawing" kind="sheet">
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              !(await confirm(
                'Drawing dibatalkan permanen dan hilang dari Library. Data dan file tetap tersimpan.',
                { variant: 'danger', confirmLabel: 'Batalkan drawing' },
              ))
            )
              return;
            await run(`drawings/${drawing.id}/void`, { reason }, 'Drawing dibatalkan.');
          }}
        >
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <label>
            Alasan pembatalan
            <Textarea
              required
              maxLength={500}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <Button className="danger" busy={busy}>
            Batalkan drawing
          </Button>
        </form>
      </Overlay>
      <Overlay open={sheet === 'owner'} onClose={() => setSheet(null)} title="Alihkan owner" kind="sheet">
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void run(`drawings/${drawing.id}/owner`, { ownerId: owner, reason }, 'Owner drawing dialihkan.');
          }}
        >
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <p className="fine">
            Owner saat ini: {drawing.owner.name}. Hak edit, submit dan revisi baru mengikuti owner.
          </p>
          <label>
            Owner baru (Drawn by)
            <Select required value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="">Pilih pengguna</option>
              {people.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name + (x.position ? ` — ${x.position}` : '')}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Alasan (opsional)
            <Textarea maxLength={500} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <Button className="primary" busy={busy}>
            Alihkan owner
          </Button>
        </form>
      </Overlay>
      {toast && <Toast message={toast} onDismiss={() => setToast('')} />}
    </>
  );
}
