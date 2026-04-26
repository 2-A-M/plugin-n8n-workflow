/**
 * Deterministic pre-deploy pass that catches catalog-drift hallucinations
 * the LLM emits despite prompt hardening. Runs after `injectMissingCredentialBlocks`
 * (Session 19 safety net) and before `deployWorkflow`.
 *
 * Six checks, each emitting a `Repair` (auto-fixed) or `ValidationError`
 * (handed off to the retry loop in n8n-workflow-service.ts):
 *
 *   1. typeVersion clamp           — closes "LLM emits 2.2 when only 1, 2, 2.1 exist"
 *   2. authentication back-fill    — closes "credentials attached but parameters.authentication missing"
 *   3. output-field validation     — closes "subject vs Subject" + typo classes
 *   4. required-parameter pre-flight
 *   5. node-name uniqueness        — n8n rejects duplicates with confusing errors
 *   6. connection sanity           — drop edges to non-existent nodes
 *
 * Mutates the workflow in place AND returns it for ergonomic chaining.
 */
import type { N8nWorkflow, NodeDefinition, RuntimeContext } from '../types/index';
export type RepairKind = 'typeVersionClamp' | 'authenticationBackfill' | 'fieldNameCaseFix' | 'aggregationSourceFieldCaseFix' | 'nodeNameDeduplication' | 'droppedDanglingEdge';
export type ValidationErrorKind = 'unknownOutputField' | 'requiredParameterMissing';
export interface Repair {
    kind: RepairKind;
    node: string;
    detail: string;
}
export interface ValidationError {
    kind: ValidationErrorKind;
    node: string;
    detail: string;
    /** When kind === 'unknownOutputField': `{{ $json.<X> }}` literal that failed. */
    expression?: string;
    /** When kind === 'unknownOutputField': fields the upstream node actually emits. */
    availableFields?: string[];
}
export interface RepairResult {
    workflow: N8nWorkflow;
    repairs: Repair[];
    errors: ValidationError[];
}
export declare function validateAndRepair(workflow: N8nWorkflow, relevantNodes: NodeDefinition[], _runtimeContext: RuntimeContext | undefined, runtimeVersions?: Map<string, number[]>): RepairResult;
//# sourceMappingURL=validateAndRepair.d.ts.map