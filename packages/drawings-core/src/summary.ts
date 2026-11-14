// Ringkasan (PRD §9), kartu Portal, lonceng aktivitas dan pencarian cepat shell (Fase 5).
import { and, desc, eq, gte, isNotNull, isNull, like, lt, ne, or, sql } from 'drizzle-orm';
import {
  AppError,
  canDraw,
  canSeeWip,
  drawingsPermission,
  requestScopes,
  wibWeekStarts,
  wibYear,
  type DrawingsDashboard,
  type Identity,
  type NotificationItem,
  type PortalSummary,
} from '@plant/contracts';
import { drawings, notifications, requests, revisions } from './schema';
import { db, likeEscape } from './support';
import { listTasks } from './approval';
import type { DirectoryPerson } from './drawings';

const WIB = 7 * 3_600_000;
const yearStart = (year: number) => new Date(Date.UTC(year, 0, 1) - WIB);
const n = (v: unknown) => Number(v ?? 0);

/** Cakupan WIP yang boleh dihitung actor: semua, milik sendiri, atau tidak ada (viewer). */
function wipScope(actor: Identity) {
  if (canSeeWip(actor, { ownerId: '' })) return 'all' as const;
  return drawingsPermission(actor, 'wip.read') === 'own' ? ('own' as const) : null;
}
async function counts(actor: Identity) {
  const scope = wipScope(actor);
  const active = isNull(drawings.voidedAt);
  const [final] = await db()
    .select({ n: sql<number>`COUNT(*)` })
    .from(drawings)
    .where(and(active, isNotNull(drawings.releasedRevisionId)));
  if (!scope) return { final: n(final.n), inProgress: null, rejected: null };
  const [wip] = await db()
    .select({
      total: sql<number>`COUNT(*)`,
      rejected: sql<number>`COALESCE(SUM(${revisions.status} LIKE '%\\_rejected'), 0)`,
    })
    .from(drawings)
    .innerJoin(revisions, eq(revisions.id, drawings.currentRevisionId))
    .where(
      and(
        active,
        or(isNull(drawings.releasedRevisionId), ne(drawings.currentRevisionId, drawings.releasedRevisionId)),
        scope === 'own' ? eq(drawings.ownerId, actor.id) : undefined,
      ),
    );
  return { final: n(final.n), inProgress: n(wip.total), rejected: n(wip.rejected) };
}

/** Rilis Final Drawing (revisi Completed, termasuk Obsolete kemudian) dalam rentang waktu. */
async function releases(from: Date, to: Date) {
  return db()
    .select({
      completedAt: revisions.completedAt,
      legacy: sql<number>`(${drawings.source} = 'legacy' AND ${revisions.cycle} = 0)`,
    })
    .from(revisions)
    .innerJoin(drawings, eq(drawings.id, revisions.drawingId))
    .where(
      and(
        isNull(drawings.voidedAt),
        isNotNull(revisions.completedAt),
        gte(revisions.completedAt, from),
        lt(revisions.completedAt, to),
      ),
    );
}
async function recentReleases(limit: number) {
  return db()
    .select({ d: drawings, revisionNo: revisions.revisionNo, cycle: revisions.cycle })
    .from(drawings)
    .innerJoin(revisions, eq(revisions.id, drawings.releasedRevisionId))
    .where(isNull(drawings.voidedAt))
    .orderBy(desc(drawings.releasedAt), desc(drawings.id))
    .limit(limit);
}

export async function drawingsDashboard(
  actor: Identity,
  yearValue: number | undefined,
  people: DirectoryPerson[] | null,
): Promise<DrawingsDashboard> {
  if (!canDraw(actor, 'read')) throw new AppError(403, 'Akses Drawing Database belum diberikan.');
  const currentYear = wibYear();
  const year = yearValue ?? currentYear;
  if (!Number.isInteger(year) || year < 2000 || year > currentYear)
    throw new AppError(400, 'Tahun tidak valid.');
  const [c, rows, recent, tasks] = await Promise.all([
    counts(actor),
    releases(yearStart(year), yearStart(year + 1)),
    recentReleases(6),
    listTasks(actor, people),
  ]);
  const series = [1, 2, 3, 4].map((quarter) => ({ quarter, released: 0, legacy: 0 }));
  for (const r of rows) {
    const month = new Date(r.completedAt!.getTime() + WIB).getUTCMonth();
    series[Math.floor(month / 3)][n(r.legacy) ? 'legacy' : 'released']++;
  }
  const viewerOnly = c.inProgress === null;
  return {
    year,
    currentYear,
    final: c.final,
    inProgress: c.inProgress,
    waiting: viewerOnly ? null : tasks.length,
    rejected: c.rejected,
    series,
    recent: recent.map(({ d, revisionNo, cycle }) => ({
      id: d.id,
      number: d.number,
      title: d.title,
      revisionNo,
      releasedAt: d.releasedAt!.toISOString(),
      // A legacy upload is completed without any submit cycle.
      legacy: d.source === 'legacy' && cycle === 0,
    })),
    tasks: tasks.length,
  };
}

