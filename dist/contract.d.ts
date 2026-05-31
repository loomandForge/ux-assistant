import { z } from 'zod';
export declare const STRATEGIC_CONTRACT_VERSION = "phase8.v2";
export declare const contextRulePrioritySchema: z.ZodEnum<["critical", "high", "medium", "low"]>;
export declare const contextRuleAuthoritySchema: z.ZodEnum<["approved", "proposed", "derived"]>;
export declare const contextRuleStatusSchema: z.ZodEnum<["draft", "approved", "deprecated"]>;
export declare const validationStatusSchema: z.ZodEnum<["pass", "fail", "partial", "unknown"]>;
export declare const validationSeveritySchema: z.ZodEnum<["critical", "high", "medium", "low"]>;
export declare const validationConfidenceSchema: z.ZodEnum<["high", "medium", "low"]>;
export declare const knowledgeScopeSchema: z.ZodEnum<["session", "user", "project", "organization"]>;
export declare const knowledgePrioritySchema: z.ZodEnum<["critical", "high", "medium", "low"]>;
export declare const knowledgeRelationshipTypeSchema: z.ZodEnum<["related_to", "depends_on", "supports", "overrides", "conflicts_with", "same_as"]>;
export declare const knowledgeItemInputSchema: z.ZodObject<{
    knowledgeKey: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodNumber>;
    sessionId: z.ZodOptional<z.ZodString>;
    scope: z.ZodDefault<z.ZodEnum<["session", "user", "project", "organization"]>>;
    category: z.ZodString;
    summary: z.ZodString;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    priority: z.ZodDefault<z.ZodEnum<["critical", "high", "medium", "low"]>>;
    confidence: z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>;
    source: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    scope: "session" | "user" | "project" | "organization";
    category: string;
    summary: string;
    tags: string[];
    priority: "critical" | "high" | "medium" | "low";
    confidence: "high" | "medium" | "low";
    userId?: string | undefined;
    projectId?: number | undefined;
    sessionId?: string | undefined;
    knowledgeKey?: string | undefined;
    source?: string | undefined;
}, {
    category: string;
    summary: string;
    userId?: string | undefined;
    projectId?: number | undefined;
    sessionId?: string | undefined;
    scope?: "session" | "user" | "project" | "organization" | undefined;
    knowledgeKey?: string | undefined;
    tags?: string[] | undefined;
    priority?: "critical" | "high" | "medium" | "low" | undefined;
    confidence?: "high" | "medium" | "low" | undefined;
    source?: string | undefined;
}>;
export declare const knowledgeRelationshipInputSchema: z.ZodObject<{
    fromKnowledgeKey: z.ZodString;
    toKnowledgeKey: z.ZodString;
    relationshipType: z.ZodEnum<["related_to", "depends_on", "supports", "overrides", "conflicts_with", "same_as"]>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    fromKnowledgeKey: string;
    toKnowledgeKey: string;
    relationshipType: "related_to" | "depends_on" | "supports" | "overrides" | "conflicts_with" | "same_as";
    note?: string | undefined;
}, {
    fromKnowledgeKey: string;
    toKnowledgeKey: string;
    relationshipType: "related_to" | "depends_on" | "supports" | "overrides" | "conflicts_with" | "same_as";
    note?: string | undefined;
}>;
export declare const memoryEntryInputSchema: z.ZodObject<{
    memoryScope: z.ZodEnum<["session", "user", "project", "organization"]>;
    memoryKey: z.ZodString;
    entryType: z.ZodString;
    content: z.ZodAny;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    tags: string[];
    memoryScope: "session" | "user" | "project" | "organization";
    memoryKey: string;
    entryType: string;
    content?: any;
}, {
    memoryScope: "session" | "user" | "project" | "organization";
    memoryKey: string;
    entryType: string;
    tags?: string[] | undefined;
    content?: any;
}>;
export declare const createProjectInputSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
}>;
export declare const addContextRuleInputSchema: z.ZodObject<{
    projectId: z.ZodNumber;
    ruleId: z.ZodString;
    category: z.ZodString;
    statement: z.ZodString;
    priority: z.ZodEnum<["critical", "high", "medium", "low"]>;
    authority: z.ZodEnum<["approved", "proposed", "derived"]>;
    appliesTo: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    validatorType: z.ZodString;
    source: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["draft", "approved", "deprecated"]>>;
}, "strip", z.ZodTypeAny, {
    projectId: number;
    category: string;
    priority: "critical" | "high" | "medium" | "low";
    ruleId: string;
    statement: string;
    authority: "approved" | "proposed" | "derived";
    appliesTo: string[];
    validatorType: string;
    status?: "approved" | "draft" | "deprecated" | undefined;
    source?: string | undefined;
}, {
    projectId: number;
    category: string;
    priority: "critical" | "high" | "medium" | "low";
    ruleId: string;
    statement: string;
    authority: "approved" | "proposed" | "derived";
    validatorType: string;
    status?: "approved" | "draft" | "deprecated" | undefined;
    source?: string | undefined;
    appliesTo?: string[] | undefined;
}>;
export declare const createContextPackInputSchema: z.ZodObject<{
    projectId: z.ZodNumber;
    name: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    ruleIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    status: z.ZodOptional<z.ZodEnum<["draft", "active", "archived"]>>;
}, "strip", z.ZodTypeAny, {
    projectId: number;
    name: string;
    version: string;
    status?: "draft" | "active" | "archived" | undefined;
    ruleIds?: number[] | undefined;
}, {
    projectId: number;
    name: string;
    version?: string | undefined;
    status?: "draft" | "active" | "archived" | undefined;
    ruleIds?: number[] | undefined;
}>;
export declare const validateOutputAgainstContextInputSchema: z.ZodObject<{
    contextPackId: z.ZodNumber;
    targetTool: z.ZodString;
    taskType: z.ZodDefault<z.ZodEnum<["generate", "review", "code", "rationale"]>>;
    outputType: z.ZodEnum<["figma", "screenshot", "html", "react_code", "web_url", "image"]>;
    outputRef: z.ZodString;
}, "strip", z.ZodTypeAny, {
    contextPackId: number;
    targetTool: string;
    taskType: "generate" | "review" | "code" | "rationale";
    outputType: "figma" | "screenshot" | "html" | "react_code" | "web_url" | "image";
    outputRef: string;
}, {
    contextPackId: number;
    targetTool: string;
    outputType: "figma" | "screenshot" | "html" | "react_code" | "web_url" | "image";
    outputRef: string;
    taskType?: "generate" | "review" | "code" | "rationale" | undefined;
}>;
export declare const generateCorrectionPromptInputSchema: z.ZodObject<{
    validationRunId: z.ZodNumber;
    targetTool: z.ZodString;
    maxItems: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    targetTool: string;
    validationRunId: number;
    maxItems: number;
}, {
    targetTool: string;
    validationRunId: number;
    maxItems?: number | undefined;
}>;
export declare const compareValidationRunsInputSchema: z.ZodObject<{
    currentValidationRunId: z.ZodNumber;
    previousValidationRunId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    currentValidationRunId: number;
    previousValidationRunId: number;
}, {
    currentValidationRunId: number;
    previousValidationRunId: number;
}>;
export declare const analyzeDesignInputSchema: z.ZodObject<{
    figmaUrl: z.ZodOptional<z.ZodString>;
    webUrl: z.ZodOptional<z.ZodString>;
    imagePath: z.ZodOptional<z.ZodString>;
    htmlSnippet: z.ZodOptional<z.ZodString>;
    chatContext: z.ZodOptional<z.ZodString>;
    problemStatement: z.ZodOptional<z.ZodString>;
    proposedSolution: z.ZodOptional<z.ZodString>;
    requirements: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    designSystem: z.ZodOptional<z.ZodString>;
    customGuidelinePath: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodNumber>;
    sessionId: z.ZodOptional<z.ZodString>;
    knowledgeItems: z.ZodDefault<z.ZodArray<z.ZodObject<{
        knowledgeKey: z.ZodOptional<z.ZodString>;
        userId: z.ZodOptional<z.ZodString>;
        projectId: z.ZodOptional<z.ZodNumber>;
        sessionId: z.ZodOptional<z.ZodString>;
        scope: z.ZodDefault<z.ZodEnum<["session", "user", "project", "organization"]>>;
        category: z.ZodString;
        summary: z.ZodString;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        priority: z.ZodDefault<z.ZodEnum<["critical", "high", "medium", "low"]>>;
        confidence: z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>;
        source: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        scope: "session" | "user" | "project" | "organization";
        category: string;
        summary: string;
        tags: string[];
        priority: "critical" | "high" | "medium" | "low";
        confidence: "high" | "medium" | "low";
        userId?: string | undefined;
        projectId?: number | undefined;
        sessionId?: string | undefined;
        knowledgeKey?: string | undefined;
        source?: string | undefined;
    }, {
        category: string;
        summary: string;
        userId?: string | undefined;
        projectId?: number | undefined;
        sessionId?: string | undefined;
        scope?: "session" | "user" | "project" | "organization" | undefined;
        knowledgeKey?: string | undefined;
        tags?: string[] | undefined;
        priority?: "critical" | "high" | "medium" | "low" | undefined;
        confidence?: "high" | "medium" | "low" | undefined;
        source?: string | undefined;
    }>, "many">>;
    knowledgeRelationships: z.ZodDefault<z.ZodArray<z.ZodObject<{
        fromKnowledgeKey: z.ZodString;
        toKnowledgeKey: z.ZodString;
        relationshipType: z.ZodEnum<["related_to", "depends_on", "supports", "overrides", "conflicts_with", "same_as"]>;
        note: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        fromKnowledgeKey: string;
        toKnowledgeKey: string;
        relationshipType: "related_to" | "depends_on" | "supports" | "overrides" | "conflicts_with" | "same_as";
        note?: string | undefined;
    }, {
        fromKnowledgeKey: string;
        toKnowledgeKey: string;
        relationshipType: "related_to" | "depends_on" | "supports" | "overrides" | "conflicts_with" | "same_as";
        note?: string | undefined;
    }>, "many">>;
    memoryEntries: z.ZodDefault<z.ZodArray<z.ZodObject<{
        memoryScope: z.ZodEnum<["session", "user", "project", "organization"]>;
        memoryKey: z.ZodString;
        entryType: z.ZodString;
        content: z.ZodAny;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        tags: string[];
        memoryScope: "session" | "user" | "project" | "organization";
        memoryKey: string;
        entryType: string;
        content?: any;
    }, {
        memoryScope: "session" | "user" | "project" | "organization";
        memoryKey: string;
        entryType: string;
        tags?: string[] | undefined;
        content?: any;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    knowledgeItems: {
        scope: "session" | "user" | "project" | "organization";
        category: string;
        summary: string;
        tags: string[];
        priority: "critical" | "high" | "medium" | "low";
        confidence: "high" | "medium" | "low";
        userId?: string | undefined;
        projectId?: number | undefined;
        sessionId?: string | undefined;
        knowledgeKey?: string | undefined;
        source?: string | undefined;
    }[];
    knowledgeRelationships: {
        fromKnowledgeKey: string;
        toKnowledgeKey: string;
        relationshipType: "related_to" | "depends_on" | "supports" | "overrides" | "conflicts_with" | "same_as";
        note?: string | undefined;
    }[];
    memoryEntries: {
        tags: string[];
        memoryScope: "session" | "user" | "project" | "organization";
        memoryKey: string;
        entryType: string;
        content?: any;
    }[];
    userId?: string | undefined;
    projectId?: number | undefined;
    sessionId?: string | undefined;
    figmaUrl?: string | undefined;
    webUrl?: string | undefined;
    imagePath?: string | undefined;
    htmlSnippet?: string | undefined;
    chatContext?: string | undefined;
    problemStatement?: string | undefined;
    proposedSolution?: string | undefined;
    requirements?: string[] | undefined;
    designSystem?: string | undefined;
    customGuidelinePath?: string | undefined;
}, {
    userId?: string | undefined;
    projectId?: number | undefined;
    sessionId?: string | undefined;
    knowledgeItems?: {
        category: string;
        summary: string;
        userId?: string | undefined;
        projectId?: number | undefined;
        sessionId?: string | undefined;
        scope?: "session" | "user" | "project" | "organization" | undefined;
        knowledgeKey?: string | undefined;
        tags?: string[] | undefined;
        priority?: "critical" | "high" | "medium" | "low" | undefined;
        confidence?: "high" | "medium" | "low" | undefined;
        source?: string | undefined;
    }[] | undefined;
    figmaUrl?: string | undefined;
    webUrl?: string | undefined;
    imagePath?: string | undefined;
    htmlSnippet?: string | undefined;
    chatContext?: string | undefined;
    problemStatement?: string | undefined;
    proposedSolution?: string | undefined;
    requirements?: string[] | undefined;
    designSystem?: string | undefined;
    customGuidelinePath?: string | undefined;
    knowledgeRelationships?: {
        fromKnowledgeKey: string;
        toKnowledgeKey: string;
        relationshipType: "related_to" | "depends_on" | "supports" | "overrides" | "conflicts_with" | "same_as";
        note?: string | undefined;
    }[] | undefined;
    memoryEntries?: {
        memoryScope: "session" | "user" | "project" | "organization";
        memoryKey: string;
        entryType: string;
        tags?: string[] | undefined;
        content?: any;
    }[] | undefined;
}>;
export declare const storeKnowledgeContextInputSchema: z.ZodObject<{
    userId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodNumber>;
    sessionId: z.ZodOptional<z.ZodString>;
    knowledgeItems: z.ZodArray<z.ZodObject<{
        knowledgeKey: z.ZodOptional<z.ZodString>;
        userId: z.ZodOptional<z.ZodString>;
        projectId: z.ZodOptional<z.ZodNumber>;
        sessionId: z.ZodOptional<z.ZodString>;
        scope: z.ZodDefault<z.ZodEnum<["session", "user", "project", "organization"]>>;
        category: z.ZodString;
        summary: z.ZodString;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        priority: z.ZodDefault<z.ZodEnum<["critical", "high", "medium", "low"]>>;
        confidence: z.ZodDefault<z.ZodEnum<["high", "medium", "low"]>>;
        source: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        scope: "session" | "user" | "project" | "organization";
        category: string;
        summary: string;
        tags: string[];
        priority: "critical" | "high" | "medium" | "low";
        confidence: "high" | "medium" | "low";
        userId?: string | undefined;
        projectId?: number | undefined;
        sessionId?: string | undefined;
        knowledgeKey?: string | undefined;
        source?: string | undefined;
    }, {
        category: string;
        summary: string;
        userId?: string | undefined;
        projectId?: number | undefined;
        sessionId?: string | undefined;
        scope?: "session" | "user" | "project" | "organization" | undefined;
        knowledgeKey?: string | undefined;
        tags?: string[] | undefined;
        priority?: "critical" | "high" | "medium" | "low" | undefined;
        confidence?: "high" | "medium" | "low" | undefined;
        source?: string | undefined;
    }>, "many">;
    knowledgeRelationships: z.ZodDefault<z.ZodArray<z.ZodObject<{
        fromKnowledgeKey: z.ZodString;
        toKnowledgeKey: z.ZodString;
        relationshipType: z.ZodEnum<["related_to", "depends_on", "supports", "overrides", "conflicts_with", "same_as"]>;
        note: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        fromKnowledgeKey: string;
        toKnowledgeKey: string;
        relationshipType: "related_to" | "depends_on" | "supports" | "overrides" | "conflicts_with" | "same_as";
        note?: string | undefined;
    }, {
        fromKnowledgeKey: string;
        toKnowledgeKey: string;
        relationshipType: "related_to" | "depends_on" | "supports" | "overrides" | "conflicts_with" | "same_as";
        note?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    knowledgeItems: {
        scope: "session" | "user" | "project" | "organization";
        category: string;
        summary: string;
        tags: string[];
        priority: "critical" | "high" | "medium" | "low";
        confidence: "high" | "medium" | "low";
        userId?: string | undefined;
        projectId?: number | undefined;
        sessionId?: string | undefined;
        knowledgeKey?: string | undefined;
        source?: string | undefined;
    }[];
    knowledgeRelationships: {
        fromKnowledgeKey: string;
        toKnowledgeKey: string;
        relationshipType: "related_to" | "depends_on" | "supports" | "overrides" | "conflicts_with" | "same_as";
        note?: string | undefined;
    }[];
    userId?: string | undefined;
    projectId?: number | undefined;
    sessionId?: string | undefined;
}, {
    knowledgeItems: {
        category: string;
        summary: string;
        userId?: string | undefined;
        projectId?: number | undefined;
        sessionId?: string | undefined;
        scope?: "session" | "user" | "project" | "organization" | undefined;
        knowledgeKey?: string | undefined;
        tags?: string[] | undefined;
        priority?: "critical" | "high" | "medium" | "low" | undefined;
        confidence?: "high" | "medium" | "low" | undefined;
        source?: string | undefined;
    }[];
    userId?: string | undefined;
    projectId?: number | undefined;
    sessionId?: string | undefined;
    knowledgeRelationships?: {
        fromKnowledgeKey: string;
        toKnowledgeKey: string;
        relationshipType: "related_to" | "depends_on" | "supports" | "overrides" | "conflicts_with" | "same_as";
        note?: string | undefined;
    }[] | undefined;
}>;
export declare const listKnowledgeContextInputSchema: z.ZodObject<{
    userId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodNumber>;
    sessionId: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodEnum<["session", "user", "project", "organization"]>>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    queryTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    ranked: z.ZodDefault<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    ranked: boolean;
    queryTags: string[];
    userId?: string | undefined;
    projectId?: number | undefined;
    sessionId?: string | undefined;
    scope?: "session" | "user" | "project" | "organization" | undefined;
    category?: string | undefined;
    tags?: string[] | undefined;
}, {
    userId?: string | undefined;
    projectId?: number | undefined;
    sessionId?: string | undefined;
    limit?: number | undefined;
    scope?: "session" | "user" | "project" | "organization" | undefined;
    ranked?: boolean | undefined;
    queryTags?: string[] | undefined;
    category?: string | undefined;
    tags?: string[] | undefined;
}>;
export declare const storeMemoryContextInputSchema: z.ZodObject<{
    memories: z.ZodArray<z.ZodObject<{
        memoryScope: z.ZodEnum<["session", "user", "project", "organization"]>;
        memoryKey: z.ZodString;
        entryType: z.ZodString;
        content: z.ZodAny;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        tags: string[];
        memoryScope: "session" | "user" | "project" | "organization";
        memoryKey: string;
        entryType: string;
        content?: any;
    }, {
        memoryScope: "session" | "user" | "project" | "organization";
        memoryKey: string;
        entryType: string;
        tags?: string[] | undefined;
        content?: any;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    memories: {
        tags: string[];
        memoryScope: "session" | "user" | "project" | "organization";
        memoryKey: string;
        entryType: string;
        content?: any;
    }[];
}, {
    memories: {
        memoryScope: "session" | "user" | "project" | "organization";
        memoryKey: string;
        entryType: string;
        tags?: string[] | undefined;
        content?: any;
    }[];
}>;
export declare const listMemoryContextInputSchema: z.ZodObject<{
    memoryScope: z.ZodOptional<z.ZodEnum<["session", "user", "project", "organization"]>>;
    memoryKey: z.ZodOptional<z.ZodString>;
    entryType: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    memoryScope?: "session" | "user" | "project" | "organization" | undefined;
    memoryKey?: string | undefined;
    entryType?: string | undefined;
}, {
    limit?: number | undefined;
    memoryScope?: "session" | "user" | "project" | "organization" | undefined;
    memoryKey?: string | undefined;
    entryType?: string | undefined;
}>;
export declare const validationFindingSchema: z.ZodObject<{
    ruleId: z.ZodString;
    status: z.ZodEnum<["pass", "fail", "partial", "unknown"]>;
    severity: z.ZodEnum<["critical", "high", "medium", "low"]>;
    confidence: z.ZodEnum<["high", "medium", "low"]>;
    evidence: z.ZodString;
    recommendation: z.ZodString;
    correctionPrompt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "pass" | "fail" | "partial" | "unknown";
    confidence: "high" | "medium" | "low";
    ruleId: string;
    severity: "critical" | "high" | "medium" | "low";
    evidence: string;
    recommendation: string;
    correctionPrompt: string;
}, {
    status: "pass" | "fail" | "partial" | "unknown";
    confidence: "high" | "medium" | "low";
    ruleId: string;
    severity: "critical" | "high" | "medium" | "low";
    evidence: string;
    recommendation: string;
    correctionPrompt: string;
}>;
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type AddContextRuleInput = z.infer<typeof addContextRuleInputSchema>;
export type CreateContextPackInput = z.infer<typeof createContextPackInputSchema>;
export type ValidateOutputAgainstContextInput = z.infer<typeof validateOutputAgainstContextInputSchema>;
export type GenerateCorrectionPromptInput = z.infer<typeof generateCorrectionPromptInputSchema>;
export type CompareValidationRunsInput = z.infer<typeof compareValidationRunsInputSchema>;
export type KnowledgeItemInput = z.infer<typeof knowledgeItemInputSchema>;
export type KnowledgeRelationshipInput = z.infer<typeof knowledgeRelationshipInputSchema>;
export type MemoryEntryInput = z.infer<typeof memoryEntryInputSchema>;
export type AnalyzeDesignInput = z.infer<typeof analyzeDesignInputSchema>;
export type StoreKnowledgeContextInput = z.infer<typeof storeKnowledgeContextInputSchema>;
export type ListKnowledgeContextInput = z.infer<typeof listKnowledgeContextInputSchema>;
export type StoreMemoryContextInput = z.infer<typeof storeMemoryContextInputSchema>;
export type ListMemoryContextInput = z.infer<typeof listMemoryContextInputSchema>;
export type ValidationFinding = z.infer<typeof validationFindingSchema>;
export declare const flowIaScenarioSchema: z.ZodObject<{
    name: z.ZodString;
    pathNodeIds: z.ZodArray<z.ZodString, "many">;
    goal: z.ZodString;
    riskTag: z.ZodEnum<["failure-scenario", "rare-user-path", "operational-exception"]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    pathNodeIds: string[];
    goal: string;
    riskTag: "failure-scenario" | "rare-user-path" | "operational-exception";
}, {
    name: string;
    pathNodeIds: string[];
    goal: string;
    riskTag: "failure-scenario" | "rare-user-path" | "operational-exception";
}>;
export declare const flowIaStructureSchema: z.ZodObject<{
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        kind: z.ZodEnum<["entry", "task", "decision", "outcome"]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        label: string;
        kind: "entry" | "task" | "decision" | "outcome";
    }, {
        id: string;
        label: string;
        kind: "entry" | "task" | "decision" | "outcome";
    }>, "many">;
    edges: z.ZodArray<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        from: string;
        to: string;
    }, {
        label: string;
        from: string;
        to: string;
    }>, "many">;
    designHints: z.ZodArray<z.ZodString, "many">;
    scenarios: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        pathNodeIds: z.ZodArray<z.ZodString, "many">;
        goal: z.ZodString;
        riskTag: z.ZodEnum<["failure-scenario", "rare-user-path", "operational-exception"]>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        pathNodeIds: string[];
        goal: string;
        riskTag: "failure-scenario" | "rare-user-path" | "operational-exception";
    }, {
        name: string;
        pathNodeIds: string[];
        goal: string;
        riskTag: "failure-scenario" | "rare-user-path" | "operational-exception";
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    nodes: {
        id: string;
        label: string;
        kind: "entry" | "task" | "decision" | "outcome";
    }[];
    edges: {
        label: string;
        from: string;
        to: string;
    }[];
    designHints: string[];
    scenarios: {
        name: string;
        pathNodeIds: string[];
        goal: string;
        riskTag: "failure-scenario" | "rare-user-path" | "operational-exception";
    }[];
}, {
    nodes: {
        id: string;
        label: string;
        kind: "entry" | "task" | "decision" | "outcome";
    }[];
    edges: {
        label: string;
        from: string;
        to: string;
    }[];
    designHints: string[];
    scenarios: {
        name: string;
        pathNodeIds: string[];
        goal: string;
        riskTag: "failure-scenario" | "rare-user-path" | "operational-exception";
    }[];
}>;
export declare const edgeCaseFindingSchema: z.ZodObject<{
    tag: z.ZodEnum<["failure-scenario", "rare-user-path", "operational-exception"]>;
    parameter: z.ZodString;
    severity: z.ZodString;
    evidence: z.ZodString;
    recommendation: z.ZodString;
}, "strip", z.ZodTypeAny, {
    severity: string;
    evidence: string;
    recommendation: string;
    tag: "failure-scenario" | "rare-user-path" | "operational-exception";
    parameter: string;
}, {
    severity: string;
    evidence: string;
    recommendation: string;
    tag: "failure-scenario" | "rare-user-path" | "operational-exception";
    parameter: string;
}>;
export declare const persuasionPackSchema: z.ZodObject<{
    positioning: z.ZodString;
    convincePartners: z.ZodString;
    valuePoints: z.ZodArray<z.ZodString, "many">;
    proofPoints: z.ZodArray<z.ZodString, "many">;
    objectionHandlers: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    positioning: string;
    convincePartners: string;
    valuePoints: string[];
    proofPoints: string[];
    objectionHandlers: string[];
}, {
    positioning: string;
    convincePartners: string;
    valuePoints: string[];
    proofPoints: string[];
    objectionHandlers: string[];
}>;
export declare const improvementPackSchema: z.ZodObject<{
    priorityFixes: z.ZodArray<z.ZodString, "many">;
    edgeCaseChecks: z.ZodArray<z.ZodString, "many">;
    nextExperiments: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    priorityFixes: string[];
    edgeCaseChecks: string[];
    nextExperiments: string[];
}, {
    priorityFixes: string[];
    edgeCaseChecks: string[];
    nextExperiments: string[];
}>;
export declare const strategicArtifactsSchema: z.ZodObject<{
    challengePrompts: z.ZodArray<z.ZodString, "many">;
    flowIaHints: z.ZodArray<z.ZodString, "many">;
    flowIaStructure: z.ZodObject<{
        nodes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            kind: z.ZodEnum<["entry", "task", "decision", "outcome"]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            label: string;
            kind: "entry" | "task" | "decision" | "outcome";
        }, {
            id: string;
            label: string;
            kind: "entry" | "task" | "decision" | "outcome";
        }>, "many">;
        edges: z.ZodArray<z.ZodObject<{
            from: z.ZodString;
            to: z.ZodString;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            label: string;
            from: string;
            to: string;
        }, {
            label: string;
            from: string;
            to: string;
        }>, "many">;
        designHints: z.ZodArray<z.ZodString, "many">;
        scenarios: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            pathNodeIds: z.ZodArray<z.ZodString, "many">;
            goal: z.ZodString;
            riskTag: z.ZodEnum<["failure-scenario", "rare-user-path", "operational-exception"]>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            pathNodeIds: string[];
            goal: string;
            riskTag: "failure-scenario" | "rare-user-path" | "operational-exception";
        }, {
            name: string;
            pathNodeIds: string[];
            goal: string;
            riskTag: "failure-scenario" | "rare-user-path" | "operational-exception";
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        nodes: {
            id: string;
            label: string;
            kind: "entry" | "task" | "decision" | "outcome";
        }[];
        edges: {
            label: string;
            from: string;
            to: string;
        }[];
        designHints: string[];
        scenarios: {
            name: string;
            pathNodeIds: string[];
            goal: string;
            riskTag: "failure-scenario" | "rare-user-path" | "operational-exception";
        }[];
    }, {
        nodes: {
            id: string;
            label: string;
            kind: "entry" | "task" | "decision" | "outcome";
        }[];
        edges: {
            label: string;
            from: string;
            to: string;
        }[];
        designHints: string[];
        scenarios: {
            name: string;
            pathNodeIds: string[];
            goal: string;
            riskTag: "failure-scenario" | "rare-user-path" | "operational-exception";
        }[];
    }>;
    edgeCaseFindings: z.ZodArray<z.ZodObject<{
        tag: z.ZodEnum<["failure-scenario", "rare-user-path", "operational-exception"]>;
        parameter: z.ZodString;
        severity: z.ZodString;
        evidence: z.ZodString;
        recommendation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        severity: string;
        evidence: string;
        recommendation: string;
        tag: "failure-scenario" | "rare-user-path" | "operational-exception";
        parameter: string;
    }, {
        severity: string;
        evidence: string;
        recommendation: string;
        tag: "failure-scenario" | "rare-user-path" | "operational-exception";
        parameter: string;
    }>, "many">;
    persuasionPack: z.ZodOptional<z.ZodObject<{
        positioning: z.ZodString;
        convincePartners: z.ZodString;
        valuePoints: z.ZodArray<z.ZodString, "many">;
        proofPoints: z.ZodArray<z.ZodString, "many">;
        objectionHandlers: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        positioning: string;
        convincePartners: string;
        valuePoints: string[];
        proofPoints: string[];
        objectionHandlers: string[];
    }, {
        positioning: string;
        convincePartners: string;
        valuePoints: string[];
        proofPoints: string[];
        objectionHandlers: string[];
    }>>;
    improvementPack: z.ZodOptional<z.ZodObject<{
        priorityFixes: z.ZodArray<z.ZodString, "many">;
        edgeCaseChecks: z.ZodArray<z.ZodString, "many">;
        nextExperiments: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        priorityFixes: string[];
        edgeCaseChecks: string[];
        nextExperiments: string[];
    }, {
        priorityFixes: string[];
        edgeCaseChecks: string[];
        nextExperiments: string[];
    }>>;
}, "strip", z.ZodTypeAny, {
    challengePrompts: string[];
    flowIaHints: string[];
    flowIaStructure: {
        nodes: {
            id: string;
            label: string;
            kind: "entry" | "task" | "decision" | "outcome";
        }[];
        edges: {
            label: string;
            from: string;
            to: string;
        }[];
        designHints: string[];
        scenarios: {
            name: string;
            pathNodeIds: string[];
            goal: string;
            riskTag: "failure-scenario" | "rare-user-path" | "operational-exception";
        }[];
    };
    edgeCaseFindings: {
        severity: string;
        evidence: string;
        recommendation: string;
        tag: "failure-scenario" | "rare-user-path" | "operational-exception";
        parameter: string;
    }[];
    persuasionPack?: {
        positioning: string;
        convincePartners: string;
        valuePoints: string[];
        proofPoints: string[];
        objectionHandlers: string[];
    } | undefined;
    improvementPack?: {
        priorityFixes: string[];
        edgeCaseChecks: string[];
        nextExperiments: string[];
    } | undefined;
}, {
    challengePrompts: string[];
    flowIaHints: string[];
    flowIaStructure: {
        nodes: {
            id: string;
            label: string;
            kind: "entry" | "task" | "decision" | "outcome";
        }[];
        edges: {
            label: string;
            from: string;
            to: string;
        }[];
        designHints: string[];
        scenarios: {
            name: string;
            pathNodeIds: string[];
            goal: string;
            riskTag: "failure-scenario" | "rare-user-path" | "operational-exception";
        }[];
    };
    edgeCaseFindings: {
        severity: string;
        evidence: string;
        recommendation: string;
        tag: "failure-scenario" | "rare-user-path" | "operational-exception";
        parameter: string;
    }[];
    persuasionPack?: {
        positioning: string;
        convincePartners: string;
        valuePoints: string[];
        proofPoints: string[];
        objectionHandlers: string[];
    } | undefined;
    improvementPack?: {
        priorityFixes: string[];
        edgeCaseChecks: string[];
        nextExperiments: string[];
    } | undefined;
}>;
export type StrategicArtifactsContract = z.infer<typeof strategicArtifactsSchema>;
export declare const validateStrategicArtifacts: (value: unknown) => StrategicArtifactsContract;
