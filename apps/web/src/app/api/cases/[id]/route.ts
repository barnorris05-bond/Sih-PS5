import { type NextRequest } from 'next/server';
import { getCaseHeader } from '@/.data/store';
import { apiError, apiSuccess } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const role = request.headers.get('x-eg-role') ?? 'scrutiny_officer';

  // Applicant check: an applicant can only see their own application
  const userAppId = request.headers.get('x-eg-app-id') ?? 'APP-001';
  if (role === 'applicant' && id !== userAppId) {
    return apiError('FORBIDDEN_ROLE', 'You do not have permission to view other institutions’ cases.', 403);
  }

  const caseHeader = getCaseHeader(id);
  if (!caseHeader) {
    return apiError('RESOURCE_NOT_FOUND', `Case ${id} not found`, 404);
  }

  return apiSuccess(caseHeader, { request });
}
