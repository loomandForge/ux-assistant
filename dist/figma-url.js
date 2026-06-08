/**
 * Figma URL parser — extracts fileKey and nodeId from various URL formats.
 */
/**
 * Parse a Figma URL and extract the file key and optional node ID.
 *
 * Supported formats:
 *   - figma.com/design/:fileKey/:fileName?node-id=:nodeId
 *   - figma.com/design/:fileKey/branch/:branchKey/:fileName
 *   - figma.com/file/:fileKey/:fileName?node-id=:nodeId
 *   - figma.com/proto/:fileKey/:fileName?node-id=:nodeId
 */
export function parseFigmaUrl(url) {
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        throw new Error(`Invalid URL: ${url}`);
    }
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== 'figma.com' && !hostname.endsWith('.figma.com')) {
        throw new Error(`Not a Figma URL: ${url}`);
    }
    const segments = parsed.pathname.split('/').filter(Boolean);
    // Expected: [type, fileKey, ...rest] or [type, fileKey, 'branch', branchKey, ...rest]
    if (segments.length < 2) {
        throw new Error(`Could not extract file key from URL: ${url}`);
    }
    const type = segments[0]; // 'design', 'file', 'proto', 'board'
    if (!['design', 'file', 'proto', 'board'].includes(type)) {
        throw new Error(`Unsupported Figma URL type "${type}": ${url}`);
    }
    let fileKey = segments[1];
    // Handle branch URLs: /design/:fileKey/branch/:branchKey/:name
    if (segments[2] === 'branch' && segments[3]) {
        fileKey = segments[3]; // Use branch key as the active file key
    }
    // Extract node-id from query params (format: "X-Y" → convert to "X:Y")
    const rawNodeId = parsed.searchParams.get('node-id');
    const nodeId = rawNodeId ? rawNodeId.replace(/-/g, ':') : null;
    return { fileKey, nodeId };
}
