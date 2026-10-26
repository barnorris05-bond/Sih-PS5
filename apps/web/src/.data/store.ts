/**
 * Singleton in-memory dataset store with atomic persistence, versioned caching,
 * and Server-Sent Events broadcasting.
 * Server-side only — never import from client components.
 */
import path from 'node:path';
import fs from 'node:fs';
import { assembleDataset, type Dataset } from '@evidencegraph/fixtures';
import { loadRulePack, verifyChain, dailyDigest, tamperRow, appendRow, applyCorrection as applyFactCorrection } from '@evidencegraph/engine';
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

// ---- Typed Store Events (for Server-Sent Events) ----

export type StoreEvent =
  | { type: 'finding.updated'; payload: { appId: string; findingId: string; status: string; actor: string } }
  | { type: 'fact.corrected'; payload: { appId: string; factId: string; replacementFactId: string; correctedValue: string | number } }
  | { type: 'decision.recorded'; payload: { appId: string; findingId: string; action: string; actor: string } }
  | { type: 'ledger.appended'; payload: { seq: number; action: string; at: string } }
  | { type: 'verification.updated'; payload: { appId: string; attemptId: string; status: string } }
  | { type: 'dataset.reset'; payload: { at: string } };

type Listener = (event: StoreEvent) => void;
const _listeners = new Set<Listener>();

export function subscribeToStoreEvents(listener: Listener): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

export function broadcastStoreEvent(event: StoreEvent): void {
  for (const listener of _listeners) {
    try {
      listener(event);
    } catch {}
  }
}

// ---- Persistence with Atomic Writes & Mutex Queue ----

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

let _writeQueue = Promise.resolve();

