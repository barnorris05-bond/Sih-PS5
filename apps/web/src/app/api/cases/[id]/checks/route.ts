import { type NextRequest } from 'next/server';
import { getVerifications, getSummary } from '@/.data/store';
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

  const verifications = getVerifications(id);
  return apiSuccess({ caseId: id, checks: verifications }, { request });
}
