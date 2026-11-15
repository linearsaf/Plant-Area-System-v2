import { pageIdentity } from '@plant/server';
import { canDraw } from '@plant/contracts';
import { Shell, Heading } from '@plant/ui';
import { DrawingsSummary } from './summary';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const identity = await pageIdentity('/drawings');
  const action = canDraw(identity, 'drawing.create')
    ? { label: 'Create Drawing', href: '/drawings/new' }
    : canDraw(identity, 'request.create')
      ? { label: 'Drawing Request baru', href: '/drawings/requests/new' }
      : canDraw(identity, 'drawing.legacy_upload')
        ? { label: 'Upload Old Drawing', href: '/drawings/legacy' }
        : null;
  return (
    <Shell identity={identity} active="drawings">
      <Heading
        eyebrow="Drawing Database"
        title="Ringkasan"
        description="Final Drawing, revisi yang sedang diproses, dan tugas yang menunggu tindakan Anda."
      />
      {canDraw(identity, 'read') ? (
        <DrawingsSummary action={action} />
      ) : (
        <p className="notice error" role="alert">
          Akses aplikasi belum diberikan.
        </p>
      )}
    </Shell>
  );
}
