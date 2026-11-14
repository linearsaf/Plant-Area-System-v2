import { notFound } from 'next/navigation';
import { pageIdentity } from '@plant/server';
import { AppError, canDraw, editableRevisionStatuses } from '@plant/contracts';
import { Shell, Heading } from '@plant/ui';
import { drawingDetail, listMasters, maxPdfBytes } from '@plant/drawings-core';
import { DrawingForm } from '../../../drawing-form';
export const dynamic = 'force-dynamic';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ correct?: string }>;
}) {
  const { id } = await params;
  const correctRequested = (await searchParams).correct === '1';
  const identity = await pageIdentity(`/drawings/library/${id}/edit`);
  const drawing = canDraw(identity, 'read')
    ? await drawingDetail(identity, id).catch((e) => {
        if (e instanceof AppError && e.status === 404) notFound();
        throw e;
      })
    : null;
  const p = drawing?.permissions;
  const released = !!drawing?.released;
  const revisionEditable =
    !!p?.edit &&
    !!drawing?.current &&
    drawing.current.id !== drawing.released?.id &&
    editableRevisionStatuses.includes(drawing.current.status);
  const metadataEditable = !!p?.edit && !released;
  const correction = !!p?.correct && (correctRequested || !revisionEditable);
  const allowed = !!drawing && (metadataEditable || revisionEditable || correction);
  return (
    <Shell identity={identity} active="drawings" activePath="/drawings/library">
      <Heading
        eyebrow="Drawing Library"
        title={correction && !revisionEditable ? 'Koreksi metadata' : 'Edit draft'}
        description={
          correction
            ? 'Metadata Final Drawing hanya dapat dikoreksi Admin dengan alasan. Perubahan tercatat pada audit.'
            : 'Lengkapi data dan file drawing. Perubahan tercatat pada jejak aktivitas.'
        }
      />
      {!allowed || !drawing ? (
        <p className="notice error" role="alert">
          Drawing ini tidak dapat diedit oleh Anda pada status sekarang.
        </p>
      ) : (
        <section className="panel">
          <DrawingForm
            mode="edit"
            drawing={drawing}
            masters={await listMasters()}
            maxMb={maxPdfBytes() / 1024 / 1024}
            actor={{ id: identity.id, name: identity.name }}
            metadataEditable={metadataEditable}
            revisionEditable={revisionEditable}
            correction={correction && released}
          />
        </section>
      )}
    </Shell>
  );
}
