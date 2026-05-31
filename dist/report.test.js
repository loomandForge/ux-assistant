import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMarkdownReport } from './report.js';
const baseResult = () => ({
    scores: [
        {
            parameter: 'design_system_consistency',
            score: 2.8,
            alignmentPct: 56,
            deviationPct: 44,
            summary: 'Design system consistency has moderate coverage with notable gaps.'
        }
    ],
    evidence: [
        {
            parameter: 'design_system_consistency',
            label: 'Design system component matches',
            detail: '3 component matches from external.',
            confidence: 'observed'
        }
    ],
    issues: [
        {
            parameter: 'design_system_consistency',
            severity: 'low',
            title: 'Some design system checks failed',
            recommendation: 'Retry design system lookup to improve confidence.',
            evidence: '2 of 8 design system queries failed.'
        }
    ],
    overallAlignmentPct: 56,
    overallDeviationPct: 44
});
test('buildMarkdownReport includes design-system lookup fallback section', () => {
    const markdown = buildMarkdownReport('https://example.com/design', baseResult());
    assert.match(markdown, /## Design System Lookup Status/);
    assert.match(markdown, /3 component matches from external\./);
    assert.match(markdown, /2 of 8 design system queries failed\./);
    assert.match(markdown, /Retry design system lookup to improve confidence\./);
});
