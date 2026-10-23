# VYREN campaign workspaces and bot teams — confirmed intent

**Owner:** Subham / ILYREN  
**Confirmed:** 23 October 2026  
**Status:** Product intent, not an implementation specification

## Outcome

The workspace is ultimately where a founder or creator runs several campaigns, each with its own persistent team of bots. Switching campaigns must not mix their bots' work, context windows, chats, task history, or campaign memory. Campaigns may have different numbers and kinds of bots, and their authorized work can continue while the user is in another workspace.

## Identity and scope

- A brand defines reusable bot identities, roles, and approved brand guidance.
- Each campaign runs its own bot instances, including its own manager bot. The same named role may work in more than one campaign, but each campaign instance has separate execution context, chats, tasks, and campaign memory.
- Campaign work does not automatically enter another campaign or become durable brand guidance. Cross-campaign reuse requires an explicit, governed promotion or approval.
- Each campaign has a shared coordination conversation and private chats with individual bots. A bot can have multiple chat sessions within its campaign without losing its campaign-scoped identity. A private chat is not automatically broadcast to the campaign team or promoted to shared memory.

## Manager and human authority

- The campaign manager assigns bounded tasks under a goal the user has approved, checks bot reports, coordinates handoffs, and reports progress and approval requests to the user.
- The manager may propose a new bot role when the campaign needs one. It must obtain the user's permission before creating or activating that role and cannot grant capabilities on its own.
- The manager must return to the user before changing the campaign goal, publishing, spending, using a new capability, or making a durable brand decision. Publishing remains subject to per-post approval.
- Bots may propose sourced findings or guidance from private work. Durable shared campaign or brand guidance requires human approval; routine task updates may appear in the coordination room without becoming memory.

## Intended experience

The user can open a campaign workspace, see its manager and team, work in the shared room or a bot's private chat, inspect ongoing tasks and handoffs, and review a clear queue of decisions that need their authority. Leaving the workspace does not stop previously authorized, bounded work. Returning shows the saved progress and any pending approvals.

## Sequencing and boundaries

The present Gate 1 proves one owner-and-brand-scoped Content Producer's durable identity, approved memory boundary, task state, capability audit, and local draft workflow. It is the foundation, not the finished multi-campaign workspace. Later work must introduce campaign-scoped bot instances, manager orchestration, conversations, background execution, shared memory, and bounded computer sessions without weakening the existing owner, brand, and approval checks.

This intent does not authorize bots or managers to publish, spend, contact external parties, create roles, change capabilities, or promote durable memory without the stated user approval. The exact data model, user-facing approval flow, computer-session allocation, resource limits, and rollout order are specification decisions to make after this intent.

## Provenance

This records Subham's interview answers in the current VYREN conversation. It describes VYREN's intended product behavior. It is not a claim about Grok Bot's private implementation.
