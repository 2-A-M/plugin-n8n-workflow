import { type IAgentRuntime } from '@elizaos/core';
import { N8nWorkflow, WorkflowMatchResult, WorkflowDraft, DraftIntentResult, NodeDefinition, NodeSearchResult, FeasibilityResult, OutputRefValidation, RuntimeContext } from '../types/index';
import type { UnknownParamDetection } from './workflow';
export declare function extractKeywords(runtime: IAgentRuntime, userPrompt: string, preferredProviders?: string[]): Promise<string[]>;
export declare function matchWorkflow(runtime: IAgentRuntime, userRequest: string, workflows: N8nWorkflow[]): Promise<WorkflowMatchResult>;
export declare function classifyDraftIntent(runtime: IAgentRuntime, userMessage: string, draft: WorkflowDraft): Promise<DraftIntentResult>;
export declare function generateWorkflow(runtime: IAgentRuntime, userPrompt: string, relevantNodes: NodeDefinition[], runtimeContext?: RuntimeContext): Promise<N8nWorkflow>;
export declare function modifyWorkflow(runtime: IAgentRuntime, existingWorkflow: N8nWorkflow, modificationRequest: string, relevantNodes: NodeDefinition[], runtimeContext?: RuntimeContext): Promise<N8nWorkflow>;
export declare function collectExistingNodeDefinitions(workflow: N8nWorkflow): NodeDefinition[];
export declare function formatActionResponse(runtime: IAgentRuntime, responseType: string, data: Record<string, unknown>): Promise<string>;
export declare function assessFeasibility(runtime: IAgentRuntime, userPrompt: string, removedNodes: NodeSearchResult[], remainingNodes: NodeSearchResult[]): Promise<FeasibilityResult>;
/**
 * Auto-corrects invalid field references in expressions using parallel LLM calls.
 * Returns a new workflow with corrected expressions.
 */
export declare function correctFieldReferences(runtime: IAgentRuntime, workflow: N8nWorkflow, invalidRefs: OutputRefValidation[]): Promise<N8nWorkflow>;
/** Deterministic fast path + LLM fallback for parameter name correction. */
export declare function correctParameterNames(runtime: IAgentRuntime, workflow: N8nWorkflow, detections: UnknownParamDetection[]): Promise<N8nWorkflow>;
//# sourceMappingURL=generation.d.ts.map