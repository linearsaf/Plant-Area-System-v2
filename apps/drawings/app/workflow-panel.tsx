'use client';
import { useEffect, useState } from 'react';
import { Button, Input, Overlay, Select, Textarea, useConfirmation } from '@plant/ui';
import { approvalLevels, drawingsRoleLabels, nextRevisionNo, type DrawingDetail } from '@plant/contracts';
import { formatWib, getJson, newKey, sendJson } from './client-api';

type Person = { id: string; name: string; position: string };
type Sheet = 'reassign' | 'revision' | 'cancel' | null;

/** Approval plan, aksi alur kerja dan riwayat keputusan per siklus (PRD §4.2–§4.4, §9). */
export function WorkflowPanel({
  drawing,
  onDone,
}: {
  drawing: DrawingDetail;
  onDone: (message: string) => void;
}) {
  const confirm = useConfirmation();
  const { steps, actions, available } = drawing.workflow;
  const current = drawing.current;
  const [sheet, setSheet] = useState<Sheet>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [key, setKey] = useState(newKey()),
    [l1, setL1] = useState(''),
    [l2, setL2] = useState(''),
    [people, setPeople] = useState<{ l1: Person[]; l2: Person[] }>({ l1: [], l2: [] }),
    [revisionNo, setRevisionNo] = useState(nextRevisionNo(drawing.released?.revisionNo ?? '0')),
    [note, setNote] = useState('');
  useEffect(() => {
    if (sheet !== 'reassign' || !current) return;
    Promise.all([
      getJson<{ people: Person[] }>(`people?for=approver-l1&revision=${current.id}`),
      getJson<{ people: Person[] }>(`people?for=approver-l2&revision=${current.id}`),
    ])
      .then(([a, b]) => setPeople({ l1: a.people, l2: b.people }))
      .catch((e) => setError(e.message));
  }, [sheet, current]);
  const open = (value: Sheet) => {
    setError('');
    setKey(newKey());
    setSheet(value);
  };
  async function run(
    method: 'POST' | 'PATCH',
    path: string,
    body: Record<string, unknown>,
    message: string,
    idempotent = true,
  ) {
    setBusy(true);
    setError('');
    try {
      await sendJson(
        method,
        path,
        { expectedVersion: drawing.version, ...body },
        idempotent ? key : undefined,
      );
      setSheet(null);
      onDone(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const l1Step = steps.find((s) => s.level === 1),
    l2Step = steps.find((s) => s.level === 2);
  const reviewable = available.check || available.approveL1 || available.approveL2;
  const anyAction =
    reviewable || available.submit || available.reassign || available.newRevision || available.cancelRevision;
  if (!anyAction && !steps.length && !actions.length && !available.makerBlocked) return null;
  return (
    <section className="panel workflow-panel">
      <h2>Alur approval</h2>
      {available.makerBlocked && (
        <p className="notice" role="status">
          Anda owner, pembuat atau pengirim revisi ini, sehingga tidak dapat memutus Check atau Approval
          (maker-checker).
        </p>
      )}
      {!!steps.length && current && current.status.startsWith('waiting_approval') && (
        <dl className="meta-list">
          {[l1Step, l2Step].map(
            (s, i) =>
              s && (
                <div key={s.level} className="contents">
                  <dt>{approvalLevels[(i + 1) as 1 | 2]}</dt>
                  <dd>
                    {s.assignee.name}
                    {s.decided && <span className="badge success">Diputus</span>}
                    {s.inactive && !s.decided && <span className="badge orange">Approver tidak aktif</span>}
                  </dd>
                </div>
              ),
          )}
          {!l2Step && l1Step && (
            <>
              <dt>Final Approval</dt>
              <dd className="muted">Tidak dipakai; Approval L1 langsung menghasilkan Completed.</dd>
            </>
          )}
        </dl>
      )}
      {error && !sheet && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="detail-actions">
        {available.submit && current && (
          <Button
            className="primary"
            busy={busy && !sheet}
            onClick={async () => {
              if (
                !(await confirm('Kirim revisi ini ke Check? Revisi tidak dapat diedit selama ditinjau.', {
                  confirmLabel: 'Submit to Check',
                }))
              )
                return;
              setKey(newKey());
              await run('POST', `revisions/${current.id}/submit`, {}, 'Revisi dikirim ke Check.');
            }}
          >
            Submit to Check
          </Button>
        )}
        {reviewable && (
          <a className="button primary" href={`/drawings/library/${drawing.id}/review`}>
            {available.check ? 'Check' : available.approveL1 ? 'Approval L1' : 'Final Approval'}
          </a>
        )}
        {available.reassign && (
          <Button className="secondary" onClick={() => open('reassign')}>
            Ganti approver
          </Button>
        )}
        {available.newRevision && (
          <Button className="secondary" onClick={() => open('revision')}>
            Buat revisi baru
          </Button>
        )}
        {available.cancelRevision && (
          <Button className="danger" onClick={() => open('cancel')}>
            Batalkan revisi
          </Button>
        )}
      </div>
      {!!actions.length && (
        <>
          <h3>Riwayat approval</h3>
          <ul className="timeline-list">
            {actions.map((a) => (
              <li key={a.id}>
                <span className="revision-row">
                  <strong>{approvalLevels[a.level]}</strong>
                  <span className={`badge ${a.decision === 'approved' ? 'success' : 'orange'}`}>
                    {a.decision === 'approved' ? 'Disetujui' : 'Ditolak'}
                  </span>
                  <small className="muted">Siklus {a.cycle}</small>
                </span>
                <small className="muted">
                  {a.actor.name}
                  {a.actorRole
                    ? ` (${drawingsRoleLabels[a.actorRole as keyof typeof drawingsRoleLabels] ?? a.actorRole})`
                    : ''}{' '}
                  · {formatWib(a.createdAt)}
                </small>
                {a.note && <span>{a.note}</span>}
                {!!a.attachments.length && (
                  <ul className="attachment-list">
                    {a.attachments.map((f) => (
                      <li key={f.id}>
                        <a href={`/drawings/api/attachments/${f.id}`} target="_blank" rel="noopener">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/drawings/api/attachments/${f.id}`} alt={f.name} loading="lazy" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <Overlay open={sheet === 'reassign'} onClose={() => setSheet(null)} title="Ganti approver" kind="sheet">
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            const body: Record<string, unknown> = {};
            if (l1) body.approverL1Id = l1;
            if (l2) body.approverL2Id = l2 === 'none' ? null : l2;
            void run(
              'PATCH',
              `revisions/${current?.id}/approval-plan`,
              body,
              'Approval plan diperbarui.',
              false,
            );
          }}
        >
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {current?.status === 'waiting_approval_1' && (
            <label>
              Approver L1 (saat ini: {l1Step?.assignee.name ?? '–'})
              <Select value={l1} onChange={(e) => setL1(e.target.value)}>
                <option value="">Tidak diubah</option>
                {people.l1.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name + (p.position ? ` — ${p.position}` : '')}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <label>
            Final Approval (saat ini: {l2Step?.assignee.name ?? 'tidak dipakai'})
            <Select value={l2} onChange={(e) => setL2(e.target.value)}>
              <option value="">Tidak diubah</option>
              {current?.status === 'waiting_approval_1' && l2Step && (
                <option value="none">Tidak memakai Final Approval</option>
              )}
              {people.l2.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name + (p.position ? ` — ${p.position}` : '')}
                </option>
              ))}
            </Select>
          </label>
          <p className="fine">Approver yang terkena maker-checker tidak ditampilkan.</p>
          <Button className="primary" busy={busy} disabled={!l1 && !l2}>
            Simpan approver
          </Button>
        </form>
      </Overlay>
      <Overlay
        open={sheet === 'revision'}
        onClose={() => setSheet(null)}
        title="Buat revisi baru"
        kind="sheet"
      >
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              'POST',
              `drawings/${drawing.id}/revisions`,
              { revisionNo, changeNote: note },
              'Revisi baru dibuat sebagai draft.',
            );
          }}
        >
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <p className="fine">
            Final Drawing Rev {drawing.released?.revisionNo} tetap berlaku dan dapat dibuka sampai revisi baru
            Completed.
          </p>
          <label>
            Revision Number
            <Input
              required
              maxLength={20}
              pattern="[A-Za-z0-9.\-]{1,20}"
              value={revisionNo}
              onChange={(e) => setRevisionNo(e.target.value)}
            />
          </label>
          <label>
            Change Note
            <Textarea maxLength={1000} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <Button className="primary" busy={busy}>
            Buat revisi baru
          </Button>
        </form>
      </Overlay>
      <Overlay open={sheet === 'cancel'} onClose={() => setSheet(null)} title="Batalkan revisi" kind="sheet">
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              'POST',
              `revisions/${current?.id}/cancel`,
              { reason: note },
              'Revisi dibatalkan. Final Drawing sebelumnya tetap berlaku.',
            );
          }}
        >
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <p className="fine">Revisi menjadi Cancelled. Data dan file tetap tersimpan.</p>
          <label>
            Alasan pembatalan
            <Textarea
              required
              maxLength={500}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <Button className="danger" busy={busy}>
            Batalkan revisi
          </Button>
        </form>
      </Overlay>
    </section>
  );
}
