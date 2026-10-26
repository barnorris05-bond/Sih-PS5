import { type NextRequest } from 'next/server';
import { getGraph, getSummary } from '@/.data/store';
import { apiError, apiSuccess } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const summary = getSummary(id);
  if (!summary) {
    return apiError('RESOURCE_NOT_FOUND', `Case ${id} not found`, 404);
  }

  const subgraph = getGraph(id);
  return apiSuccess({ caseId: id, ...subgraph }, { request });
}