function savePatch(p: StorePatch): void {
  _writeQueue = _writeQueue.then(async () => {
    try {
      const fp = patchFilePath();
      const dir = path.dirname(fp);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmpPath = `${fp}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(p, null, 2), 'utf8');
      fs.renameSync(tmpPath, fp);
    } catch {
      // non-fatal in demo
    }
  });
}

// ---- Singleton & Versioned Derived-Data Cache ----

let _ds: Dataset | null = null;
let _ledger: AuditRow[] | null = null;
let _patch: StorePatch | null = null;
let _datasetVersion = 1;
let _cachedMetrics: { version: number; data: MetricBoard } | null = null;
let _cachedSummaries: { version: number; data: ApplicationSummary[] } | null = null;

export function getDatasetVersion(): number {
  return _datasetVersion;
}

function getRulesDir(): string {
  if (process.env['RULES_DIR']) {
    const custom = path.resolve(process.cwd(), process.env['RULES_DIR']);
    if (fs.existsSync(custom)) return custom;
  }
  // Candidate 1: root is cwd
  const rootCand = path.resolve(process.cwd(), 'rules', 'aph-2024-27');
  if (fs.existsSync(rootCand)) return rootCand;

  // Candidate 2: cwd is apps/web
  const monorepoCand = path.resolve(process.cwd(), '..', '..', 'rules', 'aph-2024-27');
  if (fs.existsSync(monorepoCand)) return monorepoCand;

  // Candidate 3: relative to this file
  const relativeCand = path.resolve(__dirname, '..', '..', '..', 'rules', 'aph-2024-27');
  if (fs.existsSync(relativeCand)) return relativeCand;

  return rootCand;
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
      const { original, replacement } = applyFactCorrection(fact, { value: c.correctedValue, officer: c.officer, at: c.at });
      Object.assign(fact, original);
      _ds.facts.push(replacement);
      appendRow(_ledger!, {
        at: c.at,
        actor: c.officer,
        action: 'fact.corrected',
        entity: 'Fact',
        entityId: replacement.id,
        payload: { appId: fact.applicationId, factId: fact.id, replacementFactId: replacement.id, correctedValue: c.correctedValue },
      });
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
  if (_cachedSummaries && _cachedSummaries.version === _datasetVersion) {
    return _cachedSummaries.data;
  }
  const summaries = getDatasetInternal().summaries;
  _cachedSummaries = { version: _datasetVersion, data: summaries };
  return summaries;
}

export function getSummary(id: string): ApplicationSummary | undefined {
  return getApplicationSummaries().find((s) => s.id === id);
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
  const institutionNode = ds.graphNodes.find((n) => n.id === appId);
  if (!institutionNode) return { nodes: [], edges: [] };

  const directEdges = ds.graphEdges.filter((e) => e.source === appId || e.target === appId);
  const neighborIds = new Set<string>([appId]);
  for (const e of directEdges) {
    neighborIds.add(e.source);
    neighborIds.add(e.target);
  }
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
  if (_cachedMetrics && _cachedMetrics.version === _datasetVersion) {
    return _cachedMetrics.data;
  }
  const ds = getDatasetInternal();
  const metrics = computeMetrics({
    institutions: ds.institutions,
    documents: ds.documents,
    facts: ds.facts,
    findings: ds.findings,
    verifications: ds.verifications,
    runs: ds.runs,
  });
  _cachedMetrics = { version: _datasetVersion, data: metrics };
  return metrics;
}

// ---- Case Workspace Section Aggregations ----

export interface CaseHeader {
  id: string;
  institutionId: string;
  institutionName: string;
  applicationType: string;
  priorityScore: number;
  priorityRank: number;
  status: string;
  deadlineHoursLeft: number;
  reasons: string[];
  counts: {
    documents: number;
    mismatches: number;
    checks: number;
    connections: number;
  };
  findingsSummary: {
    total: number;
    accepted: number;
    dismissed: number;
    pending: number;
  };
  nextStep: {
    label: string;
    section: 'summary' | 'documents' | 'mismatches' | 'checks' | 'connections' | 'report';
  };
}

export function getCaseHeader(id: string): CaseHeader | undefined {
  const summary = getSummary(id);
  if (!summary) return undefined;

  const docs = getDocuments(id);
  const mismatches = getConflicts(id);
  const checks = getVerifications(id);
  const connections = getGraph(id);
  const findings = getFindings(id);

  const accepted = findings.filter((f) => (f as Record<string, unknown>)['status'] === 'accepted').length;
  const dismissed = findings.filter((f) => (f as Record<string, unknown>)['status'] === 'dismissed').length;
  const pending = findings.length - accepted - dismissed;

  let nextStep: CaseHeader['nextStep'] = {
    label: 'Prepare decision & notice',
    section: 'report',
  };

  if (pending > 0) {
    if (mismatches.length > 0) {
      nextStep = { label: `Review ${mismatches.length} mismatch${mismatches.length > 1 ? 'es' : ''}`, section: 'mismatches' };
    } else if (docs.length > 0) {
      nextStep = { label: 'Review required documents', section: 'documents' };
    }
  } else if (checks.some((c) => c.status === 'source_unavailable' || c.status === 'mismatch')) {
    nextStep = { label: 'Review official checks', section: 'checks' };
  }

  // Calculate rank based on triageScore (higher score = higher rank/priority)
  const allSummaries = getApplicationSummaries();
  const sorted = [...allSummaries].sort((a, b) => b.triageScore - a.triageScore);
  const priorityRank = sorted.findIndex((s) => s.id === id) + 1;

  return {
    id: summary.id,
    institutionId: summary.institution.id,
    institutionName: summary.institution.name,
    applicationType: summary.institution.category,
    priorityScore: summary.triageScore,
    priorityRank,
    status: summary.status,
    deadlineHoursLeft: summary.slaHoursLeft,
    reasons: summary.triageReasons,
    counts: {
      documents: docs.length,
      mismatches: mismatches.length,
      checks: checks.length,
      connections: connections.nodes.length,
    },
    findingsSummary: {
      total: findings.length,
      accepted,
      dismissed,
      pending,
    },
    nextStep,
  };
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

  _datasetVersion++;
  _cachedMetrics = null;
  _cachedSummaries = null;

  broadcastStoreEvent({
    type: 'decision.recorded',
    payload: { appId, findingId, action, actor },
  });
  broadcastStoreEvent({
    type: 'finding.updated',
    payload: { appId, findingId, status: newStatus, actor },
  });
  broadcastStoreEvent({
    type: 'ledger.appended',
    payload: { seq: row.seq, action: row.action, at: row.at },
  });

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
  if (fact.supersededBy) throw new Error(`Fact ${factId} has already been superseded`);

  const at = new Date().toISOString();
  const { original, replacement } = applyFactCorrection(fact, { value: correctedValue, officer, at });
  Object.assign(fact, original);
  ds.facts.push(replacement);

  const row = appendRow(_ledger!, {
    at,
    actor: officer,
    action: 'fact.corrected',
    entity: 'Fact',
    entityId: replacement.id,
    payload: { appId, factId, replacementFactId: replacement.id, correctedValue },
  });

  const patch = loadPatch();
  patch.corrections.push({ factId, correctedValue, officer, at });
  savePatch(patch);
  _patch = patch;

  _datasetVersion++;
  _cachedMetrics = null;
  _cachedSummaries = null;

  broadcastStoreEvent({
    type: 'fact.corrected',
    payload: { appId, factId, replacementFactId: replacement.id, correctedValue },
  });
  broadcastStoreEvent({
    type: 'ledger.appended',
    payload: { seq: row.seq, action: row.action, at: row.at },
  });

  return replacement;
}

export function tamperLedgerRow(seq: number, patch: Record<string, unknown>): AuditRow {
  getDatasetInternal(); // ensure initialized
  const row = tamperRow(_ledger!, seq, patch);

  const p = loadPatch();
  p.tamperedRows.push({ seq, patch });
  savePatch(p);
  _patch = p;

  _datasetVersion++;
  _cachedMetrics = null;

  broadcastStoreEvent({
    type: 'ledger.appended',
    payload: { seq: row.seq, action: 'ledger.tampered', at: row.at },
  });

  return row;
}

export function releaseLetter(appId: string, releasedBy: string): LetterDraft {
  const ds = getDatasetInternal();
  const letter = ds.letters.find((l) => l.applicationId === appId);
  if (!letter) throw new Error(`Letter for ${appId} not found`);

  const releasedAt = new Date().toISOString();
  (letter as Record<string, unknown>)['releasedBy'] = releasedBy;
  (letter as Record<string, unknown>)['releasedAt'] = releasedAt;

  const row = appendRow(_ledger!, {
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

  _datasetVersion++;

  broadcastStoreEvent({
    type: 'ledger.appended',
    payload: { seq: row.seq, action: row.action, at: row.at },
  });

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
  _datasetVersion++;
  _cachedMetrics = null;
  _cachedSummaries = null;

  broadcastStoreEvent({
    type: 'dataset.reset',
    payload: { at: new Date().toISOString() },
  });
}

export function getVerifyResult(): ReturnType<typeof verifyChain> {
  getDatasetInternal();
  return verifyChain(_ledger!);
}

export function getDailyDigest(): ReturnType<typeof dailyDigest> {
  getDatasetInternal();
  return dailyDigest(_ledger!);
}
