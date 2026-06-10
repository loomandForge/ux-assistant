import type { ReviewStorage } from '../storage.js';
import { reviewFigma, reviewInput, type ReviewResult } from '../pipeline.js';
import type { ReviewInputRequest } from '../input-detect.js';

type StoredRun = {
  id: number;
  inputRef: string;
  created_at: string;
  status: string;
  stage: string;
  stage_message: string;
  error?: string;
};

class RemoteReviewStorage {
  private nextRunId = 1;
  private runs = new Map<number, StoredRun>();
  private reports = new Map<number, { markdown: string; detail?: unknown }>();

  createRun(inputRef: string, _fileKey: string | null, _nodeId: string | null): number {
    const id = this.nextRunId++;
    this.runs.set(id, {
      id,
      inputRef,
      created_at: new Date().toISOString(),
      status: 'running',
      stage: 'queued',
      stage_message: 'Review request queued'
    });
    return id;
  }

  updateStage(runId: number, stage: string, stageMessage: string): void {
    const run = this.runs.get(runId);
    if (run) {
      run.stage = stage;
      run.stage_message = stageMessage;
    }
  }

  updateDesignSystemFindings(_runId: number, _mode: string, _findings?: unknown): void {}

  addToolCall(
    _runId: number,
    _toolName: string,
    _status: string,
    _rawJson?: unknown,
    _error?: string
  ): void {}

  addArtifact(_runId: number, _kind: string, _path?: string, _sourceUrl?: string): void {}

  getRun(runId: number): StoredRun | undefined {
    return this.runs.get(runId);
  }

  saveReport(runId: number, markdown: string, detail?: unknown): void {
    this.reports.set(runId, { markdown, detail });
  }

  getReport(runId: number): string | undefined {
    return this.reports.get(runId)?.markdown;
  }

  getReportDetail(runId: number): unknown | undefined {
    return this.reports.get(runId)?.detail;
  }

  completeRun(runId: number): void {
    const run = this.runs.get(runId);
    if (run) {
      run.status = 'completed';
      run.stage = 'completed';
      run.stage_message = 'Review completed';
    }
  }

  failRun(runId: number, error: string): void {
    const run = this.runs.get(runId);
    if (run) {
      run.status = 'failed';
      run.error = error;
    }
  }
}

let storage: ReviewStorage | undefined;

const getStorage = (): ReviewStorage => {
  storage ??= new RemoteReviewStorage() as unknown as ReviewStorage;
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
