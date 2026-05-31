/**
 * Figma URL parser — extracts fileKey and nodeId from various URL formats.
 */
export interface FigmaUrlParts {
    fileKey: string;
    nodeId: string | null;
}
/**
 * Parse a Figma URL and extract the file key and optional node ID.
 *
 * Supported formats:
 *   - figma.com/design/:fileKey/:fileName?node-id=:nodeId
 *   - figma.com/design/:fileKey/branch/:branchKey/:fileName
 *   - figma.com/file/:fileKey/:fileName?node-id=:nodeId
 *   - figma.com/proto/:fileKey/:fileName?node-id=:nodeId
 */
export declare function parseFigmaUrl(url: string): FigmaUrlParts;
