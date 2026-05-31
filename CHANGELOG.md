# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project aims to follow Semantic Versioning.

## [Unreleased]

### Added

- Public repository hardening baseline (.github workflows, templates, security and contribution policy).
- GitHub Pages capability site under `docs/`.
- Release automation with Release Drafter and tag-based GitHub Releases.
- Dedicated ingestion adapters under `src/adapters/` for brief, Figma, and visual input paths.
- Lightweight knowledge retrieval ranking (priority, tag match, scope weighting).
- Database schema migration/versioning notes for analysis-context tables in `README.md`.
- Documentation site architecture section for adapter boundaries and ranked knowledge retrieval flow.
- Documentation site module mapping section linking pipeline stages to concrete source files.

### Changed

- README now includes build/security/pages badges and quick policy links.
- `reviewInput` ingestion flow now delegates to dedicated adapters instead of centralized branch logic.
- Knowledge context retrieval now returns ranked items for run-level context hydration.
- Repository packaging now uses the `xmcp` deployment path with a dedicated `build:xmcp` script and Vercel build command.
- CI and lockfile handling are aligned around `pnpm`, including workspace metadata for the local `scoring` package.
- `better-sqlite3` native builds are now explicitly allowed under pnpm-based installs to keep local and CI test environments working.

## [0.1.0] - 2026-05-29

### Added

- Initial public release of ux_assistant MCP server and scoring workspace.
