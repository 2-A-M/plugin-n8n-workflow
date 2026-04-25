/**
 * Output schema utilities for validating expressions between nodes.
 * Uses pre-crawled schemaIndex.json with full schema content.
 */
import type { ExpressionRef, SchemaContent } from '../types/index';
export interface OutputSchemaResult {
    schema: SchemaContent;
    fields: string[];
}
export declare function hasOutputSchema(nodeType: string): boolean;
export declare function getAvailableResources(nodeType: string): string[];
export declare function getAvailableOperations(nodeType: string, resource: string): string[];
export declare function loadOutputSchema(nodeType: string, resource: string, operation: string): OutputSchemaResult | null;
export declare function loadTriggerOutputSchema(nodeType: string, parameters?: Record<string, unknown>): OutputSchemaResult | null;
export declare function getTopLevelFields(schema: SchemaContent): string[];
/** Returns all field paths including nested (e.g., "from.value[0].address") */
export declare function getAllFieldPaths(schema: SchemaContent, prefix?: string): string[];
/** Returns field paths with their types (e.g., "snippet: string", "payload: object"). */
export declare function getAllFieldPathsTyped(schema: SchemaContent, prefix?: string): {
    path: string;
    type: string;
}[];
export declare function parseExpressions(parameters: Record<string, unknown>, parentPath?: string): ExpressionRef[];
export declare function fieldExistsInSchema(path: string[], schema: SchemaContent): boolean;
export declare function formatSchemaForPrompt(schema: SchemaContent, maxDepth?: number): string;
//# sourceMappingURL=outputSchema.d.ts.map