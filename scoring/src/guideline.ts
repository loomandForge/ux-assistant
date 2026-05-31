import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ReviewParameterKey } from './schema.js';

export interface GuidelineParameterDefinition {
  key: ReviewParameterKey;
  title: string;
  rawText: string;
}

const PARAMETER_REGEX = /^\s*([1-7])\.\s*\*\*(.+?)\*\*\s*-\s*(.+)$/;

const titleToKey = (title: string): ReviewParameterKey | undefined => {
  const normalized = title.toLowerCase();

  if (normalized.includes('user flow') || normalized.includes('interaction design'))
    return 'user_flow_interaction';
  if (normalized.includes('visual hierarchy') || normalized.includes('layout'))
    return 'visual_hierarchy_layout';
  if (normalized.includes('design system')) return 'design_system_consistency';
  if (normalized.includes('accessibility') || normalized.includes('wcag'))
    return 'accessibility_wcag';
  if (normalized.includes('information architecture') || normalized.includes('content'))
    return 'content_information_architecture';
  if (normalized.includes('technical feasibility')) return 'technical_feasibility';
  if (normalized.includes('brand') || normalized.includes('design quality'))
    return 'brand_design_quality';

  return undefined;
};

/**
 * Parse a design review guideline markdown file and extract parameter definitions.
 */
export const loadGuidelineParameters = async (
  guidelinePath: string
): Promise<GuidelineParameterDefinition[]> => {
  const absolutePath = resolve(process.cwd(), guidelinePath);
  const content = await readFile(absolutePath, 'utf8');

  const parsed: GuidelineParameterDefinition[] = [];
  const seen = new Set<ReviewParameterKey>();

  for (const line of content.split('\n')) {
    const match = line.match(PARAMETER_REGEX);
    if (!match) continue;

    const title = match[2].trim();
    const detail = match[3].trim();
    const key = titleToKey(title);
    if (!key || seen.has(key)) continue;

    parsed.push({ key, title, rawText: `${title} - ${detail}` });
    seen.add(key);
  }

  return parsed;
};
