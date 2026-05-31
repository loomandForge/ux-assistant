export type ContextRulePriority = 'critical' | 'high' | 'medium' | 'low';
export type ContextRuleAuthority = 'approved' | 'proposed' | 'derived';
export type ContextRuleStatus = 'draft' | 'approved' | 'deprecated';
export type ValidationStatus = 'pass' | 'fail' | 'partial' | 'unknown';
export type ValidationSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ValidationConfidence = 'high' | 'medium' | 'low';
export type KnowledgeScope = 'session' | 'user' | 'project' | 'organization';
export type KnowledgePriority = 'critical' | 'high' | 'medium' | 'low';
export type KnowledgeConfidence = 'high' | 'medium' | 'low';
export type MemoryScope = 'session' | 'user' | 'project' | 'organization';
export type KnowledgeItemInput = {
    knowledgeKey?: string;
    userId?: string;
    projectId?: number;
    sessionId?: string;
    scope: KnowledgeScope;
    category: string;
    summary: string;
    tags?: string[];
    priority?: KnowledgePriority;
    confidence?: KnowledgeConfidence;
    source?: string;
};
export type KnowledgeRelationshipInput = {
    fromKnowledgeKey: string;
    toKnowledgeKey: string;
    relationshipType: string;
    note?: string;
};
export type MemoryEntryInput = {
    memoryScope: MemoryScope;
    memoryKey: string;
    entryType: string;
    content: unknown;
    tags?: string[];
};
export type AnalysisMetadataInput = {
    runId: number;
    userId?: string;
    projectId?: number;
    sessionId?: string;
    knowledgeKeys?: string[];
    memoryKeys?: string[];
};
export type ContextRuleInput = {
    projectId: number;
    ruleId: string;
    category: string;
    statement: string;
    priority: ContextRulePriority;
    authority: ContextRuleAuthority;
    appliesTo: string[];
    validatorType: string;
    source?: string;
    status?: ContextRuleStatus;
};
export type ContextPackInput = {
    projectId: number;
    name: string;
    version: string;
    ruleIds?: number[];
    status?: 'draft' | 'active' | 'archived';
};
export type ValidationRunInput = {
    projectId: number;
    contextPackId: number;
    targetTool: string;
    taskType: 'generate' | 'review' | 'code' | 'rationale';
    outputType: 'figma' | 'screenshot' | 'html' | 'react_code' | 'web_url' | 'image';
    outputRef: string;
};
export type ValidationFindingInput = {
    ruleId: string;
    status: ValidationStatus;
    severity: ValidationSeverity;
    confidence: ValidationConfidence;
    evidence: string;
    recommendation: string;
    correctionPrompt: string;
};
export type ValidationRunSummary = {
    id: number;
    projectId: number;
    contextPackId: number;
    status: string;
    targetTool: string;
    taskType: string;
    outputType: string;
    outputRef: string;
    overallCompliance: number | null;
    createdAt: string;
    completedAt: string | null;
};
export declare class ReviewStorage {
    private db;
    private static readonly KNOWLEDGE_PRIORITY_WEIGHTS;
    private static readonly KNOWLEDGE_CONFIDENCE_WEIGHTS;
    private static readonly DEFAULT_SCOPE_WEIGHTS;
    private generateKnowledgeKey;
    private ensureColumn;
    private getScopeWeight;
    constructor(dbPath?: string);
    createRun(inputRef: string, fileKey: string | null, nodeId: string | null): number;
    updateStage(runId: number, stage: string, stageMessage: string): void;
    updateDesignSystemFindings(runId: number, mode: string, findings?: unknown): void;
    completeRun(runId: number): void;
    failRun(runId: number, error: string): void;
    addToolCall(runId: number, toolName: string, status: string, data?: unknown, error?: string): void;
    addArtifact(runId: number, kind: string, path?: string, sourceUrl?: string): void;
    saveAnalysisMetadata(input: AnalysisMetadataInput): void;
    getAnalysisMetadata(runId: number): {
        runId: number;
        userId: string | null;
        projectId: string | null;
        sessionId: string | null;
        knowledgeKeys: string[];
        memoryKeys: string[];
    } | undefined;
    upsertKnowledgeItem(input: KnowledgeItemInput): {
        id: number;
        knowledgeKey: string;
    };
    upsertKnowledgeItems(inputs: KnowledgeItemInput[]): Array<{
        id: number;
        knowledgeKey: string;
    }>;
    listKnowledgeItems(filters?: {
        userId?: string;
        projectId?: number;
        sessionId?: string;
        scope?: KnowledgeScope;
        category?: string;
        knowledgeKeys?: string[];
        tags?: string[];
        queryTags?: string[];
        preferredScopes?: KnowledgeScope[];
        boostKnowledgeKeys?: string[];
        ranked?: boolean;
        limit?: number;
    }): Array<{
        id: number;
        knowledgeKey: string;
        userId: string | null;
        projectId: string | null;
        sessionId: string | null;
        scope: KnowledgeScope;
        category: string;
        summary: string;
        tags: string[];
        priority: KnowledgePriority;
        confidence: KnowledgeConfidence;
        source: string | null;
        retrievalScore?: number;
        createdAt: string;
        updatedAt: string;
    }>;
    addKnowledgeRelationships(inputs: KnowledgeRelationshipInput[]): number;
    listKnowledgeRelationships(filters?: {
        knowledgeKeys?: string[];
        limit?: number;
    }): Array<{
        id: number;
        fromKnowledgeKey: string;
        toKnowledgeKey: string;
        relationshipType: string;
        note: string | null;
        createdAt: string;
    }>;
    upsertMemoryEntry(input: MemoryEntryInput): {
        id: number;
    };
    upsertMemoryEntries(inputs: MemoryEntryInput[]): Array<{
        id: number;
    }>;
    listMemoryEntries(filters?: {
        memoryScope?: MemoryScope;
        memoryKey?: string;
        entryType?: string;
        memoryKeys?: string[];
        limit?: number;
    }): Array<{
        id: number;
        memoryScope: MemoryScope;
        memoryKey: string;
        entryType: string;
        content: unknown;
        tags: string[];
        createdAt: string;
        updatedAt: string;
    }>;
    getKnowledgeContextForRun(runId: number): {
        metadata: {
            runId: number;
            userId: string | null;
            projectId: string | null;
            sessionId: string | null;
            knowledgeKeys: string[];
            memoryKeys: string[];
        };
        knowledgeItems: ReturnType<ReviewStorage['listKnowledgeItems']>;
        relationships: ReturnType<ReviewStorage['listKnowledgeRelationships']>;
        memoryEntries: ReturnType<ReviewStorage['listMemoryEntries']>;
    } | undefined;
    saveReport(runId: number, markdown: string, detail?: unknown): void;
    getReport(runId: number): string | undefined;
    getReportDetail(runId: number): unknown | undefined;
    getRun(runId: number): unknown;
    listRuns(limit?: number): unknown[];
    getDesignSystemFindings(runId: number): unknown | undefined;
    getToolCalls(runId: number): Array<{
        tool_name: string;
        status: string;
        raw_json: string | null;
        error: string | null;
    }>;
    createProject(name: string, description?: string): {
        id: number;
        name: string;
        description: string | null;
    };
    listProjects(): Array<{
        id: number;
        name: string;
        description: string | null;
        created_at: string;
    }>;
    addContextRule(input: ContextRuleInput): {
        id: number;
        projectId: number;
        ruleId: string;
        status: ContextRuleStatus;
    };
    listContextRules(projectId: number, status?: ContextRuleStatus): Array<{
        id: number;
        projectId: number;
        ruleId: string;
        category: string;
        statement: string;
        priority: ContextRulePriority;
        authority: ContextRuleAuthority;
        appliesTo: string[];
        validatorType: string;
        source: string | null;
        status: ContextRuleStatus;
    }>;
    approveContextRule(rulePkId: number): void;
    createContextPack(input: ContextPackInput): {
        id: number;
        projectId: number;
        name: string;
        version: string;
        ruleIds: number[];
        status: 'draft' | 'active' | 'archived';
    };
    getContextPack(packId: number): {
        id: number;
        projectId: number;
        name: string;
        version: string;
        status: 'draft' | 'active' | 'archived';
        ruleIds: number[];
    } | undefined;
    createValidationRun(input: ValidationRunInput): {
        id: number;
    };
    completeValidationRun(runId: number, overallCompliance: number): void;
    failValidationRun(runId: number, error: string): void;
    saveValidationFindings(runId: number, findings: ValidationFindingInput[]): void;
    getValidationFindings(runId: number): Array<{
        ruleId: string;
        status: ValidationStatus;
        severity: ValidationSeverity;
        confidence: ValidationConfidence;
        evidence: string;
        recommendation: string;
        correctionPrompt: string;
    }>;
    saveCorrectionPrompt(runId: number, targetTool: string, prompt: string): void;
    getCorrectionPrompts(runId: number): Array<{
        id: number;
        targetTool: string;
        prompt: string;
        createdAt: string;
    }>;
    getValidationRunSummary(runId: number): ValidationRunSummary | undefined;
}
