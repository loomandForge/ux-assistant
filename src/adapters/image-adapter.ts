import type { ScoringBundle } from '@ux-assistant/scoring';
import { captureHtmlScreenshot, captureWebUrlScreenshot } from '../capture.js';
import type { ReviewStorage } from '../storage.js';

type IngestVisualOptions = {
  runId: number;
  storage: ReviewStorage;
  strategicContext: ScoringBundle['strategicContext'];
};

export type IngestedVisualPayload = {
  source: string;
  bundle: ScoringBundle;
};

const getGenericBundle = (
  source: string,
  screenshotPath?: string,
  extraToolCalls: ScoringBundle['toolCalls'] = []
): ScoringBundle => {
  const screenshotCalls: ScoringBundle['toolCalls'] = screenshotPath
    ? [
        {
          toolName: 'get_screenshot',
          status: 'success',
          data: { path: screenshotPath, source }
        }
      ]
    : [];

  return {
    figmaUrl: source,
    fileKey: null,
    nodeId: null,
    toolCalls: [...screenshotCalls, ...extraToolCalls]
  };
};

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const ingestWebInput = async (
  webUrl: string,
  options: IngestVisualOptions
): Promise<IngestedVisualPayload> => {
  let screenshotPath: string | undefined;
  let captureError: string | undefined;

  try {
    screenshotPath = await captureWebUrlScreenshot(webUrl);
    options.storage.addArtifact(options.runId, 'screenshot', screenshotPath, webUrl);
    options.storage.addToolCall(options.runId, 'capture_web_url', 'success', {
      sourceUrl: webUrl,
      screenshotPath
    });
  } catch (error) {
    captureError = errorMessage(error);
    options.storage.addToolCall(
      options.runId,
      'capture_web_url',
      'error',
      { sourceUrl: webUrl },
      captureError
    );
  }

  const bundle = getGenericBundle(webUrl, screenshotPath, [
    {
      toolName: 'get_metadata',
      status: 'success',
      data: { source: 'web_capture', sourceUrl: webUrl }
    },
    ...(captureError
      ? [
          {
            toolName: 'capture_web_url',
            status: 'error' as const,
            error: captureError
          }
        ]
      : [])
  ]);

  bundle.strategicContext = options.strategicContext;
  return { source: webUrl, bundle };
};

export const ingestHtmlInput = async (
  htmlSnippet: string,
  options: IngestVisualOptions
): Promise<IngestedVisualPayload> => {
  let screenshotPath: string | undefined;
  let captureError: string | undefined;

  try {
    screenshotPath = await captureHtmlScreenshot(htmlSnippet);
    options.storage.addArtifact(options.runId, 'screenshot', screenshotPath);
    options.storage.addToolCall(options.runId, 'capture_html_snippet', 'success', { screenshotPath });
  } catch (error) {
    captureError = errorMessage(error);
    options.storage.addToolCall(
      options.runId,
      'capture_html_snippet',
      'error',
      undefined,
      captureError
    );
  }

  const source = 'html_snippet';
  const bundle = getGenericBundle(source, screenshotPath, [
    {
      toolName: 'get_metadata',
      status: 'success',
      data: { source: 'html_capture', htmlLength: htmlSnippet.length }
    },
    {
      toolName: 'get_design_context',
      status: 'success',
      data: { code: htmlSnippet }
    },
    ...(captureError
      ? [
          {
            toolName: 'capture_html_snippet',
            status: 'error' as const,
            error: captureError
          }
        ]
      : [])
  ]);

  bundle.strategicContext = options.strategicContext;
  return { source, bundle };
};

export const ingestImagePathInput = (
  imagePath: string,
  options: IngestVisualOptions
): IngestedVisualPayload => {
  options.storage.addArtifact(options.runId, 'image', imagePath);
  options.storage.addToolCall(options.runId, 'ingest_image_path', 'success', { imagePath });

  const bundle = getGenericBundle(imagePath, imagePath);
  bundle.strategicContext = options.strategicContext;
  return { source: imagePath, bundle };
};
