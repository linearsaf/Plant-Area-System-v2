'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button, Select, Textarea, useConfirmation } from '@plant/ui';
import { approvalLevels, type DrawingDetail } from '@plant/contracts';
import { formatWib, getJson, newKey, sendJson } from './client-api';
import { ImageUpload } from './image-upload';
import { PdfViewer } from './pdf-viewer';
import { StatusBadge } from './status-badge';

type Person = { id: string; name: string; position: string };

/** Ruang tinjau: viewer besar berdampingan dengan panel keputusan (PRD §9). */
export function ReviewPanel({ drawing }: { drawing: DrawingDetail }) {
  const confirm = useConfirmation();
  const rev = drawing.current!;
  const { available, steps } = drawing.workflow;
  const level = available.check ? 0 : available.approveL1 ? 1 : 2;
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve'),
    [note, setNote] = useState(''),
    [attachments, setAttachments] = useState<string[]>([]),
    [l1, setL1] = useState(''),
    [l2, setL2] = useState(''),
    [people, setPeople] = useState<{ l1: Person[]; l2: Person[] }>({ l1: [], l2: [] }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [key, setKey] = useState(newKey());
  const onAttachments = useCallback((ids: string[]) => setAttachments(ids), []);
  useEffect(() => {
    if (level !== 0) return;
    Promise.all([
      getJson<{ people: Person[] }>(`people?for=approver-l1&revision=${rev.id}`),
      getJson<{ people: Person[] }>(`people?for=approver-l2&revision=${rev.id}`),
    ])
      .then(([a, b]) => setPeople({ l1: a.people, l2: b.people }))
      .catch((e) => setError(e.message));
  }, [level, rev.id]);
  const path = level === 0 ? 'check' : level === 1 ? 'approve-l1' : 'approve-l2';
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const label = decision === 'approve' ? 'Setujui' : 'Tolak';
    if (
      !(await confirm(`${label} ${approvalLevels[level]} untuk Rev ${rev.revisionNo}?`, {
        variant: decision === 'reject' ? 'danger' : 'primary',
        confirmLabel: label,
      }))
    )
      return;
    setBusy(true);
    setError('');
    try {
      const body: Record<string, unknown> = { expectedVersion: drawing.version, decision, note };
      if (decision === 'reject') body.attachmentIds = attachments;
      if (level === 0 && decision === 'approve') {
        body.approverL1Id = l1;
        body.approverL2Id = l2 || null;
      }
      await sendJson('POST', `revisions/${rev.id}/${path}`, body, key);
      location.assign(`/drawings/library/${drawing.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  const change =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setKey(newKey());
      setter(v);
    };
  return (
    <div className="review-room">
      <section className="panel" aria-label="File yang ditinjau">
        <PdfViewer
          url={rev.hasFile ? `/drawings/api/revisions/${rev.id}/file?intent=view` : null}
          title={`${drawing.number ?? 'Drawing'} Rev ${rev.revisionNo}`}
          watermark="Belum final"
          height="calc(100vh - 240px)"
        />
      </section>
      <section className="panel">
        <h2>{approvalLevels[level]}</h2>
        <dl className="meta-list">
          <dt>Revisi</dt>
          <dd>
            Rev {rev.revisionNo} · Siklus {rev.cycle} <StatusBadge status={rev.status} />
          </dd>
          <dt>Drawn by</dt>
          <dd>{drawing.owner.name}</dd>
          <dt>Dikirim</dt>
          <dd>{formatWib(rev.submittedAt)}</dd>
          {rev.changeNote && (
            <>
              <dt>Change Note</dt>
              <dd>{rev.changeNote}</dd>
            </>
          )}
          {level > 0 &&
            steps.map((s) => (
              <div className="contents" key={s.level}>
                <dt>{approvalLevels[s.level]}</dt>
                <dd>{s.assignee.name}</dd>
              </div>
            ))}
        </dl>
        <form className="form-stack" onSubmit={submit}>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <fieldset className="decision-choice">
            <legend className="sr-only">Keputusan</legend>
            <Button
              type="button"
              className={decision === 'approve' ? 'primary' : 'secondary'}
              aria-pressed={decision === 'approve'}
              onClick={() => change(setDecision)('approve')}
            >
              Setujui
            </Button>
            <Button
              type="button"
              className={decision === 'reject' ? 'danger' : 'secondary'}
              aria-pressed={decision === 'reject'}
              onClick={() => change(setDecision)('reject')}
            >
              Tolak
            </Button>
          </fieldset>
          {level === 0 && decision === 'approve' && (
            <>
              <label>
                Approver L1 (wajib)
                <Select required value={l1} onChange={(e) => change(setL1)(e.target.value)}>
                  <option value="">Pilih Approver L1</option>
                  {people.l1.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name + (p.position ? ` — ${p.position}` : '')}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                Final Approval (opsional)
                <Select value={l2} onChange={(e) => change(setL2)(e.target.value)}>
                  <option value="">Tanpa Final Approval</option>
                  {people.l2.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name + (p.position ? ` — ${p.position}` : '')}
                    </option>
                  ))}
                </Select>
              </label>
              <p className="fine">
                Tanpa Final Approval, persetujuan Approval L1 langsung menjadikan revisi Completed.
              </p>
            </>
          )}
          <label>
            Catatan{decision === 'reject' ? ' (wajib)' : ' (opsional)'}
            <Textarea
              required={decision === 'reject'}
              maxLength={1000}
              rows={4}
              value={note}
              onChange={(e) => change(setNote)(e.target.value)}
            />
          </label>
          {decision === 'reject' && <ImageUpload onChange={onAttachments} />}
          <Button className={decision === 'reject' ? 'danger' : 'primary'} busy={busy}>
            {decision === 'approve' ? `Setujui ${approvalLevels[level]}` : `Tolak ${approvalLevels[level]}`}
          </Button>
          {decision === 'reject' && (
            <p className="fine">Reject mengembalikan revisi ke owner untuk diperbaiki dan di-submit ulang.</p>
          )}
        </form>
      </section>
    </div>
  );
}
