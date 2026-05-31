import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { formatDesignDataForPrompt } from './design-data-extract.js';
const PARAMETER_ORDER = [
    'user_flow_interaction',
    'visual_hierarchy_layout',
    'design_system_consistency',
    'accessibility_wcag',
    'content_information_architecture',
    'technical_feasibility',
    'brand_design_quality'
];
const DEFAULT_TIMEOUT_MS = Number(process.env.UX_REVIEW_LLM_TIMEOUT_MS ?? 45000);
const PERSPECTIVE_TIMEOUT_MS = Number(process.env.UX_REVIEW_PERSPECTIVE_TIMEOUT_MS ?? 90000);
const DEFAULT_RETRIES = Number(process.env.UX_REVIEW_LLM_RETRIES ?? 1);
const parseJsonOrThrow = (value) => {
    try {
        return JSON.parse(value);
    }
    catch {
        const match = value.match(/\{[\s\S]*\}$/);
        if (!match) {
            throw new Error('Provider returned non-JSON content');
        }
        return JSON.parse(match[0]);
    }
};
const withTimeout = async (fn, timeoutMs) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fn(controller.signal);
    }
    finally {
        clearTimeout(timer);
    }
};
const retry = async (operation, attempts) => {
    let lastError;
    for (let i = 0; i <= attempts; i += 1) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
        }
    }
    throw lastError;
};
const openAiCompatibleProvider = (options) => {
    const baseHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`,
        ...options.extraHeaders
    };
    return {
        provider: options.provider,
        model: options.model,
        async callJson(prompt) {
            const response = await withTimeout(signal => fetch(`${options.baseUrl.replace(/\/$/, '')}/chat/completions`, {
                method: 'POST',
                headers: baseHeaders,
                body: JSON.stringify({
                    model: options.model,
                    temperature: 0.2,
                    response_format: { type: 'json_object' },
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a UX review assistant. Always return strict JSON with no markdown fences.'
                        },
                        { role: 'user', content: prompt }
                    ]
                }),
                signal
            }), DEFAULT_TIMEOUT_MS);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`${options.provider} request failed (${response.status}): ${errorText}`);
            }
            const payload = (await response.json());
            const content = payload.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error(`${options.provider} returned empty completion`);
            }
            return parseJsonOrThrow(content);
        },
        async callMarkdown(systemPrompt, userPrompt) {
            const response = await withTimeout(signal => fetch(`${options.baseUrl.replace(/\/$/, '')}/chat/completions`, {
                method: 'POST',
                headers: baseHeaders,
                body: JSON.stringify({
                    model: options.model,
                    temperature: 0.4,
                    max_tokens: 8000,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ]
                }),
                signal
            }), PERSPECTIVE_TIMEOUT_MS);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`${options.provider} markdown request failed (${response.status}): ${errorText}`);
            }
            const payload = (await response.json());
            const content = payload.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error(`${options.provider} returned empty markdown completion`);
            }
            return content;
        }
    };
};
// --- Copilot token resolution ---
// Reads the OAuth token stored by GitHub Copilot clients (e.g. VS Code)
// and exchanges it for a short-lived API token.
const COPILOT_HEADERS = {
    'Editor-Version': 'vscode/1.100.0',
    'Editor-Plugin-Version': 'copilot-chat/0.28.0',
    'Copilot-Integration-Id': 'vscode-chat',
    'OpenAI-Intent': 'conversation-panel'
};
let cachedCopilotToken = null;
const readCopilotOAuthToken = () => {
    const hostsPath = join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'github-copilot', 'hosts.json');
    try {
        const raw = readFileSync(hostsPath, 'utf8');
        const hosts = JSON.parse(raw);
        // Prefer GHEC host if configured, fallback to github.com
        const ghecHost = process.env.COPILOT_GHEC_HOST;
        if (ghecHost && hosts[ghecHost]?.oauth_token) {
            return hosts[ghecHost].oauth_token;
        }
        if (hosts['github.com']?.oauth_token) {
            return hosts['github.com'].oauth_token;
        }
        // Try any host entry
        for (const entry of Object.values(hosts)) {
            if (entry.oauth_token)
                return entry.oauth_token;
        }
    }
    catch {
        // File not found or parse error — not authenticated via Copilot
    }
    return undefined;
};
const obtainCopilotApiToken = async (oauthToken) => {
    // Return cached token if still valid (with 60s buffer)
    if (cachedCopilotToken && cachedCopilotToken.expiresAt > Date.now() / 1000 + 60) {
        return cachedCopilotToken;
    }
    const ghecHost = process.env.COPILOT_GHEC_HOST;
    const tokenUrl = ghecHost
        ? `https://${ghecHost}/api/v3/copilot_internal/v2/token`
        : 'https://api.github.com/copilot_internal/v2/token';
    try {
        const response = await fetch(tokenUrl, {
            method: 'GET',
            headers: {
                Authorization: `token ${oauthToken}`,
                Accept: 'application/json',
                'User-Agent': 'UX-Review-MCP/1.0.0'
            }
        });
        if (!response.ok) {
            return null;
        }
        const data = (await response.json());
        if (!data.token)
            return null;
        cachedCopilotToken = {
            token: data.token,
            expiresAt: data.expires_at ?? 0,
            apiEndpoint: data.endpoints?.api ?? 'https://api.githubcopilot.com'
        };
        return cachedCopilotToken;
    }
    catch {
        return null;
    }
};
// --- Provider chain ---
const getProviderChain = () => {
    const providers = [];
    const ghcpToken = process.env.GHCP_TOKEN ?? process.env.GITHUB_TOKEN;
    if (ghcpToken) {
        providers.push(openAiCompatibleProvider({
            provider: 'ghcp',
            model: process.env.GHCP_MODEL ?? 'claude-opus-4.6',
            baseUrl: process.env.GHCP_BASE_URL ?? 'https://models.inference.ai.azure.com',
            apiKey: ghcpToken
        }));
    }
    const glmToken = process.env.GLM_API_KEY;
    const glmBaseUrl = process.env.GLM_BASE_URL;
    if (glmToken && glmBaseUrl) {
        providers.push(openAiCompatibleProvider({
            provider: 'glm',
            model: process.env.GLM_MODEL ?? 'glm-5-preview',
            baseUrl: glmBaseUrl,
            apiKey: glmToken
        }));
    }
    return providers;
};
/**
 * Gets the provider chain, attempting Copilot token resolution if no env tokens are set.
 */
