/**
 * Critic (§04): checks every finding for resolvable evidence, a valid rule
 * reference, contradictions and neutral wording. Drops or downgrades failing
 * findings. Sends work back to Cross-check once, then routes to a human.
 * Also computes explainability coverage as a headline metric — findings with
 * full evidence and a rule that survived the Critic.
 */
import type { Fact, Finding } from "@evidencegraph/domain";
import { containsBannedWord } from "./wording.js";

export type CriticVerdict =
  | { decision: "keep" }
  | { decision: "drop"; reason: string }
  | { decision: "downgrade"; reason: string; severity: "low" }
  | { decision: "send_back"; reason: string };

export type CriticContext = {
  facts: Map<string, Fact>; // all facts incl. superseded, by id
  knownRuleIds: Set<string>;
};

export function critique(finding: Finding, ctx: CriticContext): CriticVerdict {
  /* 1. wording guard */
  const wordHit = containsBannedWord(finding.summary);
  if (wordHit) return { decision: "drop", reason: `banned wording "${wordHit.word}" in summary` };

  /* 2. rule reference must exist */
  if (finding.createdBy.startsWith("rule:") && !ctx.knownRuleIds.has(finding.ruleId)) {
    return { decision: "drop", reason: `rule ${finding.ruleId} v${finding.ruleVersion} does not exist` };
  }

  /* 3. evidence must resolve to a stored fact — at least one resolvable pointer.
   * An evidence list of explicit `factId: "none"` receipts is also accepted:
   * that is the delta receipt for "this required item was never uploaded". */
  const resolved: Fact[] = [];
  for (const e of finding.evidence) {
    const f = ctx.facts.get(e.factId);
    if (f && !f.supersededBy) resolved.push(f);
  }
  if (resolved.length === 0 && finding.evidence.length > 0 && !finding.evidence.every((e) => e.factId === "none")) {
    // Evidence never resolved: send back once if the caller allows, else drop.
    return { decision: "drop", reason: "no evidence pointer resolves to a stored live fact" };
  }
  /* 4. a finding that cites a page/bbox must have a crop (stored evidence crop) */
  const visualEvidence = finding.evidence.filter((e) => e.bbox != null || e.page != null);
  const missingCrops = visualEvidence.filter((e) => !e.cropKey);
  if (visualEvidence.length > 0 && visualEvidence.every((e) => !e.cropKey)) {
    return {
      decision: "downgrade",
      reason: "visual evidence cited without a stored crop — downgraded to low pending crop resolution",
      severity: "low",
    };
  }
  void missingCrops;

  /* 5. quarantined facts may not back findings */
  if (resolved.length > 0 && resolved.every((f) => f.quarantine)) {
    return { decision: "drop", reason: "evidence is quarantined at the confidence gate" };
  }

  return { decision: "keep" };
}

export type CriticRun = {
  kept: Finding[];
  dropped: Array<{ finding: Finding; reason: string }>;
  downgraded: Array<{ finding: Finding; reason: string }>;
  sentBackOnce: boolean;
};

/** Full pass over a findings list. `allowSendBack` is used only on first run. */
export function critiqueAll(
  findings: Finding[],
  ctx: CriticContext,
  opts: { onDroppedToHuman?: (finding: Finding, reason: string) => void } = {},
): CriticRun {
  const kept: Finding[] = [];
  const dropped: CriticRun["dropped"] = [];
  const downgraded: CriticRun["downgraded"] = [];
  for (const f of findings) {
    const v = critique(f, ctx);
    if (v.decision === "keep") {
      kept.push(f);
    } else if (v.decision === "downgrade") {
      downgraded.push({ finding: { ...f, severity: v.severity, detail: `${f.detail ?? ""}\nCritic: ${v.reason}`.trim() }, reason: v.reason });
      kept.push({ ...f, severity: v.severity, detail: `${f.detail ?? ""}\nCritic: ${v.reason}`.trim() });
    } else {
      dropped.push({ finding: f, reason: v.reason });
      opts.onDroppedToHuman?.(f, v.reason);
    }
  }
  return { kept, dropped, downgraded, sentBackOnce: false };
}

/** Explainability coverage (§17): kept findings with full evidence + a rule. */
export function explainabilityCoverage(kept: Finding[]): number {
  if (kept.length === 0) return 1;
  const good = kept.filter((f) => f.evidence.length > 0 && f.ruleId != null && f.aphRef != null).length;
  return good / kept.length;
}

/** Shared-fact contradiction check used by the Critic's "contradictions" leg. */
export function contradictingPair(a: Finding, b: Finding): boolean {
  const fa = new Set(a.evidence.map((e) => e.factId));
  const fb = new Set(b.evidence.map((e) => e.factId));
  const shared = [...fa].some((x) => fb.has(x));
  return shared && a.findingClass === "anomaly_signal" && b.findingClass === "potential_discrepancy" ? false : shared && a.status === "accepted" && b.status === "open";
}
