import { appDirectory } from '@plant/auth-core';
import { AppError } from '@plant/contracts';
import { failure, verifyInternal } from '@plant/server';
export const dynamic = 'force-dynamic';
// Service-token only. Gateway blocks /auth/internal from the public network.
export async function GET(request: Request) {
  try {
    verifyInternal(request);
    const params = new URL(request.url).searchParams;
    const app = params.get('app');
    if (app !== 'drawings') throw new AppError(400, 'Parameter app tidak valid.');
    const roles = params.get('roles')?.split(',').filter(Boolean);
    return Response.json(
      { people: await appDirectory(app, roles) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return failure(e);
  }
}
