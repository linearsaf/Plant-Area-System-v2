// Notifikasi in-app per penerima (PRD §4.8). Ditulis dalam transaksi kejadian; `source_key` unik
// membuat retry tidak menggandakan. Status dibaca disimpan di server.
import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import {
  AppError,
  canDraw,
  notificationReadSchema,
  type Identity,
  type NotificationItem,
} from '@plant/contracts';
import { notifications } from './schema';
import { db, decodeCursor, encodeCursor, parse, type Tx } from './support';

export type NotificationInput = {
  recipientId: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  sourceKey: string;
};
/** Menyisipkan notifikasi; kejadian yang sama (source_key) tidak pernah tercatat dua kali. */
export async function notify(tx: Tx, actor: Pick<Identity, 'id'>, n: NotificationInput, at = new Date()) {
  if (!n.recipientId || n.recipientId === actor.id) return; // Tidak memberi tahu pelaku sendiri.
  await tx
    .insert(notifications)
    .values({
      id: randomUUID(),
      recipientId: n.recipientId,
      kind: n.kind,
      title: n.title.slice(0, 200),
      body: n.body.slice(0, 500),
      href: n.href.slice(0, 300),
      sourceKey: n.sourceKey.slice(0, 191),
      createdAt: at,
    })
    .onDuplicateKeyUpdate({ set: { sourceKey: sql`${notifications.sourceKey}` } });
}

const toItem = (r: typeof notifications.$inferSelect): NotificationItem => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  body: r.body,
  href: r.href,
  read: !!r.readAt,
  createdAt: r.createdAt.toISOString(),
});
export async function listNotifications(actor: Identity, params: URLSearchParams) {
  if (!canDraw(actor, 'read')) throw new AppError(403, 'Akses Drawing Database belum diberikan.');
  const filter = params.get('filter') || 'all';
  if (filter !== 'all' && filter !== 'unread') throw new AppError(400, 'Filter tidak dikenal.');
  const cursor = decodeCursor(params.get('cursor'));
  const limit = Math.min(50, Math.max(1, Number(params.get('limit')) || 50));
  const rows = await db()
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientId, actor.id),
        filter === 'unread' ? isNull(notifications.readAt) : undefined,
        cursor
          ? or(
              lt(notifications.createdAt, cursor.at),
              and(eq(notifications.createdAt, cursor.at), lt(notifications.id, cursor.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  const [unread] = await db()
    .select({ n: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.recipientId, actor.id), isNull(notifications.readAt)));
  return {
    items: page.map(toItem),
    unread: Number(unread.n),
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}
/** Menandai notifikasi milik actor sebagai dibaca (ID tertentu atau semuanya). */
export async function markNotificationsRead(actor: Identity, input: unknown) {
  if (!canDraw(actor, 'read')) throw new AppError(403, 'Akses Drawing Database belum diberikan.');
  const data = parse(notificationReadSchema, input);
  const [result] = await db()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientId, actor.id),
        isNull(notifications.readAt),
        data.all ? undefined : inArray(notifications.id, data.ids!),
      ),
    );
  return { updated: result.affectedRows };
}
