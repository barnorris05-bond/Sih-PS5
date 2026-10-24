# AUDIT_STATE.md — Phase A ground truth (2026-10-24)

All observations below are from disk state and live command output on this date,
working tree `main`, commit `817154b` (docs) → `d522414` after the Phase A tooling
commit. Nothing here is taken from earlier chat summaries.

## 1. Repo layout (all source files, node_modules/.next excluded)

```
EvidenceGraph Architecture.html     spec (authoritative, untouched)
EvidenceGraph_Agent_Prompt.md       build prompt
package.json / pnpm-workspace.yaml  workspace root (pnpm 12.9.1)
apps/web/                           Next.js 15 app (route group "(routes)")
  src/app/(routes)/                 queue, applications/[id]/*

  9 tabs), self-check/[id], pipeline/[runId], rules, ledger, metrics, demo
  src/app/api/                      13 route groups (applications CRUD, facts,
                                    findings, verifications, conflicts, graph,
                                    pipeline, letter, decision, fact-correction,
                                    rules, ledger+verify, metrics, demo-reset)
  src/components/{atoms,molecules,features}/  10 + 4 + 14 components
  src/lib/, src/store/              constants/format/cn; zustand role+ui stores
  src/.data/store.ts                singleton dataset store backed by fixtures
packages/domain/                    zod schemas + TS types
packages/engine/                    rules, expr, critic, crosscheck, triage,
                                    confidence, connectors, ledger, metrics,
                                    similarity, wording, injection
packages/fixtures/                  institutions/docs/assemble/rng + dataset.test
rules/aph-2024-27/                  9 YAML rule files
docs/                               SPEC_DIGEST, PLAN, ASSUMPTIONS, DEMO_SCRIPT,
                                    AUDIT_STATE (this file)
```

File count at audit time: 126 source files under apps/packages/rules/docs/scripts.

## 2. Raw command results

```
$ pnpm install            → Already up to date. Done in 22ms (skip resolution)
```

First-run state actually found and fixed during Phase A (all verified by re-run):

| Command | First observed result | Fix | Result now |
|---|---|---|---|
| `pnpm typecheck` | exit 1: `'tsc' is not recognized` (typescript only installed in apps/web, root script runs tsc 4×) | add `typescript@^5.9.3` to workspace root devDeps | exit 0 |
| (then) typecheck round 2 | exit 2: `Cannot find module 'vitest'` in packages/engine tests | add `vitest@^2.1.9` to workspace root devDeps | — |
| (then) typecheck round 3 | exit 2: `expr.test.ts(20,40) Type '{ count: number; }' is not assignable to type 'ExprValue'`; also `dataset.test.ts(17,64)` const-tuple union widening | `expr.ts`: introduce `ExprVars = Record<string, ExprValue \| Record<string, ExprValue>>` (evaluator already supported nested-object vars — code at expr.ts:316-328 did dotted fallback), widen `evalNode`/`evalExpr` signatures; `dataset.test.ts`: type the `faultApps` local (test types only, no expectation change) | `pnpm typecheck` exit 0, no errors |
| `pnpm lint` | interactive prompt (no ESLint config anywhere); after config, `Definition for rule '@typescript-eslint/no-explicit-any' was not found` in GraphViewer.tsx (directive comment) | `apps/web/eslint.config.mjs` (FlatCompat + eslint-config-next 15), add `@eslint/eslintrc@^3`, `@typescript-eslint/eslint-plugin/parser@^8`; GraphViewer.tsx: removed an unused duplicate dynamic `import('cytoscape')`, typed the Core handle (`Core \| null`) removing the `any` | `pnpm lint` exit 0 (only the `next lint` deprecation note) |
| `pnpm test` | (see below) | — | 64/64 pass |
| `pnpm build` | exit 0 before the expr fix; after fixes still exit 0, "Compiled successfully in 4.9s", 15/15 static pages | — | exit 0 |

True test count: **64 tests, 5 test files, 0 failed, 0 skipped** (`vitest run` from
workspace root with `--root ../..` semantics preserved):

