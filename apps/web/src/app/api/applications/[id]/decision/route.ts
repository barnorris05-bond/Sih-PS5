import { type NextRequest } from 'next/server';
import { applyDecision } from '@/.data/store';
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

const DecisionBody = z.object({
  findingId: z.string().min(1),
  action: z.enum(['accept', 'dismiss', 'escalate']),
  reason: z.string().min(1, 'Reason is required'),
}).strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const role = request.headers.get('x-eg-role') ?? 'scrutiny_officer';

  if (role === 'applicant') {
    return apiError('FORBIDDEN_ROLE', 'Applicants cannot record finding decisions.', 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_FAILED', 'Invalid JSON payload', 400);
  }

  const parsed = DecisionBody.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_FAILED', 'Invalid request body', 400, parsed.error.format());
  }

  const { findingId, action, reason } = parsed.data;

  // Role check for escalate
  if (action === 'escalate' && role !== 'senior_reviewer') {
    return apiError('FORBIDDEN_ROLE', 'Only senior_reviewer can escalate findings', 403);
  }

  try {
    const ledgerRow = applyDecision(id, findingId, action, reason, role);
    return apiSuccess({ ledgerRow }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return apiError('RESOURCE_NOT_FOUND', message, 404);
  }
}
