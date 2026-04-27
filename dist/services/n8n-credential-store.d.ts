import { type IAgentRuntime, Service } from '@elizaos/core';
import type { N8nCredentialStoreApi, CredentialMapping } from '../types/index';
/**
 * Default DB-backed credential store.
 * Maps (userId, credType) → n8n credential ID.
 *
 * On the cloud, a different plugin can register its own implementation
 * under the same service type — runtime.getService() returns the first registered.
 */
export declare class N8nCredentialStore extends Service implements N8nCredentialStoreApi {
    static readonly serviceType = "n8n_credential_store";
    capabilityDescription: string;
    private getDb;
    static start(runtime: IAgentRuntime): Promise<N8nCredentialStore>;
    stop(): Promise<void>;
    get(userId: string, credType: string): Promise<string | null>;
    set(userId: string, credType: string, n8nCredId: string): Promise<void>;
    listByUser(userId: string): Promise<CredentialMapping[]>;
    delete(userId: string, credType: string): Promise<void>;
}
//# sourceMappingURL=n8n-credential-store.d.ts.map