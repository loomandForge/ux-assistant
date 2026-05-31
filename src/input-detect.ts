import { existsSync } from 'node:fs';

export type ReviewInputType = 'figma_url' | 'web_url' | 'image_path' | 'html_snippet';

export interface ReviewInputRequest {
  figmaUrl?: string;
  webUrl?: string;
  imagePath?: string;
  htmlSnippet?: string;
  designSystemFigmaUrl?: string;
  chatContext?: string;
  problemStatement?: string;
  proposedSolution?: string;
  requirements?: string[];
  designSystem?: string;
  customGuidelinePath?: string;
  userId?: string;
  projectId?: number;
  sessionId?: string;
  knowledgeItems?: unknown[];
  knowledgeRelationships?: unknown[];
  memoryEntries?: unknown[];
}

export interface ResolvedInput {
  type: ReviewInputType;
  value: string;
}

const FIGMA_URL_REGEX = /https?:\/\/(?:www\.)?figma\.com\/(?:design|file|proto|board)\/[^\s)]+/i;
const WEB_URL_REGEX = /https?:\/\/[^\s)]+/i;
const IMAGE_PATH_REGEX = /(?:^|\s)(\/?[^\s]+\.(?:png|jpg|jpeg|webp|gif))(?:$|\s)/i;

const ensureUrl = (value: string): string => {
  try {
    const parsed = new URL(value);
    return parsed.toString();
  } catch {
    throw new Error(`Invalid URL: ${value}`);
  }
};

export const resolveReviewInput = (request: ReviewInputRequest): ResolvedInput => {
  if (request.figmaUrl) {
    return { type: 'figma_url', value: ensureUrl(request.figmaUrl) };
  }

  if (request.webUrl) {
    return { type: 'web_url', value: ensureUrl(request.webUrl) };
  }

  if (request.imagePath) {
    if (!existsSync(request.imagePath)) {
      throw new Error(`Image path does not exist: ${request.imagePath}`);
    }
    return { type: 'image_path', value: request.imagePath };
  }

  if (request.htmlSnippet) {
    if (!request.htmlSnippet.trim()) {
      throw new Error('htmlSnippet must not be empty');
    }
    return { type: 'html_snippet', value: request.htmlSnippet };
  }

  const context = request.chatContext?.trim();
  if (!context) {
    throw new Error(
      'No review input provided. Pass figmaUrl, webUrl, imagePath, htmlSnippet, or chatContext for auto-detect.'
    );
  }

  const figmaMatch = context.match(FIGMA_URL_REGEX);
  if (figmaMatch) {
    return { type: 'figma_url', value: ensureUrl(figmaMatch[0]) };
  }

  const urlMatch = context.match(WEB_URL_REGEX);
  if (urlMatch) {
    return { type: 'web_url', value: ensureUrl(urlMatch[0]) };
  }

  const imagePathMatch = context.match(IMAGE_PATH_REGEX);
  if (imagePathMatch?.[1] && existsSync(imagePathMatch[1])) {
    return { type: 'image_path', value: imagePathMatch[1] };
  }

  throw new Error(
    'Auto-detect did not find a Figma URL, web URL, or valid image path in chatContext.'
  );
};
