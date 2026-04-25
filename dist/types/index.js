// Core n8n workflow types
// Credential provider types
export const N8N_CREDENTIAL_PROVIDER_TYPE = 'n8n_credential_provider';
/**
 * Type guard to check if a service implements CredentialProvider
 */
export function isCredentialProvider(service) {
    if (!service || typeof service !== 'object') {
        return false;
    }
    return typeof service.resolve === 'function';
}
// Runtime context provider types
export const N8N_RUNTIME_CONTEXT_PROVIDER_TYPE = 'n8n_runtime_context_provider';
/**
 * Type guard to check if a service implements RuntimeContextProvider.
 */
export function isRuntimeContextProvider(service) {
    if (!service || typeof service !== 'object') {
        return false;
    }
    return typeof service.getRuntimeContext === 'function';
}
// Credential store types
export const N8N_CREDENTIAL_STORE_TYPE = 'n8n_credential_store';
// Error types
export class N8nApiError extends Error {
    statusCode;
    response;
    constructor(message, statusCode, response) {
        super(message);
        this.statusCode = statusCode;
        this.response = response;
        this.name = 'N8nApiError';
    }
}
export class UnsupportedIntegrationError extends Error {
    unsupportedServices;
    availableServices;
    constructor(unsupportedServices, availableServices) {
        super(`Unsupported integrations: ${unsupportedServices.join(', ')}`);
        this.unsupportedServices = unsupportedServices;
        this.availableServices = availableServices;
        this.name = 'UnsupportedIntegrationError';
    }
}
//# sourceMappingURL=index.js.map