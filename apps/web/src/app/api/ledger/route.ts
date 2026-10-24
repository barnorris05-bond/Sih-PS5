import { NextResponse, type NextRequest } from 'next/server';
import { getLedger, tamperLedgerRow, getVerifyResult, getDailyDigest } from '@/.data/store';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const role = request.headers.get('x-eg-role') ?? 'scrutiny_officer';
  if (role !== 'auditor' && role !== 'senior_reviewer' && role !== 'scrutiny_officer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = getLedger();
  const integrity = getVerifyResult();
  const digest = getDailyDigest();

  return NextResponse.json({ rows, integrity, digest });
}

const TamperBody = z.object({
  seq: z.number().int().positive(),
  patch: z.record(z.unknown()),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = TamperBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const row = tamperLedgerRow(parsed.data.seq, parsed.data.patch);
    const integrity = getVerifyResult();
    return NextResponse.json({ row, integrity });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
