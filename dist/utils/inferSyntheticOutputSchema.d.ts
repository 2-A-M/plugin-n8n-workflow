/**
 * Synthetic output-schema inference for nodes whose output keys are
 * deterministically derivable from their parameters (Summarize, Set, etc.).
 * For nodes with arbitrary user-defined output (Code, Function), returns
 * null — callers should skip downstream field validation rather than
 * false-error.
 *
 * Returning null = "unknowable, do not validate". Returning an empty array
 * also means "unknowable" but signals the caller can warn loudly. We use
 * null (skip) for Code/Function and a populated array for Summarize/Set.
 */
import type { N8nNode } from '../types/index';
/**
 * Returns top-level output field names this node will emit, when derivable
 * from parameters alone. Returns `null` when the schema is unknowable
 * (Code, Function, AI Agent, custom) — callers should treat null as
 * "skip field validation against this node's output", NOT as "no fields".
 */
export declare function inferSyntheticOutputSchema(node: N8nNode): string[] | null;
//# sourceMappingURL=inferSyntheticOutputSchema.d.ts.map