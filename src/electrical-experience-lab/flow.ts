import { analyzeElectricalScenario } from './analysis.js';
import { buildAxRecommendation } from './ax.js';
import { runCritics } from './critics.js';
import { buildExperienceRecommendation } from './experience.js';
import type {
  AxRecommendation,
  CriticSuiteResult,
  ElectricalAnalysis,
  ElectricalScenario,
  ExperienceRecommendation
} from './schemas.js';

export type ElectricalExperienceFlowResult = {
  analysis: ElectricalAnalysis;
  experience: ExperienceRecommendation;
  ax: AxRecommendation;
  critics: CriticSuiteResult;
};

export const runElectricalExperienceFlow = (
  scenario: ElectricalScenario
): ElectricalExperienceFlowResult => {
  const analysis = analyzeElectricalScenario(scenario);
  const experience = buildExperienceRecommendation(analysis);
  const ax = buildAxRecommendation(analysis, experience);
  const critics = runCritics(scenario, analysis, experience, ax);

  return { analysis, experience, ax, critics };
};
