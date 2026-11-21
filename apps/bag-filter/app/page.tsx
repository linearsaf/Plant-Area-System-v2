import { pageIdentity } from '@plant/server';
import { Shell, Heading, Dashboard } from '@plant/ui';
export const dynamic = 'force-dynamic';
export default async function BagFilter() {
  const identity = await pageIdentity('/bag-filter'),
    grant = identity.grants.find((g) => g.appId === 'bag-filter');
  return (
    <Shell identity={identity} active="bag-filter">
      {grant ? (
        <Dashboard equipmentCodes={grant.equipment} />
      ) : (
        <>
          <Heading
            eyebrow="EQUIPMENT PROCESS / BAG FILTER"
            title="Bag Filter"
            description="Pantau umur bag dan telusuri penggantian di setiap koordinat."
          />
          <section className="panel">
            <h2>Akses belum diberikan</h2>
            <p>Hubungi admin portal untuk akses Bag Filter.</p>
          </section>
        </>
      )}
      {grant?.role === 'admin' && (
        <div className="section-title">
          <a className="badge" href="/bag-filter/audit">
            Lihat audit aplikasi ↗
          </a>
        </div>
      )}
    </Shell>
  );
}
