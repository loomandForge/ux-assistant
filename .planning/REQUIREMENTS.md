# Requirements: UX Review Assistant

**Defined:** 2026-05-29
**Core Value:** Turn design feedback into prioritized, evidence-backed actions that reduce risk and accelerate shipping.

## v1 Requirements

### Review Inputs

- [x] **RIN-01**: User can run a structured review from a Figma link.
- [x] **RIN-02**: User can run a structured review from a web URL.
- [x] **RIN-03**: User can run a structured review from an uploaded image file.
- [x] **RIN-04**: Review output includes actionable findings with severity and rationale.

### Challenge Workflow

- [x] **CHL-01**: User can run challenge mode using an existing review runId.
- [x] **CHL-02**: User can run challenge mode directly from input in one call.
- [x] **CHL-03**: Challenge output highlights edge cases, friction risks, and hidden failure modes.

### Improve Workflow

- [x] **IMP-01**: User can run improve mode using an existing review runId.
- [x] **IMP-02**: User can run improve mode directly from input in one call.
- [ ] **IMP-03**: Improve output includes prioritized actions with effort/impact orientation. (partial: prioritized actions available, explicit effort/impact framing not consistently enforced)

### Design System Evidence

- [ ] **DSE-01**: User can provide a Figma design-system link as review context. (partial: Figma input is supported, but DS-link-specific context plumbing is not explicit)
- [x] **DSE-02**: User can configure external MCP design-system search and retrieve component evidence.
- [x] **DSE-03**: User can provide markdown/JSON guideline files as custom design-system context.
- [x] **DSE-04**: User can include image references/moodboards as supplemental style evidence.
- [x] **DSE-05**: If design-system retrieval fails, output reports fallback behavior and confidence.

### Validation Quality

- [ ] **VAL-01**: Visual validation reports confidence and source type for each key finding. (partial: unknown/low-confidence fallback exists; deterministic visual evaluator is not yet implemented)
- [ ] **VAL-02**: Accessibility-related signals (contrast/readability/hierarchy indicators) are represented in findings. (partial: accessibility signal category exists, but deterministic coverage depth is limited)
- [x] **VAL-03**: Core validations preserve deterministic fallback behavior when optional services are unavailable.

## v2 Requirements

### Analytics

- **ANL-01**: User can view trend summaries across multiple reviews.
- **ANL-02**: User can compare quality drift across projects/teams.

### Integrations

- **INT-01**: User can subscribe to design source changes for auto re-review suggestions.
- **INT-02**: User can sync deeper design-system metadata automatically.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time Figma watcher/sync | Too heavy for v1 and not required for immediate consultant workflows |
| Full dashboard product | Valuable but secondary to improving core evidence quality |
| Organization-wide governance portal | Better addressed after per-run reliability and adoption |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RIN-01 | Phase 1 | Complete |
| RIN-02 | Phase 1 | Complete |
| RIN-03 | Phase 1 | Complete |
| RIN-04 | Phase 2 | Complete |
| CHL-01 | Phase 1 | Complete |
| CHL-02 | Phase 3 | Complete |
| CHL-03 | Phase 3 | Complete |
| IMP-01 | Phase 1 | Complete |
| IMP-02 | Phase 3 | Complete |
| IMP-03 | Phase 3 | Partial |
| DSE-01 | Phase 2 | Partial |
| DSE-02 | Phase 2 | Complete |
| DSE-03 | Phase 2 | Complete |
| DSE-04 | Phase 2 | Complete |
| DSE-05 | Phase 2 | Complete |
| VAL-01 | Phase 4 | Partial |
| VAL-02 | Phase 4 | Partial |
| VAL-03 | Phase 4 | Complete |

**Coverage:**
- v1 requirements: 18 total
- Complete: 14
- Partial: 4
- Mapped to phases: 18
- Unmapped: 0

## Implementation Audit (2026-06-01)

Evidence highlights:

- Multi-input review support and input detection are implemented (`figmaUrl`, `webUrl`, `imagePath`, `htmlSnippet`), with adapterized ingestion flow.
- Challenge/Improve one-shot tools are implemented (`challenge_from_input`, `improve_from_input`) and registered in the MCP server.
- External MCP and custom guideline design-system modes are implemented, including graceful degradation and report fallback section.
- Knowledge and memory persistence are implemented with ranked retrieval weighting on priority/tag/scope.

Remaining v1 gaps to close:

1. Explicit DS-link context pathway for DSE-01.
2. Effort/impact-oriented framing guarantees for IMP-03.
3. Deterministic visual validator depth and stronger accessibility signal extraction for VAL-01/VAL-02.

---
*Requirements defined: 2026-05-29*
*Last updated: 2026-06-01 after implementation audit*
