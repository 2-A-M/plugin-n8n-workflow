import { N8N_WORKFLOW_SERVICE_TYPE } from '../services/n8n-workflow-service';
/**
 * Extract N8nWorkflowService from runtime services
 */
export function getService(runtime) {
    const service = runtime.getService(N8N_WORKFLOW_SERVICE_TYPE);
    if (!service) {
        throw new Error('N8nWorkflowService not available in runtime');
    }
    return service;
}
/**
 * Validate and clamp limit parameter
 */
export function validateLimit(limitParam, defaultLimit = 20, maxLimit = 100) {
    const limit = Number(limitParam);
    if (!Number.isFinite(limit) || limit <= 0) {
        return defaultLimit;
    }
    return Math.min(limit, maxLimit);
}
//# sourceMappingURL=_helpers.js.map