# Agent OS
## Architecture & Implementation Specification
### Version 0.1 — Research-Derived Foundation

---

## 0. Document Purpose

This document defines the first implementation-grade architecture for a secure, multi-agent computer-use platform inspired by publicly documented behavior of Grok Bot.

The goal is NOT to reproduce proprietary xAI internals.

The goal is to extract:

1. Confirmed architectural behavior from public documentation.
2. Strong architectural inferences from observed behavior.
3. Safe implementation patterns.
4. Explicit unknowns that must not be assumed.
5. Security invariants that must remain true regardless of implementation.

This specification is intended to become the foundation for:

- the research paper,
- the implementation architecture,
- engineering tickets,
- schemas,
- security reviews,
- future LLM coding instructions.

---

# 1. Evidence Classification

Every architectural statement in this project must have one of four statuses.

### CONFIRMED

Directly documented by an authoritative source.

Example:

> A user's Bots share one persistent cloud computer.

Status:

`CONFIRMED`

---

### INFERRED

Not directly documented, but strongly implied by multiple documented behaviors.

Example:

> A dedicated computer-management service probably exists between the control plane and VM runtime.

Status:

`INFERRED`

---

### DESIGN

A deliberate architecture we choose for our implementation.

Example:

> Our system will use a Computer Manager service.

Status:

`DESIGN`

---

### UNKNOWN

The public evidence does not establish the answer.

Example:

> The exact internal Grok model-to-screen grounding implementation.

Status:

`UNKNOWN`

---

# 2. Core Architectural Principle

The platform is divided into three planes.

```text
┌─────────────────────────────────────────────┐
│                CONTROL PLANE                 │
│                                             │
│ Identity                                    │
│ Bot Registry                                │
│ Task Manager                                │
│ Scheduler                                   │
│ Policy Engine                               │
│ Review / Approval                           │
│ Memory Manager                              │
│ Skill Registry                              │
│ Handoff Router                              │
│ Audit / Observability                       │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                AGENT PLANE                   │
│                                             │
│ Planner                                     │
│ Model                                       │
│ Context Manager                             │
│ Tool Router                                 │
│ Verifier                                    │
│ Recovery Manager                            │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│              EXECUTION PLANE                │
│                                             │
│ Computer                                   │
│ Browser                                    │
│ Shell                                      │
│ Filesystem                                 │
│ Connectors                                 │
│ Computer Worker                            │
│ Virtual Display                            │
└─────────────────────────────────────────────┘
```

This separation is a foundational design decision.

---

# 3. Security Boundary Model

The most important documented security property is:

```text
USER = security boundary
BOT  ≠ security boundary
```

Public Grok documentation states that each user receives a dedicated Firecracker microVM, while all Bots belonging to that user share that computer. Therefore, separate Bots must not be treated as independent isolation boundaries.

A workload requiring a separate computer and credential set should receive a separate user-level isolation boundary.

Implementation invariant:

```text
Bot isolation:
    NO

User / execution-domain isolation:
    YES
```

This is a mandatory architectural rule.

---

# 4. Entity Model

The minimum domain model is:

```text
User
 ├── Bot[]
 ├── Computer
 ├── Credentials
 ├── Memory
 └── Projects[]

Bot
 ├── BotDefinition
 ├── BotState
 ├── Skills[]
 ├── Routines[]
 ├── Conversations[]
 └── Tasks[]

Computer
 ├── Screens[]
 ├── DurableStorage
 ├── Runtime
 ├── Browser
 └── ComputerWorker

Task
 ├── Goal
 ├── Context
 ├── Capabilities
 ├── Execution
 ├── Verification
 └── Proof
```

---

# 5. BotDefinition

BotDefinition describes what a Bot IS.

It must not contain transient execution state.

Candidate schema:

```json
{
  "bot_id": "bot_123",
  "name": "Researcher",
  "title": "Technical Research Agent",

  "role": {
    "description": "...",
    "objectives": [],
    "boundaries": []
  },

  "capabilities": [],

  "skill_refs": [],

  "connector_refs": [],

  "routine_refs": [],

  "policy_ref": "policy_123",

  "version": 1
}
```

## Security invariant

