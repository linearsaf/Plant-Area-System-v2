import { pageIdentity } from '@plant/server';
import { canDraw } from '@plant/contracts';
import { Shell, Heading } from '@plant/ui';
import { RequestForm } from '../../requests-ui';
export const dynamic = 'force-dynamic';

export default async function Page() {
  const identity = await pageIdentity('/drawings/requests/new');
  return (
    <Shell identity={identity} active="drawings" activePath="/drawings/requests">
      <Heading
        eyebrow="Drawing Requests"
        title="Drawing Request baru"
        description="Ajukan drawing baru. Draft Leader meninjau lalu menugaskan ke Drafter."
      />
      {canDraw(identity, 'request.create') ? (
        <section className="panel">
          <RequestForm />
        </section>
      ) : (
        <p className="notice error" role="alert">
          Role Anda tidak dapat membuat Drawing Request.
        </p>
      )}
    </Shell>
  );
}
