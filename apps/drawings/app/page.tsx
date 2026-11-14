import { pageIdentity } from '@plant/server';
import { canDraw, drawingsRole, drawingsRoleLabels } from '@plant/contracts';
import { Shell, Heading, EmptyState } from '@plant/ui';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const identity = await pageIdentity('/drawings');
  const role = drawingsRole(identity);
  return (
    <Shell identity={identity} active="drawings">
      <Heading
        eyebrow="Drawing Database"
        title="Ringkasan"
        description="Final Drawing, revisi yang sedang diproses, dan tugas yang menunggu tindakan Anda."
      />
      {canDraw(identity, 'read') && role ? (
        <section className="panel" aria-label="Ringkasan Drawing Database">
          <p className="fine">
            Role Anda: <strong>{drawingsRoleLabels[role]}</strong>
          </p>
          <EmptyState
            title="Belum ada Final Drawing"
            description="Drawing yang sudah terbit akan tampil di sini beserta ringkasan revisi dan tugas."
          />
        </section>
      ) : (
        <p className="notice error" role="alert">
          Akses aplikasi belum diberikan.
        </p>
      )}
    </Shell>
  );
}
