import { AppError, drawingsNavigation, drawingsRole } from '@plant/contracts';
import { apiIdentity, failure, verifyOrigin } from '@plant/server';
import { drawingsPortalSummary, requireDrawings } from '@plant/drawings-core';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
const json = (v: unknown, status = 200) =>
  Response.json(v, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(request: Request, context: Context) {
  try {
    const actor = await apiIdentity(request);
    requireDrawings(actor);
    const path = (await context.params).path.join('/');
    if (path === 'me')
      return json({
        id: actor.id,
        name: actor.name,
        role: drawingsRole(actor),
        navigation: drawingsNavigation(actor),
      });
    if (path === 'portal-summary') return json(await drawingsPortalSummary(actor));
    throw new AppError(404, 'Endpoint tidak ditemukan.');
  } catch (e) {
    return failure(e);
  }
}
// Write endpoints arrive in later phases. Origin and access are still enforced first.
async function mutate(request: Request) {
  try {
    verifyOrigin(request);
    requireDrawings(await apiIdentity(request));
    throw new AppError(404, 'Endpoint tidak ditemukan.');
  } catch (e) {
    return failure(e);
  }
}
export const POST = mutate;
export const PATCH = mutate;
