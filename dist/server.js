import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { existsSync, readFileSync } from 'node:fs';
import { reviewFigma, reviewInput } from './pipeline.js';
import { ReviewStorage } from './storage.js';
import { generatePerspectiveReport } from './llm.js';
import { extractDesignData } from './design-data-extract.js';
import { gatherContextWithTools } from './context-gather.js';
import { buildCorrectionPrompt, evaluateRuleFinding, scoreFromStatuses } from './validation-engine.js';
import { analyzeDesignInputSchema, addContextRuleInputSchema, compareValidationRunsInputSchema, createContextPackInputSchema, createProjectInputSchema, listKnowledgeContextInputSchema, listMemoryContextInputSchema, generateCorrectionPromptInputSchema, storeKnowledgeContextInputSchema, storeMemoryContextInputSchema, validateOutputAgainstContextInputSchema } from './contract.js';
export class UxReviewServer {
    server;
    storage;
    hasDebugFlag;
    closing = false;
    constructor(hasDebugFlag = false) {
        this.hasDebugFlag = hasDebugFlag;
        this.storage = new ReviewStorage();
        this.server = new Server({ name: 'ux-review-mcp', version: '0.1.0' }, { capabilities: { tools: {} } });
        this.setupToolHandlers();
        this.server.onerror = error => {
            if (this.hasDebugFlag) {
                console.error('[UX Review MCP Error]', error);
            }
        };
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
    }
    async shutdown() {
        if (this.closing)
            return;
        this.closing = true;
        try {
            await this.server.close();
        }
        catch {
            /* ignore */
        }
        process.exit(0);
    }
    getDesignDataForRun(runId) {
        const toolCalls = this.storage.getToolCalls(runId);
        if (!toolCalls || toolCalls.length === 0)
            return undefined;
        const parsed = toolCalls
            .filter(tc => tc.status === 'success' && tc.raw_json)
            .map(tc => {
            try {
                return { toolName: tc.tool_name, status: 'success', data: JSON.parse(tc.raw_json) };
            }
            catch {
                return null;
            }
        })
            .filter((item) => item !== null);
        if (parsed.length === 0)
            return undefined;
        return extractDesignData(parsed, 'figma');
    }
    readOutputRefContent(outputRef) {
        if (!outputRef || !existsSync(outputRef)) {
            return null;
        }
        try {
            return readFileSync(outputRef, 'utf8');
        }
        catch {
            return null;
        }
    }
    async runReviewInputFromArgs(args, onProgress) {
        return reviewInput({
            figmaUrl: args?.figmaUrl,
            webUrl: args?.webUrl,
            imagePath: args?.imagePath,
            htmlSnippet: args?.htmlSnippet,
            chatContext: args?.chatContext,
            problemStatement: args?.problemStatement,
            proposedSolution: args?.proposedSolution,
            requirements: args?.requirements,
            designSystem: args?.designSystem ?? 'generic',
            customGuidelinePath: args?.customGuidelinePath
        }, this.storage, this.hasDebugFlag, onProgress, this.server);
    }
    persistAnalysisContext(runId, input) {
        const knowledgeItems = Array.isArray(input.knowledgeItems) ? input.knowledgeItems : [];
        const knowledgeRelationships = Array.isArray(input.knowledgeRelationships)
            ? input.knowledgeRelationships
            : [];
        const memoryEntries = Array.isArray(input.memoryEntries) ? input.memoryEntries : [];
        const storedKnowledge = this.storage.upsertKnowledgeItems(knowledgeItems.map((item) => ({
            knowledgeKey: typeof item.knowledgeKey === 'string' ? item.knowledgeKey : undefined,
            userId: typeof item.userId === 'string' ? item.userId : input.userId,
            projectId: typeof item.projectId === 'number'
                ? item.projectId
                : typeof input.projectId === 'number'
                    ? input.projectId
                    : undefined,
            sessionId: typeof item.sessionId === 'string' ? item.sessionId : input.sessionId,
            scope: item.scope ?? 'project',
            category: String(item.category ?? 'general'),
            summary: String(item.summary ?? ''),
            tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === 'string') : [],
            priority: item.priority ?? 'medium',
            confidence: item.confidence ?? 'medium',
            source: typeof item.source === 'string' ? item.source : undefined
        })));
        if (knowledgeRelationships.length > 0) {
            this.storage.addKnowledgeRelationships(knowledgeRelationships);
        }
        const storedMemories = this.storage.upsertMemoryEntries(memoryEntries.map((item) => ({
            memoryScope: item.memoryScope,
            memoryKey: String(item.memoryKey ?? ''),
            entryType: String(item.entryType ?? ''),
            content: item.content,
            tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === 'string') : []
        })));
        this.storage.saveAnalysisMetadata({
            runId,
            userId: input.userId,
            projectId: input.projectId,
            sessionId: input.sessionId,
            knowledgeKeys: storedKnowledge.map(item => item.knowledgeKey),
            memoryKeys: memoryEntries.map((item) => `${item.memoryScope}:${item.memoryKey}:${item.entryType}`)
        });
        const detail = this.storage.getReportDetail(runId);
        if (detail) {
            const mergedDetail = {
                ...detail,
                analysisContext: {
                    userId: input.userId ?? null,
                    projectId: input.projectId ?? null,
                    sessionId: input.sessionId ?? null,
                    knowledgeItems: storedKnowledge,
                    relationships: knowledgeRelationships,
                    memoryEntries: storedMemories
                }
            };
            const markdown = this.storage.getReport(runId) ?? '';
            this.storage.saveReport(runId, markdown, mergedDetail);
        }
        return {
            knowledgeCount: storedKnowledge.length,
            relationshipCount: knowledgeRelationships.length,
            memoryCount: storedMemories.length
        };
    }
    async runAnalysisFromArgs(args, onProgress) {
        const input = analyzeDesignInputSchema.parse(args ?? {});
        const review = await this.runReviewInputFromArgs(input, onProgress);
        const contextSummary = this.persistAnalysisContext(review.runId, input);
        return { ...review, analysisContext: contextSummary };
    }
    getEnrichedContextForRun(runId) {
        const knowledgeContext = this.storage.getKnowledgeContextForRun(runId);
        if (!knowledgeContext) {
            return {};
        }
        const groupMemoryEntries = (scope) => knowledgeContext.memoryEntries
            .filter(entry => entry.memoryScope === scope)
            .map(entry => ({
            memoryKey: entry.memoryKey,
            entryType: entry.entryType,
            content: entry.content,
            tags: entry.tags
        }));
        return {
            knowledgeContext: {
                userId: knowledgeContext.metadata.userId ?? undefined,
                projectId: knowledgeContext.metadata.projectId ? Number(knowledgeContext.metadata.projectId) : undefined,
                sessionId: knowledgeContext.metadata.sessionId ?? undefined,
                items: knowledgeContext.knowledgeItems,
                relationships: knowledgeContext.relationships
            },
            memoryContext: {
                session: groupMemoryEntries('session'),
                user: groupMemoryEntries('user'),
                project: groupMemoryEntries('project')
            }
        };
    }
    async storeKnowledgeContext(args) {
        const input = storeKnowledgeContextInputSchema.parse(args ?? {});
        const knowledgeItems = this.storage.upsertKnowledgeItems(input.knowledgeItems.map((item) => ({
            knowledgeKey: typeof item.knowledgeKey === 'string' ? item.knowledgeKey : undefined,
            userId: typeof item.userId === 'string' ? item.userId : input.userId,
            projectId: typeof item.projectId === 'number'
                ? item.projectId
                : typeof input.projectId === 'number'
                    ? input.projectId
                    : undefined,
            sessionId: typeof item.sessionId === 'string' ? item.sessionId : input.sessionId,
            scope: item.scope ?? 'project',
            category: String(item.category ?? 'general'),
            summary: String(item.summary ?? ''),
            tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === 'string') : [],
            priority: item.priority ?? 'medium',
            confidence: item.confidence ?? 'medium',
            source: typeof item.source === 'string' ? item.source : undefined
        })));
        if (input.knowledgeRelationships.length > 0) {
            this.storage.addKnowledgeRelationships(input.knowledgeRelationships);
        }
        return { knowledgeItems };
    }
    async listKnowledgeContext(args) {
        const input = listKnowledgeContextInputSchema.parse(args ?? {});
        const preferredScopes = input.sessionId
            ? ['session', 'project', 'user', 'organization']
            : input.projectId
                ? ['project', 'user', 'organization', 'session']
                : input.userId
                    ? ['user', 'organization', 'project', 'session']
                    : ['organization', 'project', 'user', 'session'];
        const knowledgeItems = this.storage.listKnowledgeItems({
            userId: input.userId,
            projectId: input.projectId,
            sessionId: input.sessionId,
            scope: input.scope,
            category: input.category,
            tags: input.tags,
            queryTags: input.queryTags,
            ranked: input.ranked,
            preferredScopes,
            limit: input.limit
        });
        const relationships = this.storage.listKnowledgeRelationships({
            knowledgeKeys: knowledgeItems.map(item => item.knowledgeKey),
            limit: input.limit
        });
        return { knowledgeItems, relationships };
    }
    async storeMemoryContext(args) {
        const input = storeMemoryContextInputSchema.parse(args ?? {});
        const memories = this.storage.upsertMemoryEntries(input.memories.map((item) => ({
            memoryScope: item.memoryScope,
            memoryKey: String(item.memoryKey ?? ''),
            entryType: String(item.entryType ?? ''),
            content: item.content,
            tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === 'string') : []
        })));
        return { memories };
    }
    async listMemoryContext(args) {
        const input = listMemoryContextInputSchema.parse(args ?? {});
        const memories = this.storage.listMemoryEntries({
            memoryScope: input.memoryScope,
            memoryKey: input.memoryKey,
            entryType: input.entryType,
            limit: input.limit
        });
        return { memories };
    }
    async buildPerspectiveFromRun(runId, mode, overrides) {
        const detail = this.storage.getReportDetail(runId);
        if (!detail) {
            throw new Error(`No structured detail found for run ${runId}`);
        }
        const baseReport = this.storage.getReport(runId) ?? '';
        const strategic = detail?.strategicArtifacts ?? {};
        const designSystemFindings = this.storage.getDesignSystemFindings(runId) ?? {};
        const designData = this.getDesignDataForRun(runId);
        const extraContext = this.getEnrichedContextForRun(runId);
        const perspectiveCtx = {
            mode,
            figmaUrl: detail?.source ?? '',
            baseReport,
            detail,
            strategicArtifacts: strategic,
            designSystemFindings,
            designData,
            ...extraContext,
            prdText: overrides?.prdText,
            problemStatement: overrides?.problemStatement || detail?.problemStatement,
            proposedSolution: detail?.proposedSolution,
            requirements: overrides?.requirements && overrides.requirements.length > 0
                ? overrides.requirements
                : detail?.requirements,
            audience: overrides?.audience,
            businessGoal: overrides?.businessGoal
        };
        const llmResult = await generatePerspectiveReport(perspectiveCtx, this.hasDebugFlag);
        if (llmResult.markdown) {
            const header = [
                `# UX Design Review Report — ${mode.toUpperCase()} Mode`,
                '',
                `**Source:** ${perspectiveCtx.figmaUrl}`,
                `**Strategic Mode:** ${mode.toUpperCase()}`,
                `**Date:** ${new Date().toISOString()}`,
                `**Narrative Provider:** ${llmResult.provider.provider} (${llmResult.provider.model})`,
                `**Generation Time:** ${llmResult.provider.generationTimeMs}ms`,
                '',
                '---',
                ''
            ].join('\n');
            return header + llmResult.markdown;
        }
        const branch = detail?.strategicBranch ?? {};
        const lines = [];
        lines.push(`# ${mode === 'challenge' ? 'Challenge' : 'Improve'} Design`);
        lines.push('');
        lines.push('## Summary');
        lines.push(`- Run ID: ${runId}`);
        lines.push(`- Strategic Branch: ${branch?.branch ?? 'unknown'}`);
        lines.push(`- Problem-Solution Fit: ${branch?.problemSolutionFitPct ?? 'n/a'}%`);
        lines.push(`- Requirement Traceability: ${branch?.requirementTraceabilityPct ?? 'n/a'}%`);
        lines.push(`- Composite Alignment: ${branch?.compositePct ?? 'n/a'}%`);
        lines.push('');
        lines.push('## Base Report');
        lines.push(baseReport || 'Base report not available for this run.');
        return lines.join('\n');
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'review_figma',
                    description: 'Review a Figma design for UX quality. Fetches design data via Figma MCP, ' +
                        'scores across 7 parameters (user flow, visual hierarchy, design system consistency, ' +
                        'accessibility, content architecture, technical feasibility, brand quality), ' +
                        'then enriches with LLM narrative (GHCP primary, GLM fallback). Optional design system ' +
                        'validation (external MCP, generic, custom) can be enabled. Returns full markdown report first, followed by JSON metadata.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            figmaUrl: {
                                type: 'string',
                                description: 'Full Figma URL (e.g. https://www.figma.com/design/KEY/name?node-id=X-Y)'
                            },
                            designSystem: {
                                type: 'string',
                                description: "Design system mode: 'generic', 'external', 'custom', 'none' (default: 'generic')"
                            },
                            customGuidelinePath: {
                                type: 'string',
                                description: 'Path to custom guideline markdown file (required if designSystem=custom)'
                            },
                            problemStatement: {
                                type: 'string',
                                description: 'Optional explicit problem statement used for deterministic fit scoring'
                            },
                            proposedSolution: {
                                type: 'string',
                                description: 'Optional explicit proposed solution summary used for deterministic fit/traceability scoring'
                            },
                            requirements: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Optional list of explicit requirements used for deterministic traceability scoring'
                            }
                        },
                        required: ['figmaUrl']
                    }
                },
                {
                    name: 'review_input',
                    description: 'Run UX review from multiple inputs: figmaUrl, webUrl, imagePath, htmlSnippet, or auto-detect from chatContext. ' +
                        'Optional design system validation (external MCP, generic, custom). Returns full markdown report first, followed by JSON metadata.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            figmaUrl: {
                                type: 'string',
                                description: 'Figma URL to review'
                            },
                            webUrl: {
                                type: 'string',
                                description: 'Live web URL to capture and review'
                            },
                            imagePath: {
                                type: 'string',
                                description: 'Absolute path to an image file to review'
                            },
                            htmlSnippet: {
                                type: 'string',
                                description: 'HTML markup to render and capture for review'
                            },
                            chatContext: {
                                type: 'string',
                                description: 'Recent chat text used for auto-detect when explicit inputs are missing'
                            },
                            designSystem: {
                                type: 'string',
                                description: "Design system mode: 'generic', 'external', 'custom', 'none' (default: 'generic')"
                            },
                            customGuidelinePath: {
                                type: 'string',
                                description: 'Path to custom guideline markdown file (required if designSystem=custom)'
                            },
                            problemStatement: {
                                type: 'string',
                                description: 'Optional explicit problem statement used for deterministic fit scoring'
                            },
                            proposedSolution: {
                                type: 'string',
                                description: 'Optional explicit proposed solution summary used for deterministic fit/traceability scoring'
                            },
                            requirements: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Optional list of explicit requirements used for deterministic traceability scoring'
                            }
                        }
                    }
                },
                {
                    name: 'get_review_report',
                    description: 'Retrieve the full markdown report for a previous UX review run by its ID.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            runId: {
                                type: 'number',
                                description: 'The review run ID returned by review_figma'
                            }
                        },
                        required: ['runId']
                    }
                },
                {
                    name: 'analyze_design_input',
                    description: 'Canonical design analysis entry point. Accepts the same review inputs plus optional user/project/session context, knowledge items, relationships, and memory entries. Returns markdown first, then JSON metadata.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            figmaUrl: { type: 'string', description: 'Figma URL to analyze' },
                            webUrl: { type: 'string', description: 'Live web URL to capture and analyze' },
                            imagePath: { type: 'string', description: 'Absolute path to an image file to analyze' },
                            htmlSnippet: { type: 'string', description: 'HTML markup to render and analyze' },
                            chatContext: { type: 'string', description: 'Recent chat text used for auto-detect' },
                            problemStatement: { type: 'string' },
                            proposedSolution: { type: 'string' },
                            requirements: { type: 'array', items: { type: 'string' } },
                            designSystem: { type: 'string' },
                            customGuidelinePath: { type: 'string' },
                            userId: { type: 'string' },
                            projectId: { type: 'number' },
                            sessionId: { type: 'string' },
                            knowledgeItems: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        knowledgeKey: { type: 'string' },
                                        userId: { type: 'string' },
                                        projectId: { type: 'number' },
                                        sessionId: { type: 'string' },
                                        scope: {
                                            type: 'string',
                                            enum: ['session', 'user', 'project', 'organization']
                                        },
                                        category: { type: 'string' },
                                        summary: { type: 'string' },
                                        tags: { type: 'array', items: { type: 'string' } },
                                        priority: { type: 'string' },
                                        confidence: { type: 'string' },
                                        source: { type: 'string' }
                                    }
                                }
                            },
                            knowledgeRelationships: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        fromKnowledgeKey: { type: 'string' },
                                        toKnowledgeKey: { type: 'string' },
                                        relationshipType: {
                                            type: 'string',
                                            enum: ['related_to', 'depends_on', 'supports', 'overrides', 'conflicts_with', 'same_as']
                                        },
                                        note: { type: 'string' }
                                    }
                                }
                            },
                            memoryEntries: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        memoryScope: {
                                            type: 'string',
                                            enum: ['session', 'user', 'project', 'organization']
                                        },
                                        memoryKey: { type: 'string' },
                                        entryType: { type: 'string' },
                                        content: {},
                                        tags: { type: 'array', items: { type: 'string' } }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    name: 'get_review_detail',
                    description: 'Retrieve structured report detail JSON for side-panel rendering and score indicators.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            runId: {
                                type: 'number',
                                description: 'The review run ID returned by review_input/review_figma'
                            }
                        },
                        required: ['runId']
                    }
                },
                {
                    name: 'get_review_status',
                    description: 'Get current run status and stage message for progress indicator updates.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            runId: {
                                type: 'number',
                                description: 'The review run ID to inspect'
                            }
                        },
                        required: ['runId']
                    }
                },
                {
                    name: 'list_reviews',
                    description: 'List recent review runs with stage and status metadata for desktop history/panel navigation.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            limit: {
                                type: 'number',
                                description: 'Maximum number of runs to return (default: 20)'
                            }
                        }
                    }
                },
                {
                    name: 'store_knowledge_context',
                    description: 'Store categorized UX/domain/product knowledge and lightweight relationships for a user, project, or session.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            userId: { type: 'string' },
                            projectId: { type: 'number' },
                            sessionId: { type: 'string' },
                            knowledgeItems: {
                                type: 'array',
                                minItems: 1,
                                items: {
                                    type: 'object',
                                    properties: {
                                        knowledgeKey: { type: 'string' },
                                        userId: { type: 'string' },
                                        projectId: { type: 'number' },
                                        sessionId: { type: 'string' },
                                        scope: {
                                            type: 'string',
                                            enum: ['session', 'user', 'project', 'organization']
                                        },
                                        category: { type: 'string' },
                                        summary: { type: 'string' },
                                        tags: { type: 'array', items: { type: 'string' } },
                                        priority: { type: 'string' },
                                        confidence: { type: 'string' },
                                        source: { type: 'string' }
                                    },
                                    required: ['category', 'summary']
                                }
                            },
                            knowledgeRelationships: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        fromKnowledgeKey: { type: 'string' },
                                        toKnowledgeKey: { type: 'string' },
                                        relationshipType: {
                                            type: 'string',
                                            enum: ['related_to', 'depends_on', 'supports', 'overrides', 'conflicts_with', 'same_as']
                                        },
                                        note: { type: 'string' }
                                    },
                                    required: ['fromKnowledgeKey', 'toKnowledgeKey', 'relationshipType']
                                }
                            }
                        },
                        required: ['knowledgeItems']
                    }
                },
                {
                    name: 'list_knowledge_context',
                    description: 'List knowledge items and relationships for a user/project/session with optional ranked retrieval (priority + tags + scope).',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            userId: { type: 'string' },
                            projectId: { type: 'number' },
                            sessionId: { type: 'string' },
                            scope: {
                                type: 'string',
                                enum: ['session', 'user', 'project', 'organization']
                            },
                            category: { type: 'string' },
                            tags: { type: 'array', items: { type: 'string' } },
                            queryTags: { type: 'array', items: { type: 'string' } },
                            ranked: { type: 'boolean' },
                            limit: { type: 'number' }
                        }
                    }
                },
                {
                    name: 'store_memory_context',
                    description: 'Store session, user, or project memory entries that should inform future analysis runs.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            memories: {
                                type: 'array',
                                minItems: 1,
                                items: {
                                    type: 'object',
                                    properties: {
                                        memoryScope: {
                                            type: 'string',
                                            enum: ['session', 'user', 'project', 'organization']
                                        },
                                        memoryKey: { type: 'string' },
                                        entryType: { type: 'string' },
                                        content: {},
                                        tags: { type: 'array', items: { type: 'string' } }
                                    },
                                    required: ['memoryScope', 'memoryKey', 'entryType', 'content']
                                }
                            }
                        },
                        required: ['memories']
                    }
                },
                {
                    name: 'list_memory_context',
                    description: 'List stored memory entries to help inspect what the assistant has learned for a user or project.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            memoryScope: {
                                type: 'string',
                                enum: ['session', 'user', 'project', 'organization']
                            },
                            memoryKey: { type: 'string' },
                            entryType: { type: 'string' },
                            limit: { type: 'number' }
                        }
                    }
                },
                {
                    name: 'challenge_design',
                    description: 'Challenge the current design from problem-solution-requirement perspective and highlight missed edge cases.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            runId: {
                                type: 'number',
                                description: 'Review run ID from review_figma/review_input'
                            },
                            prdText: {
                                type: 'string',
                                description: 'Optional PRD/requirements text for additional challenge context'
                            }
                        },
                        required: ['runId']
                    }
                },
                {
                    name: 'challenge_from_input',
                    description: 'Run review_input and challenge_design in one call. Accepts same input fields as review_input plus optional prdText.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            figmaUrl: { type: 'string' },
                            webUrl: { type: 'string' },
                            imagePath: { type: 'string' },
                            htmlSnippet: { type: 'string' },
                            chatContext: { type: 'string' },
                            designSystem: { type: 'string' },
                            customGuidelinePath: { type: 'string' },
                            problemStatement: { type: 'string' },
                            proposedSolution: { type: 'string' },
                            requirements: { type: 'array', items: { type: 'string' } },
                            prdText: { type: 'string' }
                        }
                    }
                },
                {
                    name: 'challengedesign',
                    description: 'Alias of challenge_design.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            runId: {
                                type: 'number',
                                description: 'Review run ID from review_figma/review_input'
                            },
                            prdText: {
                                type: 'string',
                                description: 'Optional PRD/requirements text for additional challenge context'
                            }
                        },
                        required: ['runId']
                    }
                },
                {
                    name: 'improve_design',
                    description: 'Provide concrete design improvements (visual, interaction, component selection, edge cases).',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            runId: {
                                type: 'number',
                                description: 'Review run ID from review_figma/review_input'
                            },
                            problemStatement: {
                                type: 'string',
                                description: 'Optional explicit problem statement for improvement targeting'
                            },
                            requirements: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Optional requirements list to validate proposed improvements against'
                            }
                        },
                        required: ['runId']
                    }
                },
                {
                    name: 'improve_from_input',
                    description: 'Run review_input and improve_design in one call. Accepts same input fields as review_input.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            figmaUrl: { type: 'string' },
                            webUrl: { type: 'string' },
                            imagePath: { type: 'string' },
                            htmlSnippet: { type: 'string' },
                            chatContext: { type: 'string' },
                            designSystem: { type: 'string' },
                            customGuidelinePath: { type: 'string' },
                            problemStatement: { type: 'string' },
                            proposedSolution: { type: 'string' },
                            requirements: { type: 'array', items: { type: 'string' } }
                        }
                    }
                },
                {
                    name: 'improvedesign',
                    description: 'Alias of improve_design.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            runId: {
                                type: 'number',
                                description: 'Review run ID from review_figma/review_input'
                            },
                            problemStatement: {
                                type: 'string',
                                description: 'Optional explicit problem statement for improvement targeting'
                            },
                            requirements: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Optional requirements list to validate proposed improvements against'
                            }
                        },
                        required: ['runId']
                    }
                },
                {
                    name: 'pitch_design',
                    description: 'Generate stakeholder-facing pitch points and decision rationale from review findings.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            runId: {
                                type: 'number',
                                description: 'Review run ID from review_figma/review_input'
                            },
                            audience: {
                                type: 'string',
                                description: 'Optional stakeholder audience (e.g., PM, leadership, engineering, design review board)'
                            },
                            businessGoal: {
                                type: 'string',
                                description: 'Optional business goal to align pitch framing'
                            },
                            designDecisions: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Designer\'s own rationale for key decisions (e.g., "We chose tabs over accordion because users need to compare sections")'
                            },
                            constraints: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Technical/business constraints that shaped the design (e.g., "Must work offline", "Legacy API limitation")'
                            },
                            alternativesConsidered: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Alternatives the designer explored and rejected (e.g., "Tried wizard flow but users abandoned at step 3")'
                            },
                            userResearch: {
                                type: 'string',
                                description: 'User research or data backing the design approach (interview quotes, analytics, usability test findings)'
                            }
                        },
                        required: ['runId']
                    }
                },
                {
                    name: 'pitchdesign',
                    description: 'Alias of pitch_design.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            runId: {
                                type: 'number',
                                description: 'Review run ID from review_figma/review_input'
                            },
                            audience: {
                                type: 'string',
                                description: 'Optional stakeholder audience (e.g., PM, leadership, engineering, design review board)'
                            },
                            businessGoal: {
                                type: 'string',
                                description: 'Optional business goal to align pitch framing'
                            },
                            designDecisions: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Designer\'s own rationale for key decisions'
                            },
                            constraints: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Technical/business constraints that shaped the design'
                            },
                            alternativesConsidered: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Alternatives the designer explored and rejected'
                            },
                            userResearch: {
                                type: 'string',
                                description: 'User research or data backing the design approach'
                            }
                        },
                        required: ['runId']
                    }
                },
                {
                    name: 'compare_reviews',
                    description: 'Compare two review runs to show progress, regression, and what changed between design iterations.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            currentRunId: {
                                type: 'number',
                                description: 'The current/latest review run ID'
                            },
                            previousRunId: {
                                type: 'number',
                                description: 'The previous review run ID to compare against'
                            }
                        },
                        required: ['currentRunId', 'previousRunId']
                    }
                },
                {
                    name: 'gather_context',
                    description: 'Gather additional design context from other available MCP tools via sampling. ' +
                        'Uses the host LLM to call Figma, browser, filesystem, or other tools to enrich review context. ' +
                        'Returns structured findings that can inform a subsequent review.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            designRef: {
                                type: 'string',
                                description: 'Design reference (Figma URL, web URL, or description of what to look up)'
                            },
                            contextTypes: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                    enum: ['accessibility', 'design-system', 'user-flows', 'content', 'technical']
                                },
                                description: 'What types of context to gather (default: all)'
                            },
                            hints: {
                                type: 'string',
                                description: 'Additional guidance for the context gathering LLM'
                            }
                        },
                        required: ['designRef']
                    }
                },
                {
                    name: 'create_project',
                    description: 'Create a validation project to organize context rules and validation runs.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'Project name' },
                            description: { type: 'string', description: 'Optional project description' }
                        },
                        required: ['name']
                    }
                },
                {
                    name: 'add_context_rule',
                    description: 'Add a context rule for a project. Rules start as draft by default.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            projectId: { type: 'number' },
                            ruleId: { type: 'string' },
                            category: { type: 'string' },
                            statement: { type: 'string' },
                            priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                            authority: { type: 'string', enum: ['approved', 'proposed', 'derived'] },
                            appliesTo: { type: 'array', items: { type: 'string' } },
                            validatorType: { type: 'string' },
                            source: { type: 'string' },
                            status: { type: 'string', enum: ['draft', 'approved', 'deprecated'] }
                        },
                        required: [
                            'projectId',
                            'ruleId',
                            'category',
                            'statement',
                            'priority',
                            'authority',
                            'validatorType'
                        ]
                    }
                },
                {
                    name: 'list_context_rules',
                    description: 'List context rules for a project, optionally filtered by status.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            projectId: { type: 'number' },
                            status: { type: 'string', enum: ['draft', 'approved', 'deprecated'] }
                        },
                        required: ['projectId']
                    }
                },
                {
                    name: 'approve_context_rule',
                    description: 'Mark a context rule as approved for enforcement in context packs.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            rulePkId: { type: 'number', description: 'Primary key ID of the context rule row' }
                        },
                        required: ['rulePkId']
                    }
                },
                {
                    name: 'create_context_pack',
                    description: 'Create a context pack from selected rule IDs. If omitted, approved rules in the project are used.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            projectId: { type: 'number' },
                            name: { type: 'string' },
                            version: { type: 'string' },
                            ruleIds: { type: 'array', items: { type: 'number' } },
                            status: { type: 'string', enum: ['draft', 'active', 'archived'] }
                        },
                        required: ['projectId', 'name']
                    }
                },
                {
                    name: 'validate_output_against_context',
                    description: 'Validate an output against a context pack. Uses deterministic checks where available and unknown findings where not yet implemented.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            contextPackId: { type: 'number' },
                            targetTool: { type: 'string' },
                            taskType: { type: 'string', enum: ['generate', 'review', 'code', 'rationale'] },
                            outputType: {
                                type: 'string',
                                enum: ['figma', 'screenshot', 'html', 'react_code', 'web_url', 'image']
                            },
                            outputRef: { type: 'string' }
                        },
                        required: ['contextPackId', 'targetTool', 'outputType', 'outputRef']
                    }
                },
                {
                    name: 'generate_correction_prompt',
                    description: 'Generate a tool-specific correction prompt from validation findings and store it in prompt history.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            validationRunId: { type: 'number' },
                            targetTool: { type: 'string' },
                            maxItems: { type: 'number' }
                        },
                        required: ['validationRunId', 'targetTool']
                    }
                },
                {
                    name: 'compare_validation_runs',
                    description: 'Compare two validation runs to show compliance progress, regressions, and rule-level status changes.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            currentValidationRunId: { type: 'number' },
                            previousValidationRunId: { type: 'number' }
                        },
                        required: ['currentValidationRunId', 'previousValidationRunId']
                    }
                },
                {
                    name: 'reviewfigma',
                    description: 'Alias of review_figma.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            figmaUrl: {
                                type: 'string',
                                description: 'Full Figma URL (e.g. https://www.figma.com/design/KEY/name?node-id=X-Y)'
                            },
                            designSystem: {
                                type: 'string',
                                description: "Design system mode: 'generic', 'external', 'custom', 'none' (default: 'generic')"
                            },
                            customGuidelinePath: {
                                type: 'string',
                                description: 'Path to custom guideline markdown file (required if designSystem=custom)'
                            },
                            problemStatement: {
                                type: 'string',
                                description: 'Optional explicit problem statement used for deterministic fit scoring'
                            },
                            proposedSolution: {
                                type: 'string',
                                description: 'Optional explicit proposed solution summary used for deterministic fit/traceability scoring'
                            },
                            requirements: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Optional list of explicit requirements used for deterministic traceability scoring'
                            }
                        },
                        required: ['figmaUrl']
                    }
                }
            ]
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
            const { name, arguments: args } = request.params;
            const progressToken = request.params._meta?.progressToken;
            const sendProgress = progressToken
                ? async (progress, total, message) => {
                    try {
                        await extra.sendNotification({
                            method: 'notifications/progress',
                            params: { progressToken, progress, total, message }
                        });
                    }
                    catch { /* best-effort */ }
                }
                : undefined;
            switch (name) {
                case 'review_figma':
                case 'reviewfigma': {
                    const figmaUrl = args?.figmaUrl;
                    if (!figmaUrl) {
                        return { content: [{ type: 'text', text: 'Error: figmaUrl is required' }] };
                    }
                    try {
                        const onProgress = sendProgress
                            ? (_stage, progress, total) => { sendProgress(progress, total, _stage); }
                            : undefined;
                        const result = await reviewFigma(figmaUrl, this.storage, this.hasDebugFlag, {
                            designSystem: args?.designSystem ?? 'generic',
                            customGuidelinePath: args?.customGuidelinePath,
                            problemStatement: args?.problemStatement,
                            proposedSolution: args?.proposedSolution,
                            requirements: args?.requirements
                        }, onProgress, this.server);
                        const report = this.storage.getReport(result.runId);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: (report ?? 'Report not available for this run.') +
                                        '\n\n---\n\n' +
                                        '## Run Metadata (JSON)\n\n' +
                                        '```json\n' +
                                        JSON.stringify({
                                            ...result,
                                            reportMarkdown: report ?? null
                                        }, null, 2) +
                                        '\n```'
                                }
                            ]
                        };
                    }
                    catch (error) {
                        const msg = error instanceof Error ? error.message : String(error);
                        return { content: [{ type: 'text', text: `Error: ${msg}` }] };
                    }
                }
                case 'review_input': {
                    try {
                        const onProgress = sendProgress
                            ? (_stage, progress, total) => { sendProgress(progress, total, _stage); }
                            : undefined;
                        const result = await this.runReviewInputFromArgs(args, onProgress);
                        const report = this.storage.getReport(result.runId);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: (report ?? 'Report not available for this run.') +
                                        '\n\n---\n\n' +
                                        '## Run Metadata (JSON)\n\n' +
                                        '```json\n' +
                                        JSON.stringify({
                                            ...result,
                                            reportMarkdown: report ?? null
                                        }, null, 2) +
                                        '\n```'
                                }
                            ]
                        };
                    }
                    catch (error) {
                        const msg = error instanceof Error ? error.message : String(error);
                        return { content: [{ type: 'text', text: `Error: ${msg}` }] };
                    }
                }
                case 'analyze_design_input': {
                    try {
                        const onProgress = sendProgress
                            ? (_stage, progress, total) => { sendProgress(progress, total, _stage); }
                            : undefined;
                        const result = await this.runAnalysisFromArgs(args, onProgress);
                        const report = this.storage.getReport(result.runId);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: (report ?? 'Report not available for this run.') +
                                        '\n\n---\n\n' +
                                        '## Run Metadata (JSON)\n\n' +
                                        '```json\n' +
                                        JSON.stringify({
                                            ...result,
                                            reportMarkdown: report ?? null,
                                            mode: 'analyze_design_input'
                                        }, null, 2) +
                                        '\n```'
                                }
                            ]
                        };
                    }
                    catch (error) {
                        const msg = error instanceof Error ? error.message : String(error);
                        return { content: [{ type: 'text', text: `Error: ${msg}` }] };
                    }
                }
                case 'challenge_from_input': {
                    try {
                        const onProgress = sendProgress
                            ? (_stage, progress, total) => { sendProgress(progress, total, _stage); }
                            : undefined;
                        const review = await this.runReviewInputFromArgs(args, onProgress);
                        const prdText = typeof args?.prdText === 'string' ? args.prdText.trim() : undefined;
                        const challenge = await this.buildPerspectiveFromRun(review.runId, 'challenge', { prdText });
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: challenge +
                                        '\n\n---\n\n' +
                                        '## Run Metadata (JSON)\n\n' +
                                        '```json\n' +
                                        JSON.stringify({ ...review, mode: 'challenge_from_input' }, null, 2) +
                                        '\n```'
                                }
                            ]
                        };
                    }
                    catch (error) {
                        const msg = error instanceof Error ? error.message : String(error);
                        return { content: [{ type: 'text', text: `Error: ${msg}` }] };
                    }
                }
                case 'get_review_report': {
                    const runId = args?.runId;
                    if (!runId) {
                        return { content: [{ type: 'text', text: 'Error: runId is required' }] };
                    }
                    const report = this.storage.getReport(runId);
                    if (!report) {
                        return { content: [{ type: 'text', text: `Error: No report found for run ${runId}` }] };
                    }
                    return { content: [{ type: 'text', text: report }] };
                }
                case 'get_review_detail': {
                    const runId = args?.runId;
                    if (!runId) {
                        return { content: [{ type: 'text', text: 'Error: runId is required' }] };
                    }
                    const detail = this.storage.getReportDetail(runId);
                    if (!detail) {
                        return {
                            content: [
                                { type: 'text', text: `Error: No structured detail found for run ${runId}` }
                            ]
                        };
                    }
                    return { content: [{ type: 'text', text: JSON.stringify(detail, null, 2) }] };
                }
                case 'get_review_status': {
                    const runId = args?.runId;
                    if (!runId) {
                        return { content: [{ type: 'text', text: 'Error: runId is required' }] };
                    }
                    const run = this.storage.getRun(runId);
                    if (!run) {
                        return { content: [{ type: 'text', text: `Error: Run ${runId} not found` }] };
                    }
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    runId: run.id,
                                    status: run.status,
                                    stage: run.stage,
                                    stageMessage: run.stage_message,
                                    error: run.error
                                }, null, 2)
                            }
                        ]
                    };
                }
                case 'list_reviews': {
                    const limit = args?.limit ?? 20;
                    const rows = this.storage.listRuns(limit);
                    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
                }
                case 'store_knowledge_context': {
                    try {
                        const result = await this.storeKnowledgeContext(args);
                        return {
                            content: [{ type: 'text', text: JSON.stringify({ ok: true, ...result }, null, 2) }]
                        };
                    }
                    catch (error) {
                        const msg = error instanceof Error ? error.message : String(error);
                        return { content: [{ type: 'text', text: `Error: ${msg}` }] };
                    }
                }
                case 'list_knowledge_context': {
                    try {
                        const result = await this.listKnowledgeContext(args);
                        return {
                            content: [
                                { type: 'text', text: JSON.stringify({ ok: true, ...result }, null, 2) }
                            ]
                        };
                    }
                    catch (error) {
                        const msg = error instanceof Error ? error.message : String(error);
                        return { content: [{ type: 'text', text: `Error: ${msg}` }] };
                    }
                }
                case 'store_memory_context': {
                    try {
                        const result = await this.storeMemoryContext(args);
                        return {
                            content: [{ type: 'text', text: JSON.stringify({ ok: true, ...result }, null, 2) }]
                        };
                    }
                    catch (error) {
                        const msg = error instanceof Error ? error.message : String(error);
                        return { content: [{ type: 'text', text: `Error: ${msg}` }] };
                    }
                }
                case 'list_memory_context': {
                    try {
                        const result = await this.listMemoryContext(args);
                        return {
                            content: [
                                { type: 'text', text: JSON.stringify({ ok: true, ...result }, null, 2) }
                            ]
                        };
                    }
                    catch (error) {
                        const msg = error instanceof Error ? error.message : String(error);
                        return { content: [{ type: 'text', text: `Error: ${msg}` }] };
                    }
                }
                case 'challenge_design':
                case 'challengedesign': {
                    const runId = args?.runId;
                    if (!runId) {
                        return { content: [{ type: 'text', text: 'Error: runId is required' }] };
                    }
                    const detail = this.storage.getReportDetail(runId);
                    if (!detail) {
                        return {
                            content: [{ type: 'text', text: `Error: No structured detail found for run ${runId}` }]
                        };
                    }
                    const prdText = typeof args?.prdText === 'string' ? args.prdText.trim() : '';
                    const baseReport = this.storage.getReport(runId);
                    const strategic = detail?.strategicArtifacts ?? {};
                    const designSystemFindings = this.storage.getDesignSystemFindings(runId) ?? {};
                    const designData = this.getDesignDataForRun(runId);
                    const extraContext = this.getEnrichedContextForRun(runId);
                    // Try LLM-powered report first
                    const perspectiveCtx = {
                        mode: 'challenge',
                        figmaUrl: detail?.source ?? '',
                        baseReport: baseReport ?? '',
                        detail,
                        strategicArtifacts: strategic,
                        designSystemFindings,
                        designData,
                        ...extraContext,
                        prdText: prdText || undefined,
                        problemStatement: detail?.problemStatement,
                        proposedSolution: detail?.proposedSolution,
                        requirements: detail?.requirements
                    };
                    const llmResult = await generatePerspectiveReport(perspectiveCtx, this.hasDebugFlag);
                    if (llmResult.markdown) {
                        const header = [
                            '# UX Design Review Report — CHALLENGE Mode',
                            '',
                            `**Source:** ${perspectiveCtx.figmaUrl}`,
                            `**Strategic Mode:** CHALLENGE`,
                            `**Date:** ${new Date().toISOString()}`,
                            `**Narrative Provider:** ${llmResult.provider.provider} (${llmResult.provider.model})`,
                            `**Generation Time:** ${llmResult.provider.generationTimeMs}ms`,
                            '',
                            '---',
                            ''
                        ].join('\n');
                        return { content: [{ type: 'text', text: header + llmResult.markdown }] };
                    }
                    // Fallback to deterministic template if LLM unavailable
                    const strategicBranch = detail?.strategicBranch ?? null;
                    const sections = Array.isArray(detail?.sections) ? detail.sections : [];
                    const topRisks = Array.isArray(detail?.topRisks) ? detail.topRisks : [];
                    const missingExplicitContext = !prdText && (!strategicBranch || strategicBranch?.inputSource === 'derived-proxy');
                    const challengePrompts = Array.isArray(strategic?.challengePrompts)
                        ? strategic.challengePrompts
                        : [];
                    const edgeCaseFindings = Array.isArray(strategic?.edgeCaseFindings)
                        ? strategic.edgeCaseFindings
                        : [];
                    const highFindings = edgeCaseFindings.filter((item) => String(item?.severity ?? '').toLowerCase() === 'high');
                    const medFindings = edgeCaseFindings.filter((item) => String(item?.severity ?? '').toLowerCase() === 'medium');
                    const lowFindings = edgeCaseFindings.filter((item) => String(item?.severity ?? '').toLowerCase() === 'low');
                    const toTitle = (value) => String(value ?? '')
                        .replace(/_/g, ' ')
                        .split(' ')
                        .filter(Boolean)
                        .map(token => token.charAt(0).toUpperCase() + token.slice(1))
                        .join(' ');
                    const getSection = (parameter) => sections.find((section) => section?.parameter === parameter) ?? null;
                    const severityFromPct = (pct) => {
                        if (typeof pct !== 'number')
                            return 'MEDIUM';
                        if (pct < 60)
                            return 'HIGH';
                        if (pct < 80)
                            return 'MEDIUM';
                        return 'LOW';
                    };
                    const severityFromIssues = (section) => {
                        const issues = Array.isArray(section?.issues) ? section.issues : [];
                        if (issues.some((item) => ['critical', 'high'].includes(String(item?.severity ?? '').toLowerCase()))) {
                            return 'HIGH';
                        }
                        if (issues.some((item) => String(item?.severity ?? '').toLowerCase() === 'medium')) {
                            return 'MEDIUM';
                        }
                        return severityFromPct(section?.alignmentPct);
                    };
                    const summarizeSection = (section, fallback) => {
                        if (!section)
                            return [fallback];
                        const notes = [];
                        if (section.summary)
                            notes.push(section.summary);
                        if (section.narrative && section.narrative !== section.summary)
                            notes.push(section.narrative);
                        const issues = Array.isArray(section.issues) ? section.issues.slice(0, 2) : [];
                        for (const issue of issues) {
                            notes.push(`${issue.title}: ${issue.evidence} Recommendation: ${issue.recommendation}`);
                        }
                        return notes.length > 0 ? notes : [fallback];
                    };
                    const parsePrdContext = (value) => {
                        const parsed = {
                            problem: '',
                            solution: '',
                            requirements: []
                        };
                        if (!value)
                            return parsed;
                        const linesInPrd = value.split(/\r?\n/);
                        let inRequirements = false;
                        for (const rawLine of linesInPrd) {
                            const line = rawLine.trim();
                            if (!line)
                                continue;
                            if (/^problem(statement)?\s*:/i.test(line)) {
                                parsed.problem = line.replace(/^problem(statement)?\s*:/i, '').trim();
                                inRequirements = false;
                                continue;
                            }
                            if (/^(proposed\s+)?solution\s*:/i.test(line)) {
                                parsed.solution = line.replace(/^(proposed\s+)?solution\s*:/i, '').trim();
                                inRequirements = false;
                                continue;
                            }
                            if (/^requirements\s*:/i.test(line)) {
                                inRequirements = true;
                                const inline = line.replace(/^requirements\s*:/i, '').trim();
                                if (inline)
                                    parsed.requirements.push(inline);
                                continue;
                            }
                            if (inRequirements && /^[-*]\s+/.test(line)) {
                                parsed.requirements.push(line.replace(/^[-*]\s+/, '').trim());
                                continue;
                            }
                            if (inRequirements) {
                                parsed.requirements.push(line);
                            }
                        }
                        return parsed;
                    };
                    const inferRequirementParameter = (requirement) => {
                        const text = String(requirement ?? '').toLowerCase();
                        if (/(wcag|accessib|keyboard|contrast|screen reader)/.test(text))
                            return 'accessibility_wcag';
                        if (/(brand|visual|layout|hierarchy|spacing|color|typography)/.test(text))
                            return 'visual_hierarchy_layout';
                        if (/(component|token|design system|icon)/.test(text))
                            return 'design_system_consistency';
                        if (/(search|find|filter|chat|navigation|browse|flow|group|pin|tag)/.test(text))
                            return 'user_flow_interaction';
                        if (/(label|content|information|copy|taxonomy|ia|architecture)/.test(text))
                            return 'content_information_architecture';
                        if (/(performance|technical|latency|render|implementation)/.test(text))
                            return 'technical_feasibility';
                        return 'user_flow_interaction';
                    };
                    const impactForParameter = (parameter) => {
                        switch (parameter) {
                            case 'accessibility_wcag':
                                return 'Users can be blocked from completing the task.';
                            case 'content_information_architecture':
                                return 'Users may not know where to look or what to do next.';
                            case 'visual_hierarchy_layout':
                                return 'Users may miss the primary path or hesitate before acting.';
                            case 'design_system_consistency':
                                return 'Trust and consistency drop, especially across repeated use.';
                            case 'technical_feasibility':
                                return 'The solution may not scale or may fail under real conditions.';
                            default:
                                return 'Users may take longer to locate and act on the right chat.';
                        }
                    };
                    const parsedContext = parsePrdContext(prdText);
                    const problemSection = getSection('user_flow_interaction');
                    const solutionSection = getSection('content_information_architecture');
                    const iaSection = getSection('content_information_architecture');
                    const visualSection = getSection('visual_hierarchy_layout');
                    const designSystemSection = getSection('design_system_consistency');
                    const requirementsList = parsedContext.requirements.length > 0
                        ? parsedContext.requirements
                        : challengePrompts.slice(0, 3);
                    const designSystemComponents = Array.isArray(designSystemFindings?.componentFindings)
                        ? designSystemFindings.componentFindings
                        : [];
                    const designSystemIcons = Array.isArray(designSystemFindings?.iconFindings)
                        ? designSystemFindings.iconFindings
                        : [];
                    const lines = [];
                    lines.push('# Challenge Design');
                    lines.push('');
                    lines.push('## Executive Summary');
                    lines.push(`- Strategic Branch: ${strategicBranch?.branch ?? 'unknown'}`);
                    lines.push(`- Problem-Solution Fit: ${strategicBranch?.problemSolutionFitPct ?? 'n/a'}%`);
                    lines.push(`- Requirement Traceability: ${strategicBranch?.requirementTraceabilityPct ?? 'n/a'}%`);
                    lines.push(`- Composite Alignment: ${strategicBranch?.compositePct ?? 'n/a'}%`);
                    lines.push(`- High-Risk Findings: ${highFindings.length}`);
                    lines.push(`- Medium-Risk Findings: ${medFindings.length}`);
                    lines.push(`- Low-Risk Findings: ${lowFindings.length}`);
                    if (detail?.executiveSummary) {
                        lines.push(`- Narrative: ${detail.executiveSummary}`);
                    }
                    if (topRisks.length > 0) {
                        lines.push('- Top Risks:');
                        for (const risk of topRisks.slice(0, 3)) {
                            lines.push(`  - ${risk}`);
                        }
                    }
                    if (missingExplicitContext) {
                        lines.push('');
                        lines.push('## Missing Context (Please Provide in Chat)');
                        lines.push('The challenge quality is currently limited because explicit problem/requirements context is missing.');
                        lines.push('');
                        lines.push('Please share one of these:');
                        lines.push('- A short PRD/requirements block in `prdText`, or');
                        lines.push('- Problem statement + proposed solution + requirements list');
                        lines.push('');
                        lines.push('Suggested format:');
                        lines.push('```');
                        lines.push('problemStatement: <what problem are we solving?>');
                        lines.push('proposedSolution: <what design/approach is proposed?>');
                        lines.push('requirements:');
                        lines.push('- <requirement 1>');
                        lines.push('- <requirement 2>');
                        lines.push('- <requirement 3>');
                        lines.push('```');
                    }
                    lines.push('');
                    lines.push('## 1. Problem Assessment');
                    lines.push(`Severity: ${severityFromPct(strategicBranch?.problemSolutionFitPct)}`);
                    lines.push(`Problem Statement: ${parsedContext.problem || 'No explicit problem statement was provided beyond the run context.'}`);
                    for (const note of summarizeSection(problemSection, 'The current review does not yet prove that the primary find-chat task is measurably faster.')) {
                        lines.push(`- ${note}`);
                    }
                    lines.push('');
                    lines.push('## 2. Solution Assessment');
                    lines.push(`Severity: ${severityFromIssues(solutionSection)}`);
                    lines.push(`Proposed Solution: ${parsedContext.solution || 'Grouping chats into a project-based container is the stated solution.'}`);
                    for (const note of summarizeSection(solutionSection, 'The solution introduces structure, but the review needs stronger evidence that the grouping model matches user mental models.')) {
                        lines.push(`- ${note}`);
                    }
                    lines.push('');
                    lines.push('## 3. Requirements Analysis');
                    lines.push('| Requirement | Coverage Signal | Status | Notes |');
                    lines.push('| --- | --- | --- | --- |');
                    if (requirementsList.length === 0) {
                        lines.push('| No explicit requirements provided | Review cannot trace coverage | Needs input | Provide requirements in `prdText` for better traceability. |');
                    }
                    else {
                        for (const requirement of requirementsList) {
                            const parameter = inferRequirementParameter(requirement);
                            const section = getSection(parameter);
                            const status = !section
                                ? 'Needs proof'
                                : section.alignmentPct >= 80
                                    ? 'Pass'
                                    : section.alignmentPct >= 60
                                        ? 'Partial'
                                        : 'Fail';
                            const notes = section?.issues?.[0]
                                ? `${section.issues[0].title}. ${section.issues[0].recommendation}`
                                : (section?.summary ?? 'No direct evidence mapped.');
                            lines.push(`| ${String(requirement).replace(/\|/g, '/')} | ${toTitle(parameter)} ${typeof section?.alignmentPct === 'number' ? `(${section.alignmentPct}%)` : ''} | ${status} | ${String(notes).replace(/\|/g, '/')} |`);
                        }
                    }
                    lines.push('');
                    lines.push('## 4. IA & Navigation');
                    lines.push(`Severity: ${severityFromIssues(iaSection)}`);
                    for (const note of summarizeSection(iaSection, 'Navigation structure needs stronger validation for findability and recovery paths.')) {
                        lines.push(`- ${note}`);
                    }
                    if (Array.isArray(strategic?.flowIaHints) && strategic.flowIaHints.length > 0) {
                        lines.push('- Flow & IA Hints:');
                        for (const hint of strategic.flowIaHints.slice(0, 3)) {
                            lines.push(`  - ${hint}`);
                        }
                    }
                    lines.push('');
                    lines.push('## 5. Visual Design');
                    lines.push(`Severity: ${severityFromIssues(visualSection)}`);
                    for (const note of summarizeSection(visualSection, 'The visual system does not yet prove that the most important chat actions stand out immediately.')) {
                        lines.push(`- ${note}`);
                    }
                    lines.push('');
                    lines.push('## 6. Design System Compliance');
                    lines.push(`Severity: ${severityFromIssues(designSystemSection)}`);
                    lines.push('| Artifact | Match | Category | Assessment |');
                    lines.push('| --- | --- | --- | --- |');
                    if (designSystemComponents.length === 0 && designSystemIcons.length === 0) {
                        lines.push('| No explicit design-system evidence captured | n/a | n/a | No pass/fail assessment could be derived from this run. |');
                    }
                    else {
                        for (const component of designSystemComponents.slice(0, 5)) {
                            const assessment = component.matchScore >= 0.75
                                ? 'Pass'
                                : component.matchScore >= 0.5
                                    ? 'Partial'
                                    : 'Fail';
                            lines.push(`| ${component.componentName} | ${Math.round(component.matchScore * 100)}% | ${component.category} | ${assessment}: ${String(component.description ?? '').replace(/\|/g, '/')} |`);
                        }
                        for (const icon of designSystemIcons.slice(0, 3)) {
                            lines.push(`| ${icon.iconName} | assumed | icon | Partial: icon evidence was inferred but not strongly verified in this run. |`);
                        }
                    }
                    lines.push('');
                    lines.push('## 7. Recommendations');
                    const recommendationItems = [];
                    for (const item of highFindings.slice(0, 3)) {
                        recommendationItems.push(`${toTitle(item.parameter)}: ${item.recommendation}`);
                    }
                    for (const prompt of challengePrompts.slice(0, 2)) {
                        recommendationItems.push(prompt);
                    }
                    if (recommendationItems.length === 0) {
                        lines.push('1. Re-run the review with explicit requirements and target user paths.');
                    }
                    else {
                        let index = 1;
                        for (const item of Array.from(new Set(recommendationItems)).slice(0, 5)) {
                            lines.push(`${index}. ${item}`);
                            index += 1;
                        }
                    }
                    lines.push('');
                    lines.push('## 8. Risk Matrix');
                    lines.push('| Concern | Detail | Likelihood | Impact | Mitigation |');
                    lines.push('| --- | --- | --- | --- | --- |');
                    if (edgeCaseFindings.length === 0) {
                        lines.push('| No explicit edge-case findings captured | Review depth is limited by available evidence | Medium | Medium | Add more explicit task, accessibility, and navigation evidence. |');
                    }
                    else {
                        for (const item of edgeCaseFindings) {
                            const likelihood = String(item.severity ?? '').toLowerCase() === 'high'
                                ? 'High'
                                : String(item.severity ?? '').toLowerCase() === 'medium'
                                    ? 'Medium'
                                    : 'Low';
                            lines.push(`| ${toTitle(item.parameter)} | ${String(item.evidence ?? 'No evidence provided.').replace(/\|/g, '/')} | ${likelihood} | ${impactForParameter(item.parameter)} | ${String(item.recommendation ?? '').replace(/\|/g, '/')} |`);
                        }
                    }
                    lines.push('');
                    lines.push('## 9. Verdict');
                    if (highFindings.length > 0 ||
                        (typeof strategicBranch?.problemSolutionFitPct === 'number' &&
                            strategicBranch.problemSolutionFitPct < 60)) {
                        lines.push('Verdict: HIGH RISK. The current design direction may help organize chats, but this review does not yet prove that grouping is the fastest path for finding the right chat.');
                    }
                    else if (medFindings.length > 0 ||
                        (typeof strategicBranch?.problemSolutionFitPct === 'number' &&
                            strategicBranch.problemSolutionFitPct < 80)) {
                        lines.push('Verdict: MEDIUM RISK. The design has a credible direction, but key assumptions still need clearer evidence and requirement traceability.');
                    }
                    else {
                        lines.push('Verdict: LOW RISK. The design direction appears aligned, with only limited follow-up validation needed.');
                    }
                    lines.push('');
                    lines.push('## 10. Branch-Aware Follow-Up Guidance');
                    if (strategicBranch?.branch === 'persuasion') {
                        lines.push('1. Lead stakeholder review with the strongest observed proof points and explicitly address the highest-risk objections.');
                        lines.push('2. Convert remaining high-severity findings into mitigation commitments with owners and timing.');
                        lines.push('3. Re-run the review after stakeholder feedback to confirm objections were actually resolved.');
                    }
                    else if (strategicBranch?.branch === 'improvement') {
                        lines.push('1. Fix the highest-severity flow and accessibility gaps before polishing secondary screens.');
                        lines.push('2. Prototype lighter alternatives such as search, pins, or auto-grouping and compare against the project-grouping concept.');
                        lines.push('3. Validate success with a time-to-chat task, not just visual preference feedback.');
                    }
                    else {
                        lines.push('1. Treat this as a dual-track review: improve the core findability flow while also preparing a stakeholder-ready rationale.');
                        lines.push('2. Compare the grouping concept against lighter alternatives such as search, pins, recents, or auto-tagging.');
                        lines.push('3. Bring back measurable evidence on task speed, navigation confidence, and accessibility compliance before final sign-off.');
                    }
                    lines.push('');
                    lines.push('## Prioritized Action Plan');
                    if (highFindings.length > 0) {
                        lines.push('1. Resolve all HIGH-severity findings first, starting with accessibility and flow breakpoints.');
                    }
                    else {
                        lines.push('1. Address the top two challenge prompts with explicit design changes.');
                    }
                    lines.push('2. Validate drill-down flow from KPI to root-cause artifact in 2-3 interactions.');
                    lines.push('3. Add measurable success signals for each critical user path and re-run review.');
                    lines.push('');
                    lines.push('## Appendix: Base UX Review Report');
                    if (baseReport) {
                        lines.push(baseReport);
                    }
                    else {
                        lines.push('No base report is available for this run.');
                    }
                    if (prdText) {
                        lines.push('');
                        lines.push('## PRD/Requirement Context Received');
                        lines.push(prdText.slice(0, 4000));
                        lines.push('');
                        lines.push('Use the prompts above to validate whether PRD problem framing, solution strategy, and requirement traceability are complete.');
                    }
                    return { content: [{ type: 'text', text: lines.join('\n') }] };
                }
                case 'improve_design':
                case 'improvedesign': {
                    const runId = args?.runId;
                    if (!runId) {
                        return { content: [{ type: 'text', text: 'Error: runId is required' }] };
                    }
                    const detail = this.storage.getReportDetail(runId);
                    if (!detail) {
                        return {
                            content: [{ type: 'text', text: `Error: No structured detail found for run ${runId}` }]
                        };
                    }
                    const problemStatement = typeof args?.problemStatement === 'string' ? args.problemStatement.trim() : '';
                    const requirements = Array.isArray(args?.requirements)
                        ? args.requirements.filter((item) => typeof item === 'string' && item.trim().length > 0)
                        : [];
                    const strategic = detail?.strategicArtifacts ?? {};
                    const baseReport = this.storage.getReport(runId);
                    const designSystemFindings = this.storage.getDesignSystemFindings(runId) ?? {};
                    const designData = this.getDesignDataForRun(runId);
                    const extraContext = this.getEnrichedContextForRun(runId);
                    // Try LLM-powered report first
                    const perspectiveCtx = {
                        mode: 'improve',
                        figmaUrl: detail?.source ?? '',
                        baseReport: baseReport ?? '',
                        detail,
                        strategicArtifacts: strategic,
                        designSystemFindings,
                        designData,
                        ...extraContext,
                        problemStatement: problemStatement || detail?.problemStatement,
                        proposedSolution: detail?.proposedSolution,
                        requirements: requirements.length > 0 ? requirements : detail?.requirements
                    };
                    const llmResult = await generatePerspectiveReport(perspectiveCtx, this.hasDebugFlag);
                    if (llmResult.markdown) {
                        const header = [
                            '# UX Design Review Report — IMPROVE Mode',
                            '',
                            `**Source:** ${perspectiveCtx.figmaUrl}`,
                            `**Strategic Mode:** IMPROVE`,
                            `**Date:** ${new Date().toISOString()}`,
                            `**Narrative Provider:** ${llmResult.provider.provider} (${llmResult.provider.model})`,
                            `**Generation Time:** ${llmResult.provider.generationTimeMs}ms`,
                            '',
                            '---',
                            ''
                        ].join('\n');
                        return { content: [{ type: 'text', text: header + llmResult.markdown }] };
                    }
                    // Fallback to deterministic template if LLM unavailable
                    const strategicBranch = detail?.strategicBranch ?? null;
                    const missingImproveContext = !problemStatement &&
                        requirements.length === 0 &&
                        (!strategicBranch || strategicBranch?.inputSource === 'derived-proxy');
                    const pack = strategic?.improvementPack ?? {};
                    const priorityFixes = Array.isArray(pack?.priorityFixes) ? pack.priorityFixes : [];
                    const edgeCaseChecks = Array.isArray(pack?.edgeCaseChecks) ? pack.edgeCaseChecks : [];
                    const nextExperiments = Array.isArray(pack?.nextExperiments) ? pack.nextExperiments : [];
                    const edgeCaseFindings = Array.isArray(strategic?.edgeCaseFindings)
                        ? strategic.edgeCaseFindings
                        : [];
                    const highFindings = edgeCaseFindings.filter((item) => String(item?.severity ?? '').toLowerCase() === 'high');
                    const medFindings = edgeCaseFindings.filter((item) => String(item?.severity ?? '').toLowerCase() === 'medium');
                    const lowFindings = edgeCaseFindings.filter((item) => String(item?.severity ?? '').toLowerCase() === 'low');
                    const lines = [];
                    lines.push('# Improve Design');
                    lines.push('');
                    lines.push('## Base UX Review Report');
                    if (baseReport) {
                        lines.push(baseReport);
                    }
                    else {
                        lines.push('No base report is available for this run.');
                    }
                    lines.push('');
                    lines.push('## Executive Summary');
                    lines.push(`- Strategic Branch: ${strategicBranch?.branch ?? 'unknown'}`);
                    lines.push(`- Problem-Solution Fit: ${strategicBranch?.problemSolutionFitPct ?? 'n/a'}%`);
                    lines.push(`- Requirement Traceability: ${strategicBranch?.requirementTraceabilityPct ?? 'n/a'}%`);
                    lines.push(`- Composite Alignment: ${strategicBranch?.compositePct ?? 'n/a'}%`);
                    lines.push(`- Priority Fixes Identified: ${priorityFixes.length}`);
                    if (missingImproveContext) {
                        lines.push('');
                        lines.push('## Missing Context (Please Provide in Chat)');
                        lines.push('Improvement guidance will be stronger with explicit product context.');
                        lines.push('');
                        lines.push('Please provide one or both:');
                        lines.push('- problemStatement: what exact user/business problem to optimize for');
                        lines.push('- requirements: constraints and must-have outcomes');
                    }
                    if (problemStatement || requirements.length > 0) {
                        lines.push('');
                        lines.push('## Context Received');
                        if (problemStatement) {
                            lines.push(`- Problem: ${problemStatement}`);
                        }
                        if (requirements.length > 0) {
                            lines.push('- Requirements:');
                            for (const req of requirements) {
                                lines.push(`  - ${req}`);
                            }
                        }
                    }
                    lines.push('');
                    lines.push('## Parameter-Level Findings');
                    if (edgeCaseFindings.length === 0) {
                        lines.push('- No parameter-level findings were generated for this run.');
                    }
                    else {
                        for (const item of edgeCaseFindings) {
                            lines.push(`- ${item.parameter} [${item.severity}]: ${item.recommendation}`);
                        }
                    }
                    lines.push('');
                    lines.push('## Priority Fixes');
                    if (priorityFixes.length === 0) {
                        lines.push('- No priority fixes were generated for this run.');
                    }
                    else {
                        for (const item of priorityFixes) {
                            lines.push(`- ${item}`);
                        }
                    }
                    lines.push('');
                    lines.push('## Edge-Case Checks');
                    if (edgeCaseChecks.length === 0) {
                        lines.push('- No edge-case checks were generated for this run.');
                    }
                    else {
                        for (const item of edgeCaseChecks) {
                            lines.push(`- ${item}`);
                        }
                    }
                    lines.push('');
                    lines.push('## Severity-Based Issues');
                    lines.push('### High');
                    if (highFindings.length === 0) {
                        lines.push('- None');
                    }
                    else {
                        for (const item of highFindings) {
                            lines.push(`- ${item.parameter}: ${item.recommendation}`);
                        }
                    }
                    lines.push('');
                    lines.push('### Medium');
                    if (medFindings.length === 0) {
                        lines.push('- None');
                    }
                    else {
                        for (const item of medFindings) {
                            lines.push(`- ${item.parameter}: ${item.recommendation}`);
                        }
                    }
                    lines.push('');
                    lines.push('### Low');
                    if (lowFindings.length === 0) {
                        lines.push('- None');
                    }
                    else {
                        for (const item of lowFindings) {
                            lines.push(`- ${item.parameter}: ${item.recommendation}`);
                        }
                    }
                    lines.push('');
                    lines.push('## Next Experiments');
                    if (nextExperiments.length === 0) {
                        lines.push('- No experiments were generated for this run.');
                    }
                    else {
                        for (const item of nextExperiments) {
                            lines.push(`- ${item}`);
                        }
                    }
                    lines.push('');
                    lines.push('## Prioritized Action Plan');
                    lines.push('1. Apply top three priority fixes to core user path screens first.');
                    lines.push('2. Run edge-case checks for loading, error, empty, and keyboard-only interaction states.');
                    lines.push('3. Execute next experiments and compare pre/post alignment scores before finalizing.');
                    return { content: [{ type: 'text', text: lines.join('\n') }] };
                }
                case 'improve_from_input': {
                    try {
                        const onProgress = sendProgress
                            ? (_stage, progress, total) => { sendProgress(progress, total, _stage); }
                            : undefined;
                        const review = await this.runReviewInputFromArgs(args, onProgress);
                        const problemStatement = typeof args?.problemStatement === 'string' ? args.problemStatement.trim() : undefined;
                        const requirements = Array.isArray(args?.requirements)
                            ? args.requirements.filter((item) => typeof item === 'string' && item.trim().length > 0)
                            : undefined;
                        const improve = await this.buildPerspectiveFromRun(review.runId, 'improve', {
                            problemStatement,
                            requirements
                        });
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: improve +
                                        '\n\n---\n\n' +
                                        '## Run Metadata (JSON)\n\n' +
                                        '```json\n' +
                                        JSON.stringify({ ...review, mode: 'improve_from_input' }, null, 2) +
                                        '\n```'
                                }
                            ]
                        };
                    }
                    catch (error) {
                        const msg = error instanceof Error ? error.message : String(error);
                        return { content: [{ type: 'text', text: `Error: ${msg}` }] };
                    }
                }
                case 'pitch_design':
                case 'pitchdesign': {
                    const runId = args?.runId;
                    if (!runId) {
                        return { content: [{ type: 'text', text: 'Error: runId is required' }] };
                    }
                    const detail = this.storage.getReportDetail(runId);
                    if (!detail) {
                        return {
                            content: [{ type: 'text', text: `Error: No structured detail found for run ${runId}` }]
                        };
                    }
                    const audience = typeof args?.audience === 'string' ? args.audience.trim() : '';
                    const businessGoal = typeof args?.businessGoal === 'string' ? args.businessGoal.trim() : '';
                    const designDecisions = Array.isArray(args?.designDecisions)
                        ? args.designDecisions.filter((item) => typeof item === 'string' && item.trim().length > 0)
                        : [];
                    const constraints = Array.isArray(args?.constraints)
                        ? args.constraints.filter((item) => typeof item === 'string' && item.trim().length > 0)
                        : [];
                    const alternativesConsidered = Array.isArray(args?.alternativesConsidered)
                        ? args.alternativesConsidered.filter((item) => typeof item === 'string' && item.trim().length > 0)
                        : [];
                    const userResearch = typeof args?.userResearch === 'string' ? args.userResearch.trim() : '';
                    const strategic = detail?.strategicArtifacts ?? {};
                    const baseReport = this.storage.getReport(runId);
                    const designSystemFindings = this.storage.getDesignSystemFindings(runId) ?? {};
                    const designData = this.getDesignDataForRun(runId);
                    const extraContext = this.getEnrichedContextForRun(runId);
                    // Try LLM-powered report first
                    const perspectiveCtx = {
                        mode: 'pitch',
                        figmaUrl: detail?.source ?? '',
                        baseReport: baseReport ?? '',
                        detail,
                        strategicArtifacts: strategic,
                        designSystemFindings,
                        designData,
                        ...extraContext,
                        audience: audience || undefined,
                        businessGoal: businessGoal || undefined,
                        problemStatement: detail?.problemStatement,
                        proposedSolution: detail?.proposedSolution,
                        requirements: detail?.requirements,
                        designDecisions: designDecisions.length > 0 ? designDecisions : undefined,
                        constraints: constraints.length > 0 ? constraints : undefined,
                        alternativesConsidered: alternativesConsidered.length > 0 ? alternativesConsidered : undefined,
                        userResearch: userResearch || undefined
                    };
                    const llmResult = await generatePerspectiveReport(perspectiveCtx, this.hasDebugFlag);
                    if (llmResult.markdown) {
                        const header = [
                            '# UX Design Review Report — PITCH Mode',
                            '',
                            `**Source:** ${perspectiveCtx.figmaUrl}`,
                            `**Strategic Mode:** PITCH`,
                            `**Date:** ${new Date().toISOString()}`,
                            `**Narrative Provider:** ${llmResult.provider.provider} (${llmResult.provider.model})`,
                            `**Generation Time:** ${llmResult.provider.generationTimeMs}ms`,
                            '',
                            '---',
                            ''
                        ].join('\n');
                        return { content: [{ type: 'text', text: header + llmResult.markdown }] };
                    }
                    // Fallback to deterministic template if LLM unavailable
                    const strategicBranch = detail?.strategicBranch ?? null;
                    const missingPitchContext = !audience && !businessGoal && (!strategicBranch || strategicBranch?.inputSource === 'derived-proxy');
                    const pack = strategic?.persuasionPack ?? {};
                    const valuePoints = Array.isArray(pack?.valuePoints) ? pack.valuePoints : [];
                    const proofPoints = Array.isArray(pack?.proofPoints) ? pack.proofPoints : [];
                    const objectionHandlers = Array.isArray(pack?.objectionHandlers)
                        ? pack.objectionHandlers
                        : [];
                    const edgeCaseFindings = Array.isArray(strategic?.edgeCaseFindings)
                        ? strategic.edgeCaseFindings
                        : [];
                    const highFindings = edgeCaseFindings.filter((item) => String(item?.severity ?? '').toLowerCase() === 'high');
                    const lines = [];
                    lines.push('# Pitch Design');
                    lines.push('');
                    lines.push('## Base UX Review Report');
                    if (baseReport) {
                        lines.push(baseReport);
                    }
                    else {
                        lines.push('No base report is available for this run.');
                    }
                    lines.push('');
                    lines.push('## Executive Summary');
                    lines.push(`- Strategic Branch: ${strategicBranch?.branch ?? 'unknown'}`);
                    lines.push(`- Composite Alignment: ${strategicBranch?.compositePct ?? 'n/a'}%`);
                    lines.push(`- High-Risk Objections To Preempt: ${highFindings.length}`);
                    lines.push(`- Value Points Available: ${valuePoints.length}`);
                    if (missingPitchContext) {
                        lines.push('');
                        lines.push('## Missing Context (Please Provide in Chat)');
                        lines.push('Pitch guidance will be stronger with audience and business-goal context.');
                        lines.push('');
                        lines.push('Please provide one or both:');
                        lines.push('- audience: who you are pitching to');
                        lines.push('- businessGoal: what outcome this design should unlock');
                    }
                    if (audience || businessGoal) {
                        lines.push('');
                        lines.push('## Context Received');
                        if (audience) {
                            lines.push(`- Audience: ${audience}`);
                        }
                        if (businessGoal) {
                            lines.push(`- Business Goal: ${businessGoal}`);
                        }
                    }
                    lines.push('');
                    lines.push('## Parameter-Level Findings To Address In Pitch');
                    if (edgeCaseFindings.length === 0) {
                        lines.push('- No parameter-level findings were generated for this run.');
                    }
                    else {
                        for (const item of edgeCaseFindings) {
                            lines.push(`- ${item.parameter} [${item.severity}]: ${item.recommendation}`);
                        }
                    }
                    lines.push('');
                    lines.push('## Positioning');
                    lines.push(pack?.positioning ?? 'No positioning summary available for this run.');
                    lines.push('');
                    lines.push('## Convince Stakeholders');
                    lines.push(pack?.convincePartners ?? 'No stakeholder persuasion guidance available for this run.');
                    lines.push('');
                    lines.push('## Value Points');
                    if (valuePoints.length === 0) {
                        lines.push('- No value points were generated for this run.');
                    }
                    else {
                        for (const item of valuePoints) {
                            lines.push(`- ${item}`);
                        }
                    }
                    lines.push('');
                    lines.push('## Proof Points');
                    if (proofPoints.length === 0) {
                        lines.push('- No proof points were generated for this run.');
                    }
                    else {
                        for (const item of proofPoints) {
                            lines.push(`- ${item}`);
                        }
                    }
                    lines.push('');
                    lines.push('## Objection Handlers');
                    if (objectionHandlers.length === 0) {
                        lines.push('- No objection handlers were generated for this run.');
                    }
                    else {
                        for (const item of objectionHandlers) {
                            lines.push(`- ${item}`);
                        }
                    }
                    lines.push('');
                    lines.push('## Severity-Based Risks For Stakeholder Review');
                    if (highFindings.length === 0) {
                        lines.push('- No HIGH-severity blockers identified for this run.');
                    }
                    else {
                        for (const item of highFindings) {
                            lines.push(`- ${item.parameter}: ${item.recommendation}`);
                        }
                    }
                    lines.push('');
                    lines.push('## Prioritized Action Plan');
                    lines.push('1. Lead with business outcome and top 2 value points tied to measurable impact.');
                    lines.push('2. Use proof points to preempt highest-risk objections before open Q&A.');
                    lines.push('3. Close with implementation next steps, owners, and timeline for high-severity gaps.');
                    return { content: [{ type: 'text', text: lines.join('\n') }] };
                }
                case 'create_project': {
                    try {
                        const input = createProjectInputSchema.parse(args ?? {});
                        const project = this.storage.createProject(input.name, input.description);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({ ok: true, project }, null, 2)
                                }
                            ]
                        };
                    }
                    catch (error) {
                        const msg = error instanceof Error ? error.message : String(error);
                        return { content: [{ type: 'text', text: `Error: ${msg}` }] };
                    }
                }
                case 'add_context_rule': {
                    try {
                        const input = addContextRuleInputSchema.parse(args ?? {});
                        const rule = this.storage.addContextRule(input);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({ ok: true, rule }, null, 2)
                                }
                            ]
                        };
                    }
                    catch (error) {
                        const msg = error instanceof Error ? error.message : String(error);
                        return { content: [{ type: 'text', text: `Error: ${msg}` }] };
                    }
                }
                case 'list_context_rules': {
                    const projectId = args?.projectId;
                    if (!projectId) {
                        return { content: [{ type: 'text', text: 'Error: projectId is required' }] };
                    }
                    const status = args?.status;
                    const rules = this.storage.listContextRules(projectId, status);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({ ok: true, count: rules.length, rules }, null, 2)
                            }
                        ]
                    };
                }
                case 'approve_context_rule': {
                    const rulePkId = args?.rulePkId;
                    if (!rulePkId) {
                        return { content: [{ type: 'text', text: 'Error: rulePkId is required' }] };
                    }
                    this.storage.approveContextRule(rulePkId);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({ ok: true, rulePkId, status: 'approved' }, null, 2)
                            }
                        ]
                    };
                }
                case 'create_context_pack': {
                    try {
                        const input = createContextPackInputSchema.parse(args ?? {});
                        const selectedRuleIds = input.ruleIds && input.ruleIds.length > 0
                            ? input.ruleIds
                            : this.storage
                                .listContextRules(input.projectId, 'approved')
                                .map(rule => rule.id);
                        const pack = this.storage.createContextPack({
                            projectId: input.projectId,
                            name: input.name,
                            version: input.version,
                            ruleIds: selectedRuleIds,
                            status: input.status
                        });
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        ok: true,
                                        pack,
                                        note: selectedRuleIds.length === 0
                                            ? 'No rules selected; pack created empty.'
                                            : undefined
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                    catch (error) {
                        const msg = error instanceof Error ? error.message : String(error);
                        return { content: [{ type: 'text', text: `Error: ${msg}` }] };
                    }
                }
                case 'validate_output_against_context': {
                    try {
                        const input = validateOutputAgainstContextInputSchema.parse(args ?? {});
                        const pack = this.storage.getContextPack(input.contextPackId);
                        if (!pack) {
                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: `Error: context pack ${input.contextPackId} not found`
                                    }
                                ]
                            };
                        }
                        const allRules = this.storage.listContextRules(pack.projectId);
                        const packRules = allRules.filter(rule => pack.ruleIds.includes(rule.id));
                        const run = this.storage.createValidationRun({
                            projectId: pack.projectId,
                            contextPackId: pack.id,
                            targetTool: input.targetTool,
                            taskType: input.taskType,
                            outputType: input.outputType,
                            outputRef: input.outputRef
                        });
                        const outputContent = this.readOutputRefContent(input.outputRef);
                        const findings = packRules.map(rule => evaluateRuleFinding({
                            ruleId: rule.ruleId,
                            statement: rule.statement,
                            validatorType: rule.validatorType,
                            priority: rule.priority
                        }, input.outputType, outputContent));
                        this.storage.saveValidationFindings(run.id, findings);
                        const overallCompliance = scoreFromStatuses(findings.map(item => item.status));
                        this.storage.completeValidationRun(run.id, overallCompliance);
                        const byStatus = {
                            pass: findings.filter(item => item.status === 'pass').length,
                            fail: findings.filter(item => item.status === 'fail').length,
                            partial: findings.filter(item => item.status === 'partial').length,
                            unknown: findings.filter(item => item.status === 'unknown').length
                        };
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        ok: true,
                                        validationRunId: run.id,
                                        contextPackId: pack.id,
                                        overallCompliance,
                                        summary: byStatus,
                                        findings
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                    catch (error) {
                        const msg = error instanceof Error ? error.message : String(error);
                        return { content: [{ type: 'text', text: `Error: ${msg}` }] };
                    }
                }
                case 'generate_correction_prompt': {
                    try {
                        const input = generateCorrectionPromptInputSchema.parse(args ?? {});
                        const summary = this.storage.getValidationRunSummary(input.validationRunId);
                        if (!summary) {
                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: `Error: validation run ${input.validationRunId} not found`
                                    }
                                ]
                            };
                        }
                        const findings = this.storage.getValidationFindings(input.validationRunId);
                        if (findings.length === 0) {
                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: `Error: no findings found for validation run ${input.validationRunId}`
                                    }
                                ]
                            };
                        }
                        const prompt = buildCorrectionPrompt({
                            targetTool: input.targetTool,
                            overallCompliance: summary.overallCompliance,
                            findings,
                            maxItems: input.maxItems
                        });
                        const actionableCount = findings.filter(item => item.status === 'fail' || item.status === 'partial').length;
                        const sourceCount = Math.min(input.maxItems, actionableCount > 0 ? actionableCount : findings.length);
                        this.storage.saveCorrectionPrompt(input.validationRunId, input.targetTool, prompt);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        ok: true,
                                        validationRunId: input.validationRunId,
                                        targetTool: input.targetTool,
                                        prompt,
                                        sourceCount
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                    catch (error) {
                        const msg = error instanceof Error ? error.message : String(error);
                        return { content: [{ type: 'text', text: `Error: ${msg}` }] };
                    }
                }
                case 'compare_validation_runs': {
                    try {
                        const input = compareValidationRunsInputSchema.parse(args ?? {});
                        const current = this.storage.getValidationRunSummary(input.currentValidationRunId);
                        const previous = this.storage.getValidationRunSummary(input.previousValidationRunId);
                        if (!current || !previous) {
                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Error: one or both validation runs were not found'
                                    }
                                ]
                            };
                        }
                        const currentFindings = this.storage.getValidationFindings(current.id);
                        const previousFindings = this.storage.getValidationFindings(previous.id);
                        const currentScore = current.overallCompliance ?? 0;
                        const previousScore = previous.overallCompliance ?? 0;
                        const delta = currentScore - previousScore;
                        const toRank = (status) => {
                            if (status === 'pass')
                                return 3;
                            if (status === 'partial')
                                return 2;
                            if (status === 'unknown')
                                return 1;
                            return 0;
                        };
                        const previousByRule = new Map(previousFindings.map(item => [item.ruleId, item.status]));
                        let improvedRules = 0;
                        let regressedRules = 0;
                        let unchangedRules = 0;
                        for (const finding of currentFindings) {
                            const previousStatus = previousByRule.get(finding.ruleId);
                            if (!previousStatus) {
                                continue;
                            }
                            const currentRank = toRank(finding.status);
                            const previousRank = toRank(previousStatus);
                            if (currentRank > previousRank)
                                improvedRules += 1;
                            else if (currentRank < previousRank)
                                regressedRules += 1;
                            else
                                unchangedRules += 1;
                        }
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        ok: true,
                                        currentValidationRunId: current.id,
                                        previousValidationRunId: previous.id,
                                        currentCompliance: currentScore,
                                        previousCompliance: previousScore,
                                        complianceDelta: delta,
                                        direction: delta > 0 ? 'improved' : delta < 0 ? 'regressed' : 'unchanged',
                                        ruleDelta: {
                                            improved: improvedRules,
                                            regressed: regressedRules,
                                            unchanged: unchangedRules
                                        }
                                    }, null, 2)
                                }
                            ]
                        };
                    }
                    catch (error) {
                        const msg = error instanceof Error ? error.message : String(error);
                        return { content: [{ type: 'text', text: `Error: ${msg}` }] };
                    }
                }
                case 'compare_reviews': {
                    const currentRunId = args?.currentRunId;
                    const previousRunId = args?.previousRunId;
                    if (!currentRunId || !previousRunId) {
                        return { content: [{ type: 'text', text: 'Error: both currentRunId and previousRunId are required' }] };
                    }
                    const currentDetail = this.storage.getReportDetail(currentRunId);
                    const previousDetail = this.storage.getReportDetail(previousRunId);
                    if (!currentDetail) {
                        return { content: [{ type: 'text', text: `Error: No detail found for current run ${currentRunId}` }] };
                    }
                    if (!previousDetail) {
                        return { content: [{ type: 'text', text: `Error: No detail found for previous run ${previousRunId}` }] };
                    }
                    const lines = [];
                    lines.push('# Review Comparison Report');
                    lines.push('');
                    lines.push(`**Current Run:** #${currentRunId}`);
                    lines.push(`**Previous Run:** #${previousRunId}`);
                    lines.push(`**Date:** ${new Date().toISOString()}`);
                    lines.push('');
                    lines.push('---');
                    lines.push('');
                    // Overall delta
                    const currentOverall = currentDetail.overallAlignmentPct ?? 0;
                    const previousOverall = previousDetail.overallAlignmentPct ?? 0;
                    const overallDelta = currentOverall - previousOverall;
                    const direction = overallDelta > 0 ? '📈 IMPROVED' : overallDelta < 0 ? '📉 REGRESSED' : '➡️ UNCHANGED';
                    lines.push('## Overall Progress');
                    lines.push('');
                    lines.push(`| Metric | Previous | Current | Change |`);
                    lines.push(`|--------|----------|---------|--------|`);
                    lines.push(`| Overall Alignment | ${previousOverall}% | ${currentOverall}% | ${direction} ${overallDelta >= 0 ? '+' : ''}${overallDelta}% |`);
                    lines.push('');
                    // Per-parameter comparison
                    const currentSections = Array.isArray(currentDetail.sections) ? currentDetail.sections : [];
                    const previousSections = Array.isArray(previousDetail.sections) ? previousDetail.sections : [];
                    lines.push('## Parameter Breakdown');
                    lines.push('');
                    lines.push('| Parameter | Previous | Current | Change | Status |');
                    lines.push('|-----------|----------|---------|--------|--------|');
                    const improved = [];
                    const regressed = [];
                    const unchanged = [];
                    for (const current of currentSections) {
                        const previous = previousSections.find((s) => s.parameter === current.parameter);
                        const prevPct = previous?.alignmentPct ?? 0;
                        const currPct = current.alignmentPct ?? 0;
                        const delta = currPct - prevPct;
                        const name = current.parameter.replace(/_/g, ' ');
                        const status = delta > 5 ? '✅ Improved' : delta < -5 ? '⚠️ Regressed' : '➡️ Stable';
                        lines.push(`| ${name} | ${prevPct}% | ${currPct}% | ${delta >= 0 ? '+' : ''}${delta}% | ${status} |`);
                        if (delta > 5)
                            improved.push(name);
                        else if (delta < -5)
                            regressed.push(name);
                        else
                            unchanged.push(name);
                    }
                    lines.push('');
                    // Summary narrative
                    lines.push('## Summary');
                    lines.push('');
                    if (improved.length > 0) {
                        lines.push(`**Improved:** ${improved.join(', ')}`);
                    }
                    if (regressed.length > 0) {
                        lines.push(`**Regressed (needs attention):** ${regressed.join(', ')}`);
                    }
                    if (unchanged.length > 0) {
                        lines.push(`**Stable:** ${unchanged.join(', ')}`);
                    }
                    lines.push('');
                    // Issue count comparison
                    const currentIssues = Array.isArray(currentDetail.topRisks) ? currentDetail.topRisks : [];
                    const previousIssues = Array.isArray(previousDetail.topRisks) ? previousDetail.topRisks : [];
                    lines.push('## Risk Changes');
                    lines.push('');
                    lines.push(`- Previous top risks: ${previousIssues.length}`);
                    lines.push(`- Current top risks: ${currentIssues.length}`);
                    if (currentIssues.length < previousIssues.length) {
                        lines.push(`- ✅ ${previousIssues.length - currentIssues.length} risk(s) resolved`);
                    }
                    else if (currentIssues.length > previousIssues.length) {
                        lines.push(`- ⚠️ ${currentIssues.length - previousIssues.length} new risk(s) introduced`);
                    }
                    lines.push('');
                    // Recommendations
                    lines.push('## Next Steps');
                    lines.push('');
                    if (regressed.length > 0) {
                        lines.push(`1. **Investigate regression** in: ${regressed.join(', ')}. These areas scored lower than the previous iteration.`);
                    }
                    if (improved.length > 0 && regressed.length === 0) {
                        lines.push('1. Design is on track — continue iterating on remaining medium-priority items.');
                    }
                    lines.push(`${regressed.length > 0 ? '2' : '1'}. Focus next iteration on lowest-scoring parameters for maximum improvement.`);
                    lines.push(`${regressed.length > 0 ? '3' : '2'}. Re-run review after changes to track continued progress.`);
                    return { content: [{ type: 'text', text: lines.join('\n') }] };
                }
                case 'gather_context': {
                    const designRef = args?.designRef;
                    if (!designRef) {
                        return { content: [{ type: 'text', text: 'Error: designRef is required' }] };
                    }
                    const contextTypes = (Array.isArray(args?.contextTypes) ? args.contextTypes : ['accessibility', 'design-system', 'user-flows', 'content', 'technical']);
                    const hints = typeof args?.hints === 'string' ? args.hints : undefined;
                    const gathered = await gatherContextWithTools(this.server, {
                        designRef,
                        contextTypes,
                        hints,
                        debug: this.hasDebugFlag
                    });
                    if (!gathered.samplingUsed) {
                        return {
                            content: [{
                                    type: 'text',
                                    text: '## Context Gathering Unavailable\n\nThe host client does not support sampling (createMessage). ' +
                                        'Context gathering requires the client to support MCP sampling so this server can ask the host LLM to use other available tools.\n\n' +
                                        '**Workaround:** You can manually call other MCP tools (Figma, browser, etc.) and pass the results to `review_input` for a richer review.'
                                }]
                        };
                    }
                    const lines = [];
                    lines.push('# Gathered Design Context');
                    lines.push('');
                    lines.push(`**Source:** ${designRef}`);
                    lines.push(`**Context Types:** ${contextTypes.join(', ')}`);
                    lines.push('');
                    if (gathered.findings.length > 0) {
                        lines.push('## Design Findings');
                        for (const f of gathered.findings) {
                            lines.push(`- ${f}`);
                        }
                        lines.push('');
                    }
                    if (gathered.componentReferences.length > 0) {
                        lines.push('## Component References');
                        for (const c of gathered.componentReferences) {
                            lines.push(`- ${c}`);
                        }
                        lines.push('');
                    }
                    if (gathered.accessibilityNotes.length > 0) {
                        lines.push('## Accessibility Notes');
                        for (const a of gathered.accessibilityNotes) {
                            lines.push(`- ${a}`);
                        }
                        lines.push('');
                    }
                    if (gathered.additionalContext.length > 0) {
                        lines.push('## Additional Context');
                        for (const a of gathered.additionalContext) {
                            lines.push(`- ${a}`);
                        }
                        lines.push('');
                    }
                    if (gathered.findings.length === 0 && gathered.componentReferences.length === 0 && gathered.accessibilityNotes.length === 0) {
                        lines.push('No structured findings could be extracted from the sampling response.');
                        lines.push('');
                        lines.push('## Raw Response');
                        lines.push(gathered.rawResponse.slice(0, 3000));
                    }
                    return { content: [{ type: 'text', text: lines.join('\n') }] };
                }
                default:
                    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
            }
        });
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        if (this.hasDebugFlag) {
            console.error('UX Review MCP server running on stdio');
        }
    }
}
