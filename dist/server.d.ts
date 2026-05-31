export declare class UxReviewServer {
    private server;
    private storage;
    private hasDebugFlag;
    private closing;
    constructor(hasDebugFlag?: boolean);
    private shutdown;
    private getDesignDataForRun;
    private readOutputRefContent;
    private runReviewInputFromArgs;
    private persistAnalysisContext;
    private runAnalysisFromArgs;
    private getEnrichedContextForRun;
    private storeKnowledgeContext;
    private listKnowledgeContext;
    private storeMemoryContext;
    private listMemoryContext;
    private buildPerspectiveFromRun;
    private setupToolHandlers;
    run(): Promise<void>;
}
