# ❖ VYREN — AGENT ARCHITECTURAL BRIEFING & CONTEXT

> **MANDATORY CONTEXT FOR ALL AI AGENTS, SUBAGENTS, AND CONTRIBUTORS**  
> Read this document completely before generating code, designing systems, or interacting with the VYREN codebase.

---

## 1. Product Identity & Definition

### What VYREN Is:
* **VYREN** is an **AI-Powered Brand Intelligence & Creative Operating System**.
* It is a **persistent, intelligent creative organization for brands** that enables any business to establish, understand, design, evaluate, and continuously evolve its identity and creative presence.
* It operates as a collaborative AI workforce inside persistent organizational memory, partnering with human founders, creative directors, and marketers.

### What VYREN Is NOT:
* ❌ VYREN is **NOT** just an "AI image generator" or prompt sandbox.
* ❌ VYREN is **NOT** a one-time static style guide or a transient chat bot.
* ❌ Visual DNA, Campaign Studio, or Institutional Intelligence are **NOT** standalone products — they are modular intelligence subsystems within VYREN.

### The Product Thesis:
> *"Every brand deserves an intelligent creative organization that remembers what it knows, understands why it makes decisions, learns from what happens, and continuously helps it become more distinctive."*

---

## 2. The Dual Brand Modalities

Any agent building features or generating logic must understand that VYREN serves two distinct brand pathways:

### Modality A: Starting from Zero (0 &rarr; 1)
For founders launching new brands who need to discover and establish their identity:
```text
Research ──► Position ──► Define ──► Explore ──► Establish ──► Design ──► Create ──► Launch ──► Learn
```
* **Agent Requirement**: Support open exploration, hypothesis generation, aesthetic token synthesis, and market research derivation.

### Modality B: Existing Brand Ingestion & Evolution
For established brands that already possess websites, packaging, campaigns, and historical assets:
```text
Ingest Historical Assets ──► Extract Brand DNA ──► Detect Inconsistencies & Drift ──► Propose Evolution ──► Human Decision Gate ──► Closed-Loop Learning
```
* **Agent Requirement**: Support asset ingestion, drift analysis, contradiction registers, and preserving brand legacy while modernizing distinctiveness.

---

## 3. The 6 Core Product Verbs

All user workflows and system capabilities align with these 6 verbs:

1. **CREATE**: Build new brands, identities, omnichannel campaigns, and creative assets.
2. **DECIDE**: Provide evidence-backed decision support, recommendation memos, and trade-off matrices for human leaders.
3. **DESIGN**: Synthesize visual systems, 3D material drape physics, optical lighting setups, and world-building assets.
4. **LAUNCH**: Deploy and orchestrate multi-surface, omnichannel creative variations.
5. **LEARN**: Ingest live market signals, attribution metrics, counterfactual performance, and audience sentiment.
6. **IMPROVE & EVOLVE**: Apply accumulated organizational memory so future campaigns become progressively smarter, more consistent, and more distinctive over time.

---

## 4. Subsystem Topology & Architecture

```
                                  ❖ VYREN OS
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                           STRATEGIC OPERATIONS                           │
  │     Institutional Intelligence  •  Operating Rooms  •  Cadence Engine     │
  ├──────────────────────────────────────────────────────────────────────────┤
  │                            AI WORKFORCE HUB                              │
  │     Persistent Personas  •  Collaborative Rooms  •  Governance Gates     │
  ├──────────────────────────────────────────────────────────────────────────┤
  │                        CREATIVE INTELLIGENCE NETWORK                     │
  │     Visual DNA  •  Textile Physics  •  Lighting Optics  •  Foresight     │
  ├──────────────────────────────────────────────────────────────────────────┤
  │                           CAMPAIGN PRODUCTION                            │
  │     Omnichannel Projection  •  Asset Linage  •  Attribution Observatory  │
  ├──────────────────────────────────────────────────────────────────────────┤
  │                           ORGANIZATIONAL MEMORY                          │
  │      14 Canonical Memory Classes  •  Decision Ledger  •  Audit Proofs    │
  └──────────────────────────────────────────────────────────────────────────┘
```

| Layer | Location | Purpose |
| :--- | :--- | :--- |
| **Institutional Intelligence** | `backend/src/institutional_intelligence` | Multi-horizon strategy ($H_1, H_2, H_3, H_{\text{unknown}}$), Operating Rooms, Cadence Engine, and 14 memory classes. |
| **Creative Intelligence** | `backend/src/creative_intelligence_network` | Visual DNA, foresight graph, material physics, lighting shaders, and creative graph. |
| **Visual Model Gateway** | `backend/src/visual_model_gateway` | Higgsfield Unified Creative Engine (text-to-image, video synthesis, 14 camera motion vectors, 360° turntable physics, waterfall failover). |
| **Studio & Production** | `backend/src/studio_operations` | Digital turntable, asset lineage, campaign composition, and policy status HUD. |
| **Security Substrate** | `backend/src/security_substrate` | Tenant isolation, cryptographically tamper-evident ledgers, and recovery authorities. |
| **Frontend Studio** | `product/frontend/src` | Next.js 15 App router, Campaign Studio, Turntable, and Attribution Observatory. |


---

## 5. Agent Behavioral & Coding Principles

When generating or modifying code within this workspace:

1. **Strict Tenant Isolation**: Never allow cross-tenant data access. Always pass `tenant_id` and validate cryptographic tenant boundaries.
2. **Human-in-the-Loop Authority**: AI workers are advisors and executors of approved actions. AI workers **cannot** self-authorize strategic commitments, budget escalations, or memory invalidations without a human `DecisionRecord`.
3. **No Hardcoded Secrets**: Always use `.env` and environment variables. Never write raw keys or tokens into source files.
4. **Preserve Pydantic v2 & FastAPI Patterns**: Use explicit typing, schema validation, and catch external API failures with structured fallbacks.
5. **Zero-Regression Verification**: Whenever making backend changes, always verify by running the test suite:
   ```powershell
   python Visual-Intelligence\product\backend\run_phase30_tests.py
   ```
   All 81 tests must pass (100% pass rate).

## 6. Developer Navigation and Agent OS Progress

For source navigation, first query the local developer index with `node tools/agent-os/cli.mjs search <terms>` or `neighbors <node-id>`. It indexes code files, symbols, and resolved imports and refreshes while `node tools/agent-os/server.mjs` is running. Read the returned source file before making a change; the index is a disposable navigation cache, not authoritative product knowledge. Use targeted `rg` when the index does not cover the question.

Track Agent OS research and implementation tasks in `tools/agent-os/tasks.json`. The local board is at `http://127.0.0.1:4177` while its server runs. Keep card statuses and evidence links current as work proceeds. This board and index do not change VYREN's tenant, brand-memory, or human-approval rules.
