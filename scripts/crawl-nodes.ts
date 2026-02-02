/**
 * Extract all n8n node definitions from n8n-nodes-base and write to defaultNodes.json.
 *
 * Uses the pre-compiled types/nodes.json shipped with n8n-nodes-base
 * (no class instantiation needed — avoids missing peer-dependency issues).
 *
 * Requires n8n-nodes-base as a devDependency.
 * Run with: bun run crawl-nodes
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUTPUT = path.resolve(import.meta.dir, '..', 'src', 'data', 'defaultNodes.json');

const KEEP_KEYS = [
  'name',
  'displayName',
  'group',
  'description',
  'version',
  'inputs',
  'outputs',
  'properties',
  'credentials',
  'documentationUrl',
] as const;

async function main() {
  let nodesBasePath: string;
  try {
    nodesBasePath = require.resolve('n8n-nodes-base');
  } catch {
    console.error('n8n-nodes-base not found. Run: bun add -d n8n-nodes-base');
    process.exit(1);
  }

  const typesPath = path.join(nodesBasePath, '..', 'dist', 'types', 'nodes.json');
  console.log(`Reading ${typesPath} ...`);

  const raw = await readFile(typesPath, 'utf-8');
  const allNodes: Record<string, unknown>[] = JSON.parse(raw);
  console.log(`Found ${allNodes.length} node definitions`);

  // Deduplicate by name (some nodes appear multiple times for different versions)
  const seen = new Set<string>();
  const nodes: Record<string, unknown>[] = [];

  for (const node of allNodes) {
    const name = node.name as string;
    if (!name || seen.has(name)) continue;
    seen.add(name);

    const filtered: Record<string, unknown> = {};
    for (const key of KEEP_KEYS) {
      if (node[key] !== undefined) {
        filtered[key] = node[key];
      }
    }
    nodes.push(filtered);
  }

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(nodes, null, 2), 'utf-8');
  console.log(`Wrote ${nodes.length} unique nodes to ${OUTPUT}`);
}

main().catch((err) => {
  console.error('crawl-nodes failed:', err);
  process.exit(1);
});
