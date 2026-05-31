# UX Review Assistant

## What This Is

UX Review Assistant is an MCP server that helps UX consultants and agencies review design artifacts, challenge assumptions, and generate prioritized improvements for shipping teams. It accepts Figma links, web pages, and image inputs, then produces structured outputs that combine UX principles with design-system evidence. The product is focused on reducing subjective review loops by making findings measurable and actionable.

## Core Value

Turn design feedback into prioritized, evidence-backed actions that reduce risk and accelerate shipping.

## Requirements

### Validated

- ✓ Review pipeline supports Figma links, web pages, image inputs, and HTML snippets through MCP review tools.
- ✓ Challenge and Improve narratives are available from a completed review run.
- ✓ Context validation and correction prompt workflows are available through rules and packs.

### Active

- [ ] Enable single-shot Challenge flow directly from input (without requiring manual run chaining).
- [ ] Enable single-shot Improve flow directly from input (without requiring manual run chaining).
- [ ] Strengthen visual validation confidence for layout, hierarchy, and accessibility signals.
- [ ] Improve custom design-system ingestion and fallback behavior for MCP and guideline sources.
- [ ] Ensure design-system evidence is explicit across Figma system links, MCP tools, guideline files, and image references.

### Out of Scope

- Full real-time Figma sync/watchers in v1 — high complexity and not required for initial consultant workflows.
- Portfolio analytics dashboards in v1 — defer until core review reliability is improved.
- Cross-product governance metrics in v1 — defer until per-run signal quality is stable.

## Context

- Existing repository already provides core Review/Challenge/Improve MCP capabilities and persistence.
- Target users for v1 are UX consultants/agencies who need fast, structured review outputs for delivery teams.
- v1 input priorities: Figma links, web URLs, image uploads.
- Required design-system context inputs for v1: Figma design-system link, external MCP endpoint/tools, markdown/JSON guideline files, and image references.
- Strategic decision: evolve current repository instead of creating a new folder.

## Constraints

- **Tech stack**: TypeScript + Node 20 + MCP SDK — preserve compatibility with existing build/test pipeline.
- **Reliability**: Deterministic fallback output must remain available if LLM generation fails.
- **Backward compatibility**: Existing MCP tool names and core response shapes should continue to work.
- **Evidence quality**: New validation claims must indicate confidence and source type.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Improve current repo instead of creating new app folder | Core capabilities are already implemented and stable | ✓ Good |
| Prioritize UX consultants/agencies for v1 | Strong alignment with current output style and workflow needs | ✓ Good |
| Keep v1 focused on Review/Challenge/Improve quality and ergonomics | Highest leverage for shipping value quickly | ✓ Good |
| Defer dashboarding and real-time sync | Avoids scope creep while core validation quality is being improved | ✓ Good |

---
*Last updated: 2026-05-29 after project initialization*
