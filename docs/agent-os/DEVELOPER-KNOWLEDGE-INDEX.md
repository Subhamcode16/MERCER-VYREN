# Developer knowledge index decision

**Status:** Implemented as a local, reversible developer aid  
**Owner:** Subham / ILYREN  
**Date:** 2026-10-18  
**Scope:** VYREN source navigation only

## Decision and purpose

Build a small deterministic graph of code files, symbols, and resolved import links to answer navigation questions without repeated full-repository text scans. This is an index of source structure, not VYREN's brand knowledge graph, an ILYREN institutional graph, or an authority source. Existing `graphify_corpus` output serves a different corpus and its build script can delete and recreate that corpus. This index leaves it untouched.

The graph is warranted for navigation questions that cross imports and source definitions. A full graph database, embeddings, LLM extraction, and autonomous knowledge publication are unnecessary for this first developer use case. The source files remain the authority; the index is a cache.

## Competency questions

| Question | Required path and evidence |
| --- | --- |
| Where is a named worker, policy, or function defined? | Term → symbol → `DEFINES` file, with exact path and line. |
| Which modules import a policy module? | Target file ← `IMPORTS` source files, with import line. |
| What source symbols does a module define? | File → `DEFINES` symbols. |
| Where should an agent read before changing a module? | Search result → exact source path; agent reopens source. |
| Did the index include the latest source change? | File modification stamp and cached source hash; refresh time displayed. |

## Contract

Nodes are `file` and `symbol` (including Markdown headings). Directed edges are `DEFINES` and `IMPORTS`. IDs are derived from repository-relative paths and symbol line/name; renaming a file or moving a symbol changes its index ID, which is acceptable for a disposable navigation cache. Edges are admitted only when both endpoints exist in the indexed scope. No inferred call graph, behavioral dependency, or architectural claim is added.

The source scope is `Visual-Intelligence`, `docs`, `scripts`, `tests`, `tools/agent-os`, and selected root product documents, filtered to Python, JS/TS, and Markdown. Archives, generated dependencies, and local secrets are excluded. Source text is read locally; the cache stores file metadata, symbols, imports, and document search terms with their first line, rather than full passages. The index has no tenant data and must never be connected to customer files without a separate access design. Indexed source may still be confidential, so the server binds to `127.0.0.1` and the cache stays ignored by Git.

The update lifecycle is: enumerate eligible files → check modification time and size → reparse changed files → resolve imports against present files → atomically replace the cache → notify the local board. A deleted file drops out of the next graph. A search returns at most 30 matches in the board and 20 by default in the CLI. Neighbor lookup returns at most 50 edges. If a source cannot be read or an import cannot be resolved, the graph omits that relationship instead of inventing one.

## Evaluation and reversal

Acceptance checks: a known class resolves to the correct file and line; a known import returns its source and target; document terms locate a file and first matching line; editing a source file updates a search result within five seconds while the server runs; deleting a file removes it; unrelated `.env` files never appear; no result includes full source text. The board and CLI must agree on the same cached graph.

Risks: regex-based symbol parsing can miss dynamic constructs and imports; modification time and size can theoretically remain unchanged after a content edit; local polling costs a metadata scan every five seconds; line-based symbol IDs are unstable across edits. The bounded scope and source-open requirement limit those risks. If the index is misleading, delete `.cache/graph.json` and rebuild it; no product state depends on this cache.

This decision does not authorize modifying the governed organizational graph. Any future tenant, founder, claim, or policy indexing needs a separate versioned contract, provenance and access design, evaluation, and human authority review.
