import { NextResponse, type NextRequest } from 'next/server';
import { getApplicationSummaries } from '@/.data/store';

export async function GET(request: NextRequest) {
  const role = request.headers.get('x-eg-role') ?? 'scrutiny_officer';
  if (role === 'applicant') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const summaries = getApplicationSummaries();
  return NextResponse.json(summaries);
}
