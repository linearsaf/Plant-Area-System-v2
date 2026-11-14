import { AppError, canDraw, drawingsNavigation, drawingsRole } from '@plant/contracts';
import { apiIdentity, failure, fetchDirectory, readBinaryBody, readJson, verifyOrigin } from '@plant/server';
import {
  auditList,
  createDrawing,
  createLegacyDrawing,
  createMaster,
  drawingDetail,
  drawingTimeline,
  drawingsPortalSummary,
  fileNameFromHeader,
  hacSuggestions,
  listDrawings,
  listMasters,
  requireContentType,
  requireDrawings,
  requireUpload,
  revisionFile,
  serveFile,
  stageUpload,
  stagedFileForOwner,
  transferOwner,
  updateDrawing,
  updateMaster,
  uploadLimit,
  voidDrawing,
  submitRevision,
  checkRevision,
  decideApproval,
  updateApprovalPlan,
  createRevision,
  cancelRevision,
  listTasks,
  attachmentFile,
  approverCandidates,
  type FileIntent,
} from '@plant/drawings-core';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
const json = (v: unknown, status = 200) =>
  Response.json(v, { status, headers: { 'Cache-Control': 'no-store' } });
const replayable = (r: { status: number; body: unknown; replayed: boolean }) =>
  json({ ...(r.body as object), replayed: r.replayed }, r.replayed ? 200 : r.status);
const directory = () => fetchDirectory('drawings');
// Inactive-approver marks are best effort: without the directory, tasks and detail still load.
const peopleOrNull = () => directory().catch(() => null);

export async function GET(request: Request, context: Context) {
  try {
    const actor = await apiIdentity(request);
    requireDrawings(actor);
    const segments = (await context.params).path,
      path = segments.join('/'),
      params = new URL(request.url).searchParams;
    if (path === 'me')
      return json({
        id: actor.id,
        name: actor.name,
        role: drawingsRole(actor),
        navigation: drawingsNavigation(actor),
      });
    if (path === 'portal-summary') return json(await drawingsPortalSummary(actor));
    if (path === 'masters') return json(await listMasters());
    if (path === 'drawings') return json(await listDrawings(actor, params));
    if (path === 'hac-suggestions') return json(await hacSuggestions(actor, params.get('q') || ''));
    if (path === 'audit') return json(await auditList(actor, params.get('cursor')));
    if (path === 'people') {
      // Candidates for Drawn by (legacy) and owner transfer; only for roles that assign them.
      const purpose = params.get('for');
      if (purpose === 'legacy-owner' && canDraw(actor, 'drawing.legacy_upload'))
        return json({ people: (await directory()).filter((p) => p.role === 'drafter') });
      if (purpose === 'approver-l1' || purpose === 'approver-l2')
        return json({
          people: await approverCandidates(
            actor,
            params.get('revision') || '',
            purpose === 'approver-l1' ? 1 : 2,
            await directory(),
          ),
        });
      if (purpose === 'owner' && canDraw(actor, 'drawing.transfer_owner'))
        return json({
          people: (await directory()).filter((p) => p.role === 'drafter' || p.role === 'admin'),
        });
      throw new AppError(403, 'Daftar pengguna tidak tersedia untuk keperluan ini.');
    }
    if (segments.length === 2 && segments[0] === 'drawings')
      return json(await drawingDetail(actor, segments[1], await peopleOrNull()));
    if (path === 'tasks') return json({ items: await listTasks(actor, await peopleOrNull()) });
    if (path === 'tasks/count') return json({ count: (await listTasks(actor, await peopleOrNull())).length });
    if (segments.length === 2 && segments[0] === 'attachments') {
      const file = await attachmentFile(actor, segments[1]);
      return await serveFile(request, file, { disposition: 'inline', name: file.originalName });
    }
    if (segments.length === 3 && segments[0] === 'drawings' && segments[2] === 'timeline')
      return json(await drawingTimeline(actor, segments[1], params.get('cursor')));
    if (segments.length === 3 && segments[0] === 'revisions' && segments[2] === 'file') {
      const intent = (params.get('intent') || 'view') as FileIntent;
      const disposition =
        params.get('disposition') === 'attachment' || intent === 'download' ? 'attachment' : 'inline';
      // Range requests from the viewer are never audited; download/print clicks are.
      const ranged = request.headers.has('range');
      const { file, name } = await revisionFile(actor, segments[1], ranged ? 'view' : intent);
      return await serveFile(request, file, { disposition, name });
    }
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
    const segments = (await context.params).path,
      path = segments.join('/'),
      key = request.headers.get('idempotency-key');
    if (request.method === 'POST' && path === 'uploads') {
      const kind = requireUpload(actor, new URL(request.url).searchParams.get('kind') || '');
      const declaredType = requireContentType(kind, request.headers.get('content-type'));
      const name = fileNameFromHeader(request.headers.get('x-file-name'), kind);
      const body = await readBinaryBody(request, { maxBytes: uploadLimit(kind) });
      return json(await stageUpload(actor, kind, name, declaredType, body), 201);
    }
    const body = await readJson(request);
    if (request.method === 'POST') {
      if (path === 'drawings') return replayable(await createDrawing(actor, body, key));
      if (path === 'drawings/legacy')
        return replayable(await createLegacyDrawing(actor, body, key, directory));
      if (segments.length === 3 && segments[0] === 'drawings' && segments[2] === 'void')
        return replayable(await voidDrawing(actor, segments[1], body, key));
      if (segments.length === 3 && segments[0] === 'drawings' && segments[2] === 'owner')
        return replayable(await transferOwner(actor, segments[1], body, key, directory));
      if (segments.length === 3 && segments[0] === 'drawings' && segments[2] === 'revisions')
        return replayable(await createRevision(actor, segments[1], body, key));
      if (segments.length === 3 && segments[0] === 'revisions') {
        const [, id, action] = segments;
        if (action === 'submit') return replayable(await submitRevision(actor, id, body, key));
        if (action === 'check') return replayable(await checkRevision(actor, id, body, key, directory));
        if (action === 'approve-l1') return replayable(await decideApproval(actor, 1, id, body, key));
        if (action === 'approve-l2') return replayable(await decideApproval(actor, 2, id, body, key));
        if (action === 'cancel') return replayable(await cancelRevision(actor, id, body, key));
      }
      if (path === 'masters/disciplines') return json(await createMaster(actor, 'disciplines', body), 201);
    }
    if (request.method === 'PATCH') {
      if (segments.length === 2 && segments[0] === 'drawings')
        return json(await updateDrawing(actor, segments[1], body));
      if (segments.length === 3 && segments[0] === 'revisions' && segments[2] === 'approval-plan')
        return json(await updateApprovalPlan(actor, segments[1], body, directory));
      if (segments.length === 3 && segments[0] === 'masters' && segments[1] === 'disciplines')
        return json(await updateMaster(actor, 'disciplines', segments[2], body));
    }
    throw new AppError(404, 'Endpoint tidak ditemukan.');
  } catch (e) {
    return failure(e);
  }
}
export const POST = mutate;
export const PATCH = mutate;
