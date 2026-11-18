import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { selectE2e, specAreas } from '../../scripts/e2e-selection';

const specs = readdirSync('tests/e2e')
  .filter((f) => f.endsWith('.spec.ts'))
  .map((f) => `tests/e2e/${f}`)
  .sort();

test('every browser spec in the repository is mapped to the app areas it exercises', () => {
  assert.deepEqual(Object.keys(specAreas).sort(), specs);
});

test('a drawings-only change runs the drawings spec and the cross-app audit', () => {
  const s = selectE2e(['apps/drawings/app/library.tsx', 'packages/drawings-core/src/drawings.ts'], specs);
  assert.equal(s.mode, 'partial');
  assert.deepEqual(s.specs, ['tests/e2e/drawings.spec.ts', 'tests/e2e/ui-audit.spec.ts']);
});

test('shared packages, auth, portal, infra and config run the full suite', () => {
  for (const path of [
    'packages/ui/src/refresh.css',
    'packages/contracts/src/drawings-model.ts',
    'packages/server/src/index.ts',
    'packages/auth-core/src/index.ts',
    'apps/auth/app/page.tsx',
    'apps/portal/app/page.tsx',
    'infra/nginx/nginx.conf',
    'compose.yaml',
    'pnpm-lock.yaml',
    'playwright.config.ts',
    '.github/workflows/ci.yml',
    'scripts/migrate.ts',
  ]) {
    const s = selectE2e([path], specs);
    assert.equal(s.mode, 'full', path);
    assert.deepEqual(s.specs, specs, path);
  }
});

test('an unmapped path runs everything, even next to app-only changes', () => {
  const s = selectE2e(['apps/drawings/app/library.tsx', 'apps/new-app/app/page.tsx'], specs);
  assert.equal(s.mode, 'full');
});

test('documentation and non-browser tests skip the browser suite', () => {
  const s = selectE2e(
    ['docs/PRD-v2.md', 'README.md', 'tests/unit/drawings.test.ts', 'tests/integration/platform.test.ts'],
    specs,
  );
  assert.equal(s.mode, 'none');
  assert.deepEqual(s.specs, []);
});

test('an edited spec runs itself; an unknown change set runs everything', () => {
  const edited = selectE2e(['tests/e2e/theme.spec.ts'], specs);
  assert.equal(edited.mode, 'partial');
  assert.deepEqual(edited.specs, ['tests/e2e/theme.spec.ts']);
  assert.equal(selectE2e([], specs).mode, 'full');
});

test('a spec added without a mapping is never skipped', () => {
  const s = selectE2e(['apps/consumables/app/page.tsx'], [...specs, 'tests/e2e/new-flow.spec.ts']);
  assert.equal(s.mode, 'partial');
  assert.ok(s.specs.includes('tests/e2e/new-flow.spec.ts'));
  assert.ok(s.specs.includes('tests/e2e/consumables.spec.ts'));
  assert.ok(!s.specs.includes('tests/e2e/drawings.spec.ts'));
});
