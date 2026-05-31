export type DesignSystemMode = 'generic' | 'external' | 'custom' | 'none';
export interface DesignSystemConfig {
    mode: DesignSystemMode;
    customGuidelinePath?: string;
    enableExternalMcp?: boolean;
}
export declare const parseDesignSystemMode: (value: string | undefined) => DesignSystemMode;
/**
 * Load design system configuration from environment or defaults.
 */
export declare const loadDesignSystemConfig: () => DesignSystemConfig;
