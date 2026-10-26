import { type NextRequest } from 'next/server';
import { getVerifyResult, getDailyDigest } from '@/.data/store';
import { apiError, apiSuccess } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const role = request.headers.get('x-eg-role') ?? 'scrutiny_officer';
  if (role === 'applicant') {
    return apiError('FORBIDDEN_ROLE', 'Applicants cannot trigger audit verification.', 403);
  }
  const integrity = getVerifyResult();
  const digest = getDailyDigest();
  return apiSuccess({ integrity, digest }, { status: 200 });
}