const getProviderChainWithCopilot = async () => {
    const chain = getProviderChain();
    if (chain.length > 0)
        return chain;
    // No env tokens — try resolving from Copilot stored credentials
    const oauthToken = readCopilotOAuthToken();
    if (!oauthToken)
        return chain;
    const apiToken = await obtainCopilotApiToken(oauthToken);
    if (!apiToken)
        return chain;
    chain.push(openAiCompatibleProvider({
        provider: 'ghcp',
        model: process.env.GHCP_MODEL ?? 'claude-opus-4.6',
        baseUrl: apiToken.apiEndpoint,
        apiKey: apiToken.token,
        extraHeaders: COPILOT_HEADERS
    }));
    return chain;
};
const toParameterLabel = (parameter) => parameter.replace(/_/g, ' ');
const buildSummaryPrompt = (scoring, designData) => {
    const parts = [
        'You are a world-class UX design critic. Create an executive summary that surfaces NON-OBVIOUS insights about this design.',
        '',
        'Return JSON: {"executiveSummary": string, "topRisks": string[]}',
        '',
        'Guidelines:',
        '- Executive summary (150-200 words): Go beyond restating scores. Identify the SYSTEMIC theme — what underlying pattern connects the issues? Is there a mental model mismatch? A structural problem? A missing design principle?',
        '- Top risks (max 5): Each risk must explain the REAL-WORLD CONSEQUENCE, not just the problem. "Users will abandon X because Y" not "X needs improvement."',
        '- Be the reviewer who makes the designer say "I never thought of it that way."',
        ''
    ];
    // Include actual design data if available
    if (designData) {
        const formatted = formatDesignDataForPrompt(designData);
        if (formatted) {
            parts.push('ACTUAL DESIGN CONTENT (from Figma/source):');
            parts.push(formatted);
            parts.push('');
            parts.push('USE the above design data to make your analysis SPECIFIC to this design. Reference actual component names, text labels, colors, and layout patterns you see.');
            parts.push('');
        }
    }
    parts.push(`Overall alignment: ${scoring.overallAlignmentPct}%`, `Scores: ${JSON.stringify(scoring.scores)}`, `High-priority issues: ${JSON.stringify(scoring.issues
        .filter(issue => issue.severity === 'critical' || issue.severity === 'high')
        .slice(0, 10))}`, `All evidence: ${JSON.stringify(scoring.evidence.slice(0, 15))}`);
    return parts.join('\n');
};
const buildParameterPrompt = (parameter, scoring, designData) => {
    const score = scoring.scores.find(item => item.parameter === parameter);
    const evidence = scoring.evidence.filter(item => item.parameter === parameter).slice(0, 12);
    const issues = scoring.issues.filter(item => item.parameter === parameter).slice(0, 8);
    const parts = [
        `You are a world-class UX expert. Provide a detailed, insight-rich review for: ${toParameterLabel(parameter)}.`,
        '',
        'Return JSON:',
        '{"commentary": string, "strengths": string[], "issueDetails": [{"problem": string, "impact": string, "fix": string}]}',
        '',
        'QUALITY STANDARDS — your output should make designers say "why didn\'t I think of that?":',
        '',
        '- commentary (200-300 words): Go DEEP. Don\'t just describe the current state — explain WHY it matters from a user psychology perspective. Connect observations to cognitive principles (Hick\'s law, Fitts\' law, cognitive load theory, Gestalt principles, progressive disclosure). Identify the SYSTEMIC issue behind surface symptoms. What would a 10x version of this criterion look like?',
        '',
        '- strengths (2-4 items): Be SPECIFIC about what works and WHY it works psychologically. Not "good use of hierarchy" but "the visual weight progression (bold title → medium subtitle → regular body) creates a clear reading path that reduces cognitive scanning effort by ~40%."',
        '',
        '- issueDetails: For each issue:',
        '  - problem: Describe what\'s actually happening in the design (specific, observable)',
        '  - impact: Explain the USER CONSEQUENCE using behavioral language. How does this affect task completion, decision-making, trust, or emotional state? Reference specific scenarios.',
        '  - fix: Be PRESCRIPTIVE and SPECIFIC. Not "improve contrast" but "increase the CTA button text to 16px semi-bold white (#FFFFFF) on the primary blue (#0066CC) to achieve WCAG AAA (7:1 ratio), and add 4px letter-spacing for improved scanability." The designer should be able to implement this without asking follow-up questions.',
        '',
        '- Reference UX principles (Fitts\' law, progressive disclosure, recognition over recall, error prevention, flexibility & efficiency) ONLY when they genuinely illuminate the issue.',
        '- Consider edge cases: first-time users, power users, interrupted flows, error recovery, accessibility needs.',
        '- Think about what the BEST version of this design would do differently.',
        ''
    ];
    // Include relevant design data for this parameter
    if (designData) {
        const paramDesignContext = getDesignDataForParameter(parameter, designData);
        if (paramDesignContext) {
            parts.push('ACTUAL DESIGN CONTENT (reference these specific elements in your analysis):');
            parts.push(paramDesignContext);
            parts.push('');
        }
    }
    parts.push(`Score: ${JSON.stringify(score)}`, `Evidence: ${JSON.stringify(evidence)}`, `Issues: ${JSON.stringify(issues)}`);
    return parts.join('\n');
};
/** Get relevant design data subset for a specific parameter */
const getDesignDataForParameter = (parameter, data) => {
    const sections = [];
    switch (parameter) {
        case 'user_flow_interaction':
            if (data.frameNames.length > 0)
                sections.push(`Frames/Screens: ${data.frameNames.slice(0, 8).join(', ')}`);
            if (data.interactions.length > 0)
                sections.push(`Interactions: ${data.interactions.slice(0, 5).join('; ')}`);
            if (data.textContent.length > 0)
                sections.push(`CTA/Action text: ${data.textContent.filter(t => t.length < 30).slice(0, 8).map(t => `"${t}"`).join(', ')}`);
            break;
        case 'visual_hierarchy_layout':
            if (data.layout.length > 0)
                sections.push(`Layout: ${data.layout.slice(0, 6).join('; ')}`);
            if (data.typography.length > 0)
                sections.push(`Typography: ${data.typography.slice(0, 6).join(', ')}`);
            if (data.colors.length > 0)
                sections.push(`Colors: ${data.colors.slice(0, 6).join(', ')}`);
            break;
        case 'design_system_consistency':
            if (data.components.length > 0)
                sections.push(`Components used: ${data.components.slice(0, 12).join(', ')}`);
            if (data.tokens.length > 0)
                sections.push(`Tokens: ${data.tokens.slice(0, 8).join(', ')}`);
            break;
        case 'accessibility_wcag':
            if (data.colors.length > 0)
                sections.push(`Colors (check contrast): ${data.colors.slice(0, 6).join(', ')}`);
            if (data.typography.length > 0)
                sections.push(`Font sizes (check readability): ${data.typography.slice(0, 4).join(', ')}`);
            if (data.textContent.length > 0)
                sections.push(`Labels (check clarity): ${data.textContent.slice(0, 6).map(t => `"${t}"`).join(', ')}`);
            break;
        case 'content_information_architecture':
            if (data.textContent.length > 0)
                sections.push(`Content/Labels: ${data.textContent.slice(0, 10).map(t => `"${t}"`).join(', ')}`);
            if (data.frameNames.length > 0)
                sections.push(`Sections: ${data.frameNames.slice(0, 6).join(', ')}`);
            if (data.hierarchy.length > 0)
                sections.push(`Hierarchy: ${data.hierarchy.slice(0, 8).join(' > ')}`);
            break;
        case 'technical_feasibility':
            if (data.components.length > 0)
                sections.push(`Components: ${data.components.slice(0, 8).join(', ')}`);
            if (data.layout.length > 0)
                sections.push(`Layout complexity: ${data.layout.slice(0, 4).join('; ')}`);
            if (data.interactions.length > 0)
                sections.push(`Interactions to implement: ${data.interactions.slice(0, 4).join('; ')}`);
            break;
        case 'brand_design_quality':
            if (data.colors.length > 0)
                sections.push(`Brand colors: ${data.colors.slice(0, 6).join(', ')}`);
            if (data.typography.length > 0)
                sections.push(`Typography: ${data.typography.slice(0, 4).join(', ')}`);
            if (data.tokens.length > 0)
                sections.push(`Brand tokens: ${data.tokens.filter(t => t.toLowerCase().includes('brand') || t.toLowerCase().includes('color')).slice(0, 4).join(', ')}`);
            break;
    }
    return sections.length > 0 ? sections.join('\n') : null;
};
const deterministicNarrativeFallback = (scoring, durationMs) => {
    const byParameter = Object.fromEntries(PARAMETER_ORDER.map(parameter => {
        const score = scoring.scores.find(item => item.parameter === parameter);
        const highestSeverity = scoring.issues.find(item => item.parameter === parameter)?.severity ?? 'low';
        const text = `${toParameterLabel(parameter)} is at ${score?.alignmentPct ?? 0}% alignment with ${highestSeverity} priority gaps to address.`;
        return [parameter, text];
    }));
    const reviewsByParameter = Object.fromEntries(PARAMETER_ORDER.map(parameter => {
        const score = scoring.scores.find(item => item.parameter === parameter);
        const paramIssues = scoring.issues.filter(item => item.parameter === parameter);
        const review = {
            commentary: `${toParameterLabel(parameter)} scores ${score?.alignmentPct ?? 0}% alignment. ${paramIssues.length} issue(s) identified. LLM provider was unavailable for detailed analysis.`,
            strengths: [],
            issueDetails: paramIssues.map(issue => ({
                problem: issue.title,
                impact: `Severity: ${issue.severity}`,
                fix: issue.recommendation
            }))
        };
        return [parameter, review];
    }));
    return {
        executiveSummary: `Deterministic review completed with ${scoring.overallAlignmentPct}% overall alignment. ` +
            'Narrative provider was unavailable, so this summary is generated from scoring signals only.',
        topRisks: scoring.issues
            .filter(issue => issue.severity === 'critical' || issue.severity === 'high')
            .slice(0, 5)
            .map(issue => `${issue.title}: ${issue.recommendation}`),
        parameterCommentary: byParameter,
        parameterReviews: reviewsByParameter,
        provider: {
            provider: 'none',
            model: 'deterministic-only',
            fallbackUsed: false,
            generationTimeMs: durationMs
        }
    };
};
export const generateNarrative = async (scoring, debug = false, designData) => {
    const startedAt = Date.now();
    const providers = await getProviderChainWithCopilot();
    if (providers.length === 0) {
        return deterministicNarrativeFallback(scoring, Date.now() - startedAt);
    }
    let lastError;
    for (let i = 0; i < providers.length; i += 1) {
        const provider = providers[i];
        const fallbackUsed = i > 0;
        try {
            if (debug) {
                console.error(`[LLM] trying provider=${provider.provider} model=${provider.model}`);
            }
            const summary = await retry(() => provider.callJson(buildSummaryPrompt(scoring, designData)), DEFAULT_RETRIES);
            const commentaryPairs = await Promise.all(PARAMETER_ORDER.map(async (parameter) => {
                const payload = await retry(() => provider.callJson(buildParameterPrompt(parameter, scoring, designData)), DEFAULT_RETRIES);
                const review = {
                    commentary: payload.commentary,
                    strengths: payload.strengths ?? [],
                    issueDetails: payload.issueDetails ?? []
                };
                return [parameter, review];
            }));
            const parameterCommentary = Object.fromEntries(commentaryPairs.map(([p, r]) => [p, r.commentary]));
            const parameterReviews = Object.fromEntries(commentaryPairs);
            return {
                executiveSummary: summary.executiveSummary,
                topRisks: summary.topRisks.slice(0, 5),
                parameterCommentary,
                parameterReviews,
                provider: {
                    provider: provider.provider,
                    model: provider.model,
                    fallbackUsed,
                    generationTimeMs: Date.now() - startedAt
                }
            };
        }
        catch (error) {
            lastError = error;
            if (debug) {
                const msg = error instanceof Error ? error.message : String(error);
                console.error(`[LLM] provider ${provider.provider} failed: ${msg}`);
            }
        }
    }
    if (debug && lastError) {
        const msg = lastError instanceof Error ? lastError.message : String(lastError);
        console.error(`[LLM] all providers failed, using deterministic fallback: ${msg}`);
    }
    return deterministicNarrativeFallback(scoring, Date.now() - startedAt);
};
// --- Perspective Report Generation (LLM-powered rich reports) ---
const PERSPECTIVE_SYSTEM_PROMPTS = {
    review: `You are a world-class UX design critic — the kind who makes designers say "why didn't I think of that?" You produce reviews that are genuinely insightful, not just checklists.

Your expertise spans cognitive psychology, behavioral economics, interaction design, visual perception, and systems thinking. You see what others miss.

Write in a direct, authoritative tone. Be specific about what you observe.

QUALITY STANDARDS:
- Every insight must be NON-OBVIOUS. Skip things any junior designer would catch.
- Connect design decisions to user psychology: mental models, cognitive load, decision fatigue, habit formation, error recovery patterns.
- Identify SYSTEMIC issues, not just surface problems. A button color is a symptom — the real issue might be unclear information hierarchy or competing calls-to-action.
- Reference established principles (Hick's law, progressive disclosure, recognition over recall, Gestalt proximity, Miller's 7±2) but only when they genuinely illuminate the issue.
- Point out MISSED OPPORTUNITIES — things the design could do but doesn't. What would a 10x version look like?
- Consider the user's emotional journey, not just task completion. Where might they feel confused, frustrated, or delighted?
- Think about edge cases that break the mental model: first-time users, power users, error states, interrupted flows, accessibility needs.

Your report MUST include these sections:
1. Design Intent vs Reality — What the design is trying to achieve vs what it actually communicates. Identify the gap.
2. Cognitive Load Analysis — Where the user's working memory is being overtaxed. Which decisions could be eliminated or deferred?
3. Information Architecture & Flow — Is the navigation model discoverable? Does it match the user's mental model or force them to learn yours?
4. Visual Hierarchy & Attention — What does the eye see first, second, third? Is that the right priority?
5. Interaction Design & Micro-behaviors — What happens between clicks? Hover states, loading, transitions, feedback loops.
6. Design System Compliance (table with PASS/FAIL status + why it matters)
7. The Insight Others Miss — Your single most non-obvious, high-impact observation about this design.
8. Strategic Recommendations — Categorized by effort/impact. Include "what would a 10x version do?"
9. Risk Matrix (table: risk, likelihood, impact, mitigation)
10. Verdict — Would a user recommend this experience to a colleague? Why or why not?

Never be generic. Every word must be earned by something specific in THIS design.`,
    challenge: `You are a ruthlessly honest UX strategist who sees through design theater. Your job is to find the uncomfortable truths — the assumptions nobody questioned, the scenarios nobody tested, the users nobody considered.

You think like a product PM who's seen designs fail in production. You've watched beautiful mockups die on contact with real users. You know the difference between "looks good in a prototype" and "works in the wild."

QUALITY STANDARDS:
- Challenge the PROBLEM FRAMING first. Is this solving the right problem? Or is it a solution looking for a problem?
- Identify cognitive biases in the design team's thinking: anchoring to first solution, survivorship bias in user research, confirmation bias in testing.
- Ask "what happens when..." questions that expose fragility: What if the user's context changes mid-task? What if they have 500 items instead of 5? What if they're interrupted?
- Distinguish between COSMETIC problems (easy to fix) and STRUCTURAL problems (require rethinking the approach).
- For each challenge, explain the REAL-WORLD CONSEQUENCE if not addressed. Not "this might confuse users" but "users will abandon at this step because X."
- Think about second-order effects: If users learn this pattern here, what happens when they encounter it differently elsewhere in the product?

Structure your report:
1. The Uncomfortable Truth — The single biggest assumption this design makes that hasn't been validated. Why it's risky.
2. Problem-Solution Fit — Is this the minimum viable design for the actual problem? Or is it over-designed for the stated need / under-designed for the real need?
3. Assumption Stress Test — Table: assumption, what if wrong, consequence, validation needed
4. Scenario Fragility — Walk through 3 realistic scenarios where this design breaks (not just edge cases — likely scenarios).
5. User Psychology Gaps — What does this design assume about user motivation, attention, and expertise that may not hold?
6. The "Ship It" Risk List — If this shipped tomorrow, what would the support tickets say?
7. Strategic Challenges — Categorized: "Must Address Before Proceeding", "Should Address", "Acceptable Risk"
8. Risk Matrix — Table: risk, likelihood, impact, mitigation
9. Challenge Verdict — BLOCK / PROCEED WITH CONDITIONS / APPROVE with clear reasoning
10. Constructive Path Forward — Specific experiments or changes that would de-risk the concerns

Be the voice designers need to hear, not the one they want to hear. But always be constructive — every challenge comes with a path forward.`,
    improve: `You are a design craft master — the senior designer other designers bring their work to when they want to level up. You see the 20% of changes that create 80% of the improvement.

You think in terms of design leverage: what single change would cascade into multiple improvements? You understand that great design isn't about adding — it's often about removing, simplifying, and clarifying.

QUALITY STANDARDS:
- Prioritize LEVERAGE: improvements that fix multiple problems at once (e.g., better information hierarchy fixes both scannability AND accessibility).
- Be PRESCRIPTIVE, not descriptive. Don't say "improve the hierarchy" — say "make the primary action 16px semibold, demote secondary actions to 14px regular, and increase whitespace between action groups from 8px to 24px."
- Think in terms of DESIGN PATTERNS, not individual screens. If a pattern is wrong, fix it once at the system level.
- Consider the EMOTIONAL arc: where should the user feel confident? Guided? In control? Delighted?
- Include microcopy improvements with exact text — designers struggle with words more than they admit.
- For every improvement, paint the BEFORE and AFTER clearly enough that a designer could implement it without asking questions.
- Think about what makes the difference between a "fine" design and one that gets featured in case studies.

Structure your report:
1. The Biggest Lever — The single highest-impact change. If they only do ONE thing, what transforms this design?
2. Critical Fixes (< 1 hour each) — Quick wins that dramatically improve perceived quality
3. Flow & Interaction Refinements — Specific micro-interaction improvements with exact descriptions
4. Visual Hierarchy & Composition — Precise spacing, sizing, weight, and color adjustments
5. Content & Microcopy Rewrites — Exact before/after text for key touchpoints. Include error messages, empty states, and CTAs.
6. Component Upgrades — Which components to swap and why (reference design system patterns)
7. Accessibility Quick Wins — Changes that improve accessibility AND visual design simultaneously
8. The "Delight Layer" — Small touches that make users smile: transitions, progressive disclosure, smart defaults, anticipatory design
9. Priority Matrix — Table: improvement, effort (hours), impact (1-5), leverage score
10. Implementation Sequence — What order to implement for maximum cumulative effect

For each improvement:
- NOW: What it looks like today (specific)
- AFTER: Exact change to make (implementable without clarification)
- WHY: The user psychology or design principle behind it
- PROOF: How to know it worked`,
    pitch: `You are a designer's secret weapon for stakeholder presentations. You've sat in hundreds of design reviews where great designs got killed by bad pitches, and mediocre designs got approved because someone told the right story.

You understand what stakeholders ACTUALLY care about (hint: it's not pixel-perfect spacing). They care about: Will users adopt this? Will it reduce support costs? Will it ship on time? Does it align with strategy? Can we measure success?

Your job is to arm the designer with:
1. The REASONING behind every design decision ("we chose X because research shows Y")
2. Preemptive answers to the questions stakeholders ALWAYS ask
3. Business language that connects design craft to outcomes they care about
4. Honest acknowledgment of tradeoffs (which builds credibility)

QUALITY STANDARDS:
- Frame every design decision as a DELIBERATE CHOICE with reasoning. Stakeholders respect intentionality.
- Translate UX principles into BUSINESS LANGUAGE: "progressive disclosure" becomes "reduces training time by surfacing only what's needed for each task"
- Anticipate the 5 objections designers always face: "Why can't we just...?", "Is this too complex?", "How do we know users want this?", "What about the edge case where...?", "Can we ship a simpler version first?"
- Include DATA POINTS wherever possible: industry benchmarks, competitor comparison, accessibility compliance percentages.
- Give the designer CONFIDENCE PHRASES they can use: "We considered X but chose Y because..." / "Our research indicates..." / "This aligns with [principle] which has been validated by..."
- Help them acknowledge uncertainty gracefully: "We've designed for the 80% case, and here's our plan for the remaining 20%."
- Make the designer feel PREPARED and CONFIDENT walking into the room.

Structure your report:
1. The 30-Second Story — If you had one elevator ride to explain this design, what would you say? (Include the problem, the insight, and why THIS solution)
2. Design Decision Log — Table: decision made, alternatives considered, why this choice, evidence/reasoning
3. "Why This Way" Arguments — For each major design choice, the reasoning a designer can use verbatim in a meeting
4. User Value Proposition — Concrete before/after scenarios showing user benefit (with time savings, error reduction, or satisfaction metrics)
5. Business Case — How this design connects to revenue, retention, support cost reduction, or competitive positioning
6. Design Quality Proof Points — Accessibility score, design system compliance, pattern consistency — things that prove craft
7. The Honest Tradeoffs — What was sacrificed and why (shows maturity, builds trust). For each: what, why, and the plan to address later.
8. Objection Defense Kit — Table: stakeholder concern, your response, supporting evidence. Include the 5 most likely pushbacks.
9. Risk & Mitigation — Acknowledge what could go wrong + concrete plan. Shows you've thought it through.
10. Success Criteria — Measurable outcomes. "We'll know this works when [metric] improves by [amount] within [timeframe]."
11. The Ask — What exactly you need from stakeholders (approval, resources, timeline) and what they get in return.
12. Confidence Phrases & Talking Points — Ready-to-use sentences for the design review meeting.

Tone: Confident but not arrogant. Prepared but not defensive. The designer should feel like they have a senior mentor whispering the perfect response in their ear during the review.`
};
const buildPerspectiveUserPrompt = (ctx) => {
    const parts = [];
    parts.push(`# Design Under Review`);
    parts.push(`Source: ${ctx.figmaUrl}`);
    parts.push('');
    if (ctx.problemStatement || ctx.prdText) {
        parts.push('## Product Context');
        if (ctx.problemStatement)
            parts.push(`Problem Statement: ${ctx.problemStatement}`);
        if (ctx.proposedSolution)
            parts.push(`Proposed Solution: ${ctx.proposedSolution}`);
        if (ctx.requirements && ctx.requirements.length > 0) {
            parts.push('Requirements:');
            for (const req of ctx.requirements)
                parts.push(`- ${req}`);
        }
        if (ctx.prdText) {
            parts.push('');
            parts.push('PRD/Requirements Text:');
            parts.push(ctx.prdText.slice(0, 3000));
        }
        parts.push('');
    }
    if (ctx.audience || ctx.businessGoal) {
        parts.push('## Pitch Context');
        if (ctx.audience)
            parts.push(`Target Audience: ${ctx.audience}`);
        if (ctx.businessGoal)
            parts.push(`Business Goal: ${ctx.businessGoal}`);
        parts.push('');
    }
    if (ctx.knowledgeContext) {
        parts.push('## Relevant Knowledge Context');
        if (ctx.knowledgeContext.userId)
            parts.push(`User ID: ${ctx.knowledgeContext.userId}`);
        if (ctx.knowledgeContext.projectId !== undefined)
            parts.push(`Project ID: ${ctx.knowledgeContext.projectId}`);
        if (ctx.knowledgeContext.sessionId)
            parts.push(`Session ID: ${ctx.knowledgeContext.sessionId}`);
        if (Array.isArray(ctx.knowledgeContext.items) && ctx.knowledgeContext.items.length > 0) {
            parts.push('Knowledge items:');
            for (const item of ctx.knowledgeContext.items.slice(0, 12)) {
                const tags = item.tags.length > 0 ? ` | tags=${item.tags.join(', ')}` : '';
                parts.push(`- [${item.scope}/${item.priority}/${item.confidence}] ${item.category}: ${item.summary} (${item.knowledgeKey})${tags}${item.source ? ` | source=${item.source}` : ''}`);
            }
        }
        if (Array.isArray(ctx.knowledgeContext.relationships) && ctx.knowledgeContext.relationships.length > 0) {
            parts.push('Knowledge relationships:');
            for (const relationship of ctx.knowledgeContext.relationships.slice(0, 12)) {
                parts.push(`- ${relationship.fromKnowledgeKey} --${relationship.relationshipType}--> ${relationship.toKnowledgeKey}${relationship.note ? ` | ${relationship.note}` : ''}`);
            }
        }
        parts.push('');
    }
    if (ctx.memoryContext) {
        parts.push('## Relevant Memory Context');
        const pushMemoryBlock = (label, entries) => {
            if (!entries || entries.length === 0)
                return;
            parts.push(`${label}:`);
            for (const entry of entries.slice(0, 8)) {
                const content = typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content);
                parts.push(`- ${entry.memoryKey} [${entry.entryType}]${entry.tags.length > 0 ? ` tags=${entry.tags.join(', ')}` : ''}: ${content.slice(0, 500)}`);
            }
        };
        pushMemoryBlock('Session memory', ctx.memoryContext.session);
        pushMemoryBlock('User memory', ctx.memoryContext.user);
        pushMemoryBlock('Project memory', ctx.memoryContext.project);
        parts.push('');
    }
    // Designer's own rationale (pitch mode)
    if (ctx.designDecisions && ctx.designDecisions.length > 0) {
        parts.push('## Designer Rationale');
        parts.push('These are the decisions the designer made and wants to defend:');
        for (const decision of ctx.designDecisions)
            parts.push(`- ${decision}`);
        parts.push('');
    }
    if (ctx.constraints && ctx.constraints.length > 0) {
        parts.push('## Design Constraints');
        for (const constraint of ctx.constraints)
            parts.push(`- ${constraint}`);
        parts.push('');
    }
    if (ctx.alternativesConsidered && ctx.alternativesConsidered.length > 0) {
        parts.push('## Alternatives Considered & Rejected');
        for (const alt of ctx.alternativesConsidered)
            parts.push(`- ${alt}`);
        parts.push('');
    }
    if (ctx.userResearch) {
        parts.push('## User Research / Data');
        parts.push(ctx.userResearch.slice(0, 2000));
        parts.push('');
    }
    // Include actual design data extracted from source
    if (ctx.designData) {
        const formatted = formatDesignDataForPrompt(ctx.designData);
        if (formatted) {
            parts.push('## Actual Design Content (from source)');
            parts.push(formatted);
            parts.push('');
        }
    }
    // Historical comparison data
    if (ctx.previousReview) {
        parts.push('## Comparison with Previous Review');
        const delta = (ctx.detail?.overallAlignmentPct ?? 0) - ctx.previousReview.overallAlignmentPct;
        parts.push(`Previous Overall: ${ctx.previousReview.overallAlignmentPct}% → Current: ${ctx.detail?.overallAlignmentPct ?? 'N/A'}% (${delta >= 0 ? '+' : ''}${delta}%)`);
        if (ctx.previousReview.scores) {
            parts.push('Parameter changes:');
            for (const prev of ctx.previousReview.scores) {
                const current = (ctx.detail?.sections ?? []).find((s) => s.parameter === prev.parameter);
                if (current) {
                    const d = current.alignmentPct - prev.alignmentPct;
                    if (d !== 0)
                        parts.push(`- ${prev.parameter.replace(/_/g, ' ')}: ${prev.alignmentPct}% → ${current.alignmentPct}% (${d >= 0 ? '+' : ''}${d}%)`);
                }
            }
        }
        parts.push('');
    }
    // Include scoring data
    if (ctx.detail) {
        parts.push('## Scoring Data');
        if (ctx.detail.overallAlignmentPct !== undefined) {
            parts.push(`Overall Alignment: ${ctx.detail.overallAlignmentPct}%`);
        }
        if (ctx.detail.executiveSummary) {
            parts.push(`Summary: ${ctx.detail.executiveSummary}`);
        }
        if (Array.isArray(ctx.detail.sections)) {
            parts.push('');
            parts.push('### Parameter Scores');
            for (const section of ctx.detail.sections) {
                parts.push(`- ${section.parameter}: ${section.alignmentPct}% (${section.score}/5)`);
                if (section.summary)
                    parts.push(`  Summary: ${section.summary}`);
                if (section.narrative && section.narrative !== section.summary) {
                    parts.push(`  Detail: ${section.narrative}`);
                }
                if (Array.isArray(section.issues)) {
                    for (const issue of section.issues.slice(0, 3)) {
                        parts.push(`  Issue [${issue.severity}]: ${issue.title}`);
                        if (issue.evidence)
                            parts.push(`    Evidence: ${issue.evidence}`);
                        if (issue.recommendation)
                            parts.push(`    Recommendation: ${issue.recommendation}`);
                    }
                }
            }
        }
        if (Array.isArray(ctx.detail.topRisks) && ctx.detail.topRisks.length > 0) {
            parts.push('');
            parts.push('### Top Risks');
            for (const risk of ctx.detail.topRisks)
                parts.push(`- ${risk}`);
        }
    }
    // Strategic artifacts
    if (ctx.strategicArtifacts) {
        const sa = ctx.strategicArtifacts;
        if (Array.isArray(sa.challengePrompts) && sa.challengePrompts.length > 0) {
            parts.push('');
            parts.push('### Challenge Prompts');
            for (const p of sa.challengePrompts)
                parts.push(`- ${p}`);
        }
        if (Array.isArray(sa.flowIaHints) && sa.flowIaHints.length > 0) {
            parts.push('');
            parts.push('### Flow & IA Hints');
            for (const h of sa.flowIaHints)
                parts.push(`- ${h}`);
        }
        if (sa.flowIaStructure) {
            parts.push('');
            parts.push('### Flow Structure');
            if (Array.isArray(sa.flowIaStructure.nodes)) {
                parts.push('Nodes: ' + sa.flowIaStructure.nodes.map((n) => `${n.id}[${n.kind}]`).join(', '));
            }
            if (Array.isArray(sa.flowIaStructure.edges)) {
                parts.push('Edges: ' + sa.flowIaStructure.edges.map((e) => `${e.from}->${e.to}: ${e.label}`).join('; '));
            }
            if (Array.isArray(sa.flowIaStructure.designHints)) {
                for (const h of sa.flowIaStructure.designHints)
                    parts.push(`- Hint: ${h}`);
            }
        }
        if (Array.isArray(sa.edgeCaseFindings) && sa.edgeCaseFindings.length > 0) {
            parts.push('');
            parts.push('### Edge-Case Findings');
            for (const f of sa.edgeCaseFindings) {
                parts.push(`- [${f.severity}] ${f.parameter}: ${f.evidence} → ${f.recommendation}`);
            }
        }
        if (sa.persuasionPack) {
            parts.push('');
            parts.push('### Persuasion Pack');
            if (sa.persuasionPack.positioning)
                parts.push(`Positioning: ${sa.persuasionPack.positioning}`);
            if (Array.isArray(sa.persuasionPack.valuePoints)) {
                for (const v of sa.persuasionPack.valuePoints)
                    parts.push(`- Value: ${v}`);
            }
            if (Array.isArray(sa.persuasionPack.objectionHandlers)) {
                for (const o of sa.persuasionPack.objectionHandlers)
                    parts.push(`- Objection: ${o}`);
            }
        }
        if (sa.improvementPack) {
            parts.push('');
            parts.push('### Improvement Pack');
            if (Array.isArray(sa.improvementPack.priorityFixes)) {
                for (const f of sa.improvementPack.priorityFixes)
                    parts.push(`- Fix: ${f}`);
            }
            if (Array.isArray(sa.improvementPack.edgeCaseChecks)) {
                for (const c of sa.improvementPack.edgeCaseChecks)
                    parts.push(`- Check: ${c}`);
            }
        }
    }
    // Design system findings
    if (ctx.designSystemFindings) {
        const dsf = ctx.designSystemFindings;
        if (Array.isArray(dsf.componentFindings) && dsf.componentFindings.length > 0) {
            parts.push('');
            parts.push('### Design System Component Findings');
            for (const c of dsf.componentFindings.slice(0, 10)) {
                parts.push(`- ${c.componentName} (${c.category}): match=${Math.round((c.matchScore ?? 0) * 100)}% — ${c.description ?? ''}`);
            }
        }
        if (Array.isArray(dsf.iconFindings) && dsf.iconFindings.length > 0) {
            parts.push('');
            parts.push('### Icon Findings');
            for (const i of dsf.iconFindings.slice(0, 5)) {
                parts.push(`- ${i.iconName}: ${i.description ?? 'found'}`);
            }
        }
    }
    // Include base report for full context (truncated)
    if (ctx.baseReport) {
        parts.push('');
        parts.push('## Full Base Review Report (for reference)');
        parts.push(ctx.baseReport.slice(0, 4000));
    }
    parts.push('');
    parts.push(`## Task`);
    parts.push(`Generate a comprehensive ${ctx.mode.toUpperCase()} report for this design.`);
    parts.push('Use the scoring data and evidence above as input signals, but produce rich, contextual, design-specific insights.');
    parts.push('Reference specific UI elements, patterns, and decisions you can infer from the data.');
    parts.push('Do NOT just restate the scoring data — interpret it and provide expert-level analysis that makes designers say "why didn\'t I think of that?"');
    parts.push('Every observation must connect to USER PSYCHOLOGY or BUSINESS OUTCOMES — never generic advice.');
    parts.push('Be SPECIFIC and PRESCRIPTIVE. A designer should be able to act on every point without asking clarifying questions.');
    // Mode-specific task guidance
    if (ctx.mode === 'pitch') {
        parts.push('');
        parts.push('PITCH-SPECIFIC GUIDANCE:');
        parts.push('- Frame this as if you are preparing the designer to walk into a stakeholder review meeting.');
        parts.push('- Include the REASONING behind design decisions (why this approach vs alternatives).');
        parts.push('- Translate design craft into business language that resonates with leadership.');
        parts.push('- Provide ready-to-use talking points and responses to likely objections.');
        parts.push('- Help the designer feel CONFIDENT and PREPARED to defend their work.');
        parts.push('- Acknowledge tradeoffs honestly — this builds credibility with stakeholders.');
        if (ctx.designDecisions && ctx.designDecisions.length > 0) {
            parts.push('- The designer has provided their own decision rationale above. BUILD ON IT — strengthen their arguments with evidence, not replace them.');
        }
        if (ctx.audience) {
            parts.push('');
            parts.push(`AUDIENCE-SPECIFIC FRAMING (${ctx.audience}):`);
            const audienceLower = ctx.audience.toLowerCase();
            if (audienceLower.includes('engineer') || audienceLower.includes('dev')) {
                parts.push('- Focus on: implementation feasibility, component reuse, performance implications, design system alignment');
                parts.push('- Language: technical trade-offs, API considerations, state management, responsive behavior specs');
                parts.push('- They care about: "Can I build this?" and "Is this over-designed for the use case?"');
            }
            else if (audienceLower.includes('pm') || audienceLower.includes('product')) {
                parts.push('- Focus on: user value, metric impact, requirement coverage, roadmap alignment, competitive positioning');
                parts.push('- Language: user stories, OKR alignment, success metrics, adoption risk, time-to-value');
                parts.push('- They care about: "Will users adopt this?" and "Does it move our metrics?"');
            }
            else if (audienceLower.includes('leadership') || audienceLower.includes('exec') || audienceLower.includes('vp') || audienceLower.includes('c-level')) {
                parts.push('- Focus on: business impact, strategic alignment, competitive advantage, risk mitigation, ROI');
                parts.push('- Language: revenue impact, customer retention, market positioning, operational efficiency');
                parts.push('- They care about: "Why should we invest in this?" and "What\'s the business case?"');
            }
            else if (audienceLower.includes('design') || audienceLower.includes('ux')) {
                parts.push('- Focus on: craft quality, system contribution, user research backing, innovation, pattern contribution');
                parts.push('- Language: design principles, user psychology, system thinking, accessibility maturity, design debt');
                parts.push('- They care about: "Is this raising our design bar?" and "Does it contribute to our system?"');
            }
        }
    }
    if (ctx.mode === 'challenge') {
        parts.push('');
        parts.push('CHALLENGE-SPECIFIC GUIDANCE:');
        parts.push('- Focus on UNVALIDATED ASSUMPTIONS and scenarios nobody tested.');
        parts.push('- Think about what happens at scale (500 items, not 5), under stress (slow network, interruptions), and with diverse users.');
        parts.push('- Distinguish cosmetic issues from STRUCTURAL problems that require rethinking.');
        if (ctx.previousReview) {
            parts.push('- A previous review is available for comparison. Call out whether identified issues are NEW or PERSISTING.');
        }
    }
    if (ctx.mode === 'improve') {
        parts.push('');
        parts.push('IMPROVE-SPECIFIC GUIDANCE:');
        parts.push('- Prioritize LEVERAGE: changes that fix multiple problems at once.');
        parts.push('- Be PRESCRIPTIVE: exact pixel values, color codes, spacing, font sizes.');
        parts.push('- Include microcopy suggestions with exact text.');
        parts.push('- Think in implementation order: what to do first for maximum cumulative effect.');
    }
    // All modes get actionable next steps
    parts.push('');
    parts.push('REQUIRED: End your report with a "## Next Steps" section containing 3-5 concrete, immediately actionable items the designer should do NEXT. Each must be specific enough to act on without further clarification. Format as a numbered list with estimated effort.');
    parts.push('Write the full report in markdown format.');
    return parts.join('\n');
};
export const generatePerspectiveReport = async (ctx, debug = false) => {
    const startedAt = Date.now();
    const providers = await getProviderChainWithCopilot();
    if (providers.length === 0) {
        return {
            markdown: '',
            provider: {
                provider: 'none',
                model: 'deterministic-only',
                fallbackUsed: false,
                generationTimeMs: Date.now() - startedAt
            }
        };
    }
    const systemPrompt = PERSPECTIVE_SYSTEM_PROMPTS[ctx.mode];
    const userPrompt = buildPerspectiveUserPrompt(ctx);
    let lastError;
    for (let i = 0; i < providers.length; i += 1) {
        const provider = providers[i];
        const fallbackUsed = i > 0;
        try {
            if (debug) {
                console.error(`[LLM-Perspective] trying provider=${provider.provider} model=${provider.model} mode=${ctx.mode}`);
            }
            const markdown = await retry(() => provider.callMarkdown(systemPrompt, userPrompt), DEFAULT_RETRIES);
            return {
                markdown,
                provider: {
                    provider: provider.provider,
                    model: provider.model,
                    fallbackUsed,
                    generationTimeMs: Date.now() - startedAt
                }
            };
        }
        catch (error) {
            lastError = error;
            if (debug) {
                const msg = error instanceof Error ? error.message : String(error);
                console.error(`[LLM-Perspective] provider ${provider.provider} failed: ${msg}`);
            }
        }
    }
    if (debug && lastError) {
        const msg = lastError instanceof Error ? lastError.message : String(lastError);
        console.error(`[LLM-Perspective] all providers failed: ${msg}`);
    }
    return {
        markdown: '',
        provider: {
            provider: 'none',
            model: 'deterministic-only',
            fallbackUsed: false,
            generationTimeMs: Date.now() - startedAt
        }
    };
};
