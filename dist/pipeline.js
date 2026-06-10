import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { loadGuidelineParameters, runDeterministicScoring } from '@ux-assistant/scoring';
import { buildMarkdownReport } from './report.js';
import { generateNarrative } from './llm.js';
import { resolveReviewInput } from './input-detect.js';
import { buildReviewDetailPayload, buildStrategicArtifacts } from './detail.js';
import { STRATEGIC_CONTRACT_VERSION } from './contract.js';
import { STAGE_MESSAGE } from './stages.js';
import { parseDesignSystemMode } from './design-system.js';
import { buildDesignSystemEvidence } from './design-system-evidence.js';
import { extractDesignData } from './design-data-extract.js';
import { ingestBriefContext } from './adapters/brief-adapter.js';
import { hasFigmaEvidence, ingestFigmaEvidenceInput, ingestFigmaInput } from './adapters/figma-adapter.js';
import { ingestHtmlInput, ingestImagePathInput, ingestWebInput } from './adapters/image-adapter.js';
const STAGE_PROGRESS = {
    queued: 0,
    fetching_input: 1,
    querying_design_system: 2,
    scoring: 3,
    generating_narrative: 4,
    building_report: 5,
    completed: 6,
    failed: 6
};
const TOTAL_STAGES = 6;
const MARKDOWN_FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);
const shouldAutoSaveMarkdown = () => {
    const envValue = process.env.UX_REVIEW_AUTO_SAVE_MARKDOWN;
    if (!envValue) {
        return true;
    }
    return !MARKDOWN_FALSE_VALUES.has(envValue.trim().toLowerCase());
};
const resolveReportOutputDir = () => {
    const configured = process.env.UX_REVIEW_REPORT_DIR?.trim();
    if (configured) {
        return configured;
    }
    return join(process.cwd(), 'docs', 'superpowers', 'specs');
};
const slugify = (input) => input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
const buildSourceSlug = (source) => {
    try {
        const url = new URL(source);
        const fromPath = url.pathname
            .split('/')
            .filter(Boolean)
            .pop();
        if (fromPath) {
            const clean = slugify(fromPath);
            if (clean)
                return clean;
        }
    }
    catch {
        // Source may be an internal marker such as "inline-html" or a local path.
    }
    const cleanFile = slugify(basename(source));
    if (cleanFile)
        return cleanFile;
    return 'review';
};
const persistMarkdownFile = (runId, source, markdown) => {
    if (!shouldAutoSaveMarkdown()) {
        return undefined;
    }
    const outputDir = resolveReportOutputDir();
    mkdirSync(outputDir, { recursive: true });
    const isoDate = new Date().toISOString().slice(0, 10);
    const sourceSlug = buildSourceSlug(source);
    const fileName = `${isoDate}-ux-review-run-${runId}-${sourceSlug}.md`;
    const filePath = join(outputDir, fileName);
    writeFileSync(filePath, markdown, 'utf8');
    return filePath;
};
const setStage = (storage, runId, stage, onProgress) => {
    storage.updateStage(runId, stage, STAGE_MESSAGE[stage]);
    onProgress?.(stage, STAGE_PROGRESS[stage], TOTAL_STAGES);
};
const runScoringAndPersist = async (inputType, source, bundle, runId, storage, designSystemConfig, debug = false, onProgress) => {
    setStage(storage, runId, 'scoring', onProgress);
    // Optionally query design system evidence if enabled
    let designSystemEvidence;
    if (designSystemConfig?.mode !== 'none' && designSystemConfig?.enableExternalMcp) {
        try {
            setStage(storage, runId, 'querying_design_system', onProgress);
            designSystemEvidence = await buildDesignSystemEvidence(bundle.figmaUrl ?? source, undefined, debug);
            storage.addToolCall(runId, 'query_design_system_mcp', 'success', {
                mode: designSystemConfig.mode,
                queriesRun: designSystemEvidence.queriesRun,
                queriesFailed: designSystemEvidence.queriesFailed,
                componentsMatched: designSystemEvidence.componentFindings.length,
                iconsMatched: designSystemEvidence.iconFindings.length
            });
            // Inject design system findings into the bundle for scoring
            bundle.designSystemFindings = {
                mode: designSystemConfig.mode,
                componentFindings: designSystemEvidence.componentFindings,
                iconFindings: designSystemEvidence.iconFindings,
                queriesRun: designSystemEvidence.queriesRun,
                queriesFailed: designSystemEvidence.queriesFailed
            };
            // Store design system findings in database
            storage.updateDesignSystemFindings(runId, designSystemConfig.mode, bundle.designSystemFindings);
        }
        catch (error) {
            storage.addToolCall(runId, 'query_design_system_mcp', 'error', {
                mode: designSystemConfig.mode
            }, error instanceof Error ? error.message : String(error));
            if (debug) {
                const msg = error instanceof Error ? error.message : String(error);
                console.error(`[Pipeline] design system evidence failed: ${msg}`);
            }
            // Continue scoring even if design system queries fail (graceful degradation)
        }
    }
    else if (designSystemConfig?.mode) {
        storage.updateDesignSystemFindings(runId, designSystemConfig.mode, undefined);
    }
    setStage(storage, runId, 'scoring', onProgress);
    const scoringResult = runDeterministicScoring(bundle);
    // Extract actual design data from tool call results for LLM enrichment
    const sourceTypeMap = {
        figma_url: 'figma',
        web_url: 'web',
        html_snippet: 'html',
        image_path: 'image'
    };
    const designData = extractDesignData(bundle.toolCalls, sourceTypeMap[inputType] ?? 'figma');
    setStage(storage, runId, 'generating_narrative', onProgress);
    const narrative = await generateNarrative(scoringResult, debug, designData);
    const strategicArtifacts = buildStrategicArtifacts(scoringResult, narrative);
    setStage(storage, runId, 'building_report', onProgress);
    let report = buildMarkdownReport(source, scoringResult, narrative, strategicArtifacts);
    const run = storage.getRun(runId);
    const detail = buildReviewDetailPayload({
        runId,
        source,
        status: run?.status ?? 'running',
        stage: run?.stage ?? 'building_report',
        stageMessage: run?.stage_message ?? STAGE_MESSAGE.building_report,
        createdAt: run?.created_at ?? new Date().toISOString(),
        scoring: scoringResult,
        narrative
    });
    storage.saveReport(runId, report, detail);
    let reportMarkdownPath;
    try {
        reportMarkdownPath = persistMarkdownFile(runId, source, report);
        if (reportMarkdownPath) {
            storage.addArtifact(runId, 'markdown_report', reportMarkdownPath, source);
        }
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        storage.addToolCall(runId, 'save_markdown_report', 'error', undefined, msg);
        if (debug) {
            console.error(`[Pipeline] markdown report save failed: ${msg}`);
        }
    }
    storage.completeRun(runId);
    return {
        runId,
        inputType,
        source,
        reportMarkdownPath,
        stage: 'completed',
        stageMessage: STAGE_MESSAGE.completed,
        overallAlignmentPct: scoringResult.overallAlignmentPct,
        executiveSummary: narrative.executiveSummary,
        topRisksNarrative: narrative.topRisks,
        llmProvider: narrative.provider,
        strategicContractVersion: STRATEGIC_CONTRACT_VERSION,
        strategicBranch: scoringResult.strategicBranch,
        strategicArtifacts,
        scores: scoringResult.scores.map(s => ({
            parameter: s.parameter,
            alignmentPct: s.alignmentPct,
            score: s.score
        })),
        topIssues: scoringResult.issues
            .filter(i => i.severity === 'high' || i.severity === 'critical')
            .slice(0, 5)
            .map(i => ({ title: i.title, severity: i.severity, parameter: i.parameter }))
    };
};
export async function reviewInput(request, storage, debug = false, onProgress, mcpServer) {
    const resolved = resolveReviewInput(request);
    const runId = storage.createRun(resolved.value, null, null);
    // Load design system config from request or defaults
    const designSystemMode = parseDesignSystemMode(request.designSystem);
    const designSystemConfig = {
        mode: designSystemMode,
        customGuidelinePath: request.customGuidelinePath,
        enableExternalMcp: designSystemMode !== 'none' &&
            process.env.UX_REVIEW_DESIGN_SYSTEM_MCP_ENABLED !== 'false' &&
            process.env.UX_REVIEW_ELEMENT_MCP_ENABLED !== 'false'
    };
    const brief = ingestBriefContext(request);
    const strategicContext = brief.strategicContext;
    if (brief.summary.hasProblemStatement ||
        brief.summary.hasProposedSolution ||
        brief.summary.requirementsCount > 0) {
        storage.addToolCall(runId, 'ingest_brief_context', 'success', brief.summary);
    }
    try {
        setStage(storage, runId, 'fetching_input', onProgress);
        if (designSystemConfig.mode === 'custom') {
            if (!designSystemConfig.customGuidelinePath) {
                throw new Error('customGuidelinePath is required when designSystem=custom');
            }
            try {
                const parsed = await loadGuidelineParameters(designSystemConfig.customGuidelinePath);
                storage.addToolCall(runId, 'load_custom_guideline', 'success', {
                    path: designSystemConfig.customGuidelinePath,
                    parametersLoaded: parsed.length
                });
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                storage.addToolCall(runId, 'load_custom_guideline', 'error', undefined, msg);
                throw new Error(`Failed to load custom guideline: ${msg}`, { cause: error });
            }
        }
        if (resolved.type === 'figma_url') {
            if (hasFigmaEvidence(request.figmaEvidence)) {
                const figmaPayload = ingestFigmaEvidenceInput({
                    figmaUrl: resolved.value,
                    figmaEvidence: request.figmaEvidence,
                    runId,
                    storage,
                    strategicContext
                });
                return await runScoringAndPersist('figma_url', figmaPayload.source, figmaPayload.bundle, runId, storage, designSystemConfig, debug, onProgress);
            }
            const figmaPayload = await ingestFigmaInput({
                figmaUrl: resolved.value,
                runId,
                storage,
                strategicContext,
                debug,
                mcpServer
            });
            return await runScoringAndPersist('figma_url', figmaPayload.source, figmaPayload.bundle, runId, storage, designSystemConfig, debug, onProgress);
        }
        if (resolved.type === 'web_url') {
            const webPayload = await ingestWebInput(resolved.value, {
                runId,
                storage,
                strategicContext
            });
            return await runScoringAndPersist('web_url', webPayload.source, webPayload.bundle, runId, storage, designSystemConfig, debug, onProgress);
        }
        if (resolved.type === 'html_snippet') {
            const htmlPayload = await ingestHtmlInput(resolved.value, {
                runId,
                storage,
                strategicContext
            });
            return await runScoringAndPersist('html_snippet', htmlPayload.source, htmlPayload.bundle, runId, storage, designSystemConfig, debug, onProgress);
        }
        const imagePayload = ingestImagePathInput(resolved.value, {
            runId,
            storage,
            strategicContext
        });
        return await runScoringAndPersist('image_path', imagePayload.source, imagePayload.bundle, runId, storage, designSystemConfig, debug, onProgress);
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        setStage(storage, runId, 'failed', onProgress);
        storage.failRun(runId, msg);
        throw error;
    }
}
export async function reviewFigma(figmaUrl, storage, debug = false, designSystemConfig, onProgress, mcpServer) {
    return reviewInput({
        figmaUrl,
        designSystem: designSystemConfig?.designSystem,
        customGuidelinePath: designSystemConfig?.customGuidelinePath,
        figmaEvidence: designSystemConfig?.figmaEvidence,
        problemStatement: designSystemConfig?.problemStatement,
        proposedSolution: designSystemConfig?.proposedSolution,
        requirements: designSystemConfig?.requirements
    }, storage, debug, onProgress, mcpServer);
}
