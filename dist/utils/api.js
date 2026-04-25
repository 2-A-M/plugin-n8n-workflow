import { N8nApiError, } from '../types/index';
/**
 * Strip readOnly and internal fields from a workflow before sending to n8n API.
 * The n8n API uses `additionalProperties: false` — any unknown field causes 400.
 * Required fields: name, nodes, connections, settings.
 */
function toWorkflowPayload(workflow) {
    return {
        name: workflow.name,
        nodes: workflow.nodes.map(toNodePayload),
        connections: workflow.connections,
        settings: workflow.settings ?? {},
    };
}
/**
 * Strip readOnly fields from a node before sending to n8n API.
 * The node schema also uses `additionalProperties: false`.
 */
function toNodePayload(node) {
    const payload = {
        name: node.name,
        type: node.type,
        typeVersion: node.typeVersion,
        position: node.position,
        parameters: node.parameters,
    };
    if (node.id) {
        payload.id = node.id;
    }
    if (node.credentials) {
        payload.credentials = node.credentials;
    }
    if (node.disabled !== undefined) {
        payload.disabled = node.disabled;
    }
    if (node.notes) {
        payload.notes = node.notes;
    }
    if (node.notesInFlow !== undefined) {
        payload.notesInFlow = node.notesInFlow;
    }
    if (node.color) {
        payload.color = node.color;
    }
    if (node.continueOnFail !== undefined) {
        payload.continueOnFail = node.continueOnFail;
    }
    if (node.executeOnce !== undefined) {
        payload.executeOnce = node.executeOnce;
    }
    if (node.alwaysOutputData !== undefined) {
        payload.alwaysOutputData = node.alwaysOutputData;
    }
    if (node.retryOnFail !== undefined) {
        payload.retryOnFail = node.retryOnFail;
    }
    if (node.maxTries !== undefined) {
        payload.maxTries = node.maxTries;
    }
    if (node.waitBetweenTries !== undefined) {
        payload.waitBetweenTries = node.waitBetweenTries;
    }
    if (node.onError) {
        payload.onError = node.onError;
    }
    return payload;
}
/**
 * n8n REST API client
 * @see https://docs.n8n.io/api/
 */
export class N8nApiClient {
    baseUrl;
    apiKey;
    constructor(host, apiKey) {
        this.baseUrl = host.replace(/\/$/, ''); // Remove trailing slash
        this.apiKey = apiKey;
    }
    // ============================================================================
    // WORKFLOWS
    // ============================================================================
    /** @see POST /workflows */
    async createWorkflow(workflow) {
        return this.request('POST', '/workflows', toWorkflowPayload(workflow));
    }
    /** @see GET /workflows */
    async listWorkflows(params) {
        const query = new URLSearchParams();
        if (params?.active !== undefined) {
            query.append('active', params.active.toString());
        }
        if (params?.tags) {
            params.tags.forEach((tag) => query.append('tags', tag));
        }
        if (params?.limit) {
            query.append('limit', params.limit.toString());
        }
        if (params?.cursor) {
            query.append('cursor', params.cursor);
        }
        return this.request('GET', `/workflows${query.toString() ? `?${query.toString()}` : ''}`);
    }
    /** @see GET /workflows/{id} */
    async getWorkflow(id) {
        return this.request('GET', `/workflows/${id}`);
    }
    /** @see PUT /workflows/{id} */
    async updateWorkflow(id, workflow) {
        return this.request('PUT', `/workflows/${id}`, toWorkflowPayload(workflow));
    }
    /** @see DELETE /workflows/{id} */
    async deleteWorkflow(id) {
        await this.request('DELETE', `/workflows/${id}`);
    }
    /** @see POST /workflows/{id}/activate */
    async activateWorkflow(id) {
        return this.request('POST', `/workflows/${id}/activate`);
    }
    /** @see POST /workflows/{id}/deactivate */
    async deactivateWorkflow(id) {
        return this.request('POST', `/workflows/${id}/deactivate`);
    }
    /** @see PUT /workflows/{id}/tags */
    async updateWorkflowTags(id, tagIds) {
        return this.request('PUT', `/workflows/${id}/tags`, tagIds.map((id) => ({ id })));
    }
    // ============================================================================
    // CREDENTIALS
    // ============================================================================
    /** @see POST /credentials */
    async createCredential(credential) {
        return this.request('POST', '/credentials', credential);
    }
    /** @see DELETE /credentials/{id} */
    async deleteCredential(id) {
        await this.request('DELETE', `/credentials/${id}`);
    }
    // ============================================================================
    // EXECUTIONS
    // ============================================================================
    /** @see GET /executions */
    async listExecutions(params) {
        const query = new URLSearchParams();
        if (params?.workflowId) {
            query.append('workflowId', params.workflowId);
        }
        if (params?.status) {
            query.append('status', params.status);
        }
        if (params?.limit) {
            query.append('limit', params.limit.toString());
        }
        if (params?.cursor) {
            query.append('cursor', params.cursor);
        }
        return this.request('GET', `/executions${query.toString() ? `?${query.toString()}` : ''}`);
    }
    /** @see GET /executions/{id} */
    async getExecution(id) {
        return this.request('GET', `/executions/${id}`);
    }
    /** @see DELETE /executions/{id} */
    async deleteExecution(id) {
        await this.request('DELETE', `/executions/${id}`);
    }
    // ============================================================================
    // TAGS
    // ============================================================================
    /** @see GET /tags */
    async listTags() {
        return this.request('GET', '/tags');
    }
    /** @see POST /tags */
    async createTag(name) {
        return this.request('POST', '/tags', { name });
    }
    /**
     * Get or create a tag by name (helper method)
     * Used for per-user workflow organization
     */
    async getOrCreateTag(name) {
        const { data: tags } = await this.listTags();
        const existing = tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
        if (existing) {
            return existing;
        }
        try {
            return await this.createTag(name);
        }
        catch (error) {
            // Only retry on 409 "Tag already exists" — pagination may have missed it
            if (error instanceof N8nApiError && error.statusCode === 409) {
                const { data: refreshed } = await this.listTags();
                const found = refreshed.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
                if (found) {
                    return found;
                }
            }
            throw error;
        }
    }
    // ============================================================================
    // INTERNAL HELPERS
    // ============================================================================
    async request(method, path, body) {
        const url = `${this.baseUrl}/api/v1${path}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-N8N-API-KEY': this.apiKey,
            },
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        try {
            const response = await fetch(url, options);
            if (response.status === 204) {
                return undefined;
            }
            if (response.ok) {
                const text = await response.text();
                if (!text) {
                    return undefined;
                }
                return JSON.parse(text);
            }
            let message = `n8n API error: ${response.statusText}`;
            let errorData;
            try {
                errorData = await response.json();
                message = errorData.message || message;
            }
            catch {
                // not JSON — use statusText
            }
            throw new N8nApiError(message, response.status, errorData);
        }
        catch (error) {
            if (error instanceof N8nApiError) {
                throw error;
            }
            throw new N8nApiError(`Failed to call n8n API: ${error instanceof Error ? error.message : String(error)}`, undefined, error);
        }
    }
}
//# sourceMappingURL=api.js.map