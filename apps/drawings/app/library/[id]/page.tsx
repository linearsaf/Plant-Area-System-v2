import { notFound } from 'next/navigation';
import { fetchDirectory, pageIdentity } from '@plant/server';
import { AppError, canDraw } from '@plant/contracts';
import { Shell } from '@plant/ui';
import { drawingDetail } from '@plant/drawings-core';
import { DrawingTitle } from '../../drawing-title';
import { DrawingView } from '../../drawing-view';
import { DrawingStatusBadge, LegacyBadge } from '../../status-badge';
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
  const drawing = await drawingDetail(identity, id, await fetchDirectory('drawings').catch(() => null)).catch(
    (e) => {
      if (e instanceof AppError && e.status === 404) notFound();
      throw e;
    },
  );
  const shown = drawing.released ?? drawing.current;
  // Revisi yang berlaku ikut di baris nomor, sehingga terjawab sebelum viewer.
  const number = drawing.number || 'Drawing tanpa nomor';
  return (
    <Shell identity={identity} active="drawings" activePath="/drawings/library">
      <DrawingTitle
        name={drawing.title || null}
        number={shown ? `${number} · Rev ${shown.revisionNo}` : number}
      >
        <span className="detail-actions">
          {drawing.released && !drawing.voided ? (
            <span className="badge success">Final Drawing berlaku</span>
          ) : (
            shown && <DrawingStatusBadge status={shown.status} voided={!!drawing.voided} />
          )}
          {drawing.source === 'legacy' && <LegacyBadge />}
        </span>
      </DrawingTitle>
      <DrawingView drawing={drawing} />
    </Shell>
  );
}
