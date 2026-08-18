import { AX_STAGE_ORDER, scenario001AxRecommendationSchema } from './schemas.js';
export const buildAxRecommendation = (analysis, experience) => {
    const recommendedCheck = analysis.recommendedChecks[0];
    const unknown = analysis.unknowns[0];
    if (!recommendedCheck || !unknown) {
        throw new Error('AX recommendation requires a recommended check and a known unknown.');
    }
    return scenario001AxRecommendationSchema.parse({
        scenarioId: analysis.scenarioId,
        stagePath: [...AX_STAGE_ORDER],
        currentStage: 'UNDERSTAND',
        recommendedStage: 'PLAN',
        selectedAutonomy: 'Investigate',
        allowedAutonomyModes: [...experience.trustElements.autonomyBoundary.allowedModes],
        aiCan: [
            'analyze_energy_data',
            'compare_periods',
            'explain_evidence',
            'recommend_check'
        ],
        aiCannot: ['change_schedule', 'control_equipment'],
        suggestedNextStep: experience.primaryAction,
        verification: {
            stage: 'VERIFY',
            successCriteria: [
                'The extra HVAC operating window is identified in schedule records.',
                'The schedule-change reason is confirmed by an authorized person or remains explicitly unknown.',
                'No equipment schedule is changed by this investigation.'
            ],
            evidenceRefs: [recommendedCheck.id, unknown.id]
        }
    });
};
