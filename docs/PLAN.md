# PLAN — EvidenceGraph prototype build

## Folder layout

```
/apps/web            Next.js App Router (TS strict) — the whole UI + route handlers
/packages/domain     zod schemas + TS types mirroring spec §06/§07 (two-axis model)
/packages/engine     rule engine, cross-check, critic, confidence gate, ledger, triage, connectors (pure, no UI imports)
/packages/fixtures   seeded generator + typed fixture dataset (12 institutions, 13 faults, 5 clean controls, pages, entities, run timelines)
/rules/aph-2024-27   one YAML file per rule, each carrying a `tests:` block
/docs                SPEC_DIGEST.md, PLAN.md, ASSUMPTIONS.md, DEMO_SCRIPT.md
/scripts             run via pnpm scripts: generate-fixtures, check-contrast, grep-pii, verify-ledger
```

Shared packages live as plain source folders; they are consumed through TypeScript path
aliases (`@domain/*`, `@engine/*`, `@fixtures/*`) by both the Next.js app (via
`transpilePackages`-style compilation) and vitest (via alias config). This keeps the
workspace installable with one `pnpm install` on a laptop without a build step per package,
and keeps `packages/engine` free of UI imports (it can later sit behind FastAPI).

## Phases

1. **Foundations** — workspace, TS configs, tokens, theme toggle, app shell, role switcher, domain schemas.
2. **Fixtures + engine** — seeded generator for 12 institutions (7 faulty, 5 clean controls), all documents/pages/facts, entity graph, run timelines; rule engine (safe expression evaluator — no `eval`/`new Function`), YAML rule loader + tests, cross-check, critic, confidence gate, mock connector registry, SHA-256 ledger, triage.
3. **Workspace UI** — `/queue` (triage order, top-3 reasons, SLA, filters), `/applications/[id]` evidence split view (synthetic page viewer + bbox overlays + finding→evidence jump), conflict view, decision bar with mandatory reason.
4. **Depth views** — graph neighbourhood + Cypher drawer, verification timeline with MOCK labels, report + deficiency letter, `/self-check/[id]`.
5. **Operations** — `/pipeline/[runId]` replay, `/rules` admin (editor, live tests, version diff + replay, second-approval publish), `/ledger` (verify, tamper demo, signed digest), `/metrics` (computed from fixtures at runtime).
6. **Presenter + polish** — `/demo` beats, keyboard shortcuts (J/K/Enter/A/D/E/G// /Esc), skeletons, reduced motion, empty states, a11y pass.
7. **Verification** — full §8 acceptance run, README + `docs/DEMO_SCRIPT.md`.

## Real vs simulated

Real: YAML rule engine + rule tests, rule replay, cross-check, Critic, confidence gate,
triage, SHA-256 hash-chained ledger (tamper genuinely breaks it), RBAC policy, the
system-cannot-send rule, forbidden-words guard. Simulated and labelled MOCK everywhere:
OCR/LLM extraction, vision similarity, issuer connectors, Neo4j/Qdrant (in-memory behind
the same query interface, real Cypher shown in a drawer), and the agent-graph run
(deterministic replay timeline, not live execution).

## Verification gates

`pnpm typecheck && pnpm lint && pnpm test && pnpm build` plus the fixture fault matrix
(13 faults, exact classes/statuses; 5 controls, zero high-severity), contrast script in
both themes, PII grep (no 12-digit Aadhaar-like patterns anywhere), and a Playwright walk
of the six-minute demo.
