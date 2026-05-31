# GitHub Pages Deployment Design

Date: 2026-06-01
Status: Proposed
Scope: Configure repository Pages publishing from `main` via GitHub Actions using the existing `docs/` site.

## Goal

Publish the documentation site in `docs/` to GitHub Pages whenever `main` changes relevant docs or deployment workflow files.

## Decision

Use GitHub Pages with `Source = GitHub Actions`.

The repository will not use branch-based Pages publishing. The existing workflow in `.github/workflows/pages.yml` is the single deployment path.

## Why This Approach

1. Deployment behavior stays versioned in the repository.
2. The existing `docs/` directory already matches the Pages artifact model.
3. GitHub Actions publishing avoids ambiguity between branch-based and workflow-based deployment modes.
4. Publishing from `main` remains the source-of-truth without requiring a separate Pages branch.

## Repository Design

### Content Source

- Source content lives in `docs/`.
- The Pages artifact root is `docs/`.
- No additional build output directory is required for the current static docs site.

### Deployment Trigger

- Deploy on pushes to `main`.
- Limit automatic deploys to changes in:
  - `docs/**`
  - `.github/workflows/pages.yml`
- Allow manual deploys through `workflow_dispatch`.

### Deployment Workflow

Workflow file: `.github/workflows/pages.yml`

Expected behavior:

1. Checkout repository.
2. Check whether Pages is available for the repo.
3. Configure Pages.
4. Upload `docs/` as the Pages artifact.
5. Deploy with `actions/deploy-pages`.

### GitHub UI Configuration

In repository settings:

1. Open `Settings -> Pages`.
2. Under `Build and deployment`, set `Source` to `GitHub Actions`.

Do not select `Deploy from a branch`.

## Error Handling

- If the repository does not have Pages available, the workflow should skip deployment without failing unrelated work.
- If deployment permissions are missing, the failure should be visible in the Pages workflow.
- The repo should not attempt both workflow-based and branch-based Pages publishing at the same time.

## Testing and Verification

Verification for this setup consists of:

1. Confirm `.github/workflows/pages.yml` exists and targets `docs/`.
2. Confirm GitHub Pages `Source` is set to `GitHub Actions` in repo settings.
3. Push a small change to `docs/` on `main`.
4. Verify the Pages workflow completes successfully.
5. Verify the published site reflects the latest `docs/` content.

## Out of Scope

- Custom domain configuration.
- Site redesign.
- Branch-based Pages deployment.
- Converting the docs site to a separate static-site generator.

## Implementation Notes

Current repo state already aligns closely with the target design because `.github/workflows/pages.yml` is present and deploys `docs/`.

The expected implementation work is limited to:

1. Verifying the workflow remains correct.
2. Ensuring the GitHub Pages UI source is set to `GitHub Actions`.
3. Making only minimal workflow adjustments if gaps are found.