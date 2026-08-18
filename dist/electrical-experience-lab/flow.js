import { analyzeElectricalScenario } from './analysis.js';
import { buildAxRecommendation } from './ax.js';
import { runCritics } from './critics.js';
import { buildExperienceRecommendation } from './experience.js';
export const runElectricalExperienceFlow = (scenario) => {
    const analysis = analyzeElectricalScenario(scenario);
    const experience = buildExperienceRecommendation(analysis);
    const ax = buildAxRecommendation(analysis, experience);
    const critics = runCritics(scenario, analysis, experience, ax);
    return { analysis, experience, ax, critics };
};
