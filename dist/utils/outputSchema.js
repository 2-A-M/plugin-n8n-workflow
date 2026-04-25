import schemaIndex from '../data/schemaIndex.json' assert { type: 'json' };
import triggerSchemaIndex from '../data/triggerSchemaIndex.json' assert { type: 'json' };
const SCHEMA_INDEX = schemaIndex;
const TRIGGER_SCHEMAS = triggerSchemaIndex.triggers;
export function hasOutputSchema(nodeType) {
    return nodeType in SCHEMA_INDEX.nodeTypes;
}
export function getAvailableResources(nodeType) {
    const entry = SCHEMA_INDEX.nodeTypes[nodeType];
    if (!entry) {
        return [];
    }
    return Object.keys(entry.schemas);
}
export function getAvailableOperations(nodeType, resource) {
    const entry = SCHEMA_INDEX.nodeTypes[nodeType];
    if (!entry) {
        return [];
    }
    const resourceSchemas = entry.schemas[resource];
    if (!resourceSchemas) {
        return [];
    }
    return Object.keys(resourceSchemas);
}
export function loadOutputSchema(nodeType, resource, operation) {
    const entry = SCHEMA_INDEX.nodeTypes[nodeType];
    if (!entry) {
        return null;
    }
    const resourceSchemas = entry.schemas[resource];
    if (!resourceSchemas) {
        return null;
    }
    const schema = resourceSchemas[operation];
    if (!schema) {
        return null;
    }
    return {
        schema,
        fields: getTopLevelFields(schema),
    };
}
export function loadTriggerOutputSchema(nodeType, parameters) {
    if (parameters?.simple === false) {
        return null;
    }
    const entry = TRIGGER_SCHEMAS[nodeType];
    if (!entry?.outputSchema?.properties || Object.keys(entry.outputSchema.properties).length === 0) {
        return null;
    }
    return {
        schema: entry.outputSchema,
        fields: getTopLevelFields(entry.outputSchema),
    };
}
export function getTopLevelFields(schema) {
    if (!schema.properties) {
        return [];
    }
    return Object.keys(schema.properties);
}
/** Returns all field paths including nested (e.g., "from.value[0].address") */
export function getAllFieldPaths(schema, prefix = '') {
    return getAllFieldPathsTyped(schema, prefix).map((f) => f.path);
}
/** Returns field paths with their types (e.g., "snippet: string", "payload: object"). */
export function getAllFieldPathsTyped(schema, prefix = '') {
    const fields = [];
    const properties = schema.properties;
    if (!properties) {
        return fields;
    }
    for (const [key, value] of Object.entries(properties)) {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
            const propSchema = value;
            fields.push({ path: currentPath, type: propSchema.type || 'unknown' });
            if (propSchema.type === 'object' && propSchema.properties) {
                fields.push(...getAllFieldPathsTyped(propSchema, currentPath));
            }
            if (propSchema.type === 'array' && propSchema.items) {
                const items = propSchema.items;
                if (items.type === 'object' && items.properties) {
                    fields.push(...getAllFieldPathsTyped(items, `${currentPath}[0]`));
                }
            }
        }
    }
    return fields;
}
export function parseExpressions(parameters, parentPath = '') {
    const refs = [];
    for (const [key, value] of Object.entries(parameters)) {
        const currentPath = parentPath ? `${parentPath}.${key}` : key;
        if (typeof value === 'string') {
            refs.push(...extractExpressionsFromString(value, currentPath));
        }
        else if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                if (typeof value[i] === 'string') {
                    refs.push(...extractExpressionsFromString(value[i], `${currentPath}[${i}]`));
                }
                else if (typeof value[i] === 'object' && value[i] !== null) {
                    refs.push(...parseExpressions(value[i], `${currentPath}[${i}]`));
                }
            }
        }
        else if (typeof value === 'object' && value !== null) {
            refs.push(...parseExpressions(value, currentPath));
        }
    }
    return refs;
}
function extractExpressionsFromString(str, paramPath) {
    const refs = [];
    // Match every $json.field reference, even inside compound expressions like {{ $json.a || $json.b }}
    const simplePattern = /\$json\.([a-zA-Z0-9_.\[\]'"-]{1,200})/g;
    const namedNodePattern = /\$\(['"]([^'"]{1,100})['"]\)\.item\.json\.([a-zA-Z0-9_.\[\]'"-]{1,200})/g;
    let match;
    while ((match = simplePattern.exec(str)) !== null) {
        const field = match[1];
        refs.push({
            fullExpression: match[0],
            field,
            path: parseFieldPath(field),
            paramPath,
        });
    }
    while ((match = namedNodePattern.exec(str)) !== null) {
        const field = match[2];
        refs.push({
            fullExpression: match[0],
            field,
            path: parseFieldPath(field),
            paramPath,
            sourceNodeName: match[1],
        });
    }
    return refs;
}
/**
 * Parses "from.value[0].address" or "headers['content-type']" into path segments.
 */
function parseFieldPath(field) {
    const path = [];
    let current = '';
    let i = 0;
    while (i < field.length) {
        const char = field[i];
        if (char === '.') {
            if (current) {
                path.push(current);
                current = '';
            }
            i++;
        }
        else if (char === '[') {
            if (current) {
                path.push(current);
                current = '';
            }
            i++;
            if (i >= field.length) {
                break;
            }
            if (field[i] === "'" || field[i] === '"') {
                const quote = field[i];
                i++;
                while (i < field.length && field[i] !== quote) {
                    current += field[i];
                    i++;
                }
                i++;
            }
            else {
                while (i < field.length && field[i] !== ']') {
                    current += field[i];
                    i++;
                }
            }
            if (current) {
                path.push(current);
                current = '';
            }
            i++;
        }
        else {
            current += char;
            i++;
        }
    }
    if (current) {
        path.push(current);
    }
    return path;
}
export function fieldExistsInSchema(path, schema) {
    if (path.length === 0) {
        return false;
    }
    let current = schema;
    for (let i = 0; i < path.length; i++) {
        const segment = path[i];
        if (!current || typeof current !== 'object') {
            return false;
        }
        const properties = current.properties;
        if (!properties) {
            return false;
        }
        const prop = properties[segment];
        if (!prop) {
            return false;
        }
        if (i === path.length - 1) {
            return true;
        }
        if (prop.type === 'object') {
            current = prop;
        }
        else if (prop.type === 'array' && prop.items) {
            const nextSegment = path[i + 1];
            if (/^\d+$/.test(nextSegment)) {
                i++;
                current = prop.items;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }
    return false;
}
export function formatSchemaForPrompt(schema, maxDepth = 2) {
    const lines = [];
    function format(obj, depth, prefix) {
        const properties = obj.properties;
        if (!properties || depth > maxDepth) {
            return;
        }
        for (const [key, value] of Object.entries(properties)) {
            const prop = value;
            const type = prop.type;
            const path = prefix ? `${prefix}.${key}` : key;
            if (type === 'object' && prop.properties) {
                lines.push(`${path}: object`);
                format(prop, depth + 1, path);
            }
            else if (type === 'array' && prop.items) {
                const items = prop.items;
                if (items.type === 'object' && items.properties) {
                    lines.push(`${path}: array of objects`);
                    format(items, depth + 1, `${path}[0]`);
                }
                else {
                    lines.push(`${path}: array of ${items.type || 'unknown'}`);
                }
            }
            else {
                lines.push(`${path}: ${type || 'unknown'}`);
            }
        }
    }
    format(schema, 0, '');
    return lines.join('\n');
}
//# sourceMappingURL=outputSchema.js.map