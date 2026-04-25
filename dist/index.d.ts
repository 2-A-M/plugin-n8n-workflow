import { type Plugin } from '@elizaos/core';
/**
 * n8n Workflow Plugin for ElizaOS
 *
 * Generate and manage n8n workflows from natural language using RAG pipeline.
 * Supports workflow CRUD, execution management, and credential resolution.
 *
 * **Required Configuration:**
 * - `N8N_API_KEY`: Your n8n API key
 * - `N8N_HOST`: Your n8n instance URL (e.g., https://your.n8n.cloud)
 *
 * **Optional Configuration:**
 * - `workflows.credentials`: Pre-configured credential IDs for local mode
 *
 * **Example Character Configuration:**
 * ```json
 * {
 *   "name": "AI Workflow Builder",
 *   "plugins": ["@elizaos/plugin-n8n-workflow"],
 *   "settings": {
 *     "N8N_API_KEY": "env:N8N_API_KEY",
 *     "N8N_HOST": "https://your.n8n.cloud",
 *     "workflows": {
 *       "credentials": {
 *         "gmailOAuth2": "cred_gmail_123",
 *         "stripeApi": "cred_stripe_456"
 *       }
 *     }
 *   }
 * }
 * ```
 */
export declare const n8nWorkflowPlugin: Plugin;
export default n8nWorkflowPlugin;
//# sourceMappingURL=index.d.ts.map