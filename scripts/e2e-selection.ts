// Chooses which browser specs a change needs. Pure function: CI passes the changed paths and the
// spec files that exist; scripts/select-e2e.ts does the git and GitHub Actions plumbing.
//
// Fail-safe rules:
// - A changed path that matches no rule below runs the full suite. A new app, package or config
//   file is therefore tested in full until someone maps it.
// - A spec that is missing from `specAreas` runs on every partial selection.
// - The full suite still runs on main, on manual runs, and whenever the change set is unknown.

export type Area = 'bag-filter' | 'consumables' | 'drawings';

/** Code owned by a single app. A change here only needs that app's specs. */
const areaPaths: Record<Area, RegExp[]> = {
  'bag-filter': [/^apps\/bag-filter\//, /^packages\/bag-core\//],
  consumables: [/^apps\/consumables\//, /^packages\/consumables-core\//],
  drawings: [/^apps\/drawings\//, /^packages\/drawings-core\//],
};

/** Paths that cannot change what a browser sees. Unit and integration tests still run for them. */
const noBrowserImpact: RegExp[] = [
  /^docs\//,
  /^graphify-out\//,
  /^tests\/unit\//,
  /^tests\/integration\//,
  /^[^/]+\.md$/,
  /^\.graphifyignore$/,
  /^\.prettierrc\.json$/,
  /^\.prettierignore$/,
];

/**
 * App areas each spec exercises, from the routes it opens. Shared code (packages/ui, contracts,
 * server, auth-core, the auth and portal apps, infra, build and test config) is not listed: any
 * change there falls through to the full suite.
 */
export const specAreas: Record<string, Area[]> = {
  'tests/e2e/bag-bulk-selection.spec.ts': ['bag-filter'],
  'tests/e2e/bag-cancellation.spec.ts': ['bag-filter'],
  'tests/e2e/bag-map.spec.ts': ['bag-filter'],
  'tests/e2e/menu-focus.spec.ts': ['bag-filter'],
  'tests/e2e/platform.spec.ts': ['bag-filter'],
  'tests/e2e/theme.spec.ts': ['bag-filter'],
  'tests/e2e/consumables.spec.ts': ['consumables'],
  'tests/e2e/consumables-ui.spec.ts': ['consumables', 'bag-filter'],
  'tests/e2e/ui-interactions.spec.ts': ['bag-filter', 'consumables'],
  'tests/e2e/ui-audit.spec.ts': ['bag-filter', 'consumables', 'drawings'],
  'tests/e2e/drawings.spec.ts': ['drawings'],
};

export type Selection =
  | { mode: 'full'; specs: string[]; reasons: string[] }
  | { mode: 'partial'; specs: string[]; areas: Area[]; reasons: string[] }
  | { mode: 'none'; specs: string[]; reasons: string[] };

const specPattern = /^tests\/e2e\/[^/]+\.spec\.ts$/;

export function selectE2e(changed: string[], existingSpecs: string[]): Selection {
  const all = [...existingSpecs].sort();
  if (!changed.length) return { mode: 'full', specs: all, reasons: ['Daftar file yang berubah kosong.'] };
  const areas = new Set<Area>();
  const direct = new Set<string>();
  const reasons: string[] = [];
  for (const raw of changed) {
    const path = raw.replaceAll('\\', '/');
    if (noBrowserImpact.some((r) => r.test(path))) continue;
    const area = (Object.keys(areaPaths) as Area[]).find((a) => areaPaths[a].some((r) => r.test(path)));
    if (area) {
      areas.add(area);
      continue;
    }
    if (specPattern.test(path)) {
      if (all.includes(path)) direct.add(path);
      continue;
    }
    return { mode: 'full', specs: all, reasons: [`${path} dipakai bersama atau belum dipetakan.`] };
  }
  if (!areas.size && !direct.size)
    return { mode: 'none', specs: [], reasons: ['Perubahan tidak menyentuh kode yang diuji browser.'] };
  const specs = all.filter(
    (spec) => direct.has(spec) || !specAreas[spec] || specAreas[spec].some((a) => areas.has(a)),
  );
  if (areas.size) reasons.push(`Area berubah: ${[...areas].sort().join(', ')}.`);
  if (direct.size) reasons.push(`Spec diubah langsung: ${[...direct].sort().join(', ')}.`);
  const unmapped = all.filter((s) => !specAreas[s]);
  if (unmapped.length) reasons.push(`Spec belum dipetakan selalu ikut: ${unmapped.join(', ')}.`);
  return { mode: 'partial', specs, areas: [...areas].sort(), reasons };
}
