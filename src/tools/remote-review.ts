import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ReviewStorage } from '../storage.js';
import { reviewFigma, reviewInput, type ReviewResult } from '../pipeline.js';
import type { ReviewInputRequest } from '../input-detect.js';

let storage: ReviewStorage | undefined;
const REMOTE_DB_PATH = join(tmpdir(), 'ux-review-remote', 'reviews.db');

const getStorage = (): ReviewStorage => {
  storage ??= new ReviewStorage(process.env.UX_REVIEW_REMOTE_DB_PATH ?? REMOTE_DB_PATH);
  return storage;
};

const shouldDebug = (): boolean => process.env.UX_REVIEW_DEBUG === '1';

const disableMarkdownFileWritesForRemote = (): void => {
  process.env.UX_REVIEW_AUTO_SAVE_MARKDOWN ??= 'false';
};

const formatReviewOutput = (result: ReviewResult): string => {
  const report = getStorage().getReport(result.runId) ?? 'Report not available for this run.';

  return [
    report,
    '',
    '---',
    '',
    '## Run Metadata (JSON)',
    '',
    '```json',
    JSON.stringify(result, null, 2),
    '```'
  ].join('\n');
};

const formatToolError = (toolName: string, error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);

  return [
    `# ${toolName} failed`,
    '',
    message,
    '',
    'The remote MCP endpoint is available, but the review pipeline could not complete this run.'
  ].join('\n');
};

export async function runRemoteFigmaReview(args: {
  figmaUrl: string;
  designSystem?: string;
  customGuidelinePath?: string;
  problemStatement?: string;
  proposedSolution?: string;
  requirements?: string[];
}): Promise<string> {
  disableMarkdownFileWritesForRemote();

  try {
    const result = await reviewFigma(args.figmaUrl, getStorage(), shouldDebug(), {
      designSystem: args.designSystem,
      customGuidelinePath: args.customGuidelinePath,
      problemStatement: args.problemStatement,
      proposedSolution: args.proposedSolution,
      requirements: args.requirements
    });

    return formatReviewOutput(result);
  } catch (error) {
    return formatToolError('review_figma', error);
  }
}

export async function runRemoteInputReview(args: ReviewInputRequest): Promise<string> {
  disableMarkdownFileWritesForRemote();

  try {
    const result = await reviewInput(args, getStorage(), shouldDebug());
    return formatReviewOutput(result);
  } catch (error) {
    return formatToolError('review_input', error);
  }
}
