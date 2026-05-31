const normalizeRequirements = (requirements) => {
    if (!requirements || requirements.length === 0) {
        return undefined;
    }
    const deduped = Array.from(new Set(requirements.map(item => item.trim()).filter(item => item.length > 0)));
    return deduped.length > 0 ? deduped : undefined;
};
export const ingestBriefContext = (request) => {
    const problemStatement = request.problemStatement?.trim() || undefined;
    const proposedSolution = request.proposedSolution?.trim() || undefined;
    const requirements = normalizeRequirements(request.requirements);
    return {
        strategicContext: {
            problemStatement,
            proposedSolution,
            requirements
        },
        summary: {
            hasProblemStatement: !!problemStatement,
            hasProposedSolution: !!proposedSolution,
            requirementsCount: requirements?.length ?? 0
        }
    };
};
