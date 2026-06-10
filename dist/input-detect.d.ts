export type ReviewInputType = 'figma_url' | 'web_url' | 'image_path' | 'html_snippet';
export interface FigmaEvidenceToolCall {
    toolName?: string;
    name?: string;
    status?: 'success' | 'error';
    data?: unknown;
    content?: unknown;
    error?: string;
}
export interface FigmaEvidenceInput {
    designContext?: unknown;
    metadata?: unknown;
    screenshot?: unknown;
    variables?: unknown;
    variableDefs?: unknown;
    toolCalls?: FigmaEvidenceToolCall[];
}
export interface ReviewInputRequest {
    figmaUrl?: string;
    webUrl?: string;
    imagePath?: string;
    htmlSnippet?: string;
    figmaEvidence?: FigmaEvidenceInput;
    designSystemFigmaUrl?: string;
    chatContext?: string;
    problemStatement?: string;
    proposedSolution?: string;
    requirements?: string[];
    designSystem?: string;
    customGuidelinePath?: string;
    userId?: string;
    projectId?: number;
    sessionId?: string;
    knowledgeItems?: unknown[];
    knowledgeRelationships?: unknown[];
    memoryEntries?: unknown[];
}
export interface ResolvedInput {
    type: ReviewInputType;
    value: string;
}
export declare const resolveReviewInput: (request: ReviewInputRequest) => ResolvedInput;
