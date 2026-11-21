// Drawing Database end-to-end (PRD §11) against the isolated test deployment only.
// Covers access, the full approval path with stamp, legacy Final Drawing for Viewer, requests,
// file headers/CSP through the HTTPS gateway, and the UI in light/dark at 390 and 1440 px.
import { test, expect, request as requests, type APIRequestContext, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { PDFDocument, StandardFonts, degrees } from '@cantoo/pdf-lib';
import sharp from 'sharp';
import { createUser, setAppGrant, changePassword, updateUserAccess, closeAuthDb } from '@plant/auth-core';
import type { DrawingsRole, Identity } from '@plant/contracts';

const origin = process.env.PUBLIC_ORIGIN!;
const suffix = randomUUID().slice(0, 8);
const password = 'Drawings-e2e-password-2026';
type Person = { id: string; email: string; role: DrawingsRole; api: APIRequestContext };
const people: Partial<
  Record<'admin' | 'viewer' | 'drafter' | 'leader' | 'approver' | 'head' | 'outsider', Person>
> = {};
const operator: Identity = {
  id: randomUUID(),
  name: 'Drawings E2E',
  email: `drawings-e2e-${suffix}@example.test`,
  position: '',
  portalAdmin: true,
  mustChangePassword: false,
  grants: [],
};
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
async function pdf(label: string, rotate = 0) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([1191, 842]);
  page.drawText(`${label} PUMP-HOUSE`, { x: 80, y: 700, size: 36, font });
  if (rotate) page.setRotation(degrees(rotate));
  return Buffer.from(await doc.save());
}
async function signIn(email: string) {
  const api = await requests.newContext({ baseURL: origin, ignoreHTTPSErrors: true });
  const r = await api.post('/auth/api/sign-in/email', { headers: { origin }, data: { email, password } });
  expect(r.ok(), await r.text()).toBeTruthy();
  return api;
}
const post = (api: APIRequestContext, path: string, data: unknown, key = randomUUID()) =>
  api.post('/drawings/api/' + path, { headers: { origin, 'Idempotency-Key': key }, data });
const json = async (api: APIRequestContext, path: string) => (await api.get('/drawings/api/' + path)).json();
const version = async (api: APIRequestContext, id: string) =>
  (await json(api, `drawings/${id}`)).version as number;
async function upload(
  api: APIRequestContext,
  kind: 'pdf' | 'image',
  data: Buffer,
  name: string,
  type = kind === 'pdf' ? 'application/pdf' : 'image/png',
) {
  const r = await api.post('/drawings/api/uploads?kind=' + kind, {
    headers: {
      origin,
      'Content-Type': type,
      'X-File-Name': name,
    },
    data,
  });
  expect(r.status(), await r.text()).toBe(201);
  return (await r.json()).fileId as string;
}
async function login(page: Page, person: Person, theme: 'light' | 'dark' = 'light') {
  await page.addInitScript((t) => localStorage.setItem('plant-ui-theme', t), theme);
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill(person.email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /^Masuk/ }).click();
  await page.waitForURL((u) => u.pathname === '/');
  // Let the Portal finish its summary/activity requests; WebKit reports requests cut off by the next
  // navigation as page errors, which watchCsp would count as violations.
  await page.waitForLoadState('networkidle');
}
function watchCsp(page: Page) {
  const violations: string[] = [];
  page.on(
    'console',
    (m) => /Content Security Policy|Refused to/i.test(m.text()) && violations.push(m.text()),
  );
  page.on('pageerror', (e) => violations.push(e.message));
  return violations;
}

let discipline: string,
  legacy: { id: string; revisionId: string },
  released: { id: string; revisionId: string };

test.beforeAll(async () => {
  const temporary = 'Drawings-temporary-2026';
  const roles: [keyof typeof people, DrawingsRole | null][] = [
    ['admin', 'admin'],
    ['viewer', 'viewer'],
    ['drafter', 'drafter'],
    ['leader', 'leader'],
    ['approver', 'approver'],
    ['head', 'head'],
    ['outsider', null],
  ];
  for (const [key, role] of roles) {
    const email = `drawings-${key}-${suffix}@example.test`;
    const { id } = await createUser(operator, { name: `E2E ${key} ${suffix}`, email, password: temporary });
    if (key === 'admin') await updateUserAccess(operator, id, { active: true, portalAdmin: true });
    if (role) await setAppGrant(operator, id, 'drawings', { appId: 'drawings', role });
    await changePassword({ ...operator, id }, temporary, password);
    people[key] = { id, email, role: role ?? 'viewer', api: await signIn(email) };
  }
  await closeAuthDb();
  const masters = await json(people.admin!.api, 'masters');
  discipline = masters.disciplines.find((d: { active: boolean }) => d.active).id;
});
test.afterAll(async () => {
  for (const p of Object.values(people)) await p?.api.dispose();
});

