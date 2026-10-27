# Known Limitations — EvidenceGraph (Round 2)

Stated plainly. Nothing in this list is hidden from the UI.

## Storage and process model

- **Single-process store.** All state lives in one Node process: a deterministic
  fixture dataset loaded at startup plus a JSON patch file (`apps/web/src/.data/`)
  for mutations and the piecemeal ledger. Dev-server restarts that run against a
  different patch state will show it. There is no database or multi-instance
  story; concurrency beyond one officer is out of scope for the prototype.
- **Demo reset shared state.** Reset demo data clears the patch file for every
  connected client, not per session.

## Simulated against the spec

- **OCR / vision / LLM** are simulated extraction pipelines over synthetic
  documents; "confidence" values and ELA-style forensic signals are fixture data,
  not model output.
- **Issuer connectors** are mocks: six statuses exist and retries/backoff/circuit
  breaker behaviour is real code, but no live AP/NAD/board endpoint is contacted.
- **Neo4j and Qdrant** are replaced by an in-memory fixture graph and similarity
  lists with the same interface shape; Cypher queries shown in the drawer are the
  spec's text, executed pre-computed on the fixture graph, not in Neo4j.
- **RBAC is header-based.** Roles are claimed via `x-eg-role` (or the demo role
  switch), and the API trusts it. There is no login; production would replace
  this with an identity provider + server-side session checks.
- **Rate limiting** is an in-memory per-instance counter in middleware.

## Real code with demo inputs

- **Rule engine, Critic, cross-check, triage, confidence gate, hash-chained
  ledger** are real deterministic code paths, executed against planted fixture
  faults (13 faults, 5 clean controls). Metrics are computed from those runs, not
  hard-coded.

## Known UX boundaries

- Graph view renders only the per-application neighbourhood, not the full
  dataset-wide graph.
- The applicant self-check deliberately returns 403 for forensic data, triage
  internals and other institutions' data; it shows only the fix list.
- Metrics reflect the fixture dataset only; they are not live product telemetry.
- Accessibility: axe sweep is clean for serious/critical issues across all
  primary routes; moderate/minor findings may remain and are not tracked
  individually.