BotDefinition must never contain:

- passwords,
- API keys,
- OAuth tokens,
- private keys,
- raw credentials,
- customer secrets.

Templates and shared Bot configurations must remain safe to distribute.

---

# 6. BotState

BotState contains runtime information.

```json
{
  "bot_id": "bot_123",

  "status": "active",

  "current_task_id": "task_456",

  "computer_id": "computer_789",

  "screen_id": "screen_001",

  "conversation_id": "conv_123",

  "memory_refs": [],

  "active_handoffs": [],

  "last_activity": "..."
}
```

BotState must be independently recoverable from persistent storage.

---

# 7. Computer

Computer represents the persistent execution environment.

```json
{
  "computer_id": "computer_123",

  "owner_scope": {
    "type": "user",
    "id": "user_123"
  },

  "runtime": {
    "provider": "firecracker",
    "status": "ready"
  },

  "screens": [],

  "storage": {
    "durable_disk_id": "disk_123"
  },

  "browser_profile": "profile_123",

  "worker": {
    "status": "connected"
  }
}
```

The exact Firecracker configuration used by Grok remains UNKNOWN.

Our use of Firecracker is a REFERENCE DESIGN based on documented Grok behavior.

---

# 8. Screen

A Screen is the interaction surface assigned to a Bot's computer-use execution.

```json
{
  "screen_id": "screen_123",

  "computer_id": "computer_456",

  "bot_id": "bot_789",

  "status": "active",

  "active_task_id": "task_123",

  "control_owner": null
}
```

Invariant:

```text
ONE SCREEN
    ↓
MAXIMUM ONE ACTIVE COMPUTER-USE TASK
```

Public Grok documentation explicitly states that each Bot gets its own screen and one Bot runs one computer-use task on its screen at a time.

---

# 9. Task

Task is the fundamental unit of agent work.

```json
{
  "task_id": "task_123",

  "owner_bot": "bot_456",

  "objective": "...",

  "constraints": [],

  "inputs": [],

  "required_capabilities": [],

  "acceptance_criteria": [],

  "state": "queued",

  "parent_task_id": null,

  "proof_required": true
}
```

Task lifecycle:

```text
QUEUED
  ↓
PLANNING
  ↓
EXECUTING
  ↓
VERIFYING
  ↓
COMPLETED
```

Failure branches:

```text
EXECUTING
   │
   ├── WAITING_HUMAN
   ├── RECOVERY
   ├── FAILED
   └── CANCELLED
```

---

# 10. Skill

A Skill describes HOW to perform a reusable task.

Current Grok documentation explicitly describes skills as reusable instructions containing:

- when to use the skill,
- required inputs/access,
- sequence of work,
- validation,
- output,
- approval requirements.

Therefore Skill becomes a first-class domain object.

Candidate schema:

```json
{
  "skill_id": "skill_123",

  "name": "Weekly Account Health",

  "version": 3,

  "intent": "...",

  "when_to_use": "...",

  "inputs": [],

  "required_access": [],

  "steps": [],

  "validation": [],

  "output_contract": {},

  "approval_boundaries": [],

  "failure_policy": {},

  "status": "tested"
}
```

A skill created through demonstration must initially be considered:

```text
DRAFT
```

It must be reviewed and tested before unattended automation.

---

# 11. Teach-by-Demonstration

The platform should support:

```text
Human
  ↓
Demonstration
  ↓
Interaction Recording
  ↓
Skill Draft
  ↓
Human Review
  ↓
Safe Test
  ↓
Skill Activation
```

A demonstration must NOT automatically become trusted automation.

Mandatory rule:

```text
DEMONSTRATION ≠ AUTHORIZATION
```

The current Grok documentation explicitly says learned skills are drafts and recommends adding decision rules, failure handling, and approval boundaries.

---

# 12. Routine

A Routine describes WHEN a workflow runs.

Skill:

```text
HOW
```

Routine:

```text
WHEN
```

Candidate schema:

```json
{
  "routine_id": "routine_123",

  "bot_id": "bot_456",

  "skill_id": "skill_789",

  "trigger": {
    "type": "schedule",
    "timezone": "Asia/Kolkata",
    "expression": "..."
  },

  "input_source": "...",

  "approval_policy": "...",

  "failure_policy": "...",

  "status": "enabled"
}
```

