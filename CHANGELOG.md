# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project aims to follow Semantic Versioning.

## [Unreleased]

### Added

- Public repository hardening baseline (.github workflows, templates, security and contribution policy).
- GitHub Pages capability site under `docs/`.
- Premium startup-style GitHub Pages site with product preview, setup flow, trust notes, and startup roadmap.
- Release automation with Release Drafter and tag-based GitHub Releases.
- Dedicated ingestion adapters under `src/adapters/` for brief, Figma, and visual input paths.
- Lightweight knowledge retrieval ranking (priority, tag match, scope weighting).
- Database schema migration/versioning notes for analysis-context tables in `README.md`.
- Documentation site architecture section for adapter boundaries and ranked knowledge retrieval flow.
- Documentation site module mapping section linking pipeline stages to concrete source files.
- `pnpm run doctor` setup readiness check for Node, pnpm, Git origin, GitHub CLI, Codex, model-provider credentials, and optional Figma MCP configuration.
- Fixture-backed deterministic validation coverage for checkout-style UX review examples.

### Changed

- HTML/React validation findings now include stronger deterministic evidence for CTA hierarchy, hardcoded colors, heading structure, semantic landmarks, and form error-state hooks.
- Correction prompts now include both the recommendation and the concrete fix instruction for each prioritized finding.
- README now includes build/security/pages badges and quick policy links.
- `reviewInput` ingestion flow now delegates to dedicated adapters instead of centralized branch logic.
- Knowledge context retrieval now returns ranked items for run-level context hydration.
- Repository packaging now uses the `xmcp` deployment path with a dedicated `build:xmcp` script and Vercel build command.
- CI and lockfile handling are aligned around `pnpm`, including workspace metadata for the local `scoring` package.
- `better-sqlite3` native builds are now explicitly allowed under pnpm-based installs to keep local and CI test environments working.
- README, GitLab CI, and package scripts now use pnpm-first setup and verification commands.
- Remote `review_figma` and `review_input` xmcp tools now run the UX review pipeline instead of returning Phase 1 migration placeholders.
- Remote xmcp review runs now use serverless-safe in-memory storage instead of loading local SQLite at Vercel startup.
- Remote screenshot capture defaults to Vercel's writable temp directory instead of a home-directory path.
- Web and HTML input reviews now continue with metadata/design-context evidence when screenshot capture is unavailable in serverless environments.
- Vercel xmcp builds now copy the local `@ux-assistant/scoring` workspace package into the serverless function bundle and normalize the generated runtime require path.

### Removed

- Stale `package-lock.json` and the broken `start:http` script that referenced missing `dist/http.js`.

## [0.1.0] - 2026-05-29

### Added

- Initial public release of ux_assistant MCP server and scoring workspace.
