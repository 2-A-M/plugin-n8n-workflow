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
/** n8n Summarize node aggregation → output prefix. Verified against actual
 *  n8n output during Session 20 dogfood (concatenate→concatenated_<field>,
 *  count→count_<field>). Update this map when new aggregations show up. */
const SUMMARIZE_AGG_PREFIX = {
    concatenate: 'concatenated',
    count: 'count',
    countUnique: 'uniqueCount',
    sum: 'sum',
    average: 'average',
    min: 'min',
    max: 'max',
    first: 'first',
    last: 'last',
    append: 'appended',
};
/** Returns top-level output field names a Summarize node will emit, derived
 *  from its `fieldsToSummarize.values[]` parameter. */
function inferSummarizeFields(node) {
    const fields = node.parameters
        ?.fieldsToSummarize;
    if (!fields?.values || !Array.isArray(fields.values))
        return null;
    const out = [];
    for (const entry of fields.values) {
        if (typeof entry?.aggregation !== 'string' || typeof entry?.field !== 'string')
            continue;
        const prefix = SUMMARIZE_AGG_PREFIX[entry.aggregation];
        if (!prefix)
            continue;
        out.push(`${prefix}_${entry.field}`);
    }
    return out.length > 0 ? out : null;
}
/** Returns field names a Set / EditFields node will emit, derived from
 *  `assignments.assignments[]` (modern Set node) or `values.<type>[]`
 *  (legacy Set node). */
function inferSetFields(node) {
    const params = node.parameters;
    if (!params)
        return null;
    // Modern Set / EditFields shape: assignments.assignments[i].name
    const modern = params.assignments;
    if (modern?.assignments && Array.isArray(modern.assignments)) {
        const names = modern.assignments
            .map((a) => a?.name)
            .filter((n) => typeof n === 'string' && n.length > 0);
        if (names.length > 0)
            return names;
    }
    // Legacy Set shape: values.{string,number,boolean}[i].name
    const legacy = params.values;
    if (legacy && typeof legacy === 'object') {
        const names = [];
        for (const arr of Object.values(legacy)) {
            if (!Array.isArray(arr))
                continue;
            for (const v of arr) {
                if (typeof v?.name === 'string' && v.name.length > 0)
                    names.push(v.name);
            }
        }
        if (names.length > 0)
            return names;
    }
    return null;
}
/**
 * Returns top-level output field names this node will emit, when derivable
 * from parameters alone. Returns `null` when the schema is unknowable
 * (Code, Function, AI Agent, custom) — callers should treat null as
 * "skip field validation against this node's output", NOT as "no fields".
 */
export function inferSyntheticOutputSchema(node) {
    switch (node.type) {
        case 'n8n-nodes-base.summarize':
            return inferSummarizeFields(node);
        case 'n8n-nodes-base.set':
        case 'n8n-nodes-base.editFields':
            return inferSetFields(node);
        // Arbitrary user output — schema unknowable without execution.
        case 'n8n-nodes-base.code':
        case 'n8n-nodes-base.function':
        case 'n8n-nodes-base.functionItem':
            return null;
        default:
            return null;
    }
}
//# sourceMappingURL=inferSyntheticOutputSchema.js.map