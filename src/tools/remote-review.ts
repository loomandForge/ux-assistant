import type { ReviewStorage } from '../storage.js';
import { reviewFigma, reviewInput, type ReviewResult } from '../pipeline.js';
import type { FigmaEvidenceInput, ReviewInputRequest } from '../input-detect.js';
import { extractDesignData } from '../design-data-extract.js';
import { generatePerspectiveReport, type PerspectiveContext, type PerspectiveMode } from '../llm.js';

type StoredRun = {
  id: number;
  inputRef: string;
  created_at: string;
  status: string;
  stage: string;
  stage_message: string;
  error?: string;
};

type StoredToolCall = {
  tool_name: string;
  status: string;
  raw_json: string | null;
  error: string | null;
};

class RemoteReviewStorage {
  private nextRunId = 1;
  private runs = new Map<number, StoredRun>();
  private reports = new Map<number, { markdown: string; detail?: unknown }>();
  private toolCalls = new Map<number, StoredToolCall[]>();
  private designSystemFindings = new Map<number, unknown>();

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

  updateDesignSystemFindings(runId: number, mode: string, findings?: unknown): void {
    if (findings) {
      this.designSystemFindings.set(runId, { mode, ...(findings as Record<string, unknown>) });
    }
  }

  addToolCall(
    runId: number,
    toolName: string,
    status: string,
    rawJson?: unknown,
    error?: string
  ): void {
    const calls = this.toolCalls.get(runId) ?? [];
    calls.push({
      tool_name: toolName,
      status,
      raw_json: rawJson === undefined ? null : JSON.stringify(rawJson),
      error: error ?? null
    });
    this.toolCalls.set(runId, calls);
  }

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

  getDesignSystemFindings(runId: number): unknown | undefined {
    return this.designSystemFindings.get(runId);
  }

