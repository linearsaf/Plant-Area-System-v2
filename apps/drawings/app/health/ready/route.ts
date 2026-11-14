import { drawingsDatabaseReady } from '@plant/drawings-core';
export const dynamic = 'force-dynamic';
// Database + Auth. Storage failures (Fase 2) must not fail readiness; file operations answer 503.
export async function GET() {
  try {
    await drawingsDatabaseReady();
    const r = await fetch(`${process.env.AUTH_INTERNAL_URL}/auth/health/ready`, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    });
    if (!r.ok) throw Error();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