Supported trigger classes should eventually include:

```text
schedule
event
manual
webhook
external-condition
```

The exact supported trigger set must remain configurable.

---

# 13. Routine Safety Requirements

Every routine must explicitly define:

```text
Owner
Schedule
Timezone
Input source
Expected result
Approval boundary
No-data behavior
Stale-data behavior
Retry behavior
Failure destination
```

For unattended execution:

```text
NO DATA
   ↓
DO NOT INVENT
   ↓
REPORT FAILURE
```

The system must never silently substitute stale information unless the routine explicitly permits it.

---

# 14. Handoff

Handoff transfers ownership of work between agents.

It must transfer:

```text
Task state
Objective
Constraints
Relevant context
Artifacts
Acceptance criteria
Permissions
Expected output
```

It must NOT blindly transfer:

```text
entire conversation
all memory
all credentials
all permissions
```

Candidate schema:

```json
{
  "handoff_id": "handoff_123",

  "from_bot": "bot_a",
  "to_bot": "bot_b",

  "task_id": "task_123",

  "context": {
    "summary": "...",
    "source_refs": [],
    "artifact_refs": []
  },

  "permissions": [],

  "acceptance_criteria": [],

  "expected_output": {}
}
```

---

# 15. Context Hygiene

A core design principle:

```text
FULL CONVERSATION
       ≠
TASK CONTEXT
```

The receiving Bot should receive the smallest sufficient context.

Preferred:

```text
Task
 ↓
Context Summary
 ↓
Relevant Evidence
 ↓
Artifacts
 ↓
Constraints
```

Not:

```text
Entire previous conversation
```

This is consistent with the documented outer/inner-loop engineering pattern and is a major mechanism for preventing context pollution.

---

# 16. Outer Loop / Inner Loop

The platform should support hierarchical execution.

```text
OUTER AGENT
    │
    ├── gather context
    ├── inspect systems
    ├── formulate task
    ├── delegate
    └── verify
            │
            ▼
       INNER AGENT
            │
            ├── implement
            ├── execute
            ├── test
            └── iterate
```

The outer agent should not unnecessarily perform the inner agent's low-level work.

The inner agent should not inherit unrestricted outer-agent context.

---

# 17. Capability Model

Capabilities are explicit permissions.

Minimum capability classes:

```text
browser
computer
shell
filesystem
connector
network
delegation
local-computer
credential-use
```

A Bot should receive only the capabilities required by its task.

Example:

```json
{
  "bot": "researcher",

  "capabilities": [
    "browser",
    "filesystem:read",
    "connector:slack:read"
  ]
}
```

Not:

```json
{
  "capabilities": [
    "everything"
  ]
}
```

---

# 18. Tool Router

The router determines how a task should be executed.

```text
                TASK
                  │
                  ▼
             TOOL ROUTER
                  │
       ┌──────────┼───────────┐
       ▼          ▼           ▼
   Connector   Browser     Computer
       │          │           │
       └──────────┼───────────┘
                  ▼
               RESULT
```

Preferred execution hierarchy:

```text
Structured connector
        ↓
Browser/API
        ↓
Computer use
```

Computer use should not be the default if a safer structured interface exists.

---

# 19. Computer Worker

The Computer Worker is deterministic infrastructure.

It should NOT perform strategic reasoning.

Responsibilities:

```text
Screenshot
Input
Browser control
Window management
Display state
Execution acknowledgements
Health
Reconnect
```

Architecture:

```text
Agent
  ↓
Action API
  ↓
Policy
  ↓
Computer Worker
  ↓
Guest OS
```

The Worker must reject malformed or unauthorized actions.

---

# 20. Observation

Observation converts environment state into model-consumable evidence.

```text
Desktop
  ↓
Capture
  ↓
Frame Processing
  ↓
Observation
  ↓
Model
```

Candidate observation:

```json
{
  "observation_id": "obs_123",

  "screen_id": "screen_456",

  "timestamp": "...",

  "viewport": {
    "width": 1920,
    "height": 1080
  },

  "frame_ref": "artifact://frame/123",

  "cursor": {
    "x": 812,
    "y": 422
  }
}
```

