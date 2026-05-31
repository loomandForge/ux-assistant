import { DeterministicReviewResult } from '@ux-assistant/scoring';
import { LlmNarrative } from './llm.js';
interface StrategicArtifacts {
    challengePrompts: string[];
    flowIaHints: string[];
    flowIaStructure?: {
        nodes: Array<{
            id: string;
            label: string;
            kind: 'entry' | 'task' | 'decision' | 'outcome';
        }>;
        edges: Array<{
            from: string;
            to: string;
            label: string;
        }>;
        designHints: string[];
        scenarios: Array<{
            name: string;
            pathNodeIds: string[];
            goal: string;
            riskTag: 'failure-scenario' | 'rare-user-path' | 'operational-exception';
        }>;
    };
    edgeCaseFindings?: Array<{
        tag: 'failure-scenario' | 'rare-user-path' | 'operational-exception';
        parameter: string;
        severity: string;
        evidence: string;
        recommendation: string;
    }>;
    persuasionPack?: {
        positioning: string;
        convincePartners: string;
        valuePoints: string[];
        proofPoints: string[];
        objectionHandlers: string[];
    };
    improvementPack?: {
        priorityFixes: string[];
        edgeCaseChecks: string[];
        nextExperiments: string[];
    };
}
/**
 * Build a structured markdown report from scoring results.
 */
export declare function buildMarkdownReport(figmaUrl: string, result: DeterministicReviewResult, narrative?: LlmNarrative, strategicArtifacts?: StrategicArtifacts): string;
export {};
