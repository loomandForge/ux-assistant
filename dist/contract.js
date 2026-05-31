import { z } from 'zod';
export const STRATEGIC_CONTRACT_VERSION = 'phase8.v2';
export const contextRulePrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export const contextRuleAuthoritySchema = z.enum(['approved', 'proposed', 'derived']);
export const contextRuleStatusSchema = z.enum(['draft', 'approved', 'deprecated']);
export const validationStatusSchema = z.enum(['pass', 'fail', 'partial', 'unknown']);
export const validationSeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export const validationConfidenceSchema = z.enum(['high', 'medium', 'low']);
export const knowledgeScopeSchema = z.enum(['session', 'user', 'project', 'organization']);
export const knowledgePrioritySchema = contextRulePrioritySchema;
export const knowledgeRelationshipTypeSchema = z.enum([
    'related_to',
    'depends_on',
    'supports',
    'overrides',
    'conflicts_with',
    'same_as'
]);
export const knowledgeItemInputSchema = z.object({
    knowledgeKey: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    projectId: z.number().int().positive().optional(),
    sessionId: z.string().min(1).optional(),
    scope: knowledgeScopeSchema.default('project'),
    category: z.string().min(1),
    summary: z.string().min(1),
    tags: z.array(z.string().min(1)).default([]),
    priority: knowledgePrioritySchema.default('medium'),
    confidence: validationConfidenceSchema.default('medium'),
    source: z.string().optional()
});
export const knowledgeRelationshipInputSchema = z.object({
    fromKnowledgeKey: z.string().min(1),
    toKnowledgeKey: z.string().min(1),
    relationshipType: knowledgeRelationshipTypeSchema,
    note: z.string().optional()
});
export const memoryEntryInputSchema = z.object({
    memoryScope: knowledgeScopeSchema,
    memoryKey: z.string().min(1),
    entryType: z.string().min(1),
    content: z.any(),
    tags: z.array(z.string().min(1)).default([])
});
export const createProjectInputSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional()
});
export const addContextRuleInputSchema = z.object({
    projectId: z.number().int().positive(),
    ruleId: z.string().min(1),
    category: z.string().min(1),
    statement: z.string().min(1),
    priority: contextRulePrioritySchema,
    authority: contextRuleAuthoritySchema,
    appliesTo: z.array(z.string().min(1)).default([]),
    validatorType: z.string().min(1),
    source: z.string().optional(),
    status: contextRuleStatusSchema.optional()
});
export const createContextPackInputSchema = z.object({
    projectId: z.number().int().positive(),
    name: z.string().min(1),
    version: z.string().min(1).default('v1'),
    ruleIds: z.array(z.number().int().positive()).optional(),
    status: z.enum(['draft', 'active', 'archived']).optional()
});
export const validateOutputAgainstContextInputSchema = z.object({
    contextPackId: z.number().int().positive(),
    targetTool: z.string().min(1),
    taskType: z.enum(['generate', 'review', 'code', 'rationale']).default('generate'),
    outputType: z.enum(['figma', 'screenshot', 'html', 'react_code', 'web_url', 'image']),
    outputRef: z.string().min(1)
});
export const generateCorrectionPromptInputSchema = z.object({
    validationRunId: z.number().int().positive(),
    targetTool: z.string().min(1),
    maxItems: z.number().int().positive().max(10).default(3)
});
export const compareValidationRunsInputSchema = z.object({
    currentValidationRunId: z.number().int().positive(),
    previousValidationRunId: z.number().int().positive()
});
export const analyzeDesignInputSchema = z.object({
    figmaUrl: z.string().optional(),
    webUrl: z.string().optional(),
    imagePath: z.string().optional(),
    htmlSnippet: z.string().optional(),
    designSystemFigmaUrl: z.string().optional(),
    chatContext: z.string().optional(),
    problemStatement: z.string().optional(),
    proposedSolution: z.string().optional(),
    requirements: z.array(z.string().min(1)).optional(),
    designSystem: z.string().optional(),
    customGuidelinePath: z.string().optional(),
    userId: z.string().optional(),
    projectId: z.number().int().positive().optional(),
    sessionId: z.string().optional(),
    knowledgeItems: z.array(knowledgeItemInputSchema).default([]),
    knowledgeRelationships: z.array(knowledgeRelationshipInputSchema).default([]),
    memoryEntries: z.array(memoryEntryInputSchema).default([])
});
export const storeKnowledgeContextInputSchema = z.object({
    userId: z.string().optional(),
    projectId: z.number().int().positive().optional(),
    sessionId: z.string().optional(),
    knowledgeItems: z.array(knowledgeItemInputSchema).min(1),
    knowledgeRelationships: z.array(knowledgeRelationshipInputSchema).default([])
});
export const listKnowledgeContextInputSchema = z.object({
    userId: z.string().optional(),
    projectId: z.number().int().positive().optional(),
    sessionId: z.string().optional(),
    scope: knowledgeScopeSchema.optional(),
    category: z.string().optional(),
    tags: z.array(z.string().min(1)).optional(),
    queryTags: z.array(z.string().min(1)).default([]),
    ranked: z.boolean().default(true),
    limit: z.number().int().positive().max(100).default(50)
});
export const storeMemoryContextInputSchema = z.object({
    memories: z.array(memoryEntryInputSchema).min(1)
});
export const listMemoryContextInputSchema = z.object({
    memoryScope: knowledgeScopeSchema.optional(),
    memoryKey: z.string().optional(),
    entryType: z.string().optional(),
    limit: z.number().int().positive().max(100).default(50)
});
export const validationFindingSchema = z.object({
    ruleId: z.string().min(1),
    status: validationStatusSchema,
    severity: validationSeveritySchema,
    confidence: validationConfidenceSchema,
    evidence: z.string().min(1),
    recommendation: z.string().min(1),
    correctionPrompt: z.string().min(1)
});
export const flowIaScenarioSchema = z.object({
    name: z.string().min(1),
    pathNodeIds: z.array(z.string().min(1)).min(3),
    goal: z.string().min(1),
    riskTag: z.enum(['failure-scenario', 'rare-user-path', 'operational-exception'])
});
export const flowIaStructureSchema = z.object({
    nodes: z
        .array(z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        kind: z.enum(['entry', 'task', 'decision', 'outcome'])
    }))
        .min(5),
    edges: z
        .array(z.object({
        from: z.string().min(1),
        to: z.string().min(1),
        label: z.string().min(1)
    }))
        .min(5),
    designHints: z.array(z.string().min(1)).min(3),
    scenarios: z.array(flowIaScenarioSchema).min(3)
});
export const edgeCaseFindingSchema = z.object({
    tag: z.enum(['failure-scenario', 'rare-user-path', 'operational-exception']),
    parameter: z.string().min(1),
    severity: z.string().min(1),
    evidence: z.string().min(1),
    recommendation: z.string().min(1)
});
export const persuasionPackSchema = z.object({
    positioning: z.string().min(1),
    convincePartners: z.string().min(1),
    valuePoints: z.array(z.string().min(1)),
    proofPoints: z.array(z.string().min(1)),
    objectionHandlers: z.array(z.string().min(1))
});
export const improvementPackSchema = z.object({
    priorityFixes: z.array(z.string().min(1)),
    edgeCaseChecks: z.array(z.string().min(1)),
    nextExperiments: z.array(z.string().min(1))
});
export const strategicArtifactsSchema = z.object({
    challengePrompts: z.array(z.string().min(1)),
    flowIaHints: z.array(z.string().min(1)),
    flowIaStructure: flowIaStructureSchema,
    edgeCaseFindings: z.array(edgeCaseFindingSchema).min(1),
    persuasionPack: persuasionPackSchema.optional(),
    improvementPack: improvementPackSchema.optional()
});
export const validateStrategicArtifacts = (value) => {
    return strategicArtifactsSchema.parse(value);
};
