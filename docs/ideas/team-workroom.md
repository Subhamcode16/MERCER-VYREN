# VYREN Team Workroom

**Product decision, 23 October 2026:** Subham chose one real Content Producer first, a fresh Team visual direction, and the feeling of a trusted creative colleague.

## Problem statement

How might we help a solo founder direct and review one persistent creative bot, with visible memory and human control, without implying that planned coworkers or publishing abilities already exist?

## Directions considered

1. **Chat-first companion:** Familiar, but a chat surface would imply an open-ended model conversation that Gate 1 cannot yet deliver.
2. **Coworker roster:** Useful after multi-bot expansion, but the current six fixture coworkers and fabricated progress make the page less trustworthy.
3. **Mission control:** Strong for monitoring many simultaneous jobs, but oversized for one bot and one bounded preview task.
4. **Decision desk:** Excellent for future approvals, but there is no live publication approval queue yet.
5. **Memory notebook:** Makes persistence tangible, but hides the actual brief-to-draft job.
6. **Timeline journal:** Helps audit work after repeated sessions, but is empty for a new founder.
7. **Colleague workbench:** Combines a stable identity, one brief-to-draft flow, approved memory and explicit capability limits. This is the chosen direction.

## Recommended direction

The first screen is a colleague workbench. It gives the Content Producer a clear identity, makes the founder's next action obvious, and places the resulting draft beside its source, route and uncertainty. Role memory is a visible, sourced part of the relationship; the founder deliberately adds it. Future multi-bot collaboration and computer sessions appear only as a quiet roadmap statement.

Visually, the Team page departs from the former sky-and-glass roster. Its cool mineral ground, white work surface, deep botanical ink and restrained green create a calm operating scene. The locally loaded Nohemi typeface carries the voice; the page avoids faux avatars, progress meters and simulated approval alarms. These tokens are page-scoped, so the broader VYREN design system is not silently rewritten.

## Key assumptions to validate

- [ ] A founder understands that “prepare a local draft” is a limited preview, not a model-generated or publishable post. Test this with an unaided first-use walkthrough.
- [ ] The distinction between approved role memory and ordinary brief text is understandable. Ask users what the bot will remember after refresh.
- [ ] A persistent identity adds value beyond a generic editor. Observe whether founders return to the same bot and reuse its memory.
- [ ] The review surface exposes enough provenance to support a decision without overwhelming the founder. Time one draft review and note clarification questions.

## MVP scope

The page shows the real owner-scoped bot, onboarding, its role and exact capability boundary, approved sourced memory, a brief composer, the latest local draft and its audit. It handles loading, signed-out, unavailable, empty and saved-result states. No fixture coworkers appear as active workers.

## Not doing

- **Open-ended bot chat:** the current runtime only has a bounded local preview.
- **Multiple bot cards:** persistent multi-bot handoffs are a later gate.
- **Virtual computer:** no per-bot session exists yet.
- **Publication approval controls:** the Gate 1 draft has no media or publishing action.
- **Synthetic activity or attention alerts:** fabricated work would damage trust.

## Design evidence

The old page's roster, department counts and approval strip came from local fixtures rather than persistent bot state. The new view uses only the existing authenticated bot APIs. Current product patterns such as [Notion Agents](https://www.notion.com/product/agents) make permissions and activity visible, while [FigJam](https://www.figma.com/best-practices/collaborating-in-figjam/) keeps feedback tied to a shared working surface. VYREN's page is a narrower, intentionally first-bot interpretation, not a copy of either product.

## Open question

After the signed-in founder-to-draft flow is proven, should the next Team surface be a conversation thread or a task history? That decision depends on observed founder behavior and the next runtime gate.
