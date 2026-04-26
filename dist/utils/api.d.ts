import { N8nWorkflow, N8nWorkflowResponse, N8nCredential, N8nExecution, N8nTag } from '../types/index';
/**
 * n8n REST API client
 * @see https://docs.n8n.io/api/
 */
export declare class N8nApiClient {
    private baseUrl;
    private apiKey;
    constructor(host: string, apiKey: string);
    /** @see POST /workflows */
    createWorkflow(workflow: N8nWorkflow): Promise<N8nWorkflowResponse>;
    /** @see GET /workflows */
    listWorkflows(params?: {
        active?: boolean;
        tags?: string[];
        limit?: number;
        cursor?: string;
    }): Promise<{
        data: N8nWorkflowResponse[];
        nextCursor?: string;
    }>;
    /** @see GET /workflows/{id} */
    getWorkflow(id: string): Promise<N8nWorkflowResponse>;
    /** @see PUT /workflows/{id} */
    updateWorkflow(id: string, workflow: N8nWorkflow): Promise<N8nWorkflowResponse>;
    /** @see DELETE /workflows/{id} */
    deleteWorkflow(id: string): Promise<void>;
    /** @see POST /workflows/{id}/activate */
    activateWorkflow(id: string): Promise<N8nWorkflowResponse>;
    /** @see POST /workflows/{id}/deactivate */
    deactivateWorkflow(id: string): Promise<N8nWorkflowResponse>;
    /** @see PUT /workflows/{id}/tags */
    updateWorkflowTags(id: string, tagIds: string[]): Promise<N8nTag[]>;
    /** @see POST /credentials */
    createCredential(credential: {
        name: string;
        type: string;
        data: Record<string, unknown>;
    }): Promise<N8nCredential>;
    /** @see DELETE /credentials/{id} */
    deleteCredential(id: string): Promise<void>;
    /** @see GET /executions */
    listExecutions(params?: {
        workflowId?: string;
        status?: 'canceled' | 'error' | 'running' | 'success' | 'waiting';
        limit?: number;
        cursor?: string;
    }): Promise<{
        data: N8nExecution[];
        nextCursor?: string;
    }>;
    /** @see GET /executions/{id} */
    getExecution(id: string): Promise<N8nExecution>;
    /** @see DELETE /executions/{id} */
    deleteExecution(id: string): Promise<void>;
    /** @see GET /tags */
    listTags(): Promise<{
        data: N8nTag[];
    }>;
    /** @see POST /tags */
    createTag(name: string): Promise<N8nTag>;
    /**
     * Get or create a tag by name (helper method)
     * Used for per-user workflow organization
     */
    getOrCreateTag(name: string): Promise<N8nTag>;
    /**
     * Fetch the n8n runtime's actual node-type registry (NOT under /api/v1 —
     * served at /types/nodes.json). Used by Session 21 validateAndRepair to
     * intersect the static plugin catalog with what the user's n8n binary
     * actually ships, so the LLM can't pick a typeVersion that exists in
     * the catalog but not in the running n8n.
     *
     * Returns `null` on any failure — callers should fall back to the
     * static catalog versions.
     */
    getRuntimeNodeTypeVersions(): Promise<Map<string, number[]> | null>;
    private request;
}
//# sourceMappingURL=api.d.ts.map