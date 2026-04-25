import type { N8nWorkflow, NodeProperty, WorkflowValidationResult, OutputRefValidation } from '../types/index';
export declare function validateWorkflow(workflow: N8nWorkflow): WorkflowValidationResult;
export declare function validateNodeParameters(workflow: N8nWorkflow): string[];
export declare function validateNodeInputs(workflow: N8nWorkflow): string[];
export declare function positionNodes(workflow: N8nWorkflow): N8nWorkflow;
/** Ensure trigger nodes use simplified output when available. */
export declare function normalizeTriggerSimpleParam(workflow: N8nWorkflow): void;
/**
 * Validates that $json expressions reference fields that exist in upstream node output schemas.
 * Returns a list of invalid references that need correction.
 */
export declare function validateOutputReferences(workflow: N8nWorkflow): OutputRefValidation[];
/**
 * Correct invalid option parameter values and typeVersion against catalog definitions.
 * Top-level options (resource) are fixed first so displayOptions cascading works for dependent ones (operation).
 */
export declare function correctOptionParameters(workflow: N8nWorkflow): number;
/**
 * Detect parameters not matching any VISIBLE catalog property.
 * e.g. `model` is only valid for `resource: "image"`, not `resource: "text"` (where `modelId` is correct).
 * Runs AFTER correctOptionParameters so resource/operation are already valid.
 */
export interface UnknownParamDetection {
    nodeName: string;
    nodeType: string;
    currentParams: Record<string, unknown>;
    unknownKeys: string[];
    /** Simplified property definitions for this node (used by the LLM to fix params). */
    propertyDefs: NodeProperty[];
}
export declare function detectUnknownParameters(workflow: N8nWorkflow): UnknownParamDetection[];
/**
 * Prefix all string parameter values containing {{ }} with = so n8n evaluates them as expressions.
 * Without =, n8n treats {{ }} as literal text.
 * Returns the number of values prefixed.
 */
export declare function ensureExpressionPrefix(workflow: N8nWorkflow): number;
//# sourceMappingURL=workflow.d.ts.map