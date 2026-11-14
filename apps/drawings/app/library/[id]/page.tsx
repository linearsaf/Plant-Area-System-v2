import { notFound } from 'next/navigation';
import { pageIdentity } from '@plant/server';
import { AppError, canDraw } from '@plant/contracts';
import { Shell, Heading } from '@plant/ui';
import { drawingDetail } from '@plant/drawings-core';
import { DrawingView } from '../../drawing-view';
import { LegacyBadge, StatusBadge } from '../../status-badge';
export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await pageIdentity(`/drawings/library/${id}`);
  if (!canDraw(identity, 'read'))
    return (
      <Shell identity={identity} active="drawings" activePath="/drawings/library">
        <p className="notice error" role="alert">
          Akses aplikasi belum diberikan.
        </p>
      </Shell>
    );
  const drawing = await drawingDetail(identity, id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  const shown = drawing.released ?? drawing.current;
  return (
    <Shell identity={identity} active="drawings" activePath="/drawings/library">
      <Heading
        eyebrow="Drawing Library"
        title={drawing.number || 'Drawing tanpa nomor'}
        description={drawing.title || 'Nama drawing belum diisi.'}
      >
        <span className="detail-actions">
          {shown && <StatusBadge status={shown.status} />}
          {drawing.source === 'legacy' && <LegacyBadge />}
        </span>
      </Heading>
      <DrawingView drawing={drawing} />
    </Shell>
  );
}
