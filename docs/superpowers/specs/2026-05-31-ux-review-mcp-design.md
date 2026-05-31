# UX Review MCP Design

## Goal
Build a small MCP application for UX designers that reviews designs from multiple input types and gives feedback in three distinct lenses:

- Challenge: critique the problem and solution, call out assumptions, and note where the work is strong or weak
- Improve: identify concrete UX, UI, IA, workflow, and edge-case improvements
- Pitch: help the designer present the logic, tradeoffs, and decisions clearly to stakeholders

The app must reuse the existing UX review MCP server where possible and stay extensible for future MCP sources, richer knowledge, and graph-based reasoning.

## Product Shape
The product remains a single MCP server with a small public surface:

- `analyze_design_input`
- `challenge_design`
- `improve_design`
- `pitch_design`

The shared analysis tool does the heavy work once. The three render tools reuse the same analyzed result and only change the framing and output emphasis.

## Why This Shape
This structure matches the current repository well because it already has a review pipeline, report generation, storage, and tool registration. The new design should tighten those responsibilities rather than replace them.

The main benefits are:

- one canonical analysis bundle for all three outputs
- less duplicated logic
- easier reuse of Figma, screenshot, and brief inputs
- a future path for knowledge memory and graph-based relationships without overbuilding now

## Current Repo Mapping
The existing repository already contains strong starting points:

- `src/server.ts` for MCP tool registration and routing
- `src/pipeline.ts` for the review orchestration flow
- `src/report.ts` for markdown report rendering
- `src/llm.ts` for narrative generation
- `src/storage.ts` for persistence of runs and artifacts
- `src/context-gather.ts` for input gathering and adapter-style collection
- `src/validation-engine.ts` for scoring and rule evaluation

The implementation should reuse these modules rather than create a parallel architecture.

## Target Architecture
The system should be organized into five layers.

### 1. Input Adapter Layer
This layer handles source-specific ingestion and normalization.

Supported adapters:

- Figma MCP adapter
- screenshot / image adapter
- brief / PRD / chat adapter
- future MCP source adapters

Responsibilities:

- read the source
- extract source-specific evidence
- convert it into a normalized internal format
- keep source logic out of the core critique engine

### 2. Knowledge and Memory Layer
This layer provides context for better critique quality.

It should include:

- session memory for the current review run
- persistent user memory for stable preferences and critique style
- persistent project memory for product context and recurring decisions
- knowledge base entries for domain, product, UX, and workflow knowledge

The knowledge layer should be categorized, tagged, scoped, and prioritized.

Recommended categories:

- domain
- product
- UX principle
- UX pattern
- stakeholder preference
- constraint

Recommended fields:

- `id`
- `type`
- `scope`
- `priority`
- `confidence`
- `source`
- `summary`
- `tags`
- `relationships`

UX-specific knowledge should be first-class so the system can judge designs against heuristics, accessibility expectations, common patterns, workflow quality, and team-specific standards.

### 3. Relationship Layer
The relationship layer should start simple and remain optional in depth.

Supported relationship types:

- `related_to`
- `depends_on`
- `supports`
- `overrides`
- `conflicts_with`
- `same_as`

Purpose:

- connect related knowledge items
- improve retrieval and context matching
- support simple reasoning across product and UX facts

This is not a full graph engine in v1. It is a lightweight relationship model with a clear upgrade path.

### 4. Analysis Core
This is the central engine.

It consumes normalized input plus retrieved context and returns one canonical review bundle.

The bundle should contain:

- source metadata
- problem statement or inferred problem framing
- inferred design intent
- UX evidence
- UI evidence
- IA evidence
- workflow evidence
- assumptions
- gaps and risks
- confidence and coverage information
- matched knowledge items
- relationship links among matched items
- reusable insight blocks for the three renderers

This bundle becomes the single source of truth for all outputs.

### 5. Render Layer
The render layer exposes the three public commands.

#### `challenge_design`
Focus:

- whether the design solves the right problem
- what assumptions are weak or unproven
- what edge cases are missing
- where the UX or workflow breaks under pressure
- what was done well, so the critique stays fair

#### `improve_design`
Focus:

- concrete UX, UI, IA, and workflow improvements
- priority and likely effort
- missing states and edge cases
- what to fix first for the biggest gain
- what to preserve because it already works

#### `pitch_design`
Focus:

