import http from 'node:http';
import { readFileSync, writeFileSync, renameSync, statSync } from 'node:fs';
import path from 'node:path';
import { buildGraph, loadGraph, searchGraph, ROOT } from './graph.mjs';

const DIR = import.meta.dirname;
const TASKS = path.join(DIR, 'tasks.json');
const ACTIVITY = path.join(DIR, '.cache', 'activity.jsonl');
const PORT = Number(process.env.AGENT_OS_PORT || 4177);
const STAGES = new Set(['Backlog', 'Research', 'Ready', 'In Progress', 'Review', 'Done']);
const clients = new Set();
let graph = loadGraph();
let lastTaskStamp = statSync(TASKS).mtimeMs;
let refreshBusy = false;

const send = (res, status, body, type = 'application/json; charset=utf-8') => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
};
const broadcast = event => {
  for (const client of clients) {
    try { client.write(`data: ${JSON.stringify(event)}\n\n`); }
    catch { clients.delete(client); }
  }
};
const tasks = () => JSON.parse(readFileSync(TASKS, 'utf8'));
const activity = () => {
  try { return readFileSync(ACTIVITY, 'utf8').trim().split('\n').filter(Boolean).slice(-60).reverse().map(JSON.parse); }
  catch { return []; }
};
function saveTask(id, stage) {
  if (!STAGES.has(stage)) throw new Error('Invalid stage');
  const data = tasks();
  const task = data.tasks.find(item => item.id === id);
  if (!task) throw new Error('Unknown task');
  const previous = task.stage;
  if (previous === stage) return data;
  task.stage = stage;
  task.updatedAt = new Date().toISOString();
  data.updatedAt = task.updatedAt;
  writeFileSync(TASKS + '.tmp', JSON.stringify(data, null, 2) + '\n');
  renameSync(TASKS + '.tmp', TASKS);
  writeFileSync(ACTIVITY, JSON.stringify({ at: task.updatedAt, taskId: id, title: task.title, from: previous, to: stage }) + '\n', { flag: 'a' });
  lastTaskStamp = statSync(TASKS).mtimeMs;
  broadcast({ type: 'tasks' });
  return data;
}

async function refresh() {
  if (refreshBusy) return;
  refreshBusy = true;
  try {
    const stamp = statSync(TASKS).mtimeMs;
    if (stamp !== lastTaskStamp) { lastTaskStamp = stamp; broadcast({ type: 'tasks' }); }
    const next = buildGraph(graph);
    if (next.fingerprint !== graph.fingerprint) { graph = next; broadcast({ type: 'graph' }); }
  } catch (error) { console.error('Index refresh failed:', error.message); }
  finally { refreshBusy = false; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname === '/api/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': connected\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return;
  }
  if (req.method === 'GET' && url.pathname === '/api/state') return send(res, 200, { board: tasks(), activity: activity(), graph: { generatedAt: graph.generatedAt, files: graph.nodes.filter(n => n.type === 'file').length, symbols: graph.nodes.filter(n => n.type === 'symbol').length, edges: graph.edges.length } });
  if (req.method === 'GET' && url.pathname === '/api/search') return send(res, 200, { query: url.searchParams.get('q') || '', results: searchGraph(graph, url.searchParams.get('q') || '', 30) });
  if (req.method === 'GET' && /^\/api\/evidence\/[A-Z0-9-]+$/.test(url.pathname)) {
    const task = tasks().tasks.find(item => item.id === url.pathname.split('/')[3]);
    if (!task?.evidence) return send(res, 404, { error: 'No evidence attached' });
    const file = path.resolve(ROOT, task.evidence);
    if (!file.startsWith(ROOT + path.sep) || !file.endsWith('.md')) return send(res, 403, { error: 'Evidence path denied' });
    try { return send(res, 200, { path: task.evidence, content: readFileSync(file, 'utf8').slice(0, 200000) }); }
    catch { return send(res, 404, { error: 'Evidence file missing' }); }
  }
  if (req.method === 'GET' && url.pathname === '/api/neighbor') {
    const id = url.searchParams.get('id') || '';
    const edges = graph.edges.filter(edge => edge.from === id || edge.to === id).slice(0, 50);
    const ids = new Set(edges.flatMap(edge => [edge.from, edge.to]));
    return send(res, 200, { nodes: graph.nodes.filter(node => ids.has(node.id)), edges });
  }
  if (req.method === 'POST' && /^\/api\/tasks\/[A-Z0-9-]+\/stage$/.test(url.pathname)) {
    const origin = req.headers.origin;
    if (origin && origin !== `http://127.0.0.1:${PORT}` && origin !== `http://localhost:${PORT}`) return send(res, 403, { error: 'Invalid origin' });
    if (!req.headers['content-type']?.startsWith('application/json')) return send(res, 415, { error: 'Expected JSON' });
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 2048) return send(res, 413, { error: 'Request too large' }); }
    try { return send(res, 200, saveTask(url.pathname.split('/')[3], JSON.parse(body).stage)); }
    catch (error) { return send(res, 400, { error: error.message }); }
  }
  const staticFiles = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/styles.css': ['styles.css', 'text/css; charset=utf-8'] };
  if (req.method === 'GET' && staticFiles[url.pathname]) {
    const [file, type] = staticFiles[url.pathname];
    return send(res, 200, readFileSync(path.join(DIR, file), 'utf8'), type);
  }
  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => console.log(`VYREN Agent OS board: http://127.0.0.1:${PORT}`));
setInterval(refresh, 5000).unref();
setInterval(() => broadcast({ type: 'heartbeat', at: new Date().toISOString() }), 25000).unref();
