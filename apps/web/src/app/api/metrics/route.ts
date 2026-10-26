import { type NextRequest } from 'next/server';
import { getMetrics } from '@/.data/store';
import { apiError, apiSuccess } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const role = request.headers.get('x-eg-role') ?? 'scrutiny_officer';
  if (role === 'applicant') {
    return apiError('FORBIDDEN_ROLE', 'Applicants cannot view regulatory telemetry or accuracy metrics.', 403);
  }
  return apiSuccess(getMetrics(), { request });
}
