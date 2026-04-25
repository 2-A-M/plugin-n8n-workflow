const DRAFT_TTL_MS = 30 * 60 * 1000;
/**
 * Provider that tells the LLM when a workflow draft is pending confirmation.
 *
 * Without this, the LLM has no context about pending drafts and will route
 * confirmation messages (e.g. "yes, deploy it") to REPLY instead of
 * CREATE_N8N_WORKFLOW.
 */
export const pendingDraftProvider = {
    name: 'PENDING_WORKFLOW_DRAFT',
    description: 'Pending workflow draft awaiting user confirmation, modification, or cancellation',
    get: async (runtime, message, _state) => {
        const cacheKey = `workflow_draft:${message.entityId}`;
        const draft = await runtime.getCache(cacheKey);
        if (!draft || Date.now() - draft.createdAt > DRAFT_TTL_MS) {
            return { text: '', data: {}, values: {} };
        }
        const nodeNames = draft.workflow.nodes.map((n) => n.name).join(' → ');
        return {
            text: '# Pending Workflow Draft\n\n' +
                `A workflow draft "${draft.workflow.name}" is pending.\n` +
                `Nodes: ${nodeNames}\n\n` +
                '**REQUIRED**: Any user message about this draft MUST trigger the CREATE_N8N_WORKFLOW action.\n' +
                'This includes confirmations ("yes", "ok", "deploy it", "create it", "go ahead"),\n' +
                'cancellations ("cancel", "nevermind"), and modifications ("change X", "use Y instead").\n' +
                'The action handler manages all draft operations — do NOT handle them via text reply.\n' +
                'You MUST include CREATE_N8N_WORKFLOW in your actions.',
            data: { hasPendingDraft: true },
            values: { hasPendingDraft: true },
        };
    },
};
//# sourceMappingURL=pendingDraft.js.map