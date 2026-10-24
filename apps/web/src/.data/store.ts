/**
 * Singleton in-memory dataset store.
 * Server-side only — never import from client components.
 */
import path from 'node:path';
import fs from 'node:fs';
import { assembleDataset, type Dataset } from '@evidencegraph/fixtures';
import { loadRulePack, verifyChain, dailyDigest, tamperRow, appendRow } from '@evidencegraph/engine';
import { computeMetrics } from '@evidencegraph/engine';
import type {
  ApplicationSummary,
  Institution,
  Document,
  Fact,
  Finding,
  VerificationAttempt,
  AuditRow,
  Rule,
  RunEvent,
  LetterDraft,
  MetricBoard,
  GraphNode,
  GraphEdge,
  GraphSubgraph,
} from '@evidencegraph/domain';
import type { ConflictRow } from '@evidencegraph/engine';

// ---- Persistence ----

interface StorePatch {
  decisions: Array<{
    appId: string;
    findingId: string;
    action: string;
    actor: string;
    reason: string;
    at: string;
  }>;
  corrections: Array<{
    factId: string;
    correctedValue: string | number;
    officer: string;
    at: string;
  }>;
  tamperedRows: Array<{ seq: number; patch: Record<string, unknown> }>;
  letterReleases: Array<{ appId: string; releasedBy: string; releasedAt: string }>;
}

function patchFilePath(): string {
  return path.join(process.cwd(), '.data', 'store.json');
}

function loadPatch(): StorePatch {
  try {
    const fp = patchFilePath();
    if (fs.existsSync(fp)) {
      return JSON.parse(fs.readFileSync(fp, 'utf8')) as StorePatch;
    }
  } catch {
    // ignore corrupt file
  }
  return { decisions: [], corrections: [], tamperedRows: [], letterReleases: [] };
}

function savePatch(p: StorePatch): void {
  try {
    const fp = patchFilePath();
    const dir = path.dirname(fp);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fp, JSON.stringify(p, null, 2), 'utf8');
  } catch {
    // non-fatal in demo
  }
}

// ---- Singleton ----

let _ds: Dataset | null = null;
let _ledger: AuditRow[] | null = null;
let _patch: StorePatch | null = null;

function getRulesDir(): string {
  // Try env var first
  if (process.env['RULES_DIR']) {
    return path.resolve(process.cwd(), process.env['RULES_DIR']);
  }
  // Next.js: cwd() = apps/web during build/dev; monorepo root is ../../
  return path.resolve(process.cwd(), '..', '..', 'rules', 'aph-2024-27');
}

function getDatasetInternal(): Dataset {
  if (_ds) return _ds;

  const rulesDir = getRulesDir();
  const rules = loadRulePack(rulesDir);
  _ds = assembleDataset(rules);

  // Make ledger mutable
  _ledger = [..._ds.ledger];

  // Apply persisted patches
  _patch = loadPatch();
  for (const c of _patch.corrections) {
    const fact = _ds.facts.find((f) => f.id === c.factId);
    if (fact) {
      (fact as Record<string, unknown>)['value'] = c.correctedValue;
      (fact as Record<string, unknown>)['quarantine'] = null;
    }
  }
  for (const d of _patch.decisions) {
    const finding = _ds.findings.find((f) => f.id === d.findingId && f.applicationId === d.appId);
    if (finding) {
      (finding as Record<string, unknown>)['status'] = d.action === 'accept'
        ? 'accepted'
        : d.action === 'dismiss'
          ? 'dismissed'
          : 'escalated';
      (finding as Record<string, unknown>)['decidedBy'] = d.actor;
      (finding as Record<string, unknown>)['decidedAt'] = d.at;
      (finding as Record<string, unknown>)['decisionReason'] = d.reason;
    }
  }
  for (const t of _patch.tamperedRows) {
    tamperRow(_ledger!, t.seq, t.patch);
  }
  for (const r of _patch.letterReleases) {
    const letter = _ds.letters.find((l) => l.applicationId === r.appId);
    if (letter) {
      (letter as Record<string, unknown>)['releasedBy'] = r.releasedBy;
      (letter as Record<string, unknown>)['releasedAt'] = r.releasedAt;
    }
  }

  return _ds;
}

// ---- Public accessors ----

export function getDataset(): Dataset {
  return getDatasetInternal();
}

export function getApplicationSummaries(): ApplicationSummary[] {
  return getDatasetInternal().summaries;
}

export function getSummary(id: string): ApplicationSummary | undefined {
  return getDatasetInternal().summaries.find((s) => s.id === id);
}

export function getInstitution(id: string): Institution | undefined {
  return getDatasetInternal().institutions.find((i) => i.id === id);
}

export function getDocuments(appId: string): Document[] {
  return getDatasetInternal().documents.filter((d) => d.applicationId === appId);
}

export function getFacts(appId: string): Fact[] {
  return getDatasetInternal().facts.filter(
    (f) => f.applicationId === appId && !f.key.startsWith('gt.') && !f.key.startsWith('fault.'),
  );
}

export function getFindings(appId: string): Finding[] {
  return getDatasetInternal().findings.filter((f) => f.applicationId === appId);
}

export function getVerifications(appId: string): VerificationAttempt[] {
  return getDatasetInternal().verifications.filter((v) => v.applicationId === appId);
}

export function getConflicts(appId: string): ConflictRow[] {
  return getDatasetInternal().conflicts.filter((c) => c.applicationId === appId);
}

