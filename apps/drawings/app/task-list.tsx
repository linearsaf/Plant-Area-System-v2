'use client';
import { useEffect, useState } from 'react';
import { EmptyState, TableSkeleton } from '@plant/ui';
import type { TaskItem, TaskKind } from '@plant/contracts';
import { formatWib, getJson } from './client-api';
import { ToneBadge } from './status-badge';

const groups: { kind: TaskKind; title: string; hint: string }[] = [
  { kind: 'rejected', title: 'Perlu diperbaiki', hint: 'Revisi ditolak dan kembali kepada Anda.' },
  { kind: 'draft', title: 'Draft', hint: 'Lengkapi lalu Submit to Check.' },
  {
    kind: 'request_assignment',
    title: 'Request ditugaskan',
    hint: 'Terima atau tolak Drawing Request yang ditugaskan kepada Anda.',
  },
  { kind: 'waiting_check', title: 'Waiting Check', hint: 'Periksa drawing dan susun approval plan.' },
  {
    kind: 'request_review',
    title: 'Request menunggu review',
    hint: 'Tugaskan ke Drafter atau tolak dengan alasan.',
  },
  { kind: 'approval_l1', title: 'Approval L1', hint: 'Revisi yang ditugaskan kepada Anda.' },
  { kind: 'approval_l2', title: 'Final Approval', hint: 'Revisi yang ditugaskan kepada Anda.' },
  {
    kind: 'inactive_approver',
    title: 'Approver tidak aktif',
    hint: 'Ganti approver agar revisi dapat dilanjutkan.',
  },
];

/** Tugas saya dihitung server dari keadaan data saat dibuka (PRD §4.8). */
export function TaskList() {
  const [items, setItems] = useState<TaskItem[] | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    getJson<{ items: TaskItem[] }>('tasks')
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message));
  }, []);
  if (error)
    return (
      <p className="notice error" role="alert">
        {error}
      </p>
    );
  if (!items) return <TableSkeleton />;
  if (!items.length)
    return (
      <section className="panel">
        <EmptyState
          title="Tidak ada tugas"
          description="Semua drawing yang menunggu tindakan Anda sudah selesai."
        />
      </section>
    );
  return (
    <>
      {groups.map((g) => {
        const list = items.filter((i) => i.kind === g.kind);
        if (!list.length) return null;
        return (
          <section className="panel" key={g.kind} aria-label={g.title}>
            <h2>
              {g.title} <span className="badge neutral">{list.length}</span>
            </h2>
            <p className="fine">{g.hint}</p>
            <ul className="task-list">
              {list.map((t) => (
                <li key={t.key}>
                  <a href={t.href}>
                    <span className="revision-row">
                      <strong className="code-text">{t.number || 'Tanpa nomor'}</strong>
                      {t.revisionNo && <span>Rev {t.revisionNo}</span>}
                      <ToneBadge label={t.statusLabel} tone={t.tone} status={t.status} />
                    </span>
                    <span>{t.title || 'Nama drawing belum diisi'}</span>
                    <small className="muted">
                      {t.requestId ? 'Pemohon' : 'Drawn by'} {t.owner} · diperbarui {formatWib(t.updatedAt)}
                    </small>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
