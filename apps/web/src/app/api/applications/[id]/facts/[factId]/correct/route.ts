import { type NextRequest } from 'next/server';
import { applyCorrection } from '@/.data/store';
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

const CorrectBody = z.object({
  correctedValue: z.union([z.string(), z.number()]),
}).strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; factId: string }> },
) {
  const { id, factId } = await params;
  const role = request.headers.get('x-eg-role') ?? 'scrutiny_officer';
  if (role === 'applicant') {
    return apiError('FORBIDDEN_ROLE', 'Applicants cannot perform confidence gate corrections.', 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_FAILED', 'Invalid JSON payload', 400);
  }

  const parsed = CorrectBody.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_FAILED', 'Invalid request body', 400, parsed.error.format());
  }

  try {
    const fact = applyCorrection(id, factId, parsed.data.correctedValue, role);
    return apiSuccess(fact);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return apiError('RESOURCE_NOT_FOUND', message, 404);
  }
}
