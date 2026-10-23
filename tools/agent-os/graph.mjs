import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const CACHE = path.join(import.meta.dirname, '.cache', 'graph.json');
const SCOPES = [
  'Visual-Intelligence', 'docs', 'scripts', 'tests', 'tools/agent-os',
  'AGENTS.md', 'README.md', 'implementation_plan.md',
  'ILYREN-VYREN-CANONICAL-PRODUCT-CONTEXT.md',
];
const EXTENSIONS = new Set(['.py', '.ts', '.tsx', '.js', '.jsx', '.md']);
const EXCLUDED = ['tests/archive/', 'Visual-Intelligence/product/backend/.venv/'];
const clean = value => value.replaceAll('\\', '/');
const sha = value => createHash('sha256').update(value).digest('hex');

export function sourceFiles() {
  const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', ...SCOPES], { cwd: ROOT, encoding: 'utf8' });
  return [...new Set(output.split(/\r?\n/).map(clean).filter(Boolean))]
    .filter(file => EXTENSIONS.has(path.extname(file).toLowerCase()) && !EXCLUDED.some(prefix => file.startsWith(prefix)) && !file.includes('/node_modules/') && !file.includes('/.cache/'))
    .sort();
}

function extract(file, source) {
  const symbols = [];
  const imports = [];
  const terms = {};
  let termCount = 0;
  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (file.endsWith('.md')) {
      const heading = /^#{1,6}\s+(.{3,120})/.exec(line);
      if (heading) symbols.push({ name: heading[1].trim(), line: index + 1 });
      for (const term of line.toLowerCase().match(/[a-z][a-z0-9_-]{3,}/g) || []) {
        if (termCount >= 6000) break;
        if (terms[term] === undefined) { terms[term] = index + 1; termCount++; }
      }
    }
    const definition = file.endsWith('.py')
      ? /^\s*(?:async\s+)?(?:class|def)\s+([A-Za-z_][\w]*)/.exec(line)
      : /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:class|function|interface|type|const)\s+([A-Za-z_$][\w$]*)/.exec(line);
    if (definition) symbols.push({ name: definition[1], line: index + 1 });
    const pythonImport = /^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/.exec(line);
    const jsImport = /\b(?:from\s+|import\s*\()['"]([^'"]+)['"]/.exec(line);
    const imported = pythonImport?.[1] ?? pythonImport?.[2] ?? jsImport?.[1];
    if (imported) imports.push({ specifier: imported, line: index + 1 });
  }
  return { symbols, imports, terms };
}

function resolveImport(file, specifier, available) {
  let base;
  if (specifier.startsWith('.')) base = clean(path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)));
  else if (file.endsWith('.py') && specifier.startsWith('src.')) base = 'Visual-Intelligence/product/backend/' + specifier.replaceAll('.', '/');
  else return null;
  for (const candidate of [base, ...['.py','.ts','.tsx','.js','.jsx','/index.ts','/index.tsx','/__init__.py'].map(suffix => base + suffix)]) {
    if (available.has(candidate)) return candidate;
  }
  return null;
}

export function buildGraph(previous = null) {
  const files = sourceFiles();
  const available = new Set(files);
  const nodes = [];
  const edges = [];
  const inventory = [];
  const records = {};
  for (const file of files) {
    let stats;
    try { stats = statSync(path.join(ROOT, file)); }
    catch { continue; }
    const cached = previous?.version === 3 ? previous.records?.[file] : null;
    let record = cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size ? cached : null;
    if (!record) {
      const source = readFileSync(path.join(ROOT, file), 'utf8');
      record = { mtimeMs: stats.mtimeMs, size: stats.size, hash: sha(source), ...extract(file, source) };
    }
    records[file] = record;
    const fileId = `file:${file}`;
    nodes.push({ id: fileId, type: 'file', label: path.posix.basename(file), path: file, hash: record.hash, modifiedAt: stats.mtime.toISOString() });
    inventory.push([file, stats.mtimeMs, stats.size]);
    for (const symbol of record.symbols) {
      const id = `symbol:${file}:${symbol.line}:${symbol.name}`;
      nodes.push({ id, type: 'symbol', label: symbol.name, path: file, line: symbol.line });
      edges.push({ from: fileId, to: id, type: 'DEFINES', line: symbol.line });
    }
    for (const entry of record.imports) {
      const target = resolveImport(file, entry.specifier, available);
      if (target) edges.push({ from: fileId, to: `file:${target}`, type: 'IMPORTS', line: entry.line });
    }
  }
  const fingerprint = sha(JSON.stringify(inventory));
  if (previous?.version === 3 && previous.records && previous.fingerprint === fingerprint) return previous;
  const graph = { version: 3, scope: SCOPES, generatedAt: new Date().toISOString(), fingerprint, nodes, edges, records };
  mkdirSync(path.dirname(CACHE), { recursive: true });
  writeFileSync(CACHE + '.tmp', JSON.stringify(graph));
  renameSync(CACHE + '.tmp', CACHE);
  return graph;
}

export function loadGraph() {
  try { return JSON.parse(readFileSync(CACHE, 'utf8')); }
  catch { return buildGraph(); }
}

export function searchGraph(graph, query, limit = 20) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return graph.nodes.map(node => {
    const label = node.label.toLowerCase();
    const full = `${label} ${node.path.toLowerCase()}`;
    const indexedTerms = node.type === 'file' ? graph.records?.[node.path]?.terms || {} : {};
    const score = terms.every(term => full.includes(term) || indexedTerms[term] !== undefined)
      ? terms.reduce((sum, term) => sum + (label.includes(term) ? 5 : full.includes(term) ? 1 : 0.5), 0)
      : 0;
    const firstContentLine = terms.map(term => indexedTerms[term]).find(Boolean);
    return { ...node, ...(node.type === 'file' && score && firstContentLine ? { line: firstContentLine } : {}), score };
  }).filter(node => node.score).sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, Math.max(1, Math.min(limit, 100)));
}

export { ROOT, CACHE };