- decision framing
- tradeoffs
- why the design choices are defensible
- how to explain the work to product, engineering, leadership, or clients
- how to present the work as intentional and stakeholder-ready

Each renderer should return:

- markdown as the primary response
- structured JSON metadata for downstream automation or UI rendering

## Data Flow
1. An input adapter ingests Figma, image, brief, or another supported source
2. Knowledge retrieval pulls relevant domain, product, UX, and preference context
3. Session and persistent memory provide stable context for the current user and project
4. The analysis core builds the canonical review bundle
5. The relationship layer links matched knowledge items
6. One of the three renderers generates the final lens-specific response
7. Stable insights may be written back to memory or the knowledge base

## Memory Strategy
Memory should be separated by lifespan and purpose.

### Session Memory
Use for:

- the current review run
- transient conversation context
- temporary assumptions and in-progress findings

### Persistent User Memory
Use for:

- user critique preferences
- recurring patterns in how the designer works
- stable presentation or tone preferences
- repeated strengths or issues

### Persistent Project Memory
Use for:

- product context
- team standards
- design system expectations
- recurring workflow rules
- prior decisions and why they were made

Only store stable, useful facts. Do not store every raw artifact.

## Adapter Strategy
Adapters should isolate source-specific logic.

### Figma MCP Adapter
Use the Figma MCP integration to fetch or inspect design sources when the input is a Figma file or node.

### Screenshot / Image Adapter
Use for local image files and visual references that are not Figma-native.

### Brief / PRD / Chat Adapter
Use for written context and user-provided problem statements, requirements, or solution descriptions.

### Future MCP Adapters
Keep the interface open so additional MCP sources can be added later without changing the critique engine.

## Future Graph Roadmap
The design should explicitly leave room for a graph layer later.

When complexity increases across many products, teams, and UX rules, the knowledge system may need full graph mapping for:

- multi-hop reasoning
- inherited product rules
- team-specific overrides
- conflict resolution
- cross-project UX pattern reuse

For v1, this is not required. The architecture should only require the lightweight relationship layer.

## Suggested Module Split
The implementation should stay close to the current repo while separating responsibilities more clearly.

Suggested modules:

- `src/analyze-design-input.ts`
- `src/render/challenge-design.ts`
- `src/render/improve-design.ts`
- `src/render/pitch-design.ts`
- `src/knowledge/knowledge-store.ts`
- `src/knowledge/relationship-store.ts`
- `src/memory/session-memory.ts`
- `src/memory/persistent-memory.ts`
- `src/adapters/figma-mcp-adapter.ts`
- `src/adapters/image-adapter.ts`
- `src/adapters/brief-adapter.ts`

`src/server.ts` should remain the thin MCP registration layer.

## Validation Expectations
The implementation should be considered complete only when:

- the shared analysis path works for all supported input types
- each of the three public tools produces a distinct lens
- markdown remains the primary output
- JSON metadata is available for automation and UI use
- knowledge items can be categorized, tagged, and prioritized
- simple relationships can be stored and queried
- session and persistent memory are available
- Figma MCP is supported through the adapter layer

## Non-Goals for v1
Do not require these in the first version:

- full graph reasoning across many products and teams
- complex ontology management
- multi-agent orchestration
- broad workflow automation beyond the review flow
- storage of every raw input as memory

## Implementation Order
1. Refactor the current review flow into a shared analysis object
2. Add `analyze_design_input` as the canonical analysis entry point
3. Rebuild `challenge_design`, `improve_design`, and `pitch_design` as render-only tools
4. Add categorized knowledge with tags, priorities, scope, and confidence
5. Add the lightweight relationship layer
6. Add session and persistent memory
7. Add the Figma MCP adapter first, then other adapters
8. Extend the system with future MCP sources as needed

## Open Questions to Resolve Before Build
- What exact storage format should knowledge and memory use?
- Should knowledge live in SQLite, files, or both?
- How should the system decide what gets written back into memory?
- Should renderer metadata be stored inline or under a separate object?
- Should the first adapter implementation prioritize Figma MCP or local screenshot input?

## Summary
This design keeps the current MCP server structure, adds a shared analysis core, and exposes three distinct output lenses for critique, improvement, and pitching. It adds a practical knowledge and relationship layer now, with a clear plan for graph mapping later if the product grows into multi-team, multi-product reasoning.
