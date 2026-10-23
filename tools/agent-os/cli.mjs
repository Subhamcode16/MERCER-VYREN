import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import { buildGraph, loadGraph, searchGraph } from './graph.mjs';

const [command, ...args] = process.argv.slice(2);
const tasksPath = path.join(import.meta.dirname, 'tasks.json');
if (command === 'index') {
  const graph = buildGraph(loadGraph());
  console.log(JSON.stringify({ files: graph.nodes.filter(n => n.type === 'file').length, symbols: graph.nodes.filter(n => n.type === 'symbol').length, imports: graph.edges.filter(e => e.type === 'IMPORTS').length, generatedAt: graph.generatedAt }, null, 2));
} else if (command === 'search') {
  console.log(JSON.stringify(searchGraph(buildGraph(loadGraph()), args.join(' ')), null, 2));
} else if (command === 'neighbors') {
  const graph = buildGraph(loadGraph());
  const id = args[0];
  const edges = graph.edges.filter(edge => edge.from === id || edge.to === id).slice(0, 50);
  const ids = new Set(edges.flatMap(edge => [edge.from, edge.to]));
  console.log(JSON.stringify({ nodes: graph.nodes.filter(node => ids.has(node.id)), edges }, null, 2));
} else if (command === 'tasks') {
  console.log(JSON.stringify(JSON.parse(readFileSync(tasksPath, 'utf8')).tasks, null, 2));
} else if (command === 'move') {
  const [id, stage] = args;
  const valid = new Set(['Backlog', 'Research', 'Ready', 'In Progress', 'Review', 'Done']);
  if (!valid.has(stage)) throw new Error('Invalid stage');
  const board = JSON.parse(readFileSync(tasksPath, 'utf8'));
  const task = board.tasks.find(item => item.id === id);
  if (!task) throw new Error('Unknown task');
  task.stage = stage;
  task.updatedAt = new Date().toISOString();
  board.updatedAt = task.updatedAt;
  writeFileSync(tasksPath + '.tmp', JSON.stringify(board, null, 2) + '\n');
  renameSync(tasksPath + '.tmp', tasksPath);
  console.log(`${id} → ${stage}`);
} else {
  console.log('Usage: node cli.mjs index | search <words> | neighbors <node-id> | tasks | move <id> <stage>');
}
