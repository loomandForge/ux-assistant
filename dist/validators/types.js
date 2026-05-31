export const severityFromPriority = (priority) => {
    if (priority === 'critical')
        return 'critical';
    if (priority === 'high')
        return 'high';
    if (priority === 'low')
        return 'low';
    return 'medium';
};
