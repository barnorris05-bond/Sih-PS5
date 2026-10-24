import { NextResponse } from 'next/server';
import { getVerifyResult, getDailyDigest } from '@/.data/store';

export async function POST() {
  const integrity = getVerifyResult();
  const digest = getDailyDigest();
  return NextResponse.json({ integrity, digest });
}
