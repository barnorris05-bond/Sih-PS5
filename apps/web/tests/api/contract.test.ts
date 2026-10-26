import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getHealth } from '@/app/api/health/route';
import { GET as getCases } from '@/app/api/cases/route';
import { GET as getCaseHeader } from '@/app/api/cases/[id]/route';
import { GET as getCaseDocs } from '@/app/api/cases/[id]/documents/route';
import { GET as getCaseMismatches } from '@/app/api/cases/[id]/mismatches/route';
import { GET as getCaseChecks } from '@/app/api/cases/[id]/checks/route';
import { GET as getCaseConnections } from '@/app/api/cases/[id]/connections/route';
import { GET as getCaseReport } from '@/app/api/cases/[id]/report/route';
import { POST as postDecision } from '@/app/api/cases/[id]/decision/route';
import { POST as postCorrection } from '@/app/api/cases/[id]/facts/[factId]/correct/route';
import { GET as getRules } from '@/app/api/rules/route';
import { GET as getLedger, POST as postTamper } from '@/app/api/ledger/route';

function makeRequest(url: string, options: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) {
  const headers = new Headers(options.headers ?? {});
  let body: string | undefined = undefined;
  if (options.body) {
    body = JSON.stringify(options.body);
    headers.set('Content-Type', 'application/json');
  }
  return new NextRequest(new URL(url, 'http://localhost:3100'), {
    method: options.method ?? 'GET',
    headers,
    body,
  });
}

