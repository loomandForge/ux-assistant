import { type AxRecommendation, type CriticResult, type CriticSuiteResult, type ElectricalAnalysis, type ElectricalScenario, type ExperienceRecommendation } from './schemas.js';
export declare const runElectricalCritic: (analysis: ElectricalAnalysis, experience: ExperienceRecommendation) => CriticResult;
export declare const runExperienceAxCritic: (scenario: ElectricalScenario, analysis: ElectricalAnalysis, experience: ExperienceRecommendation, ax: AxRecommendation) => CriticResult;
export declare const runCritics: (scenario: ElectricalScenario, analysis: ElectricalAnalysis, experience: ExperienceRecommendation, ax: AxRecommendation) => CriticSuiteResult;
