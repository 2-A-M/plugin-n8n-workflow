import type { IAgentRuntime } from '@elizaos/core';
import type { N8nWorkflowService } from '../services/n8n-workflow-service';
/**
 * Extract N8nWorkflowService from runtime services
 */
export declare function getService(runtime: IAgentRuntime): N8nWorkflowService;
/**
 * Validate and clamp limit parameter
 */
export declare function validateLimit(limitParam: unknown, defaultLimit?: number, maxLimit?: number): number;
//# sourceMappingURL=_helpers.d.ts.map