test('access: no grant is 403 on pages and API; forged identity headers are ignored', async () => {
  const outsider = people.outsider!.api;
  expect((await outsider.get('/drawings', { maxRedirects: 0 })).status()).toBe(403);
  expect((await outsider.get('/drawings/api/me')).status()).toBe(403);
  const anonymous = await requests.newContext({ baseURL: origin, ignoreHTTPSErrors: true });
  expect(
    (
      await anonymous.get('/drawings/api/me', { headers: { 'x-user-id': 'forged', 'x-user-role': 'admin' } })
    ).status(),
  ).toBe(401);
  expect((await anonymous.get('/drawings', { maxRedirects: 0 })).status()).toBe(303);
  for (const closed of [
    '/drawings/internal/x',
    '/drawings/health/ready',
    '/auth/internal/directory?app=drawings',
  ])
    expect((await anonymous.get(closed, { maxRedirects: 0 })).status(), closed).toBe(404);
  await anonymous.dispose();
});

test('legacy Final Drawing is visible, printable and downloadable for Viewer', async () => {
  const leader = people.leader!.api;
  const fileId = await upload(leader, 'pdf', await pdf('Legacy'), 'legacy.pdf');
  const r = await post(leader, 'drawings/legacy', {
    number: `OLD-${suffix}`,
    title: 'Legacy conveyor',
    hac: '421-BF1',
    disciplineId: discipline,
    revisionNo: 'C',
    ownerId: people.drafter!.id,
    legacyNote: 'Arsip scan',
    fileId,
  });
  expect(r.status(), await r.text()).toBe(201);
  legacy = await r.json();
  const viewer = people.viewer!.api;
  const download = await viewer.get(
    `/drawings/api/revisions/${legacy.revisionId}/file?intent=download&disposition=attachment`,
  );
  expect(download.status()).toBe(200);
  expect(download.headers()['content-disposition']).toContain(`OLD-${suffix}_Rev-C.pdf`);
  expect(download.headers()['content-encoding']).toBeUndefined();
  expect(download.headers()['cache-control']).toContain('no-store');
  const ranged = await viewer.get(`/drawings/api/revisions/${legacy.revisionId}/file`, {
    headers: { Range: 'bytes=0-4' },
  });
  expect(ranged.status()).toBe(206);
  expect(await ranged.text()).toBe('%PDF-');
  expect(
    (
      await viewer.get(`/drawings/api/revisions/${legacy.revisionId}/file`, {
        headers: { Range: 'bytes=999999999-' },
      })
    ).status(),
  ).toBe(416);
  const detail = await json(viewer, `drawings/${legacy.id}`);
  expect(detail.source).toBe('legacy');
  expect(detail.workflow.actions).toHaveLength(0);
});

test('upload rejects non-PDF, SVG and oversize; gateway sends the /drawings CSP', async () => {
  const drafter = people.drafter!.api;
  const fake = await drafter.post('/drawings/api/uploads?kind=pdf', {
    headers: { origin, 'Content-Type': 'application/pdf', 'X-File-Name': 'x.pdf' },
    data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  });
  expect(fake.status()).toBe(422);
  // Images are request/review attachments: Drafter cannot create requests (PRD matrix), so 403.
  const svgHeaders = { origin, 'Content-Type': 'image/svg+xml', 'X-File-Name': 'x.svg' };
  const denied = await drafter.post('/drawings/api/uploads?kind=image', {
    headers: svgHeaders,
    data: '<svg/>',
  });
  expect(denied.status()).toBe(403);
  // A role allowed to attach images still cannot upload SVG.
  const svg = await people.viewer!.api.post('/drawings/api/uploads?kind=image', {
    headers: svgHeaders,
    data: '<svg/>',
  });
  expect(svg.status()).toBe(415);
  const big = await drafter.post('/drawings/api/uploads?kind=pdf', {
    headers: { origin, 'Content-Type': 'application/pdf', 'X-File-Name': 'big.pdf' },
    data: Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(26 * 1024 * 1024, 32)]),
  });
  expect(big.status()).toBe(413);
  const page = await drafter.get('/drawings');
  const csp = page.headers()['content-security-policy'] ?? '';
  expect(csp).toContain("'wasm-unsafe-eval'");
  expect(csp).toContain("worker-src 'self' blob:");
  expect(page.headers()['x-frame-options']).toContain('DENY');
  expect(page.headers()['strict-transport-security']).toBeTruthy();
});