Exact Grok frame resolution, sampling rate, compression, visual encoder, and grounding model are UNKNOWN.

They must not be invented.

---

# 21. Action

Actions must be typed.

Example:

```json
{
  "action_id": "act_123",

  "screen_id": "screen_456",

  "type": "click",

  "target": {
    "x": 812,
    "y": 422
  }
}
```

Supported actions:

```text
click
double_click
right_click
move
drag
scroll
type
key_press
hotkey
wait
```

Arbitrary shell execution is NOT a computer-input action.

Shell requires a separate capability.

---

# 22. Action Policy

Every consequential action passes through:

```text
Agent
 ↓
Action Normalizer
 ↓
Policy Engine
 ↓
Review / Approval
 ↓
Execution
```

Decision:

```text
ALLOW
ASK
DENY
```

The executor must never bypass policy.

---

# 23. Approval

Approval applies to consequential actions.

Default approval candidates:

```text
send message
publish
purchase
financial transfer
delete
overwrite
permission change
production change
legal acceptance
credential access
external communication
```

Approval is not retrospective.

```text
PROPOSE
   ↓
APPROVE
   ↓
EXECUTE
```

Not:

```text
EXECUTE
   ↓
ASK
```

---

# 24. Human Takeover

Human takeover is a distinct execution state.

```text
AGENT CONTROL
      ↓
HUMAN_REQUIRED
      ↓
HUMAN CONTROL
      ↓
AGENT CONTROL
```

Typical reasons:

```text
password
passkey
2FA
CAPTCHA
ambiguous destructive action
high-risk decision
```

Credentials entered through secure takeover must not become ordinary model context.

---

# 25. Credential Architecture

Credentials must be separated from agent reasoning.

```text
Agent
  │
  ▼
Credential Request
  │
  ▼
Credential Broker
  │
  ▼
Secret / OAuth Store
  │
  ▼
External Service
```

The model should receive:

```text
credential_available = true
```

not:

```text
api_key = "..."
```

---

# 26. Memory Architecture

Memory is divided by scope.

```text
MEMORY
│
├── User Memory
│
├── Bot Memory
│
├── Project Memory
│
├── Team Memory
│
├── Task/Episodic Memory
│
└── Skill Knowledge
```

Every memory item must have:

```text
owner
scope
visibility
source
timestamp
confidence
freshness
```

Candidate:

```json
{
  "memory_id": "mem_123",

  "scope": "bot",

  "visibility": "private",

  "source": "task_456",

  "content": "...",

  "confidence": 0.91,

  "created_at": "...",

  "expires_at": null
}
```

---

# 27. Memory Safety

Memory is not an authoritative source.

Rules:

```text
Changing fact
    ↓
Read current source

Consequential decision
    ↓
Verify evidence

Historical preference
    ↓
Memory may be used
```

Memory must never silently override current source-of-truth data.

---

# 28. Connector

Connector represents an external system integration.

```json
{
  "connector_id": "conn_123",

  "provider": "github",

  "permissions": [
    "repo:read"
  ],

  "credential_ref": "secret_123",

  "status": "active"
}
```

The connector abstraction should hide credentials from the model.

---

# 29. Project

A Project groups related work.

```text
Project
├── Manager
├── Bots
├── Tasks
├── Channels
├── Shared Memory
├── Artifacts
└── Policies
```

Projects are organizational/runtime scopes, not necessarily security boundaries.

Security must be explicitly defined separately.

---

# 30. Artifact

Artifacts are persistent evidence/results.

Types:

```text
file
image
screenshot
test-result
log
source-link
diff
report
recording
```

Candidate:

```json
{
  "artifact_id": "artifact_123",

  "type": "screenshot",

  "uri": "artifact://...",

  "created_by": "bot_456",

  "task_id": "task_789",

  "sha256": "...",

  "created_at": "..."
}
```

---

# 31. Proof

Proof connects claims to evidence.

```json
{
  "proof_id": "proof_123",

  "task_id": "task_456",

  "claims": [
    {
      "claim": "Login flow works",
      "evidence": [
        "artifact_123",
        "test_456"
      ]
    }
  ],

  "status": "verified"
}
```

