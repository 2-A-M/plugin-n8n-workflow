# @elizaos/plugin-n8n-workflow

Generate and deploy n8n workflows from natural language using a RAG pipeline. Supports 450+ native n8n nodes (Gmail, Slack, Stripe, etc.) with intelligent credential resolution and full workflow lifecycle management.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Configuration](#configuration)
- [Plugin Components](#plugin-components)
- [CREATE\_N8N\_WORKFLOW — Complete Lifecycle](#create_n8n_workflow--complete-lifecycle)
  - [State Machine](#state-machine)
  - [Step-by-Step Detail](#step-by-step-detail)
  - [Branch A: Draft Exists](#branch-a-draft-exists)
  - [Branch B: No Draft](#branch-b-no-draft)
  - [generateAndPreview](#generateandpreview)
  - [Response Types](#response-types)
- [RAG Pipeline](#rag-pipeline)
- [Credential Resolution](#credential-resolution)
- [Other Actions](#other-actions)
  - [ACTIVATE\_N8N\_WORKFLOW](#activate_n8n_workflow)
  - [DEACTIVATE\_N8N\_WORKFLOW](#deactivate_n8n_workflow)
  - [DELETE\_N8N\_WORKFLOW](#delete_n8n_workflow)
  - [GET\_N8N\_EXECUTIONS](#get_n8n_executions)
- [Providers](#providers)
- [LLM Response Formatting](#llm-response-formatting)
- [Database Schema](#database-schema)
- [Types Reference](#types-reference)
- [Project Structure](#project-structure)
- [Development](#development)

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                         ElizaOS Runtime                           │
│                                                                   │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────────┐ │
│  │  Services    │  │  Actions          │  │  Providers           │ │
│  │             │  │                  │  │                      │ │
│  │ N8nWorkflow │  │ CREATE_N8N_WF    │  │ PENDING_DRAFT        │ │
│  │ Service     │  │ ACTIVATE_N8N_WF  │  │ ACTIVE_WORKFLOWS     │ │
│  │             │  │ DEACTIVATE_N8N_WF│  │ WORKFLOW_STATUS       │ │
│  │ N8nCred     │  │ DELETE_N8N_WF    │  │                      │ │
│  │ Store (DB)  │  │ GET_N8N_EXECS    │  │                      │ │
│  └──────┬──────┘  └──────────────────┘  └──────────────────────┘ │
│         │                                                         │
│  ┌──────┴──────────────────────────────────────────────────────┐  │
│  │                    runtime.getCache()                       │  │
│  │              Per-user draft state machine                   │  │
│  │         Key: workflow_draft:{userId} — TTL: 30 min          │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────┐  ┌────────────────────────────────────────┐ │
│  │  Database         │  │  LLM (via runtime.useModel)            │ │
│  │  PostgreSQL       │  │                                        │ │
│  │  n8n_workflow     │  │  TEXT_LARGE ─── workflow generation     │ │
│  │  .credential_     │  │  TEXT_SMALL ─── response formatting    │ │
│  │   mappings        │  │  OBJECT_SMALL ─ classification/extract │ │
│  └──────────────────┘  └────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌──────────────────┐         ┌────────────────────────┐
│  n8n REST API    │         │ External CredProvider   │
│  /api/v1/        │         │ (optional, e.g. OAuth)  │
│  workflows       │         │                         │
│  executions      │         │ resolve(userId, type)   │
│  tags            │         │ → resolved / needs_auth │
│  credentials     │         │                         │
└──────────────────┘         └────────────────────────┘
```

---

## Configuration

### Required Settings

| Setting       | Description                    | Example                    |
|---------------|--------------------------------|----------------------------|
| `N8N_API_KEY` | Your n8n instance API key      | `n8n_api_abc123...`        |
| `N8N_HOST`    | Your n8n instance URL          | `https://your.n8n.cloud`  |

### Optional: Pre-configured Credentials

Static credential IDs bypass the resolution chain for known services:

```json
{
  "name": "AI Workflow Builder",
  "plugins": ["@elizaos/plugin-n8n-workflow"],
  "settings": {
    "N8N_API_KEY": "env:N8N_API_KEY",
    "N8N_HOST": "https://your.n8n.cloud",
    "workflows": {
      "credentials": {
        "gmailOAuth2": "cred_gmail_123",
        "stripeApi": "cred_stripe_456"
      }
    }
  }
}
```

### Optional: External Credential Provider

Register a service implementing `CredentialProvider` on the runtime (type `n8n_credential_provider`) to handle OAuth flows automatically:

```typescript
interface CredentialProvider {
  resolve(userId: string, credType: string): Promise<
    | { status: 'resolved'; credentialId: string }
    | { status: 'needs_auth'; authUrl: string }
    | null
  >;
}
```

---

## Plugin Components

### Services

| Service              | Type                   | Description                                                           |
|----------------------|------------------------|-----------------------------------------------------------------------|
| `N8nWorkflowService` | `n8n_workflow`         | RAG pipeline orchestrator, workflow CRUD, execution management        |
| `N8nCredentialStore`  | `n8n_credential_store` | PostgreSQL-backed credential mapping: `(userId, credType) → credId`  |

### Actions

| Action                    | Similes                                            | Description                                       |
|---------------------------|----------------------------------------------------|----------------------------------------------------|
| `CREATE_N8N_WORKFLOW`     | create, build, generate, confirm, deploy, cancel   | Full lifecycle: generate, preview, modify, deploy  |
| `ACTIVATE_N8N_WORKFLOW`   | activate, enable, start, turn on                   | Activate a workflow (+ draft redirect)             |
| `DEACTIVATE_N8N_WORKFLOW` | deactivate, disable, stop, pause, turn off         | Deactivate a running workflow                      |
| `DELETE_N8N_WORKFLOW`     | delete, remove, destroy                            | Permanently delete a workflow                      |
| `GET_N8N_EXECUTIONS`      | executions, history, runs                          | Show execution history (last 10 runs)              |

### Providers

| Provider                 | Name                     | Runs On       | Description                                               |
|--------------------------|--------------------------|---------------|-----------------------------------------------------------|
| `pendingDraftProvider`   | `PENDING_WORKFLOW_DRAFT` | Every message | Injects draft context into LLM state for action routing   |
| `activeWorkflowsProvider`| `ACTIVE_N8N_WORKFLOWS`   | Every message | User's workflow list (up to 20) for semantic matching     |
| `workflowStatusProvider` | `n8n_workflow_status`    | Every message | Workflow status with last execution info (up to 10)       |

---

## CREATE_N8N_WORKFLOW — Complete Lifecycle

This is the main action. It operates as a **cache-based state machine**: each invocation checks `runtime.getCache()` for an existing draft and branches accordingly. A single action handles all states — generation, preview, clarification, modification, confirmation, cancellation, and deployment.

### State Machine

```
Handler Entry
    │
    ├─── Service unavailable? ─────────────────────────────────→ ERROR
    │
    ├─── Draft in cache?
    │      │
    │      ├── Expired (> 30 min)? ─── delete cache ──────────→ (treat as no draft)
    │      │
    │      └── Valid draft ─── classifyDraftIntent (LLM)
    │            │
    │            ├── confirm + no pending clarification
    │            │     │
    │            │     └── deployWorkflow
    │            │           │
    │            │           ├── Unresolved credentials? ──────→ AUTH_REQUIRED
    │            │           │                                    (draft KEPT in cache)
    │            │           │
    │            │           └── All resolved ─────────────────→ DEPLOY_SUCCESS
    │            │                                                (draft CLEARED)
    │            │
    │            ├── confirm + has pending clarification ──────→ (override to modify)
    │            │
    │            ├── cancel ───────────────────────────────────→ CANCELLED
    │            │                                                (draft CLEARED)
    │            │
    │            ├── modify
    │            │     │
    │            │     └── modifyWorkflowDraft
    │            │           │
    │            │           ├── Needs clarification? ─────────→ CLARIFICATION
    │            │           │                                    (draft UPDATED)
    │            │           │
    │            │           └── Complete ─────────────────────→ PREVIEW
    │            │                                                (draft UPDATED)
    │            │
    │            ├── new ─── delete cache + generateAndPreview
    │            │     │
    │            │     ├── Generation failed? ─────────────────→ PREVIEW
    │            │     │                    (previous draft RESTORED, restoredAfterFailure)
    │            │     │
    │            │     └── Success ────────────────────────────→ (see generateAndPreview)
    │            │
    │            └── unknown intent ───────────────────────────→ PREVIEW
    │                                                            (re-show current draft)
    │
    └─── No draft
           │
           ├── Empty text? ───────────────────────────────────→ EMPTY_PROMPT
           │
           └── Has text ─── generateAndPreview
                 │
                 ├── Needs clarification? ─────────────────────→ CLARIFICATION
                 │                                                (draft STORED)
                 │
                 └── Complete ─────────────────────────────────→ PREVIEW
                                                                 (draft STORED)

Global catch ──────────────────────────────────────────────────→ ERROR
```

### Step-by-Step Detail

#### 1. Service Verification

```typescript
service = runtime.getService(N8N_WORKFLOW_SERVICE_TYPE)
// If null → formatActionResponse(runtime, 'ERROR', { error }) → return { success: false }
```

#### 2. Context Extraction

```typescript
userText  = message.content.text.trim()
userId    = message.entityId
cacheKey  = `workflow_draft:${userId}`   // one draft per user
```

#### 3. Cache Check

```typescript
existingDraft = await runtime.getCache<WorkflowDraft>(cacheKey)
// TTL check: Date.now() - createdAt > 30 min → deleteCache, treat as no draft
```

A `WorkflowDraft` contains:

| Field       | Type          | Description                                             |
|-------------|---------------|---------------------------------------------------------|
| `workflow`  | `N8nWorkflow` | Generated workflow (validated, positioned, no creds)    |
| `prompt`    | `string`      | Original user prompt                                    |
| `userId`    | `string`      | For credential resolution at deploy time                |
| `createdAt` | `number`      | `Date.now()` timestamp for 30-min TTL                   |

---

### Branch A: Draft Exists

#### A.1 — Intent Classification (LLM)

```typescript
intentResult = await classifyDraftIntent(runtime, userText, existingDraft)
```

Calls `ModelType.OBJECT_SMALL` with:
- System prompt: `DRAFT_INTENT_SYSTEM_PROMPT`
- Draft summary: workflow name, node list, original prompt
- Current user message

Returns:

```typescript
{ intent: 'confirm' | 'cancel' | 'modify' | 'new', modificationRequest?: string, reason: string }
```

**Fallback**: if the LLM throws or returns an invalid/missing intent → `show_preview` (re-displays the draft).

#### A.2 — Clarification Override

```
IF intent === 'confirm'
   AND draft.workflow._meta.requiresClarification.length > 0
THEN effectiveIntent = 'modify'
```

**Why**: when the draft has pending questions (e.g. "Which email address?") and the user answers "john@example.com", the LLM classifies this as "confirm" (the user responded). But we must not deploy an incomplete draft — we regenerate with the user's answer incorporated as a modification.

#### A.3 — Intent: `confirm`

```
deployWorkflow(existingDraft.workflow, userId)
    │
    ├── resolveCredentials (see Credential Resolution section)
    │
    ├── ANY credential unresolved?
    │     YES → return { id: '', missingCredentials: [...] }
    │            → action shows AUTH_REQUIRED with auth links
    │            → draft STAYS in cache for retry
    │     NO  → continue
    │
    ├── client.createWorkflow(workflow)  ← POST /api/v1/workflows
    │
    ├── client.activateWorkflow(id)      ← POST /api/v1/workflows/{id}/activate
    │   (try/catch — failure = created but inactive)
    │
    ├── client.getOrCreateTag(tagName)   ← per-user tagging
    │   client.updateWorkflowTags(id, [tagId])
    │   (try/catch — tagging is optional)
    │
    └── return { id, name, active, nodeCount, missingCredentials: [] }
         → action deletes cache
         → action shows DEPLOY_SUCCESS
```

#### A.4 — Intent: `cancel`

```
delete cache → formatActionResponse('CANCELLED', { workflowName }) → return
```

#### A.5 — Intent: `modify`

```typescript
modification = intentResult.modificationRequest || userText
modifiedWorkflow = await service.modifyWorkflowDraft(existingDraft.workflow, modification)
```

`modifyWorkflowDraft` performs:

```
1. collectExistingNodeDefinitions(existingWorkflow)
   → get catalog definitions for nodes already in the workflow

2. extractKeywords(runtime, modificationRequest)
   → LLM extracts keywords from the modification request

3. searchNodes(keywords, 10)
   → find new nodes the modification might need

4. Deduplicate: merge existing + new definitions

5. modifyWorkflow(runtime, existingWorkflow, modification, combinedDefs)
   → LLM (TEXT_LARGE, temperature 0, JSON mode)
   → modifies workflow JSON, keeping unchanged nodes intact

6. validateWorkflow(result)
   → structure validation

7. injectCatalogClarifications(result)
   → check required params + disconnected inputs from node catalog

8. positionNodes(result)
   → BFS left-to-right layout
```

After return:
- Store updated draft in cache (new `createdAt`)
- If `_meta.requiresClarification` has items → `CLARIFICATION`
- Otherwise → `PREVIEW` with updated workflow data

#### A.6 — Intent: `new`

The user wants a completely different workflow.

```
1. Empty text? → EMPTY_PROMPT + delete cache + return false
2. Delete cache
3. try: generateAndPreview(...)
4. catch:
   → restore previous draft in cache
   → PREVIEW with restoredAfterFailure: true
   → LLM mentions the new request failed, shows previous draft
```

#### A.7 — Unknown/Invalid Intent

```
Re-show current draft PREVIEW → return { success: true }
```

---

### Branch B: No Draft

```
Empty text? → EMPTY_PROMPT → return { success: false }
Has text?   → generateAndPreview(runtime, service, text, userId, cacheKey, callback)
```

---

### generateAndPreview

```
async function generateAndPreview(runtime, service, prompt, userId, cacheKey, callback)
    │
    ├── service.generateWorkflowDraft(prompt)
    │   └── Full RAG pipeline (see RAG Pipeline section)
    │
    ├── Store draft: { workflow, prompt, userId, createdAt: Date.now() }
    │
    ├── workflow._meta.requiresClarification has items?
    │   YES → formatActionResponse('CLARIFICATION', { questions })
    │   NO  → formatActionResponse('PREVIEW', buildPreviewData(workflow))
    │
    └── return { success: true }
```

#### buildPreviewData

```typescript
{
  workflowName: "Daily Stripe Summary via Gmail",
  nodes: [
    { name: "Schedule Trigger", type: "scheduleTrigger" },
    { name: "Stripe",           type: "stripe" },
    { name: "Gmail",            type: "gmail" }
  ],
  flow: "Schedule Trigger → Stripe → Gmail",   // BFS traversal from triggers
  credentials: ["stripeApi", "gmailOAuth2"],
  assumptions: ["Running daily at 9 AM"],       // if LLM made assumptions
  suggestions: ["Consider adding error handling"], // if LLM has suggestions
  restoredAfterFailure: true                    // only when "new" generation fails
}
```

`buildFlowChain`: BFS traversal of connections starting from nodes with no incoming edges (triggers), producing `A → B → C`.

---

### Response Types

| Type            | When                                  | Data Sent to LLM                                   | Cache Effect        |
|-----------------|---------------------------------------|------------------------------------------------------|---------------------|
| `PREVIEW`       | New draft or modification             | workflowName, nodes, flow, credentials, assumptions  | Draft stored/updated|
| `CLARIFICATION` | Vague prompt or missing params        | questions[]                                          | Draft stored/updated|
| `DEPLOY_SUCCESS`| Confirm + all credentials resolved    | workflowName, workflowId, nodeCount, active          | Draft **cleared**   |
| `AUTH_REQUIRED` | Confirm + unresolved credentials      | connections[{service, authUrl}]                      | Draft **kept**      |
| `CANCELLED`     | Cancel                                | workflowName                                         | Draft **cleared**   |
| `EMPTY_PROMPT`  | Empty text                            | {}                                                   | Draft cleared (if any)|
| `ERROR`         | Any exception                         | error message                                        | Unchanged           |

---

## RAG Pipeline

`generateWorkflowDraft` orchestrates the full pipeline:

```
User Prompt: "Send me Stripe payment summaries every Monday via Gmail"
    │
    ▼
┌──────────────────────────────────────────┐
│  1. extractKeywords (OBJECT_SMALL)       │
│     Input:  user prompt                  │
│     Output: ["stripe", "gmail", "email", │
│              "schedule", "payment"]      │
│     Max: 5 keywords                      │
└──────────────────┬───────────────────────┘
                   ▼
┌────────────────────�����────────────────────┐
│  2. searchNodes (local catalog)          │
│     457 embedded n8n node definitions    │
│     Keyword scoring:                     │
│       exact name match  = 10 pts         │
│       partial name match = 5 pts         │
│       category match    = 3 pts          │
│       description match = 2 pts          │
│       individual word   = 1 pt           │
│     Returns: top 15 nodes by score       │
│     Throws if 0 results                  │
└──────────────────┬───────────────────────┘
                   ▼
┌──────────────────────────────────────────┐
│  3. generateWorkflow (TEXT_LARGE)        │
│     Input:  user prompt + node defs      │
│           + output schemas (from index)  │
│     Config: temperature 0, JSON mode     │
│     Output: complete n8n workflow JSON    │
│     Includes: _meta.assumptions,         │
│               _meta.suggestions,         │
│               _meta.requiresClarification│
└──────────────────┬───────────────────────┘
                   ▼
┌──────────────────────────────────────────┐
│  4. normalizeTriggerSimpleParam          │
│     Set simple=true on trigger nodes     │
└──────────────────┬───────────────────────┘
                   ▼
┌──────────────────────────────────────────┐
│  5. correctOptionParameters              │
│     Fix node types, versions, resources, │
│     and operations against the catalog   │
└──────────────────┬───────────────────────┘
                   ▼
┌──────────────────────────────────────────┐
│  6. detectUnknownParameters              │
│     + correctParameterNames (LLM)        │
│     Fix param names not in catalog       │
└──────────────────┬───────────────────────┘
                   ▼
┌──────────────────────────────────────────┐
│  7. validateOutputReferences             │
│     + correctFieldReferences (LLM)       │
│     Validate $json expressions against   │
│     output schemas, fix invalid paths    │
└──────────────────┬───────────────────────┘
                   ▼
┌──────────────────────────────────────────┐
│  8. ensureExpressionPrefix               │
│     Wrap {{ }} with ={{ }} for n8n       │
└───────��──────────┬───────────────────────┘
                   ▼
┌──────────────────────────────────────────┐
│  9. validateWorkflow                     │
│     - nodes array exists, non-empty      │
│     - connections object valid           │
│     - required fields on each node       │
│     - no duplicate node names            │
│     - valid positions (auto-fix if not)  │
│     - connection integrity               │
│     - trigger detection                  │
│     - orphan node detection              │
│     Throws on validation errors          │
└──────────────────┬───────────────────────┘
                   ▼
┌──────────────────────────────────────────┐
│  10. injectCatalogClarifications         │
│     Check each node against catalog:     │
│     - validateNodeParameters             │
│       → missing required params?         │
│     - validateNodeInputs                 │
│       → expected inputs not connected?   │
│     Appends to _meta.requiresClarification│
└──────────────────┬───────────────────────┘
                   ▼
┌──────────────────────────────────────────┐
│  11. positionNodes                       │
│     BFS layout from trigger nodes:       │
│     - Triggers at x=250                  │
│     - Each level: x += 250              │
│     - Nodes in same level: y spacing 100 │
│     - Centered vertically               │
│     Skip if all nodes already positioned │
└──────────────────────────────────────────┘
```

---

## Credential Resolution

When deploying, credentials are resolved through a 4-step priority chain. **All unresolved credentials block deployment** — the workflow is never created on n8n without full credential resolution.

```
For each credType required by the workflow:
    │
    ├── 1. Credential Store (DB)
    │      credStore.get(userId, credType)
    │      Previously cached from successful resolutions
    │      └── Found → use it ✓
    │
    ├── 2. Static Config
    │      character.settings.workflows.credentials[credType]
    │      Name tolerance: "gmailOAuth2" ↔ "gmailOAuth2Api"
    │      └── Found → use it ✓
    │
    ├── 3. External Provider
    │      credProvider.resolve(userId, credType)
    │      │
    │      ├── { status: 'resolved', credentialId }
    │      │    → cache in DB for next time → use it ✓
    │      │
    │      ├── { status: 'needs_auth', authUrl }
    │      │    → add to missingConnections (with authUrl) ✗
    │      │
    │      └── null → fall through
    │
    └── 4. Missing
           Add to missingConnections (without authUrl) ✗
```

### Deploy Blocking

```
resolveCredentials returns missingConnections[]
    │
    ├── missingConnections.length > 0
    │     → Deploy BLOCKED
    │     → Return { id: '', missingCredentials: [...] }
    │     → Action shows AUTH_REQUIRED with auth links
    │     → Draft stays in cache
    │     → User connects services, comes back to say "deploy"
    │     → On retry: resolveCredentials checks again → resolved this time
    │
    └── missingConnections.length === 0
          → All resolved
          → Inject credential IDs into workflow nodes
          → POST /api/v1/workflows → activate → tag
          → Return { id, name, active, nodeCount, missingCredentials: [] }
```

### Credential Injection

Resolved credential IDs are injected into the workflow nodes:

```typescript
// Before injection
node.credentials = {
  gmailOAuth2Api: { id: "PLACEHOLDER", name: "Gmail" }
}

// After injection (credentialMap has gmailOAuth2Api → "cred_gmail_123")
node.credentials = {
  gmailOAuth2Api: { id: "cred_gmail_123", name: "Gmail" }
}
```

### Name Tolerance

The resolver handles naming mismatches between LLM output and config:
- `gmailOAuth2` matches config key `gmailOAuth2Api` (appends `Api`)
- `gmailOAuth2Api` matches config key `gmailOAuth2` (strips `Api`)

---

## Other Actions

### ACTIVATE_N8N_WORKFLOW

Activates a workflow to start processing triggers.

**Draft redirect**: if a pending draft exists when ACTIVATE is triggered, the handler assumes the LLM misrouted a confirmation and **deploys the draft** instead.

```
ACTIVATE handler
    │
    ├── Pending draft (not expired)?
    │     │
    │     ├── Draft needs clarification? → prompt user
    │     │
    │     └── Draft complete → deployWorkflow
    │           │
    │           ├── Unresolved credentials? → show auth links (draft kept)
    │           │
    │           └── Deployed → show success (draft cleared)
    │
    └── No draft → semantic workflow matching → activate matched workflow
```

### DEACTIVATE_N8N_WORKFLOW

Deactivates a workflow to stop automatic execution.

```
1. List user's workflows
2. matchWorkflow (LLM semantic matching)
3. confidence > none → deactivate matched workflow
   confidence = none → list all workflows, ask user to specify
```

### DELETE_N8N_WORKFLOW

Permanently deletes a workflow. Same semantic matching flow as DEACTIVATE.

### GET_N8N_EXECUTIONS

Shows execution history for a workflow (last 10 runs).

```
1. Get workflowId from state
2. Fetch executions from n8n API
3. Format with status emojis: ✅ success, ❌ error, ⏳ running, ⏸️ other
4. Show start time, finish time, error messages
```

---

## Providers

### PENDING_WORKFLOW_DRAFT

**Critical for action routing.** Without this provider, the LLM would route confirmation messages ("yes", "deploy it") to the generic REPLY action instead of `CREATE_N8N_WORKFLOW`.

When a draft exists in cache:
- Injects a context block into the LLM state
- Describes the pending draft (name, nodes)
- Instructs the LLM that ANY message about the draft MUST trigger `CREATE_N8N_WORKFLOW`
- Sets `data.hasPendingDraft = true` and `values.hasPendingDraft = true`

When no draft exists (or expired):
- Returns empty: `{ text: '', data: {}, values: {} }`

### ACTIVE_N8N_WORKFLOWS

Enriches LLM context with the user's workflow list (up to 20 workflows). This enables semantic matching — the LLM can see workflow names, IDs, and statuses when the user says "activate my Stripe workflow".

### n8n_workflow_status

Shows detailed workflow status including last execution info. Displays up to 10 workflows with status emojis (✅ active, ⏸️ inactive) and last run result.

---

## LLM Response Formatting

All user-facing messages from `CREATE_N8N_WORKFLOW` are generated by the LLM via `formatActionResponse`. No hardcoded strings.

```
formatActionResponse(runtime, responseType, data)
    │
    ▼
runtime.useModel(TEXT_SMALL, {
  prompt: ACTION_RESPONSE_SYSTEM_PROMPT
         + "\n\nType: " + responseType
         + "\n\n" + JSON.stringify(data)
})
    │
    ▼
LLM composes response in the user's conversation language
    │
    ▼
callback({ text: response })  →  sent verbatim to user
```

**System prompt rules:**
- Include ALL provided data exactly (names, IDs, URLs) — never omit, never modify
- ONLY use information from the provided data — never invent details
- Be concise — no filler

**Multi-language support**: since the LLM generates the response text, it naturally responds in whatever language the conversation is happening in. No translation tables or locale files needed.

---

## Database Schema

PostgreSQL schema `n8n_workflow` with one table, managed by Drizzle ORM:

```sql
CREATE SCHEMA n8n_workflow;

CREATE TABLE n8n_workflow.credential_mappings (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           TEXT        NOT NULL,
    cred_type         TEXT        NOT NULL,
    n8n_credential_id TEXT        NOT NULL,
    created_at        TIMESTAMP   DEFAULT now() NOT NULL,
    updated_at        TIMESTAMP   DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX idx_user_cred ON n8n_workflow.credential_mappings (user_id, cred_type);
```

Used by `N8nCredentialStore` to cache resolved credential IDs. Upsert on conflict `(userId, credType)` — when a credential is re-resolved, `updated_at` is refreshed.

---

## Types Reference

### Core Workflow Types

```typescript
interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: N8nConnections;
  active?: boolean;
  settings?: {
    executionOrder?: 'v1' | 'v0';
    timezone?: string;
    // ... other execution settings
  };
  _meta?: WorkflowMeta;   // internal only — NOT sent to n8n API
}

interface WorkflowMeta {
  assumptions?: string[];           // LLM assumptions shown in preview
  suggestions?: string[];           // LLM suggestions shown in preview
  requiresClarification?: string[]; // questions for the user
}

interface N8nNode {
  name: string;
  type: string;                     // e.g. "n8n-nodes-base.gmail"
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
  disabled?: boolean;
  // ... other optional fields (notes, color, continueOnFail, etc.)
}

interface N8nConnections {
  [nodeName: string]: {
    [outputType: string]: Array<Array<{
      node: string;
      type: string;
      index: number;
    }>>;
  };
}
```

### Draft/Intent Types

```typescript
interface WorkflowDraft {
  workflow: N8nWorkflow;
  prompt: string;
  userId: string;
  createdAt: number;         // Date.now() — for 30-min TTL
}

interface DraftIntentResult {
  intent: 'confirm' | 'cancel' | 'modify' | 'new' | 'show_preview';
  modificationRequest?: string;
  reason: string;
}
```

### Credential Types

```typescript
type CredentialProviderResult =
  | { status: 'resolved'; credentialId: string }
  | { status: 'needs_auth'; authUrl: string }
  | null;

interface MissingConnection {
  credType: string;
  authUrl?: string;          // present if needs_auth
}

interface CredentialResolutionResult {
  workflow: N8nWorkflow;                    // with injected credential IDs
  missingConnections: MissingConnection[];  // all unresolved credentials
  injectedCredentials: Map<string, string>; // credType → n8nCredId
}

interface WorkflowCreationResult {
  id: string;                               // '' if deploy blocked
  name: string;
  active: boolean;
  nodeCount: number;
  missingCredentials: MissingConnection[];  // empty if all resolved
}
```

### Semantic Matching Types

```typescript
interface WorkflowMatchResult {
  matchedWorkflowId: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  matches: Array<{ id: string; name: string; score: number }>;
  reason: string;
}
```

---

## Project Structure

```
src/
├── index.ts                     # Plugin registration (services, actions, providers, schema)
├── actions/
│   ├── createWorkflow.ts        # CREATE — draft/preview/confirm state machine
│   ├── activateWorkflow.ts      # ACTIVATE — with draft redirect logic
│   ├── deactivateWorkflow.ts    # DEACTIVATE — semantic matching
│   ├── deleteWorkflow.ts        # DELETE — semantic matching
│   └── getExecutions.ts         # GET_EXECUTIONS — execution history
├── providers/
│   ├── pendingDraft.ts          # Injects draft context for LLM routing
│   ├── activeWorkflows.ts       # User's workflow list for semantic matching
│   └── workflowStatus.ts       # Workflow status + last execution
├── services/
│   ├── n8n-workflow-service.ts  # Main service (RAG pipeline, deploy, CRUD)
│   └── n8n-credential-store.ts  # DB-backed credential store (Drizzle ORM)
├── prompts/
│   ├── workflowGeneration.ts    # System prompt for workflow generation
│   ├── keywordExtraction.ts     # System prompt for keyword extraction
│   ├── workflowMatching.ts      # System prompt for semantic matching
│   ├── draftIntent.ts           # System prompt for intent classification
│   ├── parameterCorrection.ts   # System prompt for parameter name correction
│   └── actionResponse.ts        # System prompt for response formatting
├── schemas/
│   ├── keywordExtraction.ts     # JSON schema for keyword output
│   ├── workflowMatching.ts      # JSON schema for matching output
│   └── draftIntent.ts           # JSON schema for intent output
├── types/
│   └── index.ts                 # All TypeScript interfaces and types
├── data/                        # Generated data (run `bun run crawl`)
│   ├── defaultNodes.json        # 457 n8n node definitions (types, params, versions)
│   ├── schemaIndex.json         # Output schemas per node/resource/operation
│   ├── triggerSchemaIndex.json  # Trigger output schemas (captured from n8n)
│   └── langchain-output-schemas.json  # Manual overrides for langchain nodes
├── db/
│   └── schema.ts                # Drizzle ORM schema (PostgreSQL)
└── utils/
    ├── api.ts                   # n8n REST API client (workflows, executions, tags, creds)
    ├── catalog.ts               # Node catalog (457 nodes) + keyword scoring
    ├── context.ts               # Conversation context builder + user tag naming
    ├── credentialResolver.ts    # 4-step credential resolution chain
    ├── generation.ts            # LLM utilities (extract, generate, match, classify, format)
    ├── outputSchema.ts          # Output schema validation + expression parsing
    └── workflow.ts              # Validation, positioning, corrections, auto-fix

scripts/
├── crawl.ts                     # Master crawl (runs all 3 steps below)
├── crawl-nodes.ts               # Step 1: Extract node defs from n8n-nodes-base
├── crawl-output-schemas.ts      # Step 2: Extract output schemas from __schema__/ dirs
├── crawl-triggers-live.ts       # Step 3: Capture trigger schemas from live n8n
└── crawl-triggers-static.ts     # Alternative: Extract trigger schemas from code + OpenAPI specs
```

---

## Data Generation

The plugin relies on three generated data files in `src/data/`. These are **not committed to git** — they are regenerated by `bun run crawl`.

### `bun run crawl`

Runs three steps:

| Step | Script | Generates | Requires |
|------|--------|-----------|----------|
| 1/3 | `crawl-nodes.ts` | `defaultNodes.json` — 457 node definitions with parameters, versions, credentials | n8n-nodes-base package |
| 2/3 | `crawl-output-schemas.ts` | `schemaIndex.json` — output schemas per node/resource/operation | n8n-nodes-base `__schema__/` dirs + langchain overrides |
| 3/3 | `crawl-triggers-live.ts` | `triggerSchemaIndex.json` — trigger output schemas | `N8N_HOST` + `N8N_API_KEY` env vars |

**Step 3 is skipped** if `N8N_HOST` / `N8N_API_KEY` are not set (a warning is printed).

### Output Schema System

The LLM receives output schemas during workflow generation to prevent hallucinated field paths:

- **n8n-nodes-base nodes**: Schemas are crawled from `__schema__/` directories in the npm package
- **@n8n/n8n-nodes-langchain nodes**: No `__schema__/` dirs exist — schemas are defined in `src/data/langchain-output-schemas.json` and merged at crawl time
- **Trigger nodes**: Schemas are captured from real n8n executions via `crawl-triggers-live.ts`

The generation prompt includes output schemas for all relevant nodes, so the LLM uses correct field paths like `$json.output[0].content[0].text` instead of inventing wrong ones like `$json.choices[0].message.content`.

As a safety net, `validateOutputReferences` checks all `$json` expressions against schemas post-generation and `correctFieldReferences` (LLM) fixes any remaining invalid paths.

---

## Development

### Prerequisites

| Requirement | Purpose |
|-------------|---------|
| [Bun](https://bun.sh) | Runtime and package manager |
| `N8N_HOST` | n8n instance URL (for trigger schema capture) |
| `N8N_API_KEY` | n8n API key (for trigger schema capture) |

### Setup

```bash
bun install                                    # Install dependencies
N8N_HOST=https://... N8N_API_KEY=... bun run crawl  # Generate data files
bun run build                                  # Compile TypeScript
```

### Commands

```bash
bun run crawl          # Generate all data files (nodes + schemas + triggers)
bun run crawl:nodes    # Generate only defaultNodes.json
bun run crawl:schemas  # Generate only schemaIndex.json
bun run build          # Compile TypeScript
bun test               # Run all tests (~260 tests)
bun run test:unit      # Run unit tests only
bun run test:integration # Run integration tests only
bun run test:e2e       # Run e2e tests only
bun run lint           # Lint
bun run format         # Format
```

## License

MIT

---

## Milady Fork — Sync Process & Upstream Patches

This is a Milady-vendored fork of `@elizaos/plugin-n8n-workflow`. The fork lives under `eliza/plugins/plugin-n8n-workflow/` (git submodule) so we can patch behavior the upstream package does not yet expose. Until the upstream rebases on `@elizaos/core@2.x`, the fork is the canonical source of truth for Milady's local development checkouts (resolved via `workspace:*` dependency from `@elizaos/plugin-n8n-workflow` consumers).

### Why this fork exists

- **peerDep core version mismatch.** Upstream's `package.json` declares `"@elizaos/core": "1.7.2"`. Milady's workspace ships `@elizaos/core@2.0.0-alpha.*` (alpha dist-tag). A clean `tsc` against Milady's installed `node_modules/@elizaos/core` fails on type-shape mismatches in unrelated files (e.g. `src/utils/api.ts`, `src/actions/createWorkflow.ts`, `src/routes/workflows.ts`). Until the plugin is rebased on current core, `dist/` is committed in this fork as the runtime artifact and ships alongside source.
- **Extension points the plugin doesn't expose upstream.** Milady needs to surface runtime facts (Discord guild/channel IDs, the user's Gmail email, supported credential types) and bias keyword extraction toward host-supported providers — neither hook exists in upstream v1.2.10 or v1.2.11.

### Upstream tracking

- Remote: `https://github.com/elizaos-plugins/plugin-n8n-workflow.git` (branch `main`).
- Fork base: **v1.2.10** (commit `ddc4c46`).
- Upstream HEAD at the time of writing: **v1.2.11** (`10c4670`). Rebase onto v1.2.11 not yet attempted.

### Patches over upstream — candidates for upstream PRs

Three Milady commits are clean upstream candidates. They have no Milady-specific dependencies and would benefit any consumer of the plugin:

| Commit | Title | Notes |
|--------|-------|-------|
| `8103a3e` | feat(prompt,types): add RuntimeContextProvider extension point + harden credentials/runtime-facts/output-field rules | Adds the `n8n_runtime_context_provider` service-discovery hook + promotes Section 6 to MANDATORY INVARIANT in `WORKFLOW_GENERATION_SYSTEM_PROMPT` + adds `## Runtime Facts — substitute, do not placeholder` and `## Node Output Field Names — exact match only` sections. |
| `13bc6bc` | feat(workflow): deterministic injectMissingCredentialBlocks safety net | Post-LLM, pre-validation deterministic pass that attaches a `credentials: { [credType]: { id: "{{CREDENTIAL_ID}}", name } }` block to every node whose definition requires one. Backstops occasional LLM omissions even when the prompt declares the rule MANDATORY. |
| `90b73bc` | feat(prompt,types,service): preferredProviders bias hint for keyword extraction | Adds optional `preferredProviders?: string[]` to `RuntimeContext`, threads it into `extractKeywords` via `KEYWORD_EXTRACTION_SYSTEM_PROMPT`. Lets the host nudge the LLM toward provider-specific keywords (e.g. "gmail" instead of "imap" when the user says "my emails"). |

### Milady-specific (NOT upstreamable)

- `dist/` checked into git. Workaround for the build-from-src failure described above. If the plugin rebases on `@elizaos/core@2.x`, this can be undone (delete `dist/` from `.gitignore` allow-list, switch to standard `tsc`-on-publish).
- `.gitignore` change to allow `dist/` (mirror of the above).
- `src/data/{defaultNodes,schemaIndex,triggerSchemaIndex}.json` are gitignored both upstream and in the fork. Tests need them at `src/data/`, but they are generated by `bun run crawl` and only committed under `dist/data/`. For tests, copy from `dist/data/` to `src/data/` (this is what Session 20's setup does — see "Manual sync process" below).

### Manual sync process — when upstream releases v1.2.12+

Run from `eliza/plugins/plugin-n8n-workflow/`:

```bash
# 1. Fetch upstream
git fetch origin main
git fetch origin --tags

# 2. Branch from current HEAD for the rebase attempt
git checkout -b sync-vX.Y.Z

# 3. Rebase onto the new upstream tag
git rebase vX.Y.Z

# Conflicts most likely in:
#   src/types/index.ts                    — RuntimeContext + RuntimeContextProvider
#   src/utils/generation.ts               — extractKeywords, generateWorkflow,
#                                            modifyWorkflow, buildRuntimeContextSections
#   src/utils/workflow.ts                 — injectMissingCredentialBlocks
#   src/services/n8n-workflow-service.ts  — fetchRuntimeContext + early-context call
#   src/prompts/workflowGeneration.ts     — Section 6 + Runtime Facts + Output Fields
#   src/prompts/keywordExtraction.ts      — preferredProviders bias directive

# 4. Rebuild dist (skipping pre-existing tsc errors that don't touch our patches)
bun install
bun run build || true   # tsc may surface unrelated peerDep errors; check that
                        # OUR files (src/types/index.ts, src/utils/generation.ts,
                        # src/services/n8n-workflow-service.ts, src/prompts/*)
                        # produced clean dist/ output before continuing

# 5. Stage src/data files for tests if missing
cp dist/data/defaultNodes.json dist/data/schemaIndex.json \
   dist/data/triggerSchemaIndex.json src/data/

# 6. Run plugin tests
bun test __tests__/unit/generation.test.ts
# Note: a small number of tests may be expected-failing if upstream changed
# the WORKFLOW_GENERATION_SYSTEM_PROMPT shape (e.g. "no output schema section
# when nodes have no schemas" depends on the prompt template state). Diff
# expected vs actual and update test assertions if upstream's structural
# changes are reasonable.

# 7. Commit dist deltas separately (so the patch+rebuild split is auditable)
git add src/types src/utils src/services src/prompts __tests__/
git commit -m "feat: sync to upstream vX.Y.Z + Milady patches"
git add dist/
git commit -m "chore(dist): rebuild after upstream sync to vX.Y.Z"

# 8. Point Milady's eliza submodule at the new HEAD
cd ../../..
git -C eliza add plugins/plugin-n8n-workflow
git -C eliza commit -m "chore(n8n): sync plugin fork to upstream vX.Y.Z"

# 9. Bump parent develop's eliza pointer
cd ..
git add eliza
git commit -m "chore(eliza): bump submodule for n8n plugin sync to vX.Y.Z"

# 10. Live dogfood — run the canonical mission prompt through Milady
#     to confirm the end-to-end chain still works:
#         "every morning at 8am send me a summary of my Gmail inbox to my
#          Discord channel #general"
#     and check that:
#       - the planner picks CREATE_N8N_WORKFLOW
#       - extractKeywords emits gmail/discord (not imap/webhook)
#       - workflow JSON has credentials blocks attached
#       - cron fires (forced via n8n's executor) and Discord receives the post
```

### Future — opening upstream PRs

Once the fork stabilizes through dogfood, file three separate PRs against `elizaos-plugins/plugin-n8n-workflow`:

1. **`feat(types,service): add RuntimeContextProvider extension point`** (commit `8103a3e`) — clean service-discovery hook with no breaking changes. Highest leverage for any host that wants to surface runtime facts to the LLM.
2. **`feat(workflow): injectMissingCredentialBlocks safety net`** (commit `13bc6bc`) — purely post-generation, opt-in by virtue of the upstream prompt requiring credentials blocks. Reduces user-visible "credentials missing" errors.
3. **`feat(generation): preferredProviders keyword-extraction bias`** (commit `90b73bc`) — optional, host-driven. Backward-compatible: hosts that don't supply `preferredProviders` get the unmodified prompt.

The prompt-hardening rules folded into commit `8103a3e` (Section 6 promotion + Runtime Facts substitution + Output Field exact match) can also stand alone if the maintainers prefer separate review of the prompt vs the type changes.

When all three land upstream (or are accepted in some form), Milady can drop this fork by removing the submodule and switching the `workspace:*` dep back to a pinned npm version.

