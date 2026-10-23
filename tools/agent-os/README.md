# VYREN Agent OS workspace board

This is a local progress board and developer code index for Subham's VYREN Agent OS work. It is separate from VYREN's brand and institutional memory. It does not grant agent authority or publish claims about Grok Bot.

The project artifact catalog is [docs/agent-os/README.md](../../docs/agent-os/README.md). The three requested global skill installs are recorded in [docs/agent-os/SKILLS-INSTALL.md](../../docs/agent-os/SKILLS-INSTALL.md).

Start from the repository root:

```powershell
node tools/agent-os/server.mjs
```

Open `http://127.0.0.1:4177`. The server binds only to your computer. Board cards are stored in `tasks.json`; moving one in the browser writes that file and appends a local activity record. Cards with an evidence file can display it directly. Changes to the task file made elsewhere appear in the open board on the next five-second check. The code index also refreshes within five seconds while the server is running.

For agent or terminal lookup:

```powershell
node tools/agent-os/cli.mjs index
node tools/agent-os/cli.mjs search GovernancePolicyGate
node tools/agent-os/cli.mjs neighbors file:Visual-Intelligence/product/backend/src/agent_runtime/policy/runtime_policy.py
node tools/agent-os/cli.mjs tasks
node tools/agent-os/cli.mjs move OS-002 "In Progress"
node --test tools/agent-os/graph.test.mjs
```

The index is cached at `.cache/graph.json`. It contains file names, source hashes, symbol and Markdown heading names with line numbers, resolved import links, and first-line positions for document search terms. It covers the project's `Visual-Intelligence`, `docs`, `scripts`, `tests`, and Agent OS tool folders, plus selected root product documents. It excludes archives, generated dependencies, `.env`, founder notes, credentials, and unrelated product memory. Queries return bounded path references; open the exact source before changing code. Source edits are detected by modification time and size; the refresh reuses parsed records for unchanged files. Stopping the server stops live refresh, and starting it again brings the board up to date.

The board currently records work in this repository. It is not a public hosted site or a cross-device notification service. The activity log records board movements made in the browser; direct edits to `tasks.json` update the board but do not create a movement record.
