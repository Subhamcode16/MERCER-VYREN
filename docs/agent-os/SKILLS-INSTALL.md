# Global skill installation record

Installed for Subham's Codex environment on 2026-10-18. These skills are available to new Codex turns globally, and should be selected for the task at hand rather than loaded wholesale into every prompt.

| Source | Pinned revision | Installed content | Global location |
| --- | --- | --- | --- |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | `aeac41d4d005999432bb7312f7ff06383a91d59d` | 25 skills from `skills/` | `C:\Users\User\.codex\skills\` |
| [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | `16352ac229eb08a9598dcae48fe9f2b342567d86` | 6 skills from `skills/` | `C:\Users\User\.codex\skills\` |
| [garrytan/gstack](https://github.com/garrytan/gstack) | `d258bcffb0cb7bda5f133f3e957f932d816d282f` | Codex suite via official `./setup --host codex --global --prefix` | `C:\Users\User\.codex\skills\gstack*`; source at `C:\Users\User\.codex\vendor\gstack` |

The gstack installation was verified with its `./setup --status` check: global Codex installation current, and section links resolve. The optional bundled Chromium browser was not downloaded during setup. Browser-dependent gstack commands require that later setup step; ordinary Codex browser and computer tools remain separate. Bun is retained at `C:\Users\User\.codex\vendor\bun` for gstack updates.

Third-party skill content is guidance, not authority to bypass VYREN's `AGENTS.md`, tenant isolation, evidence rules, or human decision boundaries. Review a skill before using it for consequential work.