describe('API Contract & Robustness Suite', () => {
  describe('GET /api/health', () => {
    it('returns healthy status with datasetVersion and ledger chain validity', async () => {
      const res = await getHealth(makeRequest('http://localhost:3100/api/health'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(typeof data.datasetVersion).toBe('number');
      expect(typeof data.ledgerHeadHash).toBe('string');
      expect(data.chainValid).toBe(true);
      expect(res.headers.get('ETag')).toBeDefined();
    });
  });

  describe('GET /api/cases', () => {
    it('returns paginated summaries for scrutiny officer', async () => {
      const res = await getCases(makeRequest('http://localhost:3100/api/cases?page=1&limit=5', {
        headers: { 'x-eg-role': 'scrutiny_officer' },
      }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items.length).toBeLessThanOrEqual(5);
      expect(data.pagination.page).toBe(1);
    });

    it('rejects applicant role with 403 and uniform error shape', async () => {
      const res = await getCases(makeRequest('http://localhost:3100/api/cases', {
        headers: { 'x-eg-role': 'applicant' },
      }));
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('FORBIDDEN_ROLE');
      expect(typeof data.error.message).toBe('string');
    });

    it('validates query parameters with zod', async () => {
      const res = await getCases(makeRequest('http://localhost:3100/api/cases?page=notanumber', {
        headers: { 'x-eg-role': 'scrutiny_officer' },
      }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('GET /api/cases/:id', () => {
    it('returns case header with section counts', async () => {
      const res = await getCaseHeader(
        makeRequest('http://localhost:3100/api/cases/EOA-2026-0142'),
        { params: Promise.resolve({ id: 'EOA-2026-0142' }) },
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe('EOA-2026-0142');
      expect(data.counts).toBeDefined();
      expect(typeof data.counts.documents).toBe('number');
      expect(typeof data.counts.mismatches).toBe('number');
      expect(typeof data.counts.checks).toBe('number');
      expect(typeof data.counts.connections).toBe('number');
      expect(data.nextStep).toBeDefined();
    });

    it('returns 404 with uniform error shape for non-existent case', async () => {
      const res = await getCaseHeader(
        makeRequest('http://localhost:3100/api/cases/APP-NONEXISTENT'),
        { params: Promise.resolve({ id: 'APP-NONEXISTENT' }) },
      );
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('Section endpoints', () => {
    it('GET /api/cases/:id/documents returns documents', async () => {
      const res = await getCaseDocs(
        makeRequest('http://localhost:3100/api/cases/EOA-2026-0142/documents'),
        { params: Promise.resolve({ id: 'EOA-2026-0142' }) },
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.caseId).toBe('EOA-2026-0142');
      expect(Array.isArray(data.documents)).toBe(true);
    });

    it('GET /api/cases/:id/mismatches returns conflicts and facts', async () => {
      const res = await getCaseMismatches(
        makeRequest('http://localhost:3100/api/cases/EOA-2026-0142/mismatches'),
        { params: Promise.resolve({ id: 'EOA-2026-0142' }) },
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.caseId).toBe('EOA-2026-0142');
      expect(Array.isArray(data.mismatches)).toBe(true);
    });

    it('GET /api/cases/:id/checks returns verification attempts', async () => {
      const res = await getCaseChecks(
        makeRequest('http://localhost:3100/api/cases/EOA-2026-0142/checks'),
        { params: Promise.resolve({ id: 'EOA-2026-0142' }) },
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.caseId).toBe('EOA-2026-0142');
      expect(Array.isArray(data.checks)).toBe(true);
    });

    it('GET /api/cases/:id/connections returns graph nodes and edges', async () => {
      const res = await getCaseConnections(
        makeRequest('http://localhost:3100/api/cases/EOA-2026-0142/connections'),
        { params: Promise.resolve({ id: 'EOA-2026-0142' }) },
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.caseId).toBe('EOA-2026-0142');
      expect(Array.isArray(data.nodes)).toBe(true);
      expect(Array.isArray(data.edges)).toBe(true);
    });

    it('GET /api/cases/:id/report returns findings and notice draft', async () => {
      const res = await getCaseReport(
        makeRequest('http://localhost:3100/api/cases/EOA-2026-0142/report'),
        { params: Promise.resolve({ id: 'EOA-2026-0142' }) },
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.caseId).toBe('EOA-2026-0142');
      expect(Array.isArray(data.findings)).toBe(true);
    });
  });

  describe('Mutations & Validation boundaries', () => {
    it('rejects unknown fields on POST decision (.strict)', async () => {
      const res = await postDecision(
        makeRequest('http://localhost:3100/api/cases/EOA-2026-0142/decision', {
          method: 'POST',
          headers: { 'x-eg-role': 'scrutiny_officer' },
          body: {
            findingId: 'find_1',
            action: 'accept',
            reason: 'Valid proof',
            unknownMaliciousField: 'hack',
          },
        }),
        { params: Promise.resolve({ id: 'EOA-2026-0142' }) },
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('VALIDATION_FAILED');
    });

    it('rejects applicant role on POST decision', async () => {
      const res = await postDecision(
        makeRequest('http://localhost:3100/api/cases/EOA-2026-0142/decision', {
          method: 'POST',
          headers: { 'x-eg-role': 'applicant' },
          body: {
            findingId: 'find_1',
            action: 'accept',
            reason: 'Valid proof',
          },
        }),
        { params: Promise.resolve({ id: 'EOA-2026-0142' }) },
      );
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('rejects applicant on POST correction', async () => {
      const res = await postCorrection(
        makeRequest('http://localhost:3100/api/cases/EOA-2026-0142/facts/fact_1/correct', {
          method: 'POST',
          headers: { 'x-eg-role': 'applicant' },
          body: { correctedValue: '5.00' },
        }),
        { params: Promise.resolve({ id: 'EOA-2026-0142', factId: 'fact_1' }) },
      );
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe('FORBIDDEN_ROLE');
    });
  });

  describe('Auditing & Rules roles', () => {
    it('GET /api/rules rejects applicant role', async () => {
      const res = await getRules(makeRequest('http://localhost:3100/api/rules', {
        headers: { 'x-eg-role': 'applicant' },
      }));
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('GET /api/ledger rejects applicant role', async () => {
      const res = await getLedger(makeRequest('http://localhost:3100/api/ledger', {
        headers: { 'x-eg-role': 'applicant' },
      }));
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('POST /api/ledger rejects invalid tamper schema', async () => {
      const res = await postTamper(makeRequest('http://localhost:3100/api/ledger', {
        method: 'POST',
        headers: { 'x-eg-role': 'auditor' },
        body: { invalid: 'payload' },
      }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('VALIDATION_FAILED');
    });
  });
});