  getToolCalls(runId: number): StoredToolCall[] {
    return this.toolCalls.get(runId) ?? [];
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

const getRemoteStorage = (): ReviewStorage & {
  getToolCalls(runId: number): StoredToolCall[];
  getDesignSystemFindings(runId: number): unknown | undefined;
} =>
  getStorage() as ReviewStorage & {
    getToolCalls(runId: number): StoredToolCall[];
    getDesignSystemFindings(runId: number): unknown | undefined;
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

const parseSuccessfulToolCalls = (runId: number) =>
  getRemoteStorage()
    .getToolCalls(runId)
    .filter(call => call.status === 'success' && call.raw_json)
    .map(call => {
      try {
        return {
          toolName: call.tool_name,
          status: 'success' as const,
          data: JSON.parse(call.raw_json!)
        };
      } catch {
        return null;
      }
    })
    .filter(
      (call): call is { toolName: string; status: 'success'; data: unknown } => call !== null
    );

const formatPerspectiveHeader = (
  mode: PerspectiveMode,
  source: string,
  provider: { provider: string; model: string; generationTimeMs: number }
): string =>
  [
    `# UX Design Review Report - ${mode.toUpperCase()} Mode`,
    '',
    `**Source:** ${source || 'n/a'}`,
    `**Strategic Mode:** ${mode.toUpperCase()}`,
    `**Date:** ${new Date().toISOString()}`,
    `**Narrative Provider:** ${provider.provider} (${provider.model})`,
    `**Generation Time:** ${provider.generationTimeMs}ms`,
    '',
    '---',
    ''
  ].join('\n');

const getWeakSections = (detail: any) =>
  (Array.isArray(detail?.sections) ? detail.sections : [])
    .slice()
    .sort((a: any, b: any) => Number(a?.alignmentPct ?? 100) - Number(b?.alignmentPct ?? 100))
    .slice(0, 4);

const formatIssues = (section: any): string[] => {
  const issues = Array.isArray(section?.issues) ? section.issues : [];
  if (issues.length === 0) {
    return [`- ${section?.parameter ?? 'Unknown area'}: no specific issue details captured.`];
  }
  return issues.slice(0, 3).map((issue: any) => {
    const title = issue?.title ?? issue?.problem ?? 'Issue';
    const recommendation = issue?.recommendation ?? issue?.fix ?? 'Tighten this area in the next revision.';
    return `- ${section?.parameter ?? 'Area'}: ${title}. Recommendation: ${recommendation}`;
  });
};

const deterministicPerspective = (
  runId: number,
  mode: PerspectiveMode,
  detail: any,
  baseReport: string,
  overrides?: {
    prdText?: string;
    problemStatement?: string;
    requirements?: string[];
    audience?: string;
    businessGoal?: string;
    designDecisions?: string[];
    constraints?: string[];
    alternativesConsidered?: string[];
    userResearch?: string;
  }
): string => {
  const strategic = detail?.strategicArtifacts ?? {};
  const weakSections = getWeakSections(detail);
  const lines: string[] = [];

  lines.push(`# ${mode === 'challenge' ? 'Challenge' : mode === 'improve' ? 'Improve' : 'Pitch'} Design`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Run ID: ${runId}`);
  lines.push(`- Overall alignment: ${detail?.overallAlignmentPct ?? 'n/a'}%`);
  lines.push(`- Source: ${detail?.source ?? 'n/a'}`);
  if (overrides?.problemStatement || detail?.problemStatement) {
    lines.push(`- Problem statement: ${overrides?.problemStatement ?? detail?.problemStatement}`);
  }
  if (overrides?.requirements?.length) {
    lines.push(`- Requirements supplied: ${overrides.requirements.length}`);
  }
  lines.push('');

  if (mode === 'challenge') {
    const prompts = Array.isArray(strategic?.challengePrompts) ? strategic.challengePrompts : [];
    const edgeCases = Array.isArray(strategic?.edgeCaseFindings) ? strategic.edgeCaseFindings : [];
    const risks = Array.isArray(detail?.topRisks) ? detail.topRisks : [];

    lines.push('## Strongest Challenges');
    if (prompts.length > 0) {
      for (const prompt of prompts.slice(0, 6)) lines.push(`- ${prompt}`);
    } else if (risks.length > 0) {
      for (const risk of risks.slice(0, 6)) lines.push(`- Validate risk: ${risk}`);
    } else {
      lines.push('- Validate that the design solves the stated user problem with observable task evidence.');
    }
    lines.push('');

    lines.push('## Weakest Evidence Areas');
    for (const section of weakSections) {
      lines.push(...formatIssues(section));
    }
    lines.push('');

    lines.push('## Edge Cases To Test');
    if (edgeCases.length > 0) {
      for (const item of edgeCases.slice(0, 5)) {
        lines.push(`- ${item?.scenario ?? item?.title ?? 'Untested scenario'}: ${item?.risk ?? item?.recommendation ?? 'Capture evidence before shipping.'}`);
      }
    } else {
      lines.push('- Test empty states, long content, slow loading, first-time use, and error recovery.');
    }
  } else if (mode === 'improve') {
    const improvementPack = strategic?.improvementPack ?? {};
    const fixes = Array.isArray(improvementPack?.priorityFixes) ? improvementPack.priorityFixes : [];
    const checks = Array.isArray(improvementPack?.edgeCaseChecks) ? improvementPack.edgeCaseChecks : [];
    const experiments = Array.isArray(improvementPack?.nextExperiments) ? improvementPack.nextExperiments : [];

    lines.push('## Priority Improvements');
    if (fixes.length > 0) {
      for (const fix of fixes.slice(0, 6)) lines.push(`- ${fix}`);
    } else {
      for (const section of weakSections) lines.push(...formatIssues(section));
    }
    lines.push('');

    lines.push('## Implementation Order');
    const order = fixes.length > 0 ? fixes : weakSections.map((section: any) => `Improve ${section?.parameter ?? 'weak area'}`);
    order.slice(0, 5).forEach((item: string, index: number) => {
      lines.push(`${index + 1}. ${item}`);
    });
    lines.push('');

    lines.push('## Validation Checks');
    if (checks.length > 0) {
      for (const check of checks.slice(0, 5)) lines.push(`- ${check}`);
    } else {
      lines.push('- Re-run the UX review after changes and compare the weakest parameter scores.');
      lines.push('- Capture screenshot evidence for visual hierarchy, accessibility, and content clarity.');
    }
    if (experiments.length > 0) {
      lines.push('');
      lines.push('## Suggested Experiments');
      for (const experiment of experiments.slice(0, 4)) lines.push(`- ${experiment}`);
    }
  } else {
    const persuasion = strategic?.persuasionPack ?? {};
    const valuePoints = Array.isArray(persuasion?.valuePoints) ? persuasion.valuePoints : [];
    const proofPoints = Array.isArray(persuasion?.proofPoints) ? persuasion.proofPoints : [];
    const objections = Array.isArray(persuasion?.objectionHandlers) ? persuasion.objectionHandlers : [];

    lines.push('## Stakeholder Pitch');
    lines.push(`- Audience: ${overrides?.audience ?? 'product/design stakeholders'}`);
    lines.push(`- Business goal: ${overrides?.businessGoal ?? persuasion?.positioning ?? 'improve product UX quality'}`);
    if (valuePoints.length > 0) {
      for (const point of valuePoints.slice(0, 5)) lines.push(`- ${point}`);
    } else {
      lines.push(`- The design currently scores ${detail?.overallAlignmentPct ?? 'n/a'}% overall, with clear next steps for improving confidence.`);
    }
    lines.push('');

    lines.push('## Proof Points');
    if (proofPoints.length > 0) {
      for (const point of proofPoints.slice(0, 5)) lines.push(`- ${point}`);
    } else {
      for (const section of weakSections) {
        lines.push(`- ${section?.parameter ?? 'Area'} is measured at ${section?.alignmentPct ?? 'n/a'}%, giving a concrete baseline for follow-up.`);
      }
    }
    lines.push('');

    lines.push('## Objections And Responses');
    if (objections.length > 0) {
      for (const objection of objections.slice(0, 5)) lines.push(`- ${objection}`);
    } else {
      lines.push('- If confidence is low, frame this as a review based on available evidence and request missing design context or screenshots.');
    }
  }

  lines.push('');
  lines.push('## Next Steps');
  lines.push('1. Update the weakest design areas listed above. Estimated effort: 1-2 hours.');
  lines.push('2. Add missing evidence such as design context, screenshots, variables, or acceptance criteria. Estimated effort: 30-60 minutes.');
  lines.push('3. Re-run review_figma or review_input and compare the new run against this baseline. Estimated effort: 10 minutes.');

  if (!baseReport) {
    lines.push('');
    lines.push('Note: The base markdown report was not available in this remote instance.');
  }

  return lines.join('\n');
};

export async function runRemotePerspective(args: {
  runId: number;
  mode: Exclude<PerspectiveMode, 'review'>;
  prdText?: string;
  problemStatement?: string;
  requirements?: string[];
  audience?: string;
  businessGoal?: string;
  designDecisions?: string[];
  constraints?: string[];
  alternativesConsidered?: string[];
  userResearch?: string;
}): Promise<string> {
  try {
    const remoteStorage = getRemoteStorage();
    const detail = remoteStorage.getReportDetail(args.runId) as any;
    if (!detail) {
      return [
        `# ${args.mode}_design unavailable`,
        '',
        `No structured review detail found for run ${args.runId}.`,
        '',
        'Run review_figma or review_input first, then call this tool with the returned runId. If you already did that, the serverless instance may have restarted before the follow-up call.'
      ].join('\n');
    }

    const baseReport = remoteStorage.getReport(args.runId) ?? '';
    const strategicArtifacts = detail?.strategicArtifacts ?? {};
    const designSystemFindings = remoteStorage.getDesignSystemFindings(args.runId) ?? {};
    const parsedToolCalls = parseSuccessfulToolCalls(args.runId);
    const designData = parsedToolCalls.length > 0 ? extractDesignData(parsedToolCalls, 'figma') : undefined;

    const ctx: PerspectiveContext = {
      mode: args.mode,
      figmaUrl: detail?.source ?? '',
      baseReport,
      detail,
      strategicArtifacts,
      designSystemFindings,
      designData,
      prdText: args.prdText,
      problemStatement: args.problemStatement || detail?.problemStatement,
      proposedSolution: detail?.proposedSolution,
      requirements: args.requirements && args.requirements.length > 0 ? args.requirements : detail?.requirements,
      audience: args.audience,
      businessGoal: args.businessGoal,
      designDecisions: args.designDecisions,
      constraints: args.constraints,
      alternativesConsidered: args.alternativesConsidered,
      userResearch: args.userResearch
    };

    const llmResult = await generatePerspectiveReport(ctx, shouldDebug());
    if (llmResult.markdown) {
      return formatPerspectiveHeader(args.mode, ctx.figmaUrl, llmResult.provider) + llmResult.markdown;
    }

    return deterministicPerspective(args.runId, args.mode, detail, baseReport, args);
  } catch (error) {
    return formatToolError(`${args.mode}_design`, error);
  }
}

export async function runRemoteFigmaReview(args: {
  figmaUrl: string;
  figmaEvidence?: FigmaEvidenceInput;
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
      figmaEvidence: args.figmaEvidence,
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
