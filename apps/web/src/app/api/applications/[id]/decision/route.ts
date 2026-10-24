import { NextResponse, type NextRequest } from 'next/server';
import { applyDecision } from '@/.data/store';
import { z } from 'zod';

const DecisionBody = z.object({
  findingId: z.string().min(1),
  action: z.enum(['accept', 'dismiss', 'escalate']),
  reason: z.string().min(1, 'Reason is required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const role = request.headers.get('x-eg-role') ?? 'scrutiny_officer';

  if (role === 'applicant') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = DecisionBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { findingId, action, reason } = parsed.data;

  // Role check for escalate
  if (action === 'escalate' && role !== 'senior_reviewer') {
    return NextResponse.json({ error: 'Only senior_reviewer can escalate' }, { status: 403 });
  }

  try {
    const ledgerRow = applyDecision(id, findingId, action, reason, role);
    return NextResponse.json({ ledgerRow });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}
