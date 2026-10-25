# EvidenceGraph

EvidenceGraph is a synthetic prototype of an evidence-linked validation layer beside the AICTE approval portal. It demonstrates configurable rules, cross-application checks, source verification states, human review and an audit ledger. It does not connect to AICTE or external issuer services.

## Run locally

Requires Node.js 24 and pnpm 12.9.1 (the version in `package.json`). From the repository root:

```powershell
pnpm install
pnpm dev
```

Open `http://localhost:3100`. Use the **Demo role switch** in the header to change roles. The controls exercise the same role policy at the API boundary.

Useful checks:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify
```

The seed is deterministic and contains 12 fictional institutions: seven with planted scenarios and five clean controls. No real applicant data is used.

## Demo roles

| Role | What the prototype shows |
|---|---|
| Scrutiny officer | Queue, application evidence, decisions and confidence corrections |
| Senior reviewer | Escalations and release approval for draft letters |
| Rule administrator | Rule pack and rule test view |
| Auditor | Ledger, replay and metrics |
| Institution applicant | Own institution’s self-check list |

Demo roles are selected with a request header and are not an identity provider. Applicant access is pinned to a synthetic institution.

## Real vs simulated

| Capability | Implementation in this prototype |
|---|---|
| Rule engine | Real deterministic YAML loading, safe expression evaluation, confidence routing and per-rule tests |
| Cross-check | Real deterministic matching and graph overlap on in-memory fixture data; Neo4j is not connected |
| Critic | Real schema, evidence, rule-version, wording and absence-receipt checks over the fixture store |
| Confidence gate | Real correction and supersession logic over in-memory facts; OCR confidence values are precomputed |
| Ledger | Real SHA-256 hash-chain verification and tamper detection; the daily demo digest uses a fixed demo key |
| Role checks | Real API policy checks for the five demo roles; there is no OIDC provider or production identity store |
| OCR, LLM and vision | Simulated with deterministic extracted facts, page layouts and similarity results |
| Issuer connectors | Simulated registry responses behind the connector interface; every result is marked `isMock` |
| Neo4j and Qdrant | In-memory graph and similarity fixtures; Cypher is displayed as a read-only example |
| Page crops | Synthetic document page geometry and crop references; no original PDFs are stored |

APH clause references that the team has not confirmed remain marked `[fill in]` in the rules and UI.