test('full approval path with Final Approval, reject at Check, maker-checker and stamp', async () => {
  const { drafter, leader, approver, head, admin, viewer } = people as Required<typeof people>;
  const fileId = await upload(drafter.api, 'pdf', await pdf('Released', 90), 'released.pdf');
  const created = await post(drafter.api, 'drawings', {
    number: `DWG-${suffix}`,
    title: 'Pump house',
    hac: '561-BF1',
    disciplineId: discipline,
    fileId,
  });
  expect(created.status()).toBe(201);
  released = await created.json();
  const v = () => version(admin.api, released.id);
  const rev = released.revisionId;
  expect((await post(drafter.api, `revisions/${rev}/submit`, { expectedVersion: await v() })).status()).toBe(
    200,
  );
  const image = await upload(leader.api, 'image', png, 'markup.png');
  expect(
    (
      await post(leader.api, `revisions/${rev}/check`, {
        expectedVersion: await v(),
        decision: 'reject',
        note: 'Skala',
        attachmentIds: [image],
      })
    ).status(),
  ).toBe(200);
  expect((await post(drafter.api, `revisions/${rev}/submit`, { expectedVersion: await v() })).status()).toBe(
    200,
  );
  const maker = await post(leader.api, `revisions/${rev}/check`, {
    expectedVersion: await v(),
    decision: 'approve',
    approverL1Id: drafter.id,
  });
  expect([400, 403]).toContain(maker.status());
  expect(
    (
      await post(leader.api, `revisions/${rev}/check`, {
        expectedVersion: await v(),
        decision: 'approve',
        approverL1Id: approver.id,
        approverL2Id: head.id,
      })
    ).status(),
  ).toBe(200);
  const notAssignee = await post(admin.api, `revisions/${rev}/approve-l1`, {
    expectedVersion: await v(),
    decision: 'approve',
  });
  expect(notAssignee.status()).toBe(403);
  expect(
    (
      await post(approver.api, `revisions/${rev}/approve-l1`, {
        expectedVersion: await v(),
        decision: 'approve',
      })
    ).status(),
  ).toBe(200);
  const stale = await post(head.api, `revisions/${rev}/approve-l2`, {
    expectedVersion: 1,
    decision: 'approve',
  });
  expect(stale.status()).toBe(409);
  expect(
    (
      await post(head.api, `revisions/${rev}/approve-l2`, { expectedVersion: await v(), decision: 'approve' })
    ).status(),
  ).toBe(200);
  const detail = await json(viewer.api, `drawings/${released.id}`);
  expect(detail.released.status).toBe('completed');
  expect((await viewer.api.get(`/drawings/api/revisions/${rev}/file?intent=print`)).status()).toBe(200);
  expect((await json(drafter.api, `drawings/${released.id}`)).workflow.actions).toHaveLength(4);
  const notes = await json(drafter.api, 'notifications');
  expect(notes.items.some((n: { kind: string }) => n.kind === 'drawing.completed')).toBeTruthy();
  expect((await viewer.api.get(`/drawings/api/attachments/${image}`)).status()).toBe(404);
});

test('admin maker-checker: Admin cannot check a drawing they created', async () => {
  const admin = people.admin!.api;
  const fileId = await upload(admin, 'pdf', await pdf('Admin'), 'admin.pdf');
  const d = await (
    await post(admin, 'drawings', {
      number: `ADM-${suffix}`,
      title: 'Admin',
      hac: 'H',
      disciplineId: discipline,
      fileId,
    })
  ).json();
  await post(admin, `revisions/${d.revisionId}/submit`, { expectedVersion: await version(admin, d.id) });
  const r = await post(admin, `revisions/${d.revisionId}/check`, {
    expectedVersion: await version(admin, d.id),
    decision: 'approve',
    approverL1Id: people.approver!.id,
  });
  expect(r.status()).toBe(403);
  expect((await r.json()).code).toBe('MAKER_CHECKER');
});

