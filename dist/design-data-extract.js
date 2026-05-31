/**
 * Design Data Extraction Module
 *
 * Extracts meaningful design signals from raw MCP tool call results
 * (component names, text content, layout info, colors, etc.) so the
 * LLM can reason about the actual design — not just tool success/failure.
 */
/**
 * Extract design signals from the raw data field of MCP tool call results.
 */
export function extractDesignData(toolCalls, sourceType = 'figma') {
    const result = {
        components: [],
        textContent: [],
        frameNames: [],
        colors: [],
        typography: [],
        layout: [],
        interactions: [],
        tokens: [],
        hierarchy: [],
        sourceType
    };
    for (const tc of toolCalls) {
        if (tc.status !== 'success' || !tc.data)
            continue;
        switch (tc.toolName) {
            case 'get_design_context':
                extractFromDesignContext(tc.data, result);
                break;
            case 'get_metadata':
                extractFromMetadata(tc.data, result);
                break;
            case 'get_screenshot':
                extractFromScreenshot(tc.data, result);
                break;
            case 'get_variable_defs':
                extractFromVariables(tc.data, result);
                break;
        }
    }
    // Deduplicate all arrays
    result.components = [...new Set(result.components)];
    result.textContent = [...new Set(result.textContent)];
    result.frameNames = [...new Set(result.frameNames)];
    result.colors = [...new Set(result.colors)];
    result.typography = [...new Set(result.typography)];
    result.layout = [...new Set(result.layout)];
    result.interactions = [...new Set(result.interactions)];
    result.tokens = [...new Set(result.tokens)];
    result.hierarchy = [...new Set(result.hierarchy)];
    return result;
}
function extractFromDesignContext(data, out) {
    if (!data || typeof data !== 'object')
        return;
    const obj = data;
    // Extract from code/jsx output (common in get_design_context)
    if (typeof obj.code === 'string') {
        extractComponentsFromCode(obj.code, out);
    }
    // Extract from nodes array
    if (Array.isArray(obj.nodes)) {
        for (const node of obj.nodes) {
            extractNodeInfo(node, out);
        }
    }
    // Extract from children
    if (Array.isArray(obj.children)) {
        for (const child of obj.children) {
            extractNodeInfo(child, out);
        }
    }
    // Direct node info
    extractNodeInfo(obj, out);
    // Extract from context hints
    if (typeof obj.context === 'string') {
        out.interactions.push(obj.context);
    }
    if (Array.isArray(obj.hints)) {
        for (const hint of obj.hints) {
            if (typeof hint === 'string')
                out.interactions.push(hint);
        }
    }
    // Extract from annotations
    if (Array.isArray(obj.annotations)) {
        for (const ann of obj.annotations) {
            if (typeof ann === 'string')
                out.interactions.push(ann);
            else if (ann && typeof ann === 'object') {
                const a = ann;
                if (typeof a.label === 'string')
                    out.interactions.push(a.label);
                if (typeof a.description === 'string')
                    out.interactions.push(a.description);
            }
        }
    }
}
function extractFromMetadata(data, out) {
    if (!data || typeof data !== 'object')
        return;
    const obj = data;
    // Extract page/frame names
    if (typeof obj.name === 'string')
        out.frameNames.push(obj.name);
    if (typeof obj.pageName === 'string')
        out.frameNames.push(obj.pageName);
    // Extract dimensions and layout
    if (obj.absoluteBoundingBox && typeof obj.absoluteBoundingBox === 'object') {
        const box = obj.absoluteBoundingBox;
        if (box.width && box.height) {
            out.layout.push(`Frame: ${Math.round(box.width)}×${Math.round(box.height)}px`);
        }
    }
    // Auto-layout info
    if (obj.layoutMode === 'HORIZONTAL' || obj.layoutMode === 'VERTICAL') {
        const mode = obj.layoutMode;
        const padding = obj.paddingLeft ?? obj.padding ?? 0;
        const spacing = obj.itemSpacing ?? 0;
        out.layout.push(`Auto-layout: ${mode}, spacing=${spacing}, padding=${padding}`);
    }
    // Constraints
    if (obj.constraints && typeof obj.constraints === 'object') {
        const c = obj.constraints;
        out.layout.push(`Constraints: horizontal=${c.horizontal ?? 'none'}, vertical=${c.vertical ?? 'none'}`);
    }
    // Extract from children recursively
    if (Array.isArray(obj.children)) {
        for (const child of obj.children) {
            if (child && typeof child === 'object') {
                const c = child;
                if (typeof c.name === 'string') {
                    const nodeType = typeof c.type === 'string' ? c.type : 'UNKNOWN';
                    out.hierarchy.push(`${c.name} [${nodeType}]`);
                }
                extractFromMetadata(child, out);
            }
        }
    }
    // Component info
    if (typeof obj.componentName === 'string')
        out.components.push(obj.componentName);
    if (typeof obj.mainComponent === 'string')
        out.components.push(obj.mainComponent);
    if (obj.type === 'INSTANCE' || obj.type === 'COMPONENT') {
        if (typeof obj.name === 'string')
            out.components.push(obj.name);
    }
}
function extractFromScreenshot(data, out) {
    if (!data || typeof data !== 'object')
        return;
    const obj = data;
    if (typeof obj.path === 'string')
        out.screenshotPath = obj.path;
    if (typeof obj.screenshotPath === 'string')
        out.screenshotPath = obj.screenshotPath;
}
function extractFromVariables(data, out) {
    if (!data || typeof data !== 'object')
        return;
    const obj = data;
    // Variables can be an array or nested structure
    const vars = Array.isArray(obj.variables) ? obj.variables : Array.isArray(data) ? data : [];
    for (const v of vars) {
        if (!v || typeof v !== 'object')
            continue;
        const variable = v;
        const name = typeof variable.name === 'string' ? variable.name : '';
        const value = variable.resolvedValue ?? variable.value;
        if (!name)
            continue;
        out.tokens.push(`${name}: ${formatTokenValue(value)}`);
        // Categorize by naming convention
        const lowerName = name.toLowerCase();
        if (lowerName.includes('color') || lowerName.includes('fill') || lowerName.includes('bg')) {
            if (typeof value === 'string')
                out.colors.push(`${name}=${value}`);
            else if (value && typeof value === 'object') {
                const cv = value;
                if (cv.r !== undefined) {
                    out.colors.push(`${name}=rgba(${Math.round((cv.r ?? 0) * 255)},${Math.round((cv.g ?? 0) * 255)},${Math.round((cv.b ?? 0) * 255)},${cv.a ?? 1})`);
                }
            }
        }
        if (lowerName.includes('font') || lowerName.includes('text') || lowerName.includes('type')) {
            out.typography.push(`${name}: ${formatTokenValue(value)}`);
        }
        if (lowerName.includes('spacing') || lowerName.includes('radius') || lowerName.includes('size')) {
            out.layout.push(`${name}: ${formatTokenValue(value)}`);
        }
    }
    // Also handle collection-level data
    if (Array.isArray(obj.collections)) {
        for (const col of obj.collections) {
            if (col && typeof col === 'object') {
                const c = col;
                if (typeof c.name === 'string')
                    out.tokens.push(`Collection: ${c.name}`);
            }
        }
    }
}
function extractNodeInfo(node, out) {
    if (!node || typeof node !== 'object')
        return;
    const obj = node;
    // Name and type
    const name = typeof obj.name === 'string' ? obj.name : '';
    const type = typeof obj.type === 'string' ? obj.type : '';
    if (name && type) {
        if (type === 'TEXT') {
            // Extract text content
            const characters = typeof obj.characters === 'string' ? obj.characters : name;
            if (characters.length <= 200)
                out.textContent.push(characters);
        }
        else if (type === 'INSTANCE' || type === 'COMPONENT' || type === 'COMPONENT_SET') {
            out.components.push(name);
        }
        else if (type === 'FRAME' || type === 'GROUP' || type === 'SECTION') {
            out.frameNames.push(name);
        }
    }
    // Extract fills for colors
    if (Array.isArray(obj.fills)) {
        for (const fill of obj.fills) {
            if (fill && typeof fill === 'object') {
                const f = fill;
                if (f.type === 'SOLID' && f.color && typeof f.color === 'object') {
                    const c = f.color;
                    const hex = rgbToHex(c.r ?? 0, c.g ?? 0, c.b ?? 0);
                    out.colors.push(hex);
                }
            }
        }
    }
    // Extract font info
    if (typeof obj.fontFamily === 'string') {
        const size = typeof obj.fontSize === 'number' ? `${obj.fontSize}px` : '';
        const weight = typeof obj.fontWeight === 'number' ? ` w${obj.fontWeight}` : '';
        out.typography.push(`${obj.fontFamily} ${size}${weight}`.trim());
    }
    if (obj.style && typeof obj.style === 'object') {
        const s = obj.style;
        if (typeof s.fontFamily === 'string') {
            const size = typeof s.fontSize === 'number' ? `${s.fontSize}px` : '';
            out.typography.push(`${s.fontFamily} ${size}`.trim());
        }
    }
}
function extractComponentsFromCode(code, out) {
    // Extract component-like tags from JSX/HTML code
    const tagMatches = code.match(/<([A-Z][A-Za-z0-9]+)/g);
    if (tagMatches) {
        for (const match of tagMatches) {
            out.components.push(match.slice(1)); // Remove '<'
        }
    }
    // Extract text content from code
    const textMatches = code.match(/>([^<>{]+)</g);
    if (textMatches) {
        for (const match of textMatches) {
            const text = match.slice(1, -1).trim();
            if (text.length > 2 && text.length <= 100 && !/^[{}\s]+$/.test(text)) {
                out.textContent.push(text);
            }
        }
    }
}
function formatTokenValue(value) {
    if (typeof value === 'string')
        return value;
    if (typeof value === 'number')
        return String(value);
    if (value && typeof value === 'object') {
        const v = value;
        if (v.r !== undefined) {
            return `rgba(${Math.round(v.r * 255)},${Math.round(v.g * 255)},${Math.round(v.b * 255)},${v.a ?? 1})`;
        }
        return JSON.stringify(value);
    }
    return String(value ?? '');
}
function rgbToHex(r, g, b) {
    const toHex = (n) => Math.round(n * 255)
        .toString(16)
        .padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
/**
 * Format extracted design data into a concise string for LLM consumption.
 * Keeps under ~2000 chars to avoid prompt bloat.
 */
export function formatDesignDataForPrompt(data) {
    const sections = [];
    if (data.components.length > 0) {
        sections.push(`Components: ${data.components.slice(0, 15).join(', ')}`);
    }
    if (data.textContent.length > 0) {
        sections.push(`UI Text: ${data.textContent.slice(0, 12).map(t => `"${t}"`).join(', ')}`);
    }
    if (data.frameNames.length > 0) {
        sections.push(`Frames/Sections: ${data.frameNames.slice(0, 10).join(', ')}`);
    }
    if (data.colors.length > 0) {
        sections.push(`Colors used: ${data.colors.slice(0, 8).join(', ')}`);
    }
    if (data.typography.length > 0) {
        sections.push(`Typography: ${data.typography.slice(0, 6).join(', ')}`);
    }
    if (data.layout.length > 0) {
        sections.push(`Layout: ${data.layout.slice(0, 6).join('; ')}`);
    }
    if (data.interactions.length > 0) {
        sections.push(`Interactions: ${data.interactions.slice(0, 5).join('; ')}`);
    }
    if (data.tokens.length > 0) {
        sections.push(`Design Tokens: ${data.tokens.slice(0, 8).join(', ')}`);
    }
    if (data.hierarchy.length > 0) {
        sections.push(`Layer Structure: ${data.hierarchy.slice(0, 10).join(' > ')}`);
    }
    return sections.join('\n');
}
/**
 * Compute confidence metrics from evidence data.
 */
export function computeConfidenceMetrics(evidence) {
    const total = evidence.length || 1;
    const observed = evidence.filter(e => e.confidence === 'observed').length;
    const assumed = evidence.filter(e => e.confidence === 'assumed').length;
    const unknown = evidence.filter(e => e.confidence === 'unknown').length;
    const observedPct = Math.round((observed / total) * 100);
    const assumedPct = Math.round((assumed / total) * 100);
    const unknownPct = Math.round((unknown / total) * 100);
    const level = observedPct >= 60 ? 'HIGH' : observedPct >= 35 ? 'MODERATE' : 'LOW';
    const limitations = [];
    if (assumed > 0) {
        limitations.push(`${assumed} evidence points are assumed (tool data missing or failed)`);
    }
    if (unknown > 0) {
        limitations.push(`${unknown} checks could not be verified from available design data`);
    }
    if (observedPct < 40) {
        limitations.push('Low observation coverage — scoring based primarily on structural signals');
    }
    return { observedPct, assumedPct, unknownPct, level, limitations };
}