This is especially important for autonomous coding and research.

---

# 32. Verification

Executor and verifier must be separate logical roles.

```text
PLANNER
   ↓
EXECUTOR
   ↓
VERIFIER
```

The executor saying:

```text
"Done."
```

is not evidence.

Verification should inspect:

```text
tests
screenshots
artifacts
source state
expected output
acceptance criteria
```

Possible states:

```text
PASS
FAIL
RETRY
ESCALATE
UNVERIFIABLE
```

---

# 33. Recovery

Failure must be explicit.

```text
FAILURE
   │
   ▼
CLASSIFY
   │
   ├── transient
   ├── environment
   ├── model
   ├── permission
   ├── data
   └── unknown
```

Then:

```text
transient → retry
environment → repair
permission → request
data → report
model → replan
unknown → escalate
```

Retries must be idempotent whenever possible.

---

# 34. Scheduler

The Scheduler should only determine:

```text
WHEN
```

It should not contain task execution logic.

```text
Scheduler
    ↓
Routine
    ↓
Task
    ↓
Bot
```

This separation allows routines to be edited without modifying execution infrastructure.

---

# 35. Event Bus

The platform should use an internal event system.

Candidate events:

```text
TaskCreated
TaskStarted
TaskCompleted
TaskFailed
ApprovalRequested
ApprovalGranted
ApprovalDenied
HumanTakeoverRequested
HumanTakeoverCompleted
HandoffCreated
SkillCreated
SkillUpdated
RoutineTriggered
ArtifactCreated
VerificationPassed
VerificationFailed
ComputerStarted
ComputerStopped
WorkerDisconnected
WorkerReconnected
```

Events should be immutable.

---

# 36. Audit Log

Every meaningful action should produce an audit record.

Minimum fields:

```json
{
  "event_id": "evt_123",

  "timestamp": "...",

  "actor": {
    "type": "bot",
    "id": "bot_123"
  },

  "action": "browser.navigate",

  "resource": "...",

  "decision": "allowed",

  "policy_source": "auto-review",

  "task_id": "task_456",

  "result": "success"
}
```

Current Grok Enterprise documentation is especially valuable here: it says action recording can cover tool calls, decisions, connector calls, shell commands, browser navigation, computer-use sessions, file transfers, messages, routine runs, guardrail interventions, skills, and delegated work.

Therefore auditability should be treated as a first-class subsystem rather than an afterthought.

---

# 37. Architecture Invariants

These are rules that implementation code MUST NOT violate.

### INV-001 — Bot isolation

Bots must not be treated as security boundaries.

### INV-002 — User isolation

Different execution users must have separate compute/security boundaries.

### INV-003 — Least privilege

A Bot receives only required capabilities.

### INV-004 — Credential isolation

Secrets never enter ordinary model context.

### INV-005 — Policy before execution

Consequential actions pass through policy.

### INV-006 — Approval before consequential execution

Human approval must precede actions requiring approval.

### INV-007 — Executor ≠ verifier

Execution completion does not prove correctness.

### INV-008 — Memory ≠ source of truth

Current authoritative sources override memory.

### INV-009 — Demonstration ≠ authorization

A learned workflow does not automatically receive unattended execution rights.

### INV-010 — Handoff ≠ conversation dump

Only necessary task context should cross agent boundaries.

### INV-011 — No silent failure

Unavailable or stale sources must produce explicit failure states.

### INV-012 — No fabricated evidence

Agents must distinguish:

```text
observed
inferred
assumed
unknown
```

### INV-013 — Auditability

Important actions must have an auditable event.

### INV-014 — Idempotent automation

Retries must not accidentally duplicate consequential operations.

### INV-015 — Human takeover

High-risk or authentication-sensitive actions must have a secure human path.

---

# 38. State Machines

## Bot

```text
CREATED
  ↓
INITIALIZING
  ↓
READY
  ↓
ACTIVE
  ├── WAITING
  ├── HUMAN_REQUIRED
  └── ERROR
  ↓
DISABLED
```

## Task

