# Roadmap: UX Review Assistant

## Goal

Deliver a production-ready Review + Challenge + Improve workflow with stronger design-system evidence and validation confidence for UX consultants/agencies.

## Phase 1: Baseline Stabilization and UX Entry Paths

**Outcome:** Confirm stable baseline behavior and clear entry paths for v1-first input modes.

- Confirm/verify review flows for Figma, web URL, and image input.
- Ensure run lifecycle visibility and run retrieval ergonomics are documented.
- Tighten request/response contracts for review outputs.

**Requirements covered:** RIN-01, RIN-02, RIN-03, CHL-01, IMP-01

## Phase 2: Design-System Ingestion and Evidence Hardening

**Outcome:** User-provided design-system context is more reliable and explicit in outputs.

- Improve ingestion/fallback logic across MCP-based and guideline-based design-system sources.
- Ensure reports clearly represent design-system evidence confidence and fallback paths.
- Validate support for Figma DS link, MCP source, guideline files, and image references.

**Requirements covered:** RIN-04, DSE-01, DSE-02, DSE-03, DSE-04, DSE-05

## Phase 3: Single-Shot Challenge and Improve Flows

**Outcome:** Users can run challenge or improve directly from input without manual chaining.

- Add convenience orchestration for challenge-from-input.
- Add convenience orchestration for improve-from-input.
- Preserve backward compatibility with runId-based tools.

**Requirements covered:** CHL-02, CHL-03, IMP-02, IMP-03

## Phase 4: Validation Signal Quality Upgrade

**Outcome:** Visual/accessibility findings become more actionable with explicit confidence.

- Upgrade visual validation heuristics and confidence calibration.
- Improve accessibility signal coverage in deterministic path.
- Maintain fallback behavior when optional analyzers are unavailable.

**Requirements covered:** VAL-01, VAL-02, VAL-03

## Phase 5: Documentation and Onboarding Fit

**Outcome:** Teams can onboard quickly and supply correct inputs/context with minimal setup friction.

- Update README and examples for v1 workflows.
- Add clear setup guidance for design-system context variants.
- Publish recommended usage patterns for consultants/agencies.

**Requirements covered:** RIN-04, DSE-05

## Phase 6: Phase-Level Verification Hardening

**Outcome:** Regression risk is reduced via repeatable test and verification gates.

- Add/expand tests for new orchestration flows.
- Add scenario checks for input and design-system failure cases.
- Define phase completion checks and UAT fixtures.

**Requirements covered:** CHL-02, IMP-02, VAL-01, VAL-03

## Phase 7: V2 Discovery Track (Parallel)

**Outcome:** Gather evidence for post-v1 investments without blocking shipping.

- Explore trend analytics and comparison views.
- Evaluate deeper design-system sync options.
- Prioritize v2 scope by real usage feedback.

**Requirements covered:** ANL-01, ANL-02, INT-01, INT-02 (v2)

## Execution Notes

- Preferred mode: YOLO with verifier enabled.
- Granularity: Fine (this roadmap intentionally uses smaller phases).
- Parallelization: Allowed for documentation, research, and non-conflicting validation work.
- Guardrail: Do not break existing MCP tool contracts while adding convenience entry points.

---
*Last updated: 2026-05-29 after roadmap initialization*
