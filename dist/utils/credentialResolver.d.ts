import type { N8nWorkflow, CredentialResolutionResult, N8nPluginConfig, CredentialProvider, N8nCredentialStoreApi } from '../types/index';
import type { N8nApiClient } from './api';
/**
 * Resolve and inject credentials into workflow.
 *
 * Resolution chain (first match wins):
 *   1. Credential store DB — cached mappings from previous resolutions
 *   2. Static config — character.settings.workflows.credentials
 *   3. External provider — registered CredentialProvider service (e.g. cloud OAuth)
 *   4. Missing — reported for manual configuration in n8n
 */
export declare function resolveCredentials(workflow: N8nWorkflow, userId: string, config: N8nPluginConfig, credStore: N8nCredentialStoreApi | null, credProvider: CredentialProvider | null, apiClient: N8nApiClient | null, tagName: string): Promise<CredentialResolutionResult>;
//# sourceMappingURL=credentialResolver.d.ts.map