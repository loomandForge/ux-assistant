export interface DesignSystemComponentSearchResult {
    componentName: string;
    category: string;
    description: string;
    matchScore: number;
}
export interface DesignSystemIconSearchResult {
    name: string;
    tags: string[];
    category: string;
}
/**
 * Search for component definitions in an external design system via MCP.
 */
export declare const searchDesignSystemComponents: (query: string, debug?: boolean) => Promise<DesignSystemComponentSearchResult[]>;
/**
 * Search for icons in an external design system via MCP.
 */
export declare const searchDesignSystemIcons: (query: string, debug?: boolean) => Promise<DesignSystemIconSearchResult[]>;
export type ElementSearchResult = DesignSystemComponentSearchResult;
export type ElementIconResult = DesignSystemIconSearchResult;
export declare const searchElementComponents: (query: string, debug?: boolean) => Promise<DesignSystemComponentSearchResult[]>;
export declare const searchElementIcons: (query: string, debug?: boolean) => Promise<DesignSystemIconSearchResult[]>;
