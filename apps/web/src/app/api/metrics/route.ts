import { NextResponse, type NextRequest } from 'next/server';
import { getMetrics } from '@/.data/store';

export async function GET(request: NextRequest) {
  const role = request.headers.get('x-eg-role') ?? 'scrutiny_officer';
  if (role === 'applicant') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(getMetrics());
}
