import { NextResponse, type NextRequest } from 'next/server';
import { applyCorrection } from '@/.data/store';
import { z } from 'zod';

const CorrectBody = z.object({
  correctedValue: z.union([z.string(), z.number()]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; factId: string }> },
) {
  const { id, factId } = await params;
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

  const parsed = CorrectBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const fact = applyCorrection(id, factId, parsed.data.correctedValue, role);
    return NextResponse.json(fact);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}
