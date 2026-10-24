import { NextResponse, type NextRequest } from 'next/server';
import { getSummary, getDocuments, getFacts, getFindings, getVerifications, getConflicts, getLetter } from '@/.data/store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const role = request.headers.get('x-eg-role') ?? 'scrutiny_officer';

  const summary = getSummary(id);
  if (!summary) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Applicant can only see if they pin matches
  if (role === 'applicant') {
    const pin = request.headers.get('x-eg-pin') ?? '';
    if (summary.institution.applicantRolePin !== pin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const documents = getDocuments(id);
  const facts = getFacts(id);
  let findings = getFindings(id);
  // Applicant: no forensic/anomaly findings
  if (role === 'applicant') {
    findings = findings.filter((f) => f.findingClass !== 'anomaly_signal');
  }
  const verifications = getVerifications(id);
  const conflicts = getConflicts(id);
  const letter = getLetter(id) ?? null;

  return NextResponse.json({
    summary,
    institution: summary.institution,
    documents,
    facts,
    findings,
    verifications,
    conflicts,
    letter,
  });
}
