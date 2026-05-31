export type ReviewStage = 'queued' | 'fetching_input' | 'querying_design_system' | 'scoring' | 'generating_narrative' | 'building_report' | 'completed' | 'failed';
export declare const STAGE_MESSAGE: Record<ReviewStage, string>;
