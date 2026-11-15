import { notFound } from 'next/navigation';
import { pageIdentity } from '@plant/server';
import { AppError, canDraw } from '@plant/contracts';
import { Shell, Heading } from '@plant/ui';
import { revisionContext } from '@plant/drawings-core';
import { PdfViewer } from '../../pdf-viewer';
export const dynamic = 'force-dynamic';

/** Viewer penuh satu revisi. Izin sama dengan endpoint file; watermark untuk revisi belum final. */
export default async function Page({ params }: { params: Promise<{ revisionId: string }> }) {
  const { revisionId } = await params;
  const identity = await pageIdentity(`/drawings/view/${revisionId}`);
  if (!canDraw(identity, 'read')) notFound();
  const context = await revisionContext(identity, revisionId).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  const final = context.status === 'completed' && !context.voided;
  const url = (intent: string) =>
    `/drawings/api/revisions/${revisionId}/file?intent=${intent}${intent === 'download' ? '&disposition=attachment' : ''}`;
  return (
    <Shell identity={identity} active="drawings" activePath="/drawings/library">
      <Heading
        eyebrow="Drawing Library"
        title={`${context.number ?? 'Drawing'} · Rev ${context.revisionNo}`}
        description={context.title ?? ''}
      >
        <a className="button secondary" href={`/drawings/library/${context.drawingId}`}>
          Kembali ke detail
        </a>
      </Heading>
      <PdfViewer
        url={context.hasFile ? url('view') : null}
        title={`${context.number ?? 'Drawing'} Rev ${context.revisionNo}`}
        height="calc(100vh - 220px)"
        watermark={
          final
            ? undefined
            : context.status === 'obsolete'
              ? 'Obsolete'
              : context.status === 'cancelled'
                ? 'Cancelled'
                : 'Belum final'
        }
        downloadUrl={final ? url('download') : undefined}
        printUrl={final ? url('print') : undefined}
      />
    </Shell>
  );
}