/** Kartu Portal dengan data nyata (Fase 5). */
export async function drawingsPortalSummary(
  actor: Identity,
  people: DirectoryPerson[] | null,
  now = Date.now(),
): Promise<PortalSummary> {
  if (!canDraw(actor, 'read')) throw new AppError(403, 'Akses Drawing Database belum diberikan.');
  const weeks = wibWeekStarts(now, 12);
  const [c, rows, recent, tasks] = await Promise.all([
    counts(actor),
    releases(new Date(weeks[0].startMs), new Date(Math.min(weeks[11].endMs, now + 60_000))),
    recentReleases(5),
    listTasks(actor, people),
  ]);
  const weekCounts = weeks.map((w) => ({
    start: w.start,
    count: rows.filter((r) => r.completedAt!.getTime() >= w.startMs && r.completedAt!.getTime() < w.endMs)
      .length,
  }));
  let openRequests = 0;
  if (requestScopes(actor).includes('mine')) {
    const [row] = await db()
      .select({ n: sql<number>`COUNT(*)` })
      .from(requests)
      .where(
        and(
          eq(requests.requesterId, actor.id),
          ne(requests.status, 'closed'),
          ne(requests.status, 'review_rejected'),
        ),
      );
    openRequests = n(row.n);
  }
  const total = c.final + (c.inProgress ?? 0);
  const metrics: PortalSummary['metrics'] = [];
  if (c.inProgress !== null)
    metrics.push({
      key: 'wip',
      label: 'Dalam proses',
      value: c.inProgress,
      href: '/drawings/library',
      tone: 'neutral',
    });
  if (c.inProgress !== null)
    metrics.push({
      key: 'tasks',
      label: 'Menunggu tindakan',
      value: tasks.length,
      href: '/drawings/tasks',
      tone: tasks.length ? 'warning' : 'neutral',
    });
  else if (requestScopes(actor).includes('mine'))
    metrics.push({
      key: 'requests',
      label: 'Request aktif',
      value: openRequests,
      href: '/drawings/requests',
    });
  const attention: PortalSummary['attention'] = [];
  const group = { key: 'drawings', label: 'Drawing Database', unit: 'drawing' };
  if (c.rejected)
    attention.push({
      key: 'rejected',
      group,
      label: 'Revisi ditolak perlu diperbaiki',
      value: c.rejected,
      severity: 'warning',
      href: '/drawings/tasks',
    });
  const inactive = tasks.filter((t) => t.kind === 'inactive_approver').length;
  if (inactive)
    attention.push({
      key: 'inactive',
      group,
      label: 'Approver tidak aktif',
      value: inactive,
      severity: 'danger',
      href: '/drawings/tasks',
    });
  const action = canDraw(actor, 'drawing.create')
    ? { label: 'Create Drawing', href: '/drawings/new', icon: 'plus' as const }
    : canDraw(actor, 'request.create')
      ? { label: 'Drawing Request', href: '/drawings/requests/new', icon: 'drawing' as const }
      : undefined;
  return {
    appId: 'drawings',
    updatedAt: (recent[0]?.d.releasedAt ?? new Date(now)).toISOString(),
    headline: {
      label: 'Final Drawing',
      value: c.final,
      total: total || c.final,
      unit: 'drawing',
      caption: c.final
        ? c.inProgress
          ? `${c.inProgress.toLocaleString('id-ID')} drawing lain sedang diproses.`
          : 'Semua drawing aktif sudah terbit.'
        : 'Belum ada Final Drawing.',
      href: '/drawings/library',
    },
    metrics: metrics.slice(0, 2),
    attention,
    activity: { unitSingular: 'drawing', weeks: weekCounts },
    recent: recent.map(({ d, revisionNo }) => ({
      id: d.id,
      title: d.number ?? 'Drawing',
      meta: `${d.title ?? ''} · Rev ${revisionNo}`,
      at: d.releasedAt!.toISOString(),
      href: `/drawings/library/${d.id}`,
    })),
    ...(action ? { action } : {}),
  };
}

/** Lonceng aktivitas shell: notifikasi terbaru milik actor. */
export async function drawingsActivity(actor: Identity): Promise<{ items: NotificationItem[] }> {
  if (!canDraw(actor, 'read')) throw new AppError(403, 'Akses Drawing Database belum diberikan.');
  const rows = await db()
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, actor.id))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(12);
  return {
    items: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      body: r.body,
      href: r.href,
      read: !!r.readAt,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/** Pencarian cepat shell (Ctrl/Cmd+K): drawing yang boleh dilihat dan request dalam cakupan. */
export async function drawingsDiscovery(actor: Identity, q: string) {
  if (!canDraw(actor, 'read')) throw new AppError(403, 'Akses Drawing Database belum diberikan.');
  const term = q.trim().slice(0, 60);
  if (term.length < 2) return { drawings: [], requests: [] };
  const pattern = `%${likeEscape(term)}%`;
  const scope = wipScope(actor);
  const found = await db()
    .select({ id: drawings.id, number: drawings.number, title: drawings.title, hac: drawings.hac })
    .from(drawings)
    .where(
      and(
        isNull(drawings.voidedAt),
        or(
          like(drawings.number, pattern),
          like(drawings.title, pattern),
          like(drawings.hac, pattern.toUpperCase()),
        ),
        scope === 'all'
          ? undefined
          : scope === 'own'
            ? or(isNotNull(drawings.releasedRevisionId), eq(drawings.ownerId, actor.id))
            : isNotNull(drawings.releasedRevisionId),
      ),
    )
    .orderBy(desc(drawings.updatedAt))
    .limit(8);
  const scopes = requestScopes(actor);
  const reqs = scopes.length
    ? await db()
        .select({ id: requests.id, number: requests.number, hac: requests.hac })
        .from(requests)
        .where(
          and(
            like(requests.number, pattern.toUpperCase()),
            scopes.includes('all')
              ? undefined
              : or(
                  eq(requests.requesterId, actor.id),
                  scopes.includes('assigned') ? eq(requests.drafterId, actor.id) : undefined,
                ),
          ),
        )
        .orderBy(desc(requests.updatedAt))
        .limit(5)
    : [];
  return { drawings: found, requests: reqs };
}
