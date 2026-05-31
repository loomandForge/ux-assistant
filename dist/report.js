import { STRATEGIC_CONTRACT_VERSION } from './contract.js';
import { computeConfidenceMetrics } from './design-data-extract.js';
/**
 * Build a structured markdown report from scoring results.
 */
export function buildMarkdownReport(figmaUrl, result, narrative, strategicArtifacts) {
    const lines = [];
    lines.push(`# UX Review Report`);
    lines.push('');
    lines.push(`**Source:** ${figmaUrl}`);
    lines.push(`**Overall Alignment:** ${result.overallAlignmentPct}%`);
    lines.push(`**Date:** ${new Date().toISOString()}`);
    if (narrative) {
        lines.push(`**Narrative Provider:** ${narrative.provider.provider} (${narrative.provider.model})`);
        lines.push(`**Narrative Generation:** ${narrative.provider.generationTimeMs}ms`);
    }
    lines.push(`**Strategic Contract Version:** ${STRATEGIC_CONTRACT_VERSION}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    // Confidence disclosure
    const confidence = computeConfidenceMetrics(result.evidence);
    lines.push('## Review Confidence');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Confidence Level | **${confidence.level}** |`);
    lines.push(`| Observed Evidence | ${confidence.observedPct}% |`);
    lines.push(`| Assumed (tool gaps) | ${confidence.assumedPct}% |`);
    lines.push(`| Unknown (unverifiable) | ${confidence.unknownPct}% |`);
    lines.push('');
    if (confidence.limitations.length > 0) {
        lines.push('**Limitations:**');
        for (const limitation of confidence.limitations) {
            lines.push(`- ⚠️ ${limitation}`);
        }
        lines.push('');
    }
    if (result.strategicBranch) {
        const branchLabel = result.strategicBranch.branch === 'improvement'
            ? 'Improve Solution'
            : result.strategicBranch.branch === 'persuasion'
                ? 'Persuasion Pack'
                : 'Dual Path (Borderline)';
        lines.push('## Strategic Branching Decision');
        lines.push('');
        lines.push(`- **Branch:** ${branchLabel}`);
        lines.push(`- **Composite:** ${result.strategicBranch.branchCompositePct}%`);
        lines.push(`- **Problem-Solution Fit:** ${result.strategicBranch.problemSolutionFitPct}%`);
        lines.push(`- **Requirement Traceability:** ${result.strategicBranch.requirementTraceabilityPct}%`);
        lines.push(`- **Input Source:** ${result.strategicBranch.inputSource}`);
        if (result.strategicBranch.confidenceCaution) {
            lines.push(`- **Confidence Caution:** enabled`);
        }
        if (result.strategicBranch.notes.length > 0) {
            lines.push('- **Notes:**');
            for (const note of result.strategicBranch.notes) {
                lines.push(`  - ${note}`);
            }
        }
        lines.push('');
    }
    const designSystemIssue = result.issues.find(issue => issue.parameter === 'design_system_consistency' &&
        issue.title.toLowerCase().includes('design system checks failed'));
    const designSystemEvidence = result.evidence.find(item => item.parameter === 'design_system_consistency' &&
        item.label.toLowerCase().includes('design system component matches'));
    if (designSystemIssue || designSystemEvidence) {
        lines.push('## Design System Lookup Status');
        lines.push('');
        if (designSystemEvidence) {
            lines.push(`- Evidence: ${designSystemEvidence.detail}`);
        }
        if (designSystemIssue) {
            lines.push(`- Fallback: ${designSystemIssue.evidence}`);
            lines.push(`- Recommendation: ${designSystemIssue.recommendation}`);
        }
        else {
            lines.push('- Fallback: No lookup failures detected for this run.');
        }
        lines.push('');
    }
    if (strategicArtifacts) {
        lines.push('## Challenge Prompts');
        lines.push('');
        for (const prompt of strategicArtifacts.challengePrompts) {
            lines.push(`- ${prompt}`);
        }
        lines.push('');
        lines.push('## Flow & IA Hints');
        lines.push('');
        for (const hint of strategicArtifacts.flowIaHints) {
            lines.push(`- ${hint}`);
        }
        lines.push('');
        if (strategicArtifacts.flowIaStructure) {
            lines.push('## Flow & IA Structure (Deterministic)');
            lines.push('');
            lines.push('### Nodes');
            for (const node of strategicArtifacts.flowIaStructure.nodes) {
                lines.push(`- ${node.id} [${node.kind}]: ${node.label}`);
            }
            lines.push('');
            lines.push('### Edges');
            for (const edge of strategicArtifacts.flowIaStructure.edges) {
                lines.push(`- ${edge.from} -> ${edge.to}: ${edge.label}`);
            }
            lines.push('');
            lines.push('### Design Hints');
            for (const hint of strategicArtifacts.flowIaStructure.designHints) {
                lines.push(`- ${hint}`);
            }
            lines.push('');
            lines.push('### Scenarios');
            for (const scenario of strategicArtifacts.flowIaStructure.scenarios) {
                lines.push(`- ${scenario.name} [${scenario.riskTag}]`);
                lines.push(`  - Goal: ${scenario.goal}`);
                lines.push(`  - Path: ${scenario.pathNodeIds.join(' -> ')}`);
            }
            lines.push('');
        }
        if (strategicArtifacts.edgeCaseFindings && strategicArtifacts.edgeCaseFindings.length > 0) {
            lines.push('## Edge-Case Findings (Tagged)');
            lines.push('');
            for (const finding of strategicArtifacts.edgeCaseFindings) {
                lines.push(`- [${finding.tag}] ${finding.parameter} (${finding.severity})`);
                lines.push(`  - Evidence: ${finding.evidence}`);
                lines.push(`  - Recommendation: ${finding.recommendation}`);
            }
            lines.push('');
        }
        if (strategicArtifacts.persuasionPack) {
            lines.push('## Persuasion Pack');
            lines.push('');
            lines.push(`- Positioning: ${strategicArtifacts.persuasionPack.positioning}`);
            lines.push(`- Convince partners: ${strategicArtifacts.persuasionPack.convincePartners}`);
            for (const valuePoint of strategicArtifacts.persuasionPack.valuePoints) {
                lines.push(`- Value point: ${valuePoint}`);
            }
            for (const proofPoint of strategicArtifacts.persuasionPack.proofPoints) {
                lines.push(`- Proof point: ${proofPoint}`);
            }
            for (const objection of strategicArtifacts.persuasionPack.objectionHandlers) {
                lines.push(`- Objection handler: ${objection}`);
            }
            lines.push('');
        }
        if (strategicArtifacts.improvementPack) {
            lines.push('## Improvement Pack');
            lines.push('');
            for (const fix of strategicArtifacts.improvementPack.priorityFixes) {
                lines.push(`- Priority fix: ${fix}`);
            }
            for (const check of strategicArtifacts.improvementPack.edgeCaseChecks) {
                lines.push(`- Edge case check: ${check}`);
            }
            for (const experiment of strategicArtifacts.improvementPack.nextExperiments) {
                lines.push(`- Next experiment: ${experiment}`);
            }
            lines.push('');
        }
    }
    if (narrative) {
        lines.push('## Executive Summary');
        lines.push('');
        lines.push(narrative.executiveSummary);
        lines.push('');
        if (narrative.topRisks.length > 0) {
            lines.push('## Top Risks');
            lines.push('');
            for (const risk of narrative.topRisks) {
                lines.push(`- ${risk}`);
            }
            lines.push('');
        }
    }
    // Scores table
    lines.push('## Parameter Scores');
    lines.push('');
    lines.push('| Parameter | Score | Alignment | Summary |');
    lines.push('|-----------|-------|-----------|---------|');
    for (const s of result.scores) {
        const name = s.parameter.replace(/_/g, ' ');
        lines.push(`| ${name} | ${s.score}/5 | ${s.alignmentPct}% | ${s.summary} |`);
    }
    lines.push('');
    // Detailed per-criteria breakdown with issues, LLM insights, and fixes
    lines.push('## Detailed Criteria Breakdown');
    lines.push('');
    for (const s of result.scores) {
        const name = s.parameter.replace(/_/g, ' ');
        const paramIssues = result.issues.filter(i => i.parameter === s.parameter);
        const paramEvidence = result.evidence.filter(e => e.parameter === s.parameter);
        const review = narrative?.parameterReviews?.[s.parameter];
        lines.push(`### ${name} — ${s.alignmentPct}% (${s.score}/5)`);
        lines.push('');
        // LLM expert commentary
        if (review?.commentary) {
            lines.push(`> ${review.commentary}`);
            lines.push('');
        }
        else if (s.summary) {
            lines.push(`**Assessment:** ${s.summary}`);
            lines.push('');
        }
        // Strengths from LLM
        if (review?.strengths && review.strengths.length > 0) {
            lines.push('**What works well:**');
            for (const strength of review.strengths) {
                lines.push(`- ✓ ${strength}`);
            }
            lines.push('');
        }
        // Evidence observed
        const observedEvidence = paramEvidence.filter(e => e.confidence === 'observed');
        if (observedEvidence.length > 0) {
            lines.push('**Observed signals:**');
            for (const e of observedEvidence.slice(0, 5)) {
                lines.push(`- ${e.label}: ${e.detail}`);
            }
            lines.push('');
        }
        // Issues with LLM-enriched details
        if (paramIssues.length > 0 || (review?.issueDetails && review.issueDetails.length > 0)) {
            lines.push('**Issues & Recommendations:**');
            lines.push('');
            // If we have LLM-enriched issue details, show them (richer)
            if (review?.issueDetails && review.issueDetails.length > 0) {
                for (const detail of review.issueDetails) {
                    lines.push(`#### ⚠ ${detail.problem}`);
                    lines.push('');
                    lines.push(`**Impact:** ${detail.impact}`);
                    lines.push('');
                    lines.push(`**Fix:** ${detail.fix}`);
                    lines.push('');
                }
            }
            else {
                // Fallback to deterministic issues table
                lines.push('| Severity | Issue | What to fix |');
                lines.push('|----------|-------|-------------|');
                for (const issue of paramIssues) {
                    const severity = issue.severity.toUpperCase();
                    const fix = issue.recommendation || 'Review and address';
                    lines.push(`| ${severity} | ${issue.title} | ${fix} |`);
                }
                lines.push('');
            }
            // Evidence backing the issues
            const assumedEvidence = paramEvidence.filter(e => e.confidence === 'assumed' || e.confidence === 'unknown');
            if (assumedEvidence.length > 0) {
                lines.push('**Gaps / assumptions:**');
                for (const e of assumedEvidence.slice(0, 5)) {
                    lines.push(`- ${e.label}: ${e.detail}`);
                }
                lines.push('');
            }
        }
        else {
            lines.push('**No issues identified** — this criterion meets expectations.');
            lines.push('');
        }
    }
    // Cross-cutting issues summary (non-redundant with per-parameter breakdown)
    const highIssues = result.issues.filter(i => i.severity === 'critical' || i.severity === 'high');
    const mediumIssues = result.issues.filter(i => i.severity === 'medium');
    if (highIssues.length > 0 || mediumIssues.length > 0) {
        lines.push('## Issue Summary');
        lines.push('');
        lines.push(`| Priority | Count | Parameters Affected |`);
        lines.push(`|----------|-------|---------------------|`);
        if (highIssues.length > 0) {
            const affectedHigh = [...new Set(highIssues.map(i => i.parameter.replace(/_/g, ' ')))];
            lines.push(`| 🔴 Critical/High | ${highIssues.length} | ${affectedHigh.join(', ')} |`);
        }
        if (mediumIssues.length > 0) {
            const affectedMed = [...new Set(mediumIssues.map(i => i.parameter.replace(/_/g, ' ')))];
            lines.push(`| 🟡 Medium | ${mediumIssues.length} | ${affectedMed.join(', ')} |`);
        }
        lines.push('');
        // Identify systemic patterns (issues appearing in 3+ parameters)
        const parameterIssueCounts = new Map();
        for (const issue of result.issues) {
            const key = issue.title.toLowerCase().replace(/missing .+ evidence/i, 'missing evidence');
            parameterIssueCounts.set(key, (parameterIssueCounts.get(key) ?? 0) + 1);
        }
        const systemicPatterns = [...parameterIssueCounts.entries()].filter(([, count]) => count >= 2);
        if (systemicPatterns.length > 0) {
            lines.push('**Systemic Patterns** (issues spanning multiple parameters):');
            for (const [pattern, count] of systemicPatterns.slice(0, 5)) {
                lines.push(`- "${pattern}" appears across ${count} parameters`);
            }
            lines.push('');
        }
    }
    // Evidence summary
    const observed = result.evidence.filter(e => e.confidence === 'observed');
    lines.push('## Evidence Summary');
    lines.push('');
    lines.push(`- **Observed signals:** ${observed.length}`);
    lines.push(`- **Total evidence points:** ${result.evidence.length}`);
    lines.push(`- **Issues identified:** ${result.issues.length}`);
    lines.push('');
    return lines.join('\n');
}
