import { AppError, drawingsNavigation, drawingsRole } from '@plant/contracts';
import { apiIdentity, failure, readBinaryBody, verifyOrigin } from '@plant/server';
import {
  drawingsPortalSummary,
  fileNameFromHeader,
  requireContentType,
  requireDrawings,
  requireUpload,
  serveFile,
  stageUpload,
  stagedFileForOwner,
  uploadLimit,
} from '@plant/drawings-core';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
const json = (v: unknown, status = 200) =>
  Response.json(v, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(request: Request, context: Context) {
  try {
    const actor = await apiIdentity(request);
    requireDrawings(actor);
    const segments = (await context.params).path,
      path = segments.join('/');
    if (path === 'me')
      return json({
        id: actor.id,
        name: actor.name,
        role: drawingsRole(actor),
        navigation: drawingsNavigation(actor),
      });
    if (path === 'portal-summary') return json(await drawingsPortalSummary(actor));
    // Pratinjau file staged milik pengunggah, sebelum dirujuk drawing. Hanya inline/view.
    if (segments.length === 3 && segments[0] === 'uploads' && segments[2] === 'file') {
      const file = await stagedFileForOwner(actor, segments[1]);
      return await serveFile(request, file, { disposition: 'inline', name: file.originalName });
    }
    throw new AppError(404, 'Endpoint tidak ditemukan.');
  } catch (e) {
    return failure(e);
  }
}
async function mutate(request: Request, context: Context) {
  try {
    verifyOrigin(request);
    const actor = await apiIdentity(request);
    requireDrawings(actor);
    const path = (await context.params).path.join('/');
    if (request.method === 'POST' && path === 'uploads') {
      const kind = requireUpload(actor, new URL(request.url).searchParams.get('kind') || '');
      const declaredType = requireContentType(kind, request.headers.get('content-type'));
      const name = fileNameFromHeader(request.headers.get('x-file-name'), kind);
      const body = await readBinaryBody(request, { maxBytes: uploadLimit(kind) });
      return json(await stageUpload(actor, kind, name, declaredType, body), 201);
    }
    throw new AppError(404, 'Endpoint tidak ditemukan.');
  } catch (e) {
    return failure(e);
  }
}
export const POST = mutate;
export const PATCH = mutate;
