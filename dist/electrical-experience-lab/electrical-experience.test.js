import test from 'node:test';
import assert from 'node:assert/strict';
import { runElectricalExperienceFlow } from './flow.js';
import { scenario001 } from './scenario-001.js';
import { AX_STAGE_ORDER, electricalAnalysisSchema, experienceRecommendationSchema, scenario001AxRecommendationSchema } from './schemas.js';
test('Scenario 001 flows through deterministic analysis, recommendations, AX, and critics', () => {
    const result = runElectricalExperienceFlow(scenario001);
    electricalAnalysisSchema.parse(result.analysis);
    experienceRecommendationSchema.parse(result.experience);
    scenario001AxRecommendationSchema.parse(result.ax);
    assert.equal(result.analysis.calculations.totalEnergyChange.percentChange, 18);
    assert.equal(result.analysis.calculations.totalEnergyChange.deltaKwh, 180);
    const equipmentCalculations = Object.fromEntries(result.analysis.calculations.equipmentContributions.map(item => [
        item.equipmentId,
        item
    ]));
    assert.equal(equipmentCalculations.hvac?.percentChange, 41);
    assert.equal(equipmentCalculations.hvac?.shareOfTotalIncreasePercent, 91.1);
    assert.equal(equipmentCalculations.lighting?.percentChange, 2);
    assert.equal(equipmentCalculations['other-loads']?.percentChange, 3);
    assert.equal(result.analysis.calculations.operatingHoursDelta.deltaHoursPerDay, 3.1);
    assert.equal(result.analysis.unknowns[0]?.statement, 'The reason for the HVAC schedule change is unknown.');
    assert.match(result.experience.primaryMessage.text, /increased 18%/);
    assert.equal(result.experience.primaryAction.autonomyMode, 'Investigate');
    assert.equal(result.experience.primaryAction.changesEquipmentState, false);
    assert.ok(result.experience.evidence.every(item => item.visible));
    assert.ok(result.experience.hiddenDetails.length > 0);
    assert.deepEqual(result.ax.stagePath, AX_STAGE_ORDER);
    assert.deepEqual(result.ax.allowedAutonomyModes, [
        'Assist',
        'Investigate',
        'Recommend'
    ]);
    assert.equal(result.ax.selectedAutonomy, 'Investigate');
    assert.deepEqual(result.ax.aiCannot, ['change_schedule', 'control_equipment']);
    assert.equal(result.critics.passed, true);
    assert.deepEqual(new Set(result.critics.results.flatMap(critic => critic.checks.map(check => check.id))), new Set([
        'unsupported_claims',
        'evidence_visibility',
        'progressive_disclosure',
        'uncertainty',
        'autonomy_safety'
    ]));
    for (const critic of result.critics.results) {
        assert.equal(critic.passed, true);
        assert.equal(critic.score, 100);
        assert.ok(critic.checks.every(check => check.status === 'pass'));
    }
});
