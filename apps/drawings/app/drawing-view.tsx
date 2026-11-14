'use client';
import { useEffect, useState } from 'react';
import { Button, Overlay, Select, Textarea, Toast, useConfirmation } from '@plant/ui';
import type { DrawingDetail, RevisionSummary, TimelineEntry } from '@plant/contracts';
import { formatWib, getJson, newKey, sendJson } from './client-api';
import { PdfViewer } from './pdf-viewer';
import { LegacyBadge, StatusBadge } from './status-badge';

const actionLabels: Record<string, string> = {
  'drawing.created': 'Membuat drawing',
  'drawing.legacy_uploaded': 'Upload Old Drawing',
  'drawing.updated': 'Mengubah draft',
  'drawing.corrected': 'Mengoreksi metadata',
  'drawing.voided': 'Membatalkan drawing',
  'drawing.owner_transferred': 'Mengalihkan owner',
  'file.downloaded': 'Mengunduh Final Drawing',
  'file.printed': 'Mencetak Final Drawing',
};
type Person = { id: string; name: string; position: string };

/** Revisi yang ditampilkan: Final Drawing berlaku, atau revisi kerja bila belum ada rilis. */
function shown(d: DrawingDetail): RevisionSummary | null {
  return d.released ?? d.current;
}

export function DrawingView({ drawing }: { drawing: DrawingDetail }) {
  const confirm = useConfirmation();
  const [selected, setSelected] = useState<RevisionSummary | null>(shown(drawing)),
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
      {drawing.voided && (
        <p className="notice error" role="status">
          Drawing dibatalkan {formatWib(drawing.voided.at)} oleh {drawing.voided.by.name}. Alasan:{' '}
          {drawing.voided.reason}
        </p>
      )}
      {drawing.revising && <p className="notice">Revisi berikutnya sedang diproses.</p>}
      <div className="drawing-detail">
        <section className="panel" aria-label="Viewer drawing">
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
        <div className="detail-side">
          <section className="panel">
            <h2>Data drawing</h2>
            <dl className="meta-list">
              <dt>Drawing Number</dt>
              <dd className="code-text">{drawing.number || 'Belum diisi'}</dd>
              <dt>Drawing Name</dt>
              <dd>{drawing.title || 'Belum diisi'}</dd>
              <dt>HAC/SAC</dt>
              <dd className="code-text">{drawing.hac}</dd>
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
                  <dt>Legacy Ready Note</dt>
                  <dd>{drawing.legacyNote}</dd>
                </>
              )}
              {drawing.description && (
                <>
                  <dt>Description</dt>
                  <dd>{drawing.description}</dd>
                </>
              )}
            </dl>
            <div className="detail-actions">
              {p.edit && (
                <a className="button primary" href={`/drawings/library/${drawing.id}/edit`}>
                  Edit draft
                </a>
              )}
              {p.correct && !p.edit && (
                <a className="button secondary" href={`/drawings/library/${drawing.id}/edit?correct=1`}>
                  Koreksi metadata
                </a>
              )}
              {p.transferOwner && (
                <Button className="secondary" onClick={() => (setKey(newKey()), setSheet('owner'))}>
                  Alihkan owner
                </Button>
              )}
              {p.void && (
                <Button className="danger" onClick={() => (setKey(newKey()), setSheet('void'))}>
                  Batalkan drawing
                </Button>
              )}
              {selected?.hasFile && (
                <a className="button secondary" href={`/drawings/view/${selected.id}`}>
                  Buka viewer penuh
                </a>
              )}
            </div>
          </section>
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
                        onClick={() => setSelected(r)}
                      >
                        {selected?.id === r.id ? 'Ditampilkan' : 'Tampilkan'}
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
