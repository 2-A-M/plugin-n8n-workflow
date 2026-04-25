import { type Provider } from '@elizaos/core';
/**
 * Provider that enriches state with user's active workflows
 *
 * This provider runs for every message and adds workflow information to the state,
 * allowing the LLM to automatically extract workflow IDs and references from context.
 *
 * Example: User says "run my Stripe workflow" → LLM can see all workflows and extract the right ID
 */
export declare const activeWorkflowsProvider: Provider;
//# sourceMappingURL=activeWorkflows.d.ts.map