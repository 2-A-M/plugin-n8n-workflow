import { type IAgentRuntime, Service } from '@elizaos/core';
import type { N8nWorkflow, N8nWorkflowResponse, N8nExecution, WorkflowCreationResult } from '../types/index';
export declare const N8N_WORKFLOW_SERVICE_TYPE = "n8n_workflow";
export interface N8nWorkflowServiceConfig {
    apiKey: string;
    host: string;
    credentials?: Record<string, string>;
}
/**
 * N8n Workflow Service - Orchestrates the RAG pipeline for workflow generation.
 *
 * generateWorkflowDraft(): keywords → node search → LLM generation → validation → positioning
 * deployWorkflow(): credential resolution → n8n Cloud API → tagging
 */
export declare class N8nWorkflowService extends Service {
    static readonly serviceType = "n8n_workflow";
    capabilityDescription: string;
    private apiClient;
    private serviceConfig;
    static start(runtime: IAgentRuntime): Promise<N8nWorkflowService>;
    stop(): Promise<void>;
    private injectCatalogClarifications;
    private getClient;
    private getConfig;
    generateWorkflowDraft(prompt: string): Promise<N8nWorkflow>;
    modifyWorkflowDraft(existingWorkflow: N8nWorkflow, modificationRequest: string): Promise<N8nWorkflow>;
    deployWorkflow(workflow: N8nWorkflow, userId: string): Promise<WorkflowCreationResult>;
    listWorkflows(userId?: string): Promise<N8nWorkflowResponse[]>;
    activateWorkflow(workflowId: string): Promise<void>;
    deactivateWorkflow(workflowId: string): Promise<void>;
    deleteWorkflow(workflowId: string): Promise<void>;
    getWorkflow(workflowId: string): Promise<N8nWorkflowResponse>;
    getWorkflowExecutions(workflowId: string, limit?: number): Promise<N8nExecution[]>;
    listExecutions(params?: {
        workflowId?: string;
        status?: 'canceled' | 'error' | 'running' | 'success' | 'waiting';
        limit?: number;
        cursor?: string;
    }): Promise<{
        data: N8nExecution[];
        nextCursor?: string;
    }>;
    getExecutionDetail(executionId: string): Promise<N8nExecution>;
}
//# sourceMappingURL=n8n-workflow-service.d.ts.map