```text
QUEUED
 ↓
PLANNING
 ↓
EXECUTING
 ↓
VERIFYING
 ├── COMPLETE
 ├── RECOVERY
 └── HUMAN_REQUIRED
```

## Computer

```text
CREATED
 ↓
PROVISIONING
 ↓
READY
 ↓
ACTIVE
 ↓
HIBERNATED
 ↓
TERMINATED
```

Exact lifecycle semantics remain implementation-specific.

---

# 39. Architecture Knowledge Base

The project itself requires a research knowledge layer.

Every important architecture claim should become:

```json
{
  "claim_id": "ARCH-001",

  "claim": "...",

  "status": "confirmed",

  "confidence": "high",

  "evidence_refs": [],

  "implementation_consequence": "...",

  "last_verified": "..."
}
```

Statuses:

```text
CONFIRMED
SUPPORTED_INFERENCE
DESIGN
UNKNOWN
REJECTED
SUPERSEDED
```

This prevents architectural hallucination.

---

# 40. LLM Implementation Contract

When an LLM is asked to implement any subsystem, it must receive:

```text
SYSTEM CONTEXT
+
ARCHITECTURE VERSION
+
RELEVANT SCHEMAS
+
INVARIANTS
+
SECURITY RULES
+
EVIDENCE STATUS
+
KNOWN UNKNOWNS
```

The LLM must NOT infer missing infrastructure.

Required behavior:

```text
If documented:
    implement according to specification.

If design decision exists:
    follow design.

If unknown:
    STOP and surface unknown.

If implementation conflicts with invariant:
    STOP.

If security boundary is unclear:
    STOP.

If schema is missing:
    request clarification rather than inventing one.
```

---

# 41. Evidence Rule

Every implementation-sensitive assumption must answer:

```text
WHERE DID THIS COME FROM?
```

Possible answers:

```text
Official documentation
Source code
Observed behavior
Experiment
Architectural decision
Unverified hypothesis
```

No anonymous assumptions.

---

# 42. Current Confirmed Findings

The following are currently supported by public Grok documentation:

1. Bots have persistent cloud computers.
2. Bots share the user's computer.
3. Different users receive separate Firecracker microVM boundaries.
4. Bot identity is not a security boundary.
5. Bots can coordinate.
6. Bots can hand work to one another.
7. Bots can use connectors.
8. Bots can use computer interaction.
9. Bots have separate screens on the shared computer.
10. A Bot runs one computer-use task on its screen at a time.
11. Bots maintain persistent role/context.
12. Skills describe reusable workflows.
13. Routines schedule workflows.
14. Skills can be learned from demonstrations.
15. Learned skills require review/testing.
16. Consequential actions can require approval.
17. Human takeover is supported.
18. Current-source verification is recommended for consequential work.
19. Action recording can cover broad execution activity.
20. Shared Bot templates must not contain secrets.

---

# 43. Current Unknowns

The following MUST remain explicitly unknown until evidence is discovered:

```text
Exact model architecture
Exact visual encoder
Exact screenshot sampling strategy
Exact UI grounding algorithm
Exact planner architecture
Exact tool-selection algorithm
Exact memory retrieval implementation
Exact vector/database technology
Exact scheduler implementation
Exact VM networking architecture
Exact Firecracker configuration
Exact worker protocol
Exact host fleet architecture
Exact browser automation implementation
Exact retry policy
Exact model routing
Exact internal message protocol
Exact observability backend
```

No implementation document may silently convert these into facts.

---

# 44. Immediate Implementation Order

The system should NOT be built in random order.

Recommended sequence:

```text
PHASE 1
Domain Models
    ↓
Bot
Task
Skill
Routine
Handoff
Capability
Artifact

PHASE 2
Control Plane
    ↓
Bot Registry
Task Manager
Policy Engine
Event Bus
Audit Log

PHASE 3
Agent Runtime
    ↓
Planner
Context Manager
Tool Router
Verifier
Recovery

PHASE 4
Execution
    ↓
Computer Worker
Virtual Display
Browser
Filesystem
Shell

PHASE 5
Isolation
    ↓
VM
Network
Credential Broker
Secret Store

PHASE 6
Automation
    ↓
Scheduler
Routines
Events
Handoffs

PHASE 7
Advanced Intelligence
    ↓
Memory
Skill Learning
Visual Grounding
Hierarchical Agents
Self-Verification
```

