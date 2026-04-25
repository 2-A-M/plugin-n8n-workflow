import { type Provider } from '@elizaos/core';
/**
 * Provider that tells the LLM when a workflow draft is pending confirmation.
 *
 * Without this, the LLM has no context about pending drafts and will route
 * confirmation messages (e.g. "yes, deploy it") to REPLY instead of
 * CREATE_N8N_WORKFLOW.
 */
export declare const pendingDraftProvider: Provider;
//# sourceMappingURL=pendingDraft.d.ts.map