export function getGraph(appId?: string): GraphSubgraph {
  const ds = getDatasetInternal();
  if (!appId) {
    return { nodes: ds.graphNodes, edges: ds.graphEdges };
  }
  // Return neighbourhood: institution node + 2-hop neighbours
  const institutionNode = ds.graphNodes.find((n) => n.id === appId);
  if (!institutionNode) return { nodes: [], edges: [] };

  const directEdges = ds.graphEdges.filter((e) => e.source === appId || e.target === appId);
  const neighborIds = new Set<string>([appId]);
  for (const e of directEdges) {
    neighborIds.add(e.source);
    neighborIds.add(e.target);
  }
  // second hop
  const hop2Edges = ds.graphEdges.filter(
    (e) => (neighborIds.has(e.source) || neighborIds.has(e.target)) && !directEdges.includes(e),
  );
  for (const e of hop2Edges) {
    neighborIds.add(e.source);
    neighborIds.add(e.target);
  }
  const nodes = ds.graphNodes.filter((n) => neighborIds.has(n.id));
  const edges = [...directEdges, ...hop2Edges];
  return { nodes, edges };
}

export function getRunEvents(appId: string): RunEvent[] {
  return getDatasetInternal().runs[appId] ?? [];
}

export function getLetter(appId: string): LetterDraft | undefined {
  return getDatasetInternal().letters.find((l) => l.applicationId === appId);
}

export function getLedger(): AuditRow[] {
  getDatasetInternal(); // ensure initialized
  return _ledger!;
}

export function getRules(): Rule[] {
  return getDatasetInternal().rules;
}

export function getSignalStrengths(): Record<string, string> {
  return getDatasetInternal().signalStrengths;
}

export function getMetrics(): MetricBoard {
  const ds = getDatasetInternal();
  return computeMetrics({
    institutions: ds.institutions,
    documents: ds.documents,
    facts: ds.facts,
    findings: ds.findings,
    verifications: ds.verifications,
    runs: ds.runs,
  });
}

// ---- Mutations ----

export function applyDecision(
  appId: string,
  findingId: string,
  action: 'accept' | 'dismiss' | 'escalate',
  reason: string,
  actor: string,
): AuditRow {
  const ds = getDatasetInternal();
  const finding = ds.findings.find((f) => f.id === findingId && f.applicationId === appId);
  if (!finding) throw new Error(`Finding ${findingId} not found`);

  const newStatus = action === 'accept' ? 'accepted' : action === 'dismiss' ? 'dismissed' : 'escalated';
  (finding as Record<string, unknown>)['status'] = newStatus;
  (finding as Record<string, unknown>)['decidedBy'] = actor;
  (finding as Record<string, unknown>)['decidedAt'] = new Date().toISOString();
  (finding as Record<string, unknown>)['decisionReason'] = reason;

  const row = appendRow(_ledger!, {
    at: new Date().toISOString(),
    actor,
    action: `finding.${action}`,
    entity: 'Finding',
    entityId: findingId,
    payload: { appId, findingId, action, reason },
  });

  const patch = loadPatch();
  patch.decisions.push({ appId, findingId, action, actor, reason, at: row.at });
  savePatch(patch);
  _patch = patch;

  return row;
}

export function applyCorrection(
  appId: string,
  factId: string,
  correctedValue: string | number,
  officer: string,
): Fact {
  const ds = getDatasetInternal();
  const fact = ds.facts.find((f) => f.id === factId && f.applicationId === appId);
  if (!fact) throw new Error(`Fact ${factId} not found`);

  (fact as Record<string, unknown>)['value'] = correctedValue;
  (fact as Record<string, unknown>)['quarantine'] = null;

  appendRow(_ledger!, {
    at: new Date().toISOString(),
    actor: officer,
    action: 'fact.corrected',
    entity: 'Fact',
    entityId: factId,
    payload: { appId, factId, correctedValue },
  });

  const patch = loadPatch();
  patch.corrections.push({ factId, correctedValue, officer, at: new Date().toISOString() });
  savePatch(patch);
  _patch = patch;

  return fact;
}

export function tamperLedgerRow(seq: number, patch: Record<string, unknown>): AuditRow {
  getDatasetInternal(); // ensure initialized
  const row = tamperRow(_ledger!, seq, patch);

  const p = loadPatch();
  p.tamperedRows.push({ seq, patch });
  savePatch(p);
  _patch = p;

  return row;
}

export function releaseLetter(appId: string, releasedBy: string): LetterDraft {
  const ds = getDatasetInternal();
  const letter = ds.letters.find((l) => l.applicationId === appId);
  if (!letter) throw new Error(`Letter for ${appId} not found`);

  const releasedAt = new Date().toISOString();
  (letter as Record<string, unknown>)['releasedBy'] = releasedBy;
  (letter as Record<string, unknown>)['releasedAt'] = releasedAt;

  appendRow(_ledger!, {
    at: releasedAt,
    actor: releasedBy,
    action: 'letter.released',
    entity: 'Letter',
    entityId: appId,
    payload: { appId, releasedBy },
  });

  const p = loadPatch();
  p.letterReleases.push({ appId, releasedBy, releasedAt });
  savePatch(p);

  return letter;
}

export function resetToSeed(): void {
  _ds = null;
  _ledger = null;
  _patch = null;
  try {
    const fp = patchFilePath();
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  } catch {
    // non-fatal
  }
}

export function getVerifyResult(): ReturnType<typeof verifyChain> {
  getDatasetInternal();
  return verifyChain(_ledger!);
}

export function getDailyDigest(): ReturnType<typeof dailyDigest> {
  getDatasetInternal();
  return dailyDigest(_ledger!);
}