---

# 45. First Implementation Target

The first executable prototype should NOT attempt to reproduce Grok.

Build:

```text
ONE USER
    ↓
ONE BOT
    ↓
ONE TASK
    ↓
ONE TOOL
    ↓
ONE EXECUTION
    ↓
ONE VERIFICATION
    ↓
ONE AUDIT RECORD
```

Then expand:

```text
ONE BOT
    ↓
MULTIPLE TOOLS
```

Then:

```text
MULTIPLE BOTS
    ↓
HANDOFF
```

Then:

```text
MULTIPLE BOTS
    ↓
SHARED COMPUTER
```

Then:

```text
MULTIPLE USERS
    ↓
ISOLATED COMPUTERS
```

Then:

```text
SKILLS
+
ROUTINES
+
MEMORY
+
POLICY
```

This order minimizes the number of unknown variables at every stage.

---

# 46. Research Status

Architecture confidence:

| Domain | Status |
|---|---|
| User/VM isolation | HIGH |
| Shared computer model | HIGH |
| Bot model | HIGH |
| Skill model | HIGH |
| Routine model | HIGH |
| Handoff concept | HIGH |
| Approval concept | HIGH |
| Audit concept | HIGH |
| Computer-use architecture | MEDIUM-HIGH |
| Agent planner | MEDIUM |
| Memory architecture | MEDIUM |
| Visual grounding | LOW |
| Internal model architecture | UNKNOWN |
| Exact production infrastructure | UNKNOWN |

---

# 47. Design Principle

The final system should not be:

```text
LLM + tools
```

It should be:

```text
             AGENT OPERATING SYSTEM

      ┌─────────────────────────────┐
      │        Intelligence         │
      ├─────────────────────────────┤
      │ Planning / Reasoning        │
      │ Memory                      │
      │ Skills                      │
      │ Verification               │
      ├─────────────────────────────┤
      │        Governance           │
      ├─────────────────────────────┤
      │ Policy / Approval           │
      │ Identity / Permissions      │
      │ Audit / Evidence            │
      ├─────────────────────────────┤
      │        Orchestration        │
      ├─────────────────────────────┤
      │ Tasks / Handoffs / Events   │
      │ Scheduler / Projects        │
      ├─────────────────────────────┤
      │        Execution            │
      ├─────────────────────────────┤
      │ Browser / Shell / Computer  │
      │ Files / Connectors          │
      ├─────────────────────────────┤
      │        Isolation             │
      ├─────────────────────────────┤
      │ VM / Network / Credentials  │
      └─────────────────────────────┘
```

The LLM is therefore **one component inside the operating system**, not the operating system itself.

---

# 48. Versioning Rule

This specification begins at:

`Agent OS v0.1`

Future changes must identify:

```text
What changed?
Why?
Evidence?
Security impact?
Schema impact?
Backward compatibility?
```

No silent architectural changes.

---

# 49. Next Research Target

The next research phase should now focus on:

## Agent Runtime Internals

Specifically:

```text
Goal
 ↓
Planner
 ↓
Context Construction
 ↓
Model Invocation
 ↓
Tool Selection
 ↓
Observation
 ↓
Action
 ↓
Verification
 ↓
Recovery
 ↓
Memory Update
```

We need to determine:

1. What information actually enters the model context?
2. How is a task decomposed?
3. How are tools selected?
4. How does visual grounding work?
5. How are failed actions detected?
6. How does the agent decide to retry?
7. How does it know when it is finished?
8. How does it decide when to ask a human?
9. How is memory written?
10. How is memory retrieved?
11. How does a parent agent supervise a child agent?
12. How does evidence flow back to the planner?

These questions now form **Phase 2 — Agent Runtime Research**.

---

## Final architectural position

We are no longer trying to "figure out Grok's code."

We are reconstructing the **engineering principles behind a Grok-class agent operating system**, using public evidence wherever possible and explicitly separating evidence from inference.

That distinction is now a permanent rule of this project.