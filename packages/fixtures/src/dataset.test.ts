import { describe, expect, it } from "vitest";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { INSTITUTIONS, FAULT_MATRIX } from "./institutions.js";
import { loadRulePack } from "../../engine/src/rules.js";
import { assembleDataset } from "./assemble.js";
import type { Rule, Finding } from "@evidencegraph/domain";
import type { Dataset } from "./assemble.js";

const RULE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../rules/aph-2024-27");
const rules: Rule[] = loadRulePack(RULE_DIR) as Rule[];
const dataset = assembleDataset(rules);

const byApp = (app: string, list: Finding[]) => list.filter((f) => f.applicationId === app);
const instIds = INSTITUTIONS.map((i) => i.id);
const faultApps: string[] = Array.from(new Set<string>(FAULT_MATRIX.flatMap((f) => f.institutions as readonly string[])));
const controlApps = instIds.filter((id) => !faultApps.includes(id));

describe("dataset assembly", () => {
  it("builds every application, document, fact and verification", () => {
    expect(dataset.institutions.length).toBe(12);
    expect(dataset.documents.length).toBeGreaterThan(60);
    expect(dataset.facts.length).toBeGreaterThan(120);
    expect(dataset.verifications.length).toBeGreaterThan(24);
    expect(dataset.rules.length).toBe(rules.length);
  });

  it("is deterministic: assembling twice yields byte-identical JSON", () => {
    const again = assembleDataset(loadRulePack(RULE_DIR) as Rule[]);
    void again;
    const a = JSON.stringify(stripLatency(dataset));
    const b = JSON.stringify(stripLatency(assembleDataset(loadRulePack(RULE_DIR) as Rule[])));
    expect(b).toBe(a);
  });
});

function stripLatency(ds: Dataset): unknown {
  // latencyMs is a scheduled MOCK latency, deterministic per ref but the two
  // assemblies must not be allowed to differ only by that; they do not.
  return JSON.parse(JSON.stringify(ds));
}

describe("the 13 planted faults are all observable", () => {
  const cases: Array<{ n: number; app: string; match: (f: Finding, ds: Dataset) => boolean }> = [
    { n: 1, app: "EOA-2026-0142", match: (f) => f.ruleId === "FORENSICS.PDF_STRUCTURE" && f.findingClass === "anomaly_signal" },
    { n: 2, app: "EOA-2026-0142", match: (f) => f.ruleId === "land_area_form_vs_deed" && f.findingClass === "potential_discrepancy" },
    { n: 3, app: "EOA-2026-0117", match: (f) => f.ruleId === "ghost_faculty_cross_institution" && f.findingClass === "potential_discrepancy" },
    { n: 3, app: "INTK-2026-0208", match: (f) => f.ruleId === "ghost_faculty_cross_institution" && f.findingClass === "potential_discrepancy" },
    { n: 4, app: "EOA-2026-0117", match: (f) => f.ruleId === "fdr_single_pledge" && f.findingClass === "anomaly_signal" && f.crossApplication },
    { n: 4, app: "NEW-2026-0031", match: (f) => f.ruleId === "fdr_single_pledge" && f.findingClass === "anomaly_signal" },
    { n: 5, app: "EOA-2026-0187", match: (f) => f.findingClass === "anomaly_signal" && /classroom|photo/i.test(f.ruleId + f.summary) },
    { n: 6, app: "INTK-2026-0208", match: (f) => f.findingClass === "anomaly_signal" && /seal/i.test(f.summary) },
    { n: 7, app: "INTK-2026-0229", match: (f) => f.ruleId === "trust_affidavit_presence" && f.findingClass === "completeness_gap" },
    { n: 8, app: "NEW-2026-0058", match: (f) => f.ruleId === "bcc_validity" && f.findingClass === "validity_gap" },
    { n: 9, app: "INTK-2026-0208", match: (f) => f.ruleId === "degree_holder_matches_registry" },
    { n: 10, app: "NEW-2026-0031", match: (f) => f.ruleId === "FORENSICS.PDF_STRUCTURE" && f.findingClass === "anomaly_signal" },
    { n: 11, app: "EOA-2026-0117", match: () => true }, // confidence gate failure is an event; asserted below
    { n: 12, app: "NEW-2026-0058", match: (f) => f.findingClass === "anomaly_signal" && /instruction|injection|hidden/i.test(f.ruleId + f.summary) },
    // Fault 13 surfaces as the connector staying source_unavailable (circuit breaker), not as a finding.
    { n: 13, app: "NEW-2026-0058", match: (_f, ds) => ds.verifications.some((v) => v.connector === "fire_department" && v.applicationId === "NEW-2026-0058" && v.status === "source_unavailable" && v.isMock) },
  ];

  for (const c of cases) {
    it(`fault ${c.n} (${c.app}) surfaces in the expected way`, () => {
      const found = byApp(c.app, dataset.findings).some((f) => c.match(f, dataset));
      expect(found, `fault ${c.n} on ${c.app}: findings=${JSON.stringify(dataset.findings.map((f) => ({ app: f.applicationId, rule: f.ruleId, cls: f.findingClass })))}`).toBe(true);
    });
  }

  it("fault 11 (blurred roster) is held at the confidence gate, never a mismatch", () => {
    const held = dataset.facts.filter((f) => f.applicationId === "EOA-2026-0117" && f.key === "faculty.roster_count" && f.quarantine);
    expect(held.length).toBe(1);
    const mismatch = dataset.findings.filter((f) => f.applicationId === "EOA-2026-0117" && f.ruleId === "faculty_count_form_vs_roster");
    expect(mismatch).toEqual([]);
  });

  it("fault 13 (fire department offline) leaves the verification pending with a MOCK circuit breaker", () => {
    const noAnswer = dataset.verifications.filter((v) => v.applicationId === "NEW-2026-0058" && v.connector === "fire_department");
    expect(noAnswer.length).toBe(1);
    expect(noAnswer[0]?.status).toBe("source_unavailable");
    expect(noAnswer[0]?.isMock).toBe(true);
  });

  it("fault 9 shows a verification mismatch against the record", () => {
    const v = dataset.verifications.filter((x) => x.applicationId === "INTK-2026-0208" && x.connector === "digilocker_nad");
    expect(v.length).toBeGreaterThanOrEqual(1);
    // The certificate's holder disagrees with the NAD record — that IS the fault.
    expect(v[0]?.status).toBe("mismatch");
  });
});

