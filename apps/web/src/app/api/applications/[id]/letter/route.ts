import { NextResponse, type NextRequest } from 'next/server';
import { getLetter, releaseLetter } from '@/.data/store';
import { z } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const letter = getLetter(id);
  if (!letter) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(letter);
}

const ReleaseBody = z.object({
  releasedBy: z.string().min(1),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const role = request.headers.get('x-eg-role') ?? 'scrutiny_officer';
  if (role !== 'senior_reviewer') {
    return NextResponse.json({ error: 'Forbidden — senior_reviewer only' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ReleaseBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const letter = releaseLetter(id, parsed.data.releasedBy);
    return NextResponse.json(letter);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}
