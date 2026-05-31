import { captureHtmlScreenshot, captureWebUrlScreenshot } from '../capture.js';
const getGenericBundle = (source, screenshotPath, extraToolCalls = []) => {
    return {
        figmaUrl: source,
        fileKey: null,
        nodeId: null,
        toolCalls: [
            {
                toolName: 'get_screenshot',
                status: 'success',
                data: { path: screenshotPath, source }
            },
            ...extraToolCalls
        ]
    };
};
export const ingestWebInput = async (webUrl, options) => {
    const screenshotPath = await captureWebUrlScreenshot(webUrl);
    options.storage.addArtifact(options.runId, 'screenshot', screenshotPath, webUrl);
    options.storage.addToolCall(options.runId, 'capture_web_url', 'success', {
        sourceUrl: webUrl,
        screenshotPath
    });
    const bundle = getGenericBundle(webUrl, screenshotPath, [
        {
            toolName: 'get_metadata',
            status: 'success',
            data: { source: 'web_capture', sourceUrl: webUrl }
        }
    ]);
    bundle.strategicContext = options.strategicContext;
    return { source: webUrl, bundle };
};
export const ingestHtmlInput = async (htmlSnippet, options) => {
    const screenshotPath = await captureHtmlScreenshot(htmlSnippet);
    options.storage.addArtifact(options.runId, 'screenshot', screenshotPath);
    options.storage.addToolCall(options.runId, 'capture_html_snippet', 'success', { screenshotPath });
    const source = 'html_snippet';
    const bundle = getGenericBundle(source, screenshotPath, [
        {
            toolName: 'get_metadata',
            status: 'success',
            data: { source: 'html_capture' }
        }
    ]);
    bundle.strategicContext = options.strategicContext;
    return { source, bundle };
};
export const ingestImagePathInput = (imagePath, options) => {
    options.storage.addArtifact(options.runId, 'image', imagePath);
    options.storage.addToolCall(options.runId, 'ingest_image_path', 'success', { imagePath });
    const bundle = getGenericBundle(imagePath, imagePath);
    bundle.strategicContext = options.strategicContext;
    return { source: imagePath, bundle };
};
