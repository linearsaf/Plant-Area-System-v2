import { notFound } from 'next/navigation';
import { pageIdentity } from '@plant/server';
import { AppError, canDraw } from '@plant/contracts';
import { Shell, Heading } from '@plant/ui';
import { requestDetail } from '@plant/drawings-core';
import { RequestView } from '../../requests-ui';
export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await pageIdentity(`/drawings/requests/${id}`);
  if (!canDraw(identity, 'read')) notFound();
  const request = await requestDetail(identity, id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  return (
    <Shell identity={identity} active="drawings" activePath="/drawings/requests">
      <Heading eyebrow="Drawing Requests" title={request.number} description={`HAC/SAC ${request.hac}`}>
        <a className="button secondary" href="/drawings/requests">
          Kembali ke daftar
        </a>
      </Heading>
      <RequestView request={request} />
    </Shell>
  );
}
