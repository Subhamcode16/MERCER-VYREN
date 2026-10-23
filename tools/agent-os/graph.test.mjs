import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGraph, searchGraph } from './graph.mjs';

const graph = loadGraph();

test('finds a source definition with an exact line', () => {
  const result = searchGraph(graph, 'GovernancePolicyGate').find(node => node.label === 'GovernancePolicyGate');
  assert.equal(result?.path, 'Visual-Intelligence/product/backend/src/institutional_intelligence/governance/gate.py');
  assert.ok(result.line > 0);
});

test('preserves source-bearing import relationships', () => {
  const from = 'file:Visual-Intelligence/product/backend/src/agent_runtime/tools/governed_tool_registry.py';
  const to = 'file:Visual-Intelligence/product/backend/src/agent_runtime/policy/runtime_policy.py';
  assert.ok(graph.edges.some(edge => edge.from === from && edge.to === to && edge.type === 'IMPORTS' && edge.line > 0));
});

test('locates documentation terms without exposing source passages', () => {
  const results = searchGraph(graph, 'tenant isolation');
  assert.ok(results.some(node => node.path.endsWith('.md') && node.line > 0));
  assert.ok(results.every(node => !('content' in node) && !('source' in node)));
});

test('excludes secrets and generated data', () => {
  assert.ok(graph.nodes.every(node => !node.path.includes('.env') && !node.path.includes('node_modules') && !node.path.includes('graphify_corpus')));
});
