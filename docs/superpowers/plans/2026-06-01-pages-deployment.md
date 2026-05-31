# GitHub Pages Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure the repository publishes the `docs/` site to GitHub Pages from `main` using GitHub Actions as the only deployment path.

**Architecture:** Keep the existing static site in `docs/` as the Pages artifact, keep `.github/workflows/pages.yml` as the deployment entrypoint, and align repository settings so GitHub Pages uses workflow-based publishing. Verification is split between repository file checks, workflow checks, and one live deployment check from `main`.

**Tech Stack:** GitHub Actions, GitHub Pages, static HTML/CSS in `docs/`

---

### Task 1: Verify repository workflow configuration

**Files:**
- Modify: `.github/workflows/pages.yml` only if gaps are found
- Reference: `docs/superpowers/specs/2026-06-01-pages-deployment-design.md`

- [ ] **Step 1: Inspect the current Pages workflow**

Run:

```bash
cd '/Users/hanna/Documents/My Projects/Open source project/ux_assistant' && sed -n '1,220p' .github/workflows/pages.yml
```

Expected: a workflow triggered from `main`, scoped to `docs/**` and `.github/workflows/pages.yml`, uploading `./docs`, and deploying with `actions/deploy-pages`.

- [ ] **Step 2: Compare the workflow to the approved design**

Check for these exact requirements:

```text
push.branches includes main
push.paths includes docs/**
push.paths includes .github/workflows/pages.yml
workflow_dispatch exists
permissions include pages: write and id-token: write
upload-pages-artifact path is ./docs
deploy-pages is the final deployment action
```

Expected: all requirements are present with no branch-based publishing logic.

- [ ] **Step 3: Make the minimal workflow edit only if a requirement is missing**

If editing is required, use this target shape:

```yaml
on:
  push:
    branches: [main]
    paths:
      - "docs/**"
      - ".github/workflows/pages.yml"
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write
```

Expected: any change remains limited to `.github/workflows/pages.yml` and preserves the current `docs/` artifact deployment.

- [ ] **Step 4: Validate YAML after any edit**

Run:

```bash
cd '/Users/hanna/Documents/My Projects/Open source project/ux_assistant' && git diff -- .github/workflows/pages.yml
```

Expected: only intentional workflow changes appear.

- [ ] **Step 5: Commit the workflow change if one was needed**

```bash
cd '/Users/hanna/Documents/My Projects/Open source project/ux_assistant' && git add .github/workflows/pages.yml && git commit -m "Configure GitHub Pages workflow"
```

Expected: a single commit containing only the workflow adjustment. If no edit was needed, skip this commit step.

### Task 2: Align GitHub Pages repository settings

**Files:**
- No repository files changed in this task
- Reference: `.github/workflows/pages.yml`

- [ ] **Step 1: Open the repository Pages settings**

Use this URL pattern in the browser:

```text
https://github.com/loomandForge/ux-assistant/settings/pages
```

Expected: the GitHub Pages settings page for the repository opens.

- [ ] **Step 2: Set the build source to GitHub Actions**

In the GitHub UI, select:

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

Expected: the repository is configured to publish Pages from workflow runs, not from a branch.

- [ ] **Step 3: Confirm branch-based publishing is not selected**

Check for this state:

```text
Source is NOT "Deploy from a branch"
Source IS "GitHub Actions"
```

Expected: only workflow-based publishing is active.

### Task 3: Verify end-to-end publishing from main

**Files:**
- Modify: `docs/index.html` or another small file under `docs/`
- Verify: `.github/workflows/pages.yml`

- [ ] **Step 1: Make a minimal docs-only change for deployment verification**

Example edit target:

```html
<meta name="description" content="ux_assistant is an MCP server for UX review and context-aware design validation." />
```

Change a small visible or metadata-only string inside `docs/` so a new Pages deployment is triggered from `main`.

Expected: the change is harmless, reviewable, and limited to `docs/`.

- [ ] **Step 2: Review the docs diff before pushing**

Run:

```bash
cd '/Users/hanna/Documents/My Projects/Open source project/ux_assistant' && git diff -- docs
```

Expected: the diff shows only the small docs verification edit.

- [ ] **Step 3: Commit and push the docs change to main**

```bash
cd '/Users/hanna/Documents/My Projects/Open source project/ux_assistant' && git add docs && git commit -m "Trigger GitHub Pages deployment" && git push origin main
```

Expected: the push triggers the Pages workflow on `main`.

- [ ] **Step 4: Verify the Pages workflow run succeeds**

Check GitHub Actions for the `Deploy Docs to GitHub Pages` workflow.

Expected: the run completes successfully with an environment URL for `github-pages`.

- [ ] **Step 5: Verify the published site reflects the latest docs**

Open the Pages site URL reported by the deployment step.

Expected: the site serves the latest `docs/` content and includes the verification change.

- [ ] **Step 6: Commit any follow-up fix if deployment reveals a gap**

If the workflow or docs site fails, limit the repair to the smallest needed change and commit with one of these messages:

```bash
git commit -m "Fix GitHub Pages deployment"
```

or

```bash
git commit -m "Fix docs site publishing"
```

Expected: the repair addresses the specific deployment failure without widening scope.