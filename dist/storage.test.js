import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ReviewStorage } from './storage.js';
const withStorage = (fn) => {
    const dir = mkdtempSync(join(tmpdir(), 'ux-review-storage-'));
    const dbPath = join(dir, 'test.db');
    const storage = new ReviewStorage(dbPath);
    fn(storage);
};
test('can create project and list projects', () => {
    withStorage(storage => {
        const project = storage.createProject('Medhyam', 'Luxury real estate UX validation');
        assert.ok(project.id > 0);
        const projects = storage.listProjects();
        assert.equal(projects.length, 1);
        assert.equal(projects[0].name, 'Medhyam');
    });
});
test('can add and approve context rule', () => {
    withStorage(storage => {
        const project = storage.createProject('Medhyam');
        const rule = storage.addContextRule({
            projectId: project.id,
            ruleId: 'brand.visual.001',
            category: 'brand_expression',
            statement: 'Use calm, spacious layouts.',
            priority: 'high',
            authority: 'approved',
            appliesTo: ['homepage'],
            validatorType: 'visual_llm'
        });
        assert.equal(rule.status, 'draft');
        storage.approveContextRule(rule.id);
        const approved = storage.listContextRules(project.id, 'approved');
        assert.equal(approved.length, 1);
        assert.equal(approved[0].ruleId, 'brand.visual.001');
    });
});
test('can create context pack and save validation findings', () => {
    withStorage(storage => {
        const project = storage.createProject('Medhyam');
        const rule = storage.addContextRule({
            projectId: project.id,
            ruleId: 'cta.001',
            category: 'ux',
            statement: 'Use one primary CTA in hero.',
            priority: 'high',
            authority: 'approved',
            appliesTo: ['homepage'],
            validatorType: 'deterministic_html'
        });
        storage.approveContextRule(rule.id);
        const pack = storage.createContextPack({
            projectId: project.id,
            name: 'homepage_v1',
            version: 'v1',
            ruleIds: [rule.id]
        });
        const run = storage.createValidationRun({
            projectId: project.id,
            contextPackId: pack.id,
            targetTool: 'figma_make',
            taskType: 'generate',
            outputType: 'screenshot',
            outputRef: '/tmp/screen.png'
        });
        storage.saveValidationFindings(run.id, [
            {
                ruleId: 'cta.001',
                status: 'fail',
                severity: 'high',
                confidence: 'high',
                evidence: 'Three competing primary CTAs above fold',
                recommendation: 'Keep only one primary CTA',
                correctionPrompt: 'Convert two CTAs to secondary links.'
            }
        ]);
        storage.completeValidationRun(run.id, 0);
        const findings = storage.getValidationFindings(run.id);
        assert.equal(findings.length, 1);
        assert.equal(findings[0].status, 'fail');
    });
});
test('can store and read correction prompts', () => {
    withStorage(storage => {
        const project = storage.createProject('Medhyam');
        const rule = storage.addContextRule({
            projectId: project.id,
            ruleId: 'cta.001',
            category: 'ux',
            statement: 'Use one primary CTA in hero.',
            priority: 'high',
            authority: 'approved',
            appliesTo: ['homepage'],
            validatorType: 'deterministic_html'
        });
        storage.approveContextRule(rule.id);
        const pack = storage.createContextPack({
            projectId: project.id,
            name: 'homepage_v1',
            version: 'v1',
            ruleIds: [rule.id]
        });
        const run = storage.createValidationRun({
            projectId: project.id,
            contextPackId: pack.id,
            targetTool: 'cursor',
            taskType: 'generate',
            outputType: 'react_code',
            outputRef: '/tmp/page.tsx'
        });
        storage.saveCorrectionPrompt(run.id, 'cursor', 'Use one primary CTA and tokenized colors.');
        const prompts = storage.getCorrectionPrompts(run.id);
        assert.equal(prompts.length, 1);
        assert.equal(prompts[0].targetTool, 'cursor');
    });
});
test('can compare validation run summaries', () => {
    withStorage(storage => {
        const project = storage.createProject('Medhyam');
        const rule = storage.addContextRule({
            projectId: project.id,
            ruleId: 'cta.001',
            category: 'ux',
            statement: 'Use one primary CTA in hero.',
            priority: 'high',
            authority: 'approved',
            appliesTo: ['homepage'],
            validatorType: 'deterministic_html'
        });
        storage.approveContextRule(rule.id);
        const pack = storage.createContextPack({
            projectId: project.id,
            name: 'homepage_v1',
            version: 'v1',
            ruleIds: [rule.id]
        });
        const previousRun = storage.createValidationRun({
            projectId: project.id,
            contextPackId: pack.id,
            targetTool: 'figma_make',
            taskType: 'generate',
            outputType: 'screenshot',
            outputRef: '/tmp/old.png'
        });
        storage.saveValidationFindings(previousRun.id, [
            {
                ruleId: 'cta.001',
                status: 'fail',
                severity: 'high',
                confidence: 'high',
                evidence: 'Three CTAs',
                recommendation: 'Keep one CTA',
                correctionPrompt: 'Reduce CTA count'
            }
        ]);
        storage.completeValidationRun(previousRun.id, 20);
        const currentRun = storage.createValidationRun({
            projectId: project.id,
            contextPackId: pack.id,
            targetTool: 'figma_make',
            taskType: 'generate',
            outputType: 'screenshot',
            outputRef: '/tmp/new.png'
        });
        storage.saveValidationFindings(currentRun.id, [
            {
                ruleId: 'cta.001',
                status: 'pass',
                severity: 'high',
                confidence: 'high',
                evidence: 'Single CTA',
                recommendation: 'No change',
                correctionPrompt: 'Keep hierarchy'
            }
        ]);
        storage.completeValidationRun(currentRun.id, 90);
        const previousSummary = storage.getValidationRunSummary(previousRun.id);
        const currentSummary = storage.getValidationRunSummary(currentRun.id);
        assert.equal(previousSummary?.overallCompliance, 20);
        assert.equal(currentSummary?.overallCompliance, 90);
    });
});
test('can store and list knowledge context', () => {
    withStorage(storage => {
        const run = storage.createRun('https://example.com/design', null, null);
        const knowledge = storage.upsertKnowledgeItem({
            knowledgeKey: 'ux.principle.progressive-disclosure',
            userId: 'user-1',
            projectId: 101,
            sessionId: 'session-1',
            scope: 'project',
            category: 'UX principle',
            summary: 'Use progressive disclosure to reduce cognitive load.',
            tags: ['ux', 'cognitive-load'],
            priority: 'high',
            confidence: 'high',
            source: 'design-review'
        });
        storage.addKnowledgeRelationships([
            {
                fromKnowledgeKey: knowledge.knowledgeKey,
                toKnowledgeKey: 'ux.pattern.wizard',
                relationshipType: 'supports',
                note: 'Helps justify step-by-step flow.'
            }
        ]);
        storage.upsertMemoryEntry({
            memoryScope: 'user',
            memoryKey: 'user-1:preferences',
            entryType: 'tone',
            content: { preferredTone: 'direct' },
            tags: ['tone', 'preference']
        });
        storage.saveAnalysisMetadata({
            runId: run,
            userId: 'user-1',
            projectId: 101,
            sessionId: 'session-1',
            knowledgeKeys: [knowledge.knowledgeKey],
            memoryKeys: ['user:user-1:preferences:tone']
        });
        const knowledgeItems = storage.listKnowledgeItems({ userId: 'user-1' });
        const relationships = storage.listKnowledgeRelationships({ knowledgeKeys: [knowledge.knowledgeKey] });
        const memories = storage.listMemoryEntries({ memoryScope: 'user', memoryKey: 'user-1:preferences' });
        assert.equal(knowledgeItems.length, 1);
        assert.equal(knowledgeItems[0].summary, 'Use progressive disclosure to reduce cognitive load.');
        assert.equal(relationships.length, 1);
        assert.equal(memories.length, 1);
        assert.deepEqual(memories[0].content, { preferredTone: 'direct' });
    });
});
test('knowledge ranking prioritizes scope, priority, and matching tags', () => {
    withStorage(storage => {
        storage.upsertKnowledgeItems([
            {
                knowledgeKey: 'k-session-medium',
                userId: 'user-1',
                projectId: 201,
                sessionId: 'session-1',
                scope: 'session',
                category: 'ux',
                summary: 'Session-level UI notes for current critique context.',
                tags: ['a11y', 'ux'],
                priority: 'medium',
                confidence: 'high'
            },
            {
                knowledgeKey: 'k-project-high',
                userId: 'user-1',
                projectId: 201,
                scope: 'project',
                category: 'ux',
                summary: 'Project-level accessibility preference for buttons.',
                tags: ['a11y'],
                priority: 'high',
                confidence: 'medium'
            },
            {
                knowledgeKey: 'k-organization-critical',
                scope: 'organization',
                category: 'brand',
                summary: 'Org-level brand tone and copy consistency rule.',
                tags: ['brand'],
                priority: 'critical',
                confidence: 'medium'
            }
        ]);
        const ranked = storage.listKnowledgeItems({
            queryTags: ['a11y'],
            preferredScopes: ['session', 'project', 'user', 'organization'],
            ranked: true,
            limit: 3
        });
        assert.equal(ranked.length, 3);
        assert.equal(ranked[0].knowledgeKey, 'k-project-high');
        assert.equal(ranked[1].knowledgeKey, 'k-session-medium');
        assert.equal(ranked[2].knowledgeKey, 'k-organization-critical');
        assert.ok((ranked[0].retrievalScore ?? 0) >= (ranked[1].retrievalScore ?? 0));
    });
});
