# VYREN — Brand Intelligence OS

VYREN is a product by ILYREN, envisioned as an AI-assisted operating system for brand intelligence, creative direction, and campaign execution. It is designed to support both creating a brand from the ground up and evolving an existing brand using accumulated context and decisions.

## Current project status

The product’s application flow and interface hierarchy have been redesigned. The current UI concept includes a brand workspace, AI-coworker conversations, workforce and group navigation, campaign/task views, a Kanban-style pipeline, and profile/usage settings.

**The backend for this redesigned experience has not yet been implemented or connected.** The screenshots and interface elements are design-state evidence only. They do not establish that agent streams, task execution, collaboration, metrics, authentication, persistence, or settings are live or production-ready. In particular, values shown in mockups (such as active task/agent counts, velocity, and compliance rate) are illustrative until verified against a working system.

The next architecture work depends on the Grok Bot research notes the project owner plans to provide. Once available, those notes should be reviewed and translated into VYREN-specific requirements and implementation decisions; they are not yet a completed integration or verified design specification.

## Product experience in the current redesign

- **Brand workspace:** choose a workspace and access recent conversations, individual AI coworkers, and groups.
- **Creative direction and orchestration:** work with a named AI coworker through a conversation-oriented interface.
- **Brand entry points:** start a new brand, evolve an existing one, open Campaign Studio, or explore Visual DNA and material physics.
- **Work tracking:** inspect a proposed task pipeline across backlog, plan, in-progress, review, and done stages.
- **Governance and account settings:** provide places for permissions, profile, usage/computational quotas, and subscription settings.

These are intended product surfaces from the redesigned flow. Their presence in the UI does not imply that their underlying services or data flows have been built.

## Product principles

- Preserve brand context and decisions over time.
- Make AI-assisted creative work legible and reviewable.
- Keep human approval and appropriate permissions in the execution path.
- Treat agent activity, task status, and compliance signals as auditable data—not decorative claims.
- Separate demonstrated functionality from planned capabilities in documentation and product communication.

## Development status and documentation

The repository contains earlier implementation material and historical architecture/test claims. Those claims may describe a previous baseline and have not been re-verified here as evidence for the redesigned application or its backend. Do not interpret historical test counts, phase labels, security descriptions, or integration statements as validation of the current flow.

See [the project task tracker](docs/PROJECT-TASK-TRACKER.md) for the owner-confirmed completed work and remaining work. The immediate outstanding inputs are the Grok Bot research notes and subsequent backend architecture/integration work.

## Repository

This repository is the VYREN project workspace. Review the relevant package-level documentation and configuration before running development commands; the repository contains multiple application/subsystem areas, and this README intentionally does not claim that a single quickstart boots a fully integrated product.

## Status language

Use **completed** only for work that has been implemented or explicitly confirmed by the project owner. Use **planned**, **pending**, or **proposed** for work that is not yet built or verified. Update this README and the task tracker together as the product progresses.