describe("fault 3 and 4 evidence anchors", () => {
  it("ghost-faculty findings cite the roster-entry facts of BOTH member rosters", () => {
    for (const app of ["INTK-2026-0208", "EOA-2026-0117"]) {
      const ghost = byApp(app, dataset.findings).filter((f) => f.ruleId === "ghost_faculty_cross_institution");
      expect(ghost.length).toBeGreaterThanOrEqual(1);
      for (const f of ghost) {
        expect(f.evidence.length).toBeGreaterThanOrEqual(2);
        const factsById = new Map(dataset.facts.map((x) => [x.id, x]));
        for (const e of f.evidence) {
          const fact = e.kind === "fact_ref" ? factsById.get(e.factId) : undefined;
          expect(fact, `${e.kind} pointer ${"factId" in e ? e.factId : e.kind} must resolve`).toBeDefined();
          if (!fact) continue;
          expect(fact.key).toBe("faculty.roster_entry");
          expect(["INTK-2026-0208", "EOA-2026-0117"]).toContain(fact.applicationId);
          expect(fact.documentId, "roster entry must come from a stored document").not.toBeNull();
          expect(fact.page).not.toBeNull();
          expect(fact.bbox).not.toBeNull();
        }
      }
    }
  });

  it("reused-FDR findings cite the FDR facts with their crops on both members", () => {
    for (const app of ["EOA-2026-0117", "NEW-2026-0031"]) {
      const reuse = byApp(app, dataset.findings).filter((f) => f.ruleId === "fdr_single_pledge");
      expect(reuse.length).toBeGreaterThanOrEqual(1);
      for (const f of reuse) {
        expect(f.evidence.length).toBeGreaterThanOrEqual(2);
        const factsById = new Map(dataset.facts.map((x) => [x.id, x]));
        for (const e of f.evidence) {
          const fact = e.kind === "fact_ref" ? factsById.get(e.factId) : undefined;
          expect(fact).toBeDefined();
          if (!fact) continue;
          expect(fact.key).toBe("fdr.ref");
          expect(["EOA-2026-0117", "NEW-2026-0031"]).toContain(fact.applicationId);
          expect(fact.page).not.toBeNull();
          expect(fact.bbox).not.toBeNull();
        }
        expect(f.crossApplication).toBe(true);
      }
    }
  });
});

describe("five clean controls", () => {
  it("have zero high-severity findings", () => {
    const highs = controlApps.flatMap((id) => byApp(id, dataset.findings)).filter((f) => f.severity === "high");
    expect(highs.map((f) => ({ app: f.applicationId, rule: f.ruleId, summary: f.summary }))).toEqual([]);
  });

  it("every application carries evidence-backed findings with resolvable pointers", () => {
    const factIds = new Set(dataset.facts.map((f) => f.id));
    const orphans = dataset.findings.flatMap((f) =>
      f.evidence.flatMap((e) => (e.kind !== "fact_ref" || e.factId === "none" ? [] : factIds.has(e.factId) ? [] : [{ finding: f.id, evidence: e.factId }])),
    );
    expect(orphans).toEqual([]);
  });
});
