export const parseDesignSystemMode = (value) => {
    if (!value) {
        return 'generic';
    }
    const normalized = value.toLowerCase().trim();
    if (normalized === 'external' ||
        normalized === 'external-mcp' ||
        normalized === 'element-ix' ||
        normalized === 'element' ||
        normalized === 'ix') {
        return 'external';
    }
    if (normalized === 'custom') {
        return 'custom';
    }
    if (normalized === 'none') {
        return 'none';
    }
    return 'generic';
};
/**
 * Load design system configuration from environment or defaults.
 */
export const loadDesignSystemConfig = () => {
    const mode = parseDesignSystemMode(process.env.UX_REVIEW_DESIGN_SYSTEM ?? 'generic');
    const customGuidelinePath = process.env.UX_REVIEW_CUSTOM_GUIDELINE_PATH;
    const enableExternalMcp = process.env.UX_REVIEW_DESIGN_SYSTEM_MCP_ENABLED === 'true' ||
        process.env.UX_REVIEW_ELEMENT_MCP_ENABLED === 'true' ||
        (mode === 'external' &&
            !process.env.UX_REVIEW_DESIGN_SYSTEM_MCP_ENABLED &&
            !process.env.UX_REVIEW_ELEMENT_MCP_ENABLED);
    return {
        mode,
        customGuidelinePath,
        enableExternalMcp: enableExternalMcp && mode !== 'none'
    };
};
