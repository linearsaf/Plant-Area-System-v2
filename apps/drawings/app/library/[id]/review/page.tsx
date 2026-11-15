import { notFound } from 'next/navigation';
import { fetchDirectory, pageIdentity } from '@plant/server';
import { AppError, canDraw } from '@plant/contracts';
import { Shell, Heading } from '@plant/ui';
import { drawingDetail } from '@plant/drawings-core';
import { ReviewPanel } from '../../../review-panel';
export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await pageIdentity(`/drawings/library/${id}/review`);
  const drawing = canDraw(identity, 'read')
    ? await drawingDetail(identity, id, await fetchDirectory('drawings').catch(() => null)).catch((e) => {
        if (e instanceof AppError && e.status === 404) notFound();
        throw e;
      })
    : null;
  const a = drawing?.workflow.available;
  const allowed = !!drawing?.current && !!a && (a.check || a.approveL1 || a.approveL2);
  return (
    <Shell identity={identity} active="drawings" activePath="/drawings/tasks">
      <Heading
        eyebrow="Ruang tinjau"
        title={drawing ? (drawing.number ?? 'Drawing tanpa nomor') : 'Ruang tinjau'}
        description={drawing?.title ?? ''}
      >
        {drawing && (
          <a className="button secondary" href={`/drawings/library/${drawing.id}`}>
            Kembali ke detail
          </a>
        )}
      </Heading>
      {allowed && drawing ? (
        <ReviewPanel drawing={drawing} />
      ) : (
        <p className="notice error" role="alert">
          {drawing?.workflow.available.makerBlocked
            ? 'Anda owner, pembuat atau pengirim revisi ini, sehingga tidak dapat memutus (maker-checker).'
            : 'Tidak ada keputusan yang menunggu Anda pada drawing ini.'}
        </p>
      )}
    </Shell>
  );
}
