import type { AxRecommendation, CriticSuiteResult, ElectricalAnalysis, ElectricalScenario, ExperienceRecommendation } from './schemas.js';
export type ElectricalExperienceFlowResult = {
    analysis: ElectricalAnalysis;
    experience: ExperienceRecommendation;
    ax: AxRecommendation;
    critics: CriticSuiteResult;
};
export declare const runElectricalExperienceFlow: (scenario: ElectricalScenario) => ElectricalExperienceFlowResult;
