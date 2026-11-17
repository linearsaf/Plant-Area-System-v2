import { notFound } from 'next/navigation';
import { pageIdentity } from '@plant/server';
import {
  canDraw,
  canOpenDrawingsSection,
  canSeeWip,
  drawingsRole,
  drawingsSections,
  requestScopes,
} from '@plant/contracts';
import { Shell, Heading, EmptyState } from '@plant/ui';
import { listMasters, maxPdfBytes } from '@plant/drawings-core';
import { Library, type LibraryParams } from '../library';
import { DrawingForm } from '../drawing-form';
import { MastersManager } from '../masters-manager';
import { AuditList } from '../audit-list';
import { TaskList } from '../task-list';
import { RequestList } from '../requests-ui';
export const dynamic = 'force-dynamic';
const pages: Record<string, { title: string; description: string }> = {
  library: {
    title: 'Drawing Library',
    description: 'Cari Final Drawing dan drawing yang sedang diproses berdasarkan nomor, nama atau HAC/SAC.',
  },
  tasks: {
    title: 'Tugas saya',
    description: 'Draft, pemeriksaan, dan approval yang menunggu tindakan Anda.',
  },
  requests: {
    title: 'Drawing Requests',
    description: 'Permintaan drawing baru beserta status review dan pengerjaannya.',
  },
  new: {
    title: 'Create Drawing',
    description: 'Buat drawing baru sebagai draft, lalu Submit to Check dari halaman detail.',
  },
  legacy: {
    title: 'Upload Old Drawing',
    description:
      'Unggah drawing lama langsung sebagai Final Drawing berlabel Legacy Ready, tanpa approval digital.',
  },
  manage: { title: 'Pengelolaan', description: 'Kelola master Discipline Drawing Database.' },
  audit: {
    title: 'Audit',
    description: 'Telusuri perubahan drawing, revisi, file dan master beserta pencatatnya.',
  },
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<LibraryParams>;
}) {
  const { section } = await params;
  if (!drawingsSections.includes(section) || !pages[section]) notFound();
  const identity = await pageIdentity(`/drawings/${section}`);
  const page = pages[section];
  const allowed = canOpenDrawingsSection(identity, section);
  const masters =
    allowed && ['library', 'new', 'legacy', 'manage'].includes(section) ? await listMasters() : null;
  const maxMb = maxPdfBytes() / 1024 / 1024;
  const actor = { id: identity.id, name: identity.name };
  return (
    <Shell identity={identity} active="drawings" activePath={`/drawings/${section}`}>
      <Heading eyebrow="Drawing Database" title={page.title} description={page.description}>
        {section === 'requests' && allowed && canDraw(identity, 'request.create') && (
          <a className="button primary" href="/drawings/requests/new">
            Request baru
          </a>
        )}
        {section === 'library' && allowed && canOpenDrawingsSection(identity, 'new') && (
          <a className="button primary" href="/drawings/new">
            Create Drawing
          </a>
        )}
      </Heading>
      {!allowed ? (
        <p className="notice error" role="alert">
          Anda tidak memiliki akses untuk halaman ini.
        </p>
      ) : section === 'library' && masters ? (
        <Library
          masters={masters}
          canSeeWip={canSeeWip(identity, { ownerId: identity.id })}
          isAdmin={drawingsRole(identity) === 'admin'}
          initial={await searchParams}
        />
      ) : (section === 'new' || section === 'legacy') && masters ? (
        <section className="panel">
          <DrawingForm
            mode={section === 'new' ? 'create' : 'legacy'}
            masters={masters}
            maxMb={maxMb}
            actor={actor}
          />
        </section>
      ) : section === 'manage' && masters ? (
        <MastersManager initial={masters} />
      ) : section === 'audit' ? (
        <AuditList />
      ) : section === 'tasks' ? (
        <TaskList />
      ) : section === 'requests' ? (
        <RequestList scopes={requestScopes(identity)} />
      ) : (
        <section className="panel">
          <EmptyState
            title="Halaman sedang disiapkan"
            description="Fitur ini tersedia pada tahap implementasi berikutnya."
          />
        </section>
      )}
    </Shell>
  );
}