```
 ✓ packages/engine/src/ledger.test.ts (5 tests) 4ms
 ✓ packages/engine/src/expr.test.ts (13 tests) 5ms
 ✓ packages/engine/src/services.test.ts (13 tests) 6ms
 ✓ packages/engine/src/rules.test.ts (11 tests) 17ms
 ✓ packages/fixtures/src/dataset.test.ts (22 tests) 44ms
 Test Files  5 passed (5)
      Tests  64 passed (64)
```

64 vs 65 discrepancy from earlier reports: a temporary debug probe
(`packages/engine/__dbg_tmp.test.ts` variant naming) existed during that session
and was removed; 5 test files is the true stable count.

## 3. Leftover scan

`grep -rn "TODO|FIXME|XXX|HACK|\.only|it\.skip|describe\.skip|test\.skip|console\.log|debugger"` over
apps/web/src, packages/*/src, rules, docs: **0 hits in source** (test files use
none of the skip/only forms).
Removed during this audit: `packages/engine/.tmp-debug.ts` (probe script that
called `console.log` — leftover from a previous debugging session). Re-scan after
removal clean. No `dbg_tmp*`, no `*.tmp*` files remain. No `@ts-ignore` /
`@ts-expect-error` / `if (false)` in src.

## 4. Route inventory (browser-verified via Chromium against `pnpm dev` on :3100)

Server log: `✓ Ready in 3.3s`, Local http://localhost:3100.

| Route | Browser check | Observed |
|---|---|---|
| `/` | — | (redirects; not separately tested this phase) |
| `/queue` | 200, rendered | Grid of all 12 applications with scores/reasons/SLA/status; `/api/applications` 200; **0 console errors** |
| `/applications/[id]` (+`/overview`,`/page`) | 200 via tab redirect | workspace shell renders |
| `/applications/[id]/evidence` | 200 | facts + documents APIs 200 |
| `/applications/[id]/conflicts` | 200 | conflicts API 200 |
| `/applications/[id]/graph` | 200 | graph API 200, GraphViewer chunk loads |
| `/applications/[id]/verification` | 200 | verifications API 200 |
| `/applications/[id]/forensics` | 200 | findings?class=anomaly_signal API 200 |
| `/applications/[id]/decision` | 200 | decision bar renders |
| `/applications/[id]/letter` | 200 | letter API 200 |
| `/applications/[id]/pipeline` | 200 | pipeline events API 200 (events keyed by application id; `/pipeline/[runId]` page redirects to this route) |
| `/pipeline/[runId]` | redirect verified with a real id (`EOA-2026-0117`); `/pipeline/nonexistent` → app pipeline page returns 404 (correct for unknown application) | |
| `/rules`, `/ledger`, `/metrics`, `/demo` | 200 | no console errors during sweep |
| confidence-gate modal | component exists (`ConfidenceGateModal`), wired in evidence page; **interactive verification deferred to Phase E/F** | |

No failed network calls or blank screens observed during the sweep. The one 404
seen is the correct not-found for a bogus application id.

## 5. Semantic issues found while auditing (work list for Phase B–E)

1. **Systematic false-positive mis-slot findings (fixed during Phase A).** The
   intake completeness loop compared `doc.checklistSlot !== item.key` — comparing
   slot names (`facility_documents`) to checklist row ids (`facility_fire`). Every
   application produced 10 bogus `completeness_gap / INTAKE.SLOT` findings (queue
   showed "10 completeness gaps" on all 12 rows including 5 clean controls, and
   inflated every triage score by a constant). Fix: CHECKLIST rows now declare the
   true expected slot per row; verification: control `EOA-2026-0199` (deliberate
   mis-slot) shows exactly 1 finding; control `EOA-2026-0163` shows 0; faulted
   `EOA-2026-0142` shows 3; full suite still 64/64.
2. Controls now surface *nothing* rather than their documented legitimate
   variation (B8 work ahead).
3. All Phase B engine review items (critic absence receipts, graph evidence
   anchors, scoping normalisation, confidence convention, test-expectation audit,
   fault 7 declarative matrix, fault 13 statuses) still open as listed in the
   round-2 prompt.
