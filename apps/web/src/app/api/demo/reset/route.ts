import { NextResponse } from 'next/server';
import { resetToSeed } from '@/.data/store';

export async function POST() {
  resetToSeed();
  return NextResponse.json({ ok: true, message: 'Dataset reset to seed' });
}