test('drawing request closes when its drawing is released', async () => {
  const { viewer, leader, drafter, approver } = people as Required<typeof people>;
  const created = await post(viewer.api, 'requests', {
    hac: 'L61-BF1',
    description: 'Request E2E',
    purpose: 'Overhaul',
  });
  expect(created.status()).toBe(201);
  const { id, number } = await created.json();
  expect(number).toMatch(/^DRQ-\d{4}-\d{6}$/);
  const rv = async () => (await json(leader.api, `requests/${id}`)).version;
  expect(
    (
      await post(leader.api, `requests/${id}/review`, {
        expectedVersion: await rv(),
        decision: 'assign',
        drafterId: drafter.id,
      })
    ).status(),
  ).toBe(200);
  const accepted = await (
    await post(drafter.api, `requests/${id}/drafter-decision`, {
      expectedVersion: await rv(),
      decision: 'accept',
    })
  ).json();
  const drawingId = accepted.drawingId as string;
  const fileId = await upload(drafter.api, 'pdf', await pdf('Request'), 'request.pdf');
  const patched = await drafter.api.patch(`/drawings/api/drawings/${drawingId}`, {
    headers: { origin },
    data: {
      expectedVersion: await version(drafter.api, drawingId),
      number: `REQ-${suffix}`,
      title: 'Dari request',
      disciplineId: discipline,
      fileId,
    },
  });
  expect(patched.status(), await patched.text()).toBe(200);
  const revisionId = (await json(drafter.api, `drawings/${drawingId}`)).current.id;
  await post(drafter.api, `revisions/${revisionId}/submit`, {
    expectedVersion: await version(drafter.api, drawingId),
  });
  await post(leader.api, `revisions/${revisionId}/check`, {
    expectedVersion: await version(leader.api, drawingId),
    decision: 'approve',
    approverL1Id: approver.id,
  });
  await post(approver.api, `revisions/${revisionId}/approve-l1`, {
    expectedVersion: await version(approver.api, drawingId),
    decision: 'approve',
  });
  const request = await json(viewer.api, `requests/${id}`);
  expect(request.status).toBe('closed');
  expect(request.closeReason).toBe('Drawing terbit');
});

for (const [width, theme] of [
  [1440, 'light'],
  [390, 'dark'],
] as const)
  test(`UI ${width}px ${theme}: viewer library, detail and in-page PDF viewer without CSP violations`, async ({
    page,
  }) => {
    const violations = watchCsp(page);
    await page.setViewportSize({ width, height: 900 });
    // OS scheme opposite to the app theme: pdf_viewer.css once forced light-dark() onto the shell.
    await page.emulateMedia({ colorScheme: theme === 'light' ? 'dark' : 'light' });
    await login(page, people.viewer!, theme);
    await page.goto('/drawings/library');
    // By role: a streamed, still-hidden copy of the page can briefly share the placeholder.
    await page.getByRole('searchbox', { name: 'Cari', exact: true }).fill(`DWG-${suffix}`);
    await page
      .getByRole('link', { name: `DWG-${suffix}` })
      .first()
      .click();
    await expect(page.locator('.pdfViewer .page canvas').first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('link', { name: 'Download' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Jejak aktivitas' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    // pdfjs global `.sidebar` / `:root` rules must not leak into the shell.
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(theme);
    if (width > 767)
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('.sidebar')!).position)).toBe(
        'sticky',
      );
    // Toolbar controls never overlap each other.
    expect(
      await page.evaluate(() => {
        const r = [...document.querySelectorAll('.pdf-toolbar :is(button, input, select, a)')].map((e) =>
          e.getBoundingClientRect(),
        );
        return r.some((a, i) =>
          r
            .slice(i + 1)
            .some(
              (b) =>
                a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1,
            ),
        );
      }),
    ).toBe(false);
    expect(violations).toEqual([]);
  });

