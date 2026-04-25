import { NodeDefinition, NodeSearchResult, IntegrationFilterResult } from '../types/index';
/** Get all nodes in the catalog. Used by route handlers for unfiltered listing. */
export declare function getAllNodes(): NodeDefinition[];
/**
 * Look up a node definition by its type name.
 *
 * Handles full names ("n8n-nodes-base.gmail", "@n8n/n8n-nodes-langchain.openAi")
 * and bare names ("gmail", "openAi").
 */
export declare function getNodeDefinition(typeName: string): NodeDefinition | undefined;
/**
 * Scoring: exact name 10, word-boundary 7, substring 3, category 3, description 2, word 1
 */
export declare function searchNodes(keywords: string[], limit?: number): NodeSearchResult[];
export declare function filterNodesByIntegrationSupport(nodes: NodeSearchResult[], supportedCredTypes: Set<string>): IntegrationFilterResult;
export declare function simplifyNodeForLLM(node: NodeDefinition): NodeDefinition;
//# sourceMappingURL=catalog.d.ts.map