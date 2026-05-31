const CONTEXT_GATHER_PROMPT = `You are a UX research assistant. Your job is to gather additional design context using the tools available to you.

Given the design reference below, use any available tools (Figma, browser, filesystem, etc.) to gather:
1. Component hierarchy and naming conventions
2. Color tokens and typography scales in use
3. Interaction patterns and state transitions
4. Accessibility annotations or ARIA patterns
5. Any design system documentation or guidelines referenced

Design reference: {designRef}
{contextTypes}
{hints}

Return your findings as structured text with clear section headers. Be concise and factual — only report what you can observe or verify through tools.`;
/**
 * Check if the connected client supports sampling (createMessage).
 */
export function clientSupportsSampling(server) {
    const caps = server.getClientCapabilities();
    return !!caps?.sampling;
}
/**
 * Check if the connected client supports tools in sampling requests.
 */
export function clientSupportsToolsInSampling(server) {
    const caps = server.getClientCapabilities();
    const samplingCaps = caps?.sampling;
    return !!samplingCaps?.tools;
}
/**
 * Gather additional design context by asking the host LLM to use available tools.
 * Falls back gracefully if sampling is not supported by the client.
 */
export async function gatherContext(server, options) {
    const empty = {
        rawResponse: '',
        findings: [],
        componentReferences: [],
        accessibilityNotes: [],
        additionalContext: [],
        samplingUsed: false
    };
    if (!clientSupportsSampling(server)) {
        if (options.debug) {
            console.error('[context-gather] Client does not support sampling, skipping context gathering');
        }
        return empty;
    }
    const contextTypeDescriptions = options.contextTypes.map(t => {
        switch (t) {
            case 'accessibility': return '- Check for accessibility annotations, ARIA labels, contrast ratios, keyboard navigation';
            case 'design-system': return '- Look for design system tokens, component library usage, brand guidelines';
            case 'user-flows': return '- Examine user flow paths, navigation structure, state machines';
            case 'content': return '- Review content strategy, microcopy, information architecture';
            case 'technical': return '- Check technical constraints, responsive breakpoints, performance considerations';
        }
    }).join('\n');
    const prompt = CONTEXT_GATHER_PROMPT
        .replace('{designRef}', options.designRef)
        .replace('{contextTypes}', contextTypeDescriptions ? `\nFocus on:\n${contextTypeDescriptions}` : '')
        .replace('{hints}', options.hints ? `\nAdditional context: ${options.hints}` : '');
    try {
        const response = await server.createMessage({
            messages: [
                {
                    role: 'user',
                    content: { type: 'text', text: prompt }
                }
            ],
            maxTokens: options.maxTokens ?? 2000,
            modelPreferences: {
                hints: [{ name: 'claude-sonnet-4-20250514' }, { name: 'gpt-4o' }]
            }
        });
        const text = extractTextFromResponse(response);
        if (!text) {
            if (options.debug) {
                console.error('[context-gather] Empty response from sampling');
            }
            return empty;
        }
        return {
            ...parseGatheredContext(text),
            rawResponse: text,
            samplingUsed: true
        };
    }
    catch (error) {
        if (options.debug) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[context-gather] Sampling failed: ${msg}`);
        }
        return empty;
    }
}
/**
 * Gather context with tools — asks the host LLM to actively use other MCP tools.
 * Only works if the client supports tools in sampling.
 */
export async function gatherContextWithTools(server, options) {
    const empty = {
        rawResponse: '',
        findings: [],
        componentReferences: [],
        accessibilityNotes: [],
        additionalContext: [],
        samplingUsed: false
    };
    if (!clientSupportsToolsInSampling(server)) {
        // Fall back to basic sampling without tools
        return gatherContext(server, options);
    }
    const contextTypeDescriptions = options.contextTypes.map(t => {
        switch (t) {
            case 'accessibility': return '- Use available tools to check accessibility annotations, ARIA labels, contrast ratios';
            case 'design-system': return '- Use available tools to find design tokens, component documentation, style guides';
            case 'user-flows': return '- Use available tools to trace navigation paths and interaction states';
            case 'content': return '- Use available tools to examine content structure and information hierarchy';
            case 'technical': return '- Use available tools to check technical implementation details';
        }
    }).join('\n');
    const prompt = `You are a UX research assistant with access to tools. Use the available tools to gather design context for the following design:

Design reference: ${options.designRef}

Tasks:
${contextTypeDescriptions}
${options.hints ? `\nAdditional guidance: ${options.hints}` : ''}

Use whatever tools are available (Figma, browser, filesystem, etc.) to gather real data. Report your findings with clear section headers.`;
    try {
        const response = await server.createMessage({
            messages: [
                {
                    role: 'user',
                    content: { type: 'text', text: prompt }
                }
            ],
            maxTokens: options.maxTokens ?? 3000,
            modelPreferences: {
                hints: [{ name: 'claude-sonnet-4-20250514' }, { name: 'gpt-4o' }]
            }
        });
        const text = extractTextFromResponse(response);
        if (!text) {
            if (options.debug) {
                console.error('[context-gather] Empty response from sampling with tools');
            }
            return empty;
        }
        return {
            ...parseGatheredContext(text),
            rawResponse: text,
            samplingUsed: true
        };
    }
    catch (error) {
        if (options.debug) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[context-gather] Sampling with tools failed: ${msg}`);
        }
        // Fall back to basic sampling
        return gatherContext(server, options);
    }
}
// --- Helpers ---
function extractTextFromResponse(response) {
    if (!response)
        return '';
    // Handle single content block
    if (response.content?.type === 'text') {
        return response.content.text;
    }
    // Handle array of content blocks
    if (Array.isArray(response.content)) {
        return response.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join('\n');
    }
    return '';
}
function parseGatheredContext(text) {
    const findings = [];
    const componentReferences = [];
    const accessibilityNotes = [];
    const additionalContext = [];
    const lines = text.split('\n');
    let currentSection = 'general';
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        // Detect section headers
        if (/^#+\s*(component|hierarchy|naming)/i.test(trimmed)) {
            currentSection = 'components';
            continue;
        }
        if (/^#+\s*(color|token|typography|design.system)/i.test(trimmed)) {
            currentSection = 'findings';
            continue;
        }
        if (/^#+\s*(access|aria|wcag|a11y)/i.test(trimmed)) {
            currentSection = 'accessibility';
            continue;
        }
        if (/^#+\s*(interaction|state|flow|navigation)/i.test(trimmed)) {
            currentSection = 'findings';
            continue;
        }
        if (/^#+/.test(trimmed)) {
            currentSection = 'general';
            continue;
        }
        // Only capture bullet points and meaningful content
        if (/^[-*•]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
            const content = trimmed.replace(/^[-*•\d.)]+\s+/, '');
            switch (currentSection) {
                case 'components':
                    componentReferences.push(content);
                    break;
                case 'accessibility':
                    accessibilityNotes.push(content);
                    break;
                case 'findings':
                    findings.push(content);
                    break;
                default:
                    additionalContext.push(content);
            }
        }
    }
    return { findings, componentReferences, accessibilityNotes, additionalContext };
}