test('UI: leader review room and approver tasks badge', async ({ page }) => {
  const { drafter, leader, admin } = people as Required<typeof people>;
  const fileId = await upload(drafter.api, 'pdf', await pdf('Review'), 'review.pdf');
  const d = await (
    await post(drafter.api, 'drawings', {
      number: `RV-${suffix}`,
      title: 'Review',
      hac: 'H',
      disciplineId: discipline,
      fileId,
    })
  ).json();
  await post(drafter.api, `revisions/${d.revisionId}/submit`, {
    expectedVersion: await version(admin.api, d.id),
  });
  const violations = watchCsp(page);
  await login(page, leader);
  await page.goto('/drawings/tasks');
  await expect(page.getByRole('heading', { name: /Waiting Check/ })).toBeVisible();
  await page.goto(`/drawings/library/${d.id}/review`);
  await expect(page.locator('.pdfViewer canvas').first()).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Tolak', exact: true }).click();
  await page.getByLabel(/Catatan/).fill('Perbaiki notasi');
  await page.getByRole('button', { name: 'Tolak Check' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Tolak' }).click();
  await page.waitForURL(new RegExp(`/drawings/library/${d.id}$`));
  await expect(page.locator('.drawing-status[data-status=check_rejected]').first()).toBeVisible();
  expect(violations).toEqual([]);
});

test('request images: 10 photos are compressed to webp with thumbnails; the 11th is refused', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const { viewer } = people as Required<typeof people>;
  const photos = await Promise.all(
    Array.from({ length: 11 }, async (_, i) => ({
      name: `sudut-${i + 1}.jpg`,
      mimeType: 'image/jpeg',
      buffer: await sharp({
        create: { width: 3000, height: 2000, channels: 3, background: { r: 20 * i, g: 120, b: 90 } },
      })
        .jpeg({ quality: 92 })
        .toBuffer(),
    })),
  );
  const violations = watchCsp(page);
  await login(page, viewer);
  await page.goto('/drawings/requests/new');
  await page.getByLabel('HAC/SAC').fill('L61-BF1');
  await page.getByLabel('Description').fill('Foto dari 11 sudut');
  await page.getByLabel('Keperluan').fill('Referensi drafter');
  const input = page.locator('input[type=file]');
  await input.setInputFiles(photos);
  await expect(page.getByRole('main').locator('.notice[role="alert"]')).toContainText('Maksimal 10 gambar.');
  await expect(page.locator('.attachment-list img')).toHaveCount(10, { timeout: 60000 });
  for (const src of await page
    .locator('.attachment-list img')
    .evaluateAll((els) => els.map((e) => e.getAttribute('src'))))
    expect(src).toMatch(/\?variant=thumb$/);
  await page.getByRole('button', { name: 'Kirim request' }).click();
  await page.waitForURL(/\/drawings\/requests\/[0-9a-f-]{36}$/);
  const thumbs = page.locator('.attachment-list img');
  await expect(thumbs).toHaveCount(10);
  const src = (await thumbs.first().getAttribute('src'))!;
  expect(src).toMatch(/^\/drawings\/api\/attachments\/[0-9a-f-]{36}\?variant=thumb$/);
  const full = await viewer.api.get(src.replace('?variant=thumb', ''));
  expect(full.headers()['content-type']).toBe('image/webp');
  expect(full.headers()['cache-control']).toBe('private, no-cache, no-transform');
  const meta = await sharp(Buffer.from(await full.body())).metadata();
  expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(2560);
  expect(violations).toEqual([]);
});

test('If-None-Match does not bypass permission on request images', async () => {
  const { viewer, drafter } = people as Required<typeof people>;
  const image = await upload(
    viewer.api,
    'image',
    await sharp({ create: { width: 800, height: 600, channels: 3, background: '#4a7' } })
      .webp()
      .toBuffer(),
    'izin.webp',
    'image/webp',
  );
  const created = await post(viewer.api, 'requests', {
    hac: 'L61-BF1',
    description: 'Izin gambar',
    purpose: 'Uji cache',
    imageIds: [image],
  });
  expect(created.status()).toBe(201);
  const ok = await viewer.api.get(`/drawings/api/attachments/${image}?variant=thumb`);
  expect(ok.status()).toBe(200);
  const etag = ok.headers()['etag'];
  const again = await viewer.api.get(`/drawings/api/attachments/${image}?variant=thumb`, {
    headers: { 'If-None-Match': etag },
  });
  expect(again.status()).toBe(304);
  // Drafter belum ditugaskan ke request ini: ETag yang benar tetap 404.
  const denied = await drafter.api.get(`/drawings/api/attachments/${image}?variant=thumb`, {
    headers: { 'If-None-Match': etag },
  });
  expect(denied.status()).toBe(404);
});
