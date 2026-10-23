# Team Workroom design direction

**Status:** Implemented page-level direction, 23 October 2026. Subham selected a fresh Team visual language and “a trusted creative colleague” as the first impression. This document applies to `/team`; it does not replace the broader app design guide at `Visual-Intelligence/product/frontend/src/app/DESIGN.md`.

## Creative north star

A quiet working desk for one creative colleague. The page should feel attentive, legible and grounded. Its first viewport explains who the bot is, what the founder can ask of it, and which decisions stay human.

## System

| Role | Value | Reason |
| --- | --- | --- |
| Ground | `#e9ede8` | Cool mineral light separates Team from the sky-and-glass prototype. |
| Work surface | `#ffffff` | Briefs and drafts deserve the clearest reading surface. |
| Botanical ink | `#17251f` | High-contrast text without the hardness of pure black. |
| Action | `#244d37` | One restrained action color; green also connects to memory and growth. |
| Muted text | `#647368` | Secondary details remain legible. |
| Soft division | `#d9dfd7` | Columns are separated without stacked nested cards. |
| Caution | `#a13936` | Errors use a distinct hue, never a fake urgency banner. |

The existing locally loaded **Nohemi** family is used for display and UI, so this page adds no font service or dependency. Type starts with a large, compact page title, then a clear bot name and work-section headings. Small uppercase labels are reserved for metadata; they never carry the primary message.

The desktop composition has three unequal columns: bot identity and authority, a dominant brief-to-draft work surface, and approved memory. Below 1180px, memory moves beneath the work area; below 740px, everything stacks in reading order. Spacing follows a loose 8px rhythm. Corners are restrained (6–15px). Movement is limited to feedback on buttons and the loading indicator, with reduced-motion support.

## Content rules

- The persistent bot comes from the authenticated backend. No fixture coworker may appear active.
- Draft state, source, route, uncertainty and tool audit remain inspectable after refresh.
- A local concept is called a local concept. It does not claim model execution, media generation or publishing permission.
- Only founder-submitted, sourced guidance appears in approved role memory.
- Future multi-bot collaboration and computer sessions are presented as planned capabilities, without simulated counts or progress.
- Signed-out, loading, unavailable, empty and saved-result states receive distinct copy.

## Deliberate risks

The page gives one bot almost the whole canvas, even though the product thesis includes a future workforce. This sacrifices the visual excitement of a six-person roster to earn trust today. The calm mineral palette also departs from VYREN's broader meadow atmosphere; the page becomes the place to operate, not another ambient showcase.

## Verification

The anonymous `/team` state was inspected in a local browser at desktop width. TypeScript and targeted ESLint checks passed. `npm run build` passed with Next.js webpack; Turbopack's CSS-module worker exited before connecting in this environment, so the build script uses the supported webpack path. Signed-in and narrow-screen visual checks remain open.

The Team sign-in modal also suppresses its global concept-art carousel and uses a focused form, so opening it from this page does not reintroduce simulated “live” work. The login form was visually checked without entering credentials.
