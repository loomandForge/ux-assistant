import type { ReviewEvidence } from '@ux-assistant/scoring';
import {
  searchDesignSystemComponents,
  searchDesignSystemIcons,
  type DesignSystemComponentSearchResult
} from './element-mcp.js';

export interface DesignSystemEvidence {
  componentFindings: Array<{
    componentName: string;
    matchScore: number;
    category: string;
    description: string;
    evidence: ReviewEvidence;
  }>;
  iconFindings: Array<{
    iconName: string;
    tags: string[];
    evidence: ReviewEvidence;
  }>;
  queriesRun: number;
  queriesFailed: number;
}

/**
 * Extract component and icon names from figma node names or descriptions.
 */
const extractDesignTokensFromContext = (
  nodeDescription?: string,
  figmaNodeName?: string
): string[] => {
  const text = [nodeDescription ?? '', figmaNodeName ?? ''].join(' ');

  // Extract potential component names (PascalCase/camelCase or hyphenated)
  const tokens: string[] = [];
  const words = text.match(/\b[A-Za-z]+(?:[A-Z][a-z]+)+\b/g) ?? [];
  tokens.push(...words);

  // Also extract hyphenated terms
  const hyphenated = text.match(/\b[\w]+-[\w-]+\b/g) ?? [];
  tokens.push(...hyphenated);

  // Remove duplicates and very short terms
  return [...new Set(tokens)].filter(t => t.length > 2).slice(0, 5);
};

/**
 * Convert design system component search result to scoring evidence.
 */
const componentToEvidence = (result: DesignSystemComponentSearchResult): ReviewEvidence => {
  const confidence = result.matchScore > 0.5 ? 'observed' : 'assumed';
  return {
    parameter: 'design_system_consistency',
    label: 'Design system component match',
    detail: `${result.componentName} (${result.category}): ${result.description}`,
    confidence
  };
};

/**
 * Convert design system icon search result to scoring evidence.
 */
const iconToEvidence = (): ReviewEvidence => {
  return {
    parameter: 'design_system_consistency',
    label: 'Design system icon match',
    detail: 'Icon usage found in design system library',
    confidence: 'assumed'
  };
};

/**
 * Query a design system MCP for compliance findings and convert to scoring evidence.
 */
export const buildDesignSystemEvidence = async (
  nodeDescription?: string,
  figmaNodeName?: string,
  enableDebug = false
): Promise<DesignSystemEvidence> => {
  const tokens = extractDesignTokensFromContext(nodeDescription, figmaNodeName);

  if (tokens.length === 0) {
    return {
      componentFindings: [],
      iconFindings: [],
      queriesRun: 0,
      queriesFailed: 0
    };
  }

  const componentFindings: DesignSystemEvidence['componentFindings'] = [];
  const iconFindings: DesignSystemEvidence['iconFindings'] = [];

  let queriesRun = 0;
  let queriesFailed = 0;

  // Query for each token in parallel
  const componentPromises = tokens.map(async token => {
    try {
      queriesRun++;
      const results = await searchDesignSystemComponents(token, enableDebug);
      return results.map(result => ({
        componentName: result.componentName,
        matchScore: result.matchScore,
        category: result.category,
        description: result.description,
        evidence: componentToEvidence(result)
      }));
    } catch (error) {
      queriesFailed++;
      if (enableDebug) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(
          `[Design System Evidence] component query failed for token "${token}": ${msg}`
        );
      }
      return [];
    }
  });

  const iconPromises = tokens.map(async token => {
    try {
      queriesRun++;
      const results = await searchDesignSystemIcons(token, enableDebug);
      return results.map(result => ({
        iconName: result.name,
        tags: result.tags,
        evidence: iconToEvidence()
      }));
    } catch (error) {
      queriesFailed++;
      if (enableDebug) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[Design System Evidence] icon query failed for token "${token}": ${msg}`);
      }
      return [];
    }
  });

  const [componentResults, iconResults] = await Promise.all([
    Promise.all(componentPromises),
    Promise.all(iconPromises)
  ]);

  componentFindings.push(...componentResults.flat());
  iconFindings.push(...iconResults.flat());

  return {
    componentFindings,
    iconFindings,
    queriesRun,
    queriesFailed
  };
};
