import { type NextRequest } from 'next/server';
import { resetToSeed, getDatasetVersion } from '@/.data/store';
import { apiSuccess } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  resetToSeed();
  return apiSuccess({
    ok: true,
    message: 'Dataset reset to seed',
    datasetVersion: getDatasetVersion(),
  });
}
