# web/ + hermes_cli/web_routers/ — the dashboard (`hermes dashboard` → `/chat`)

Applies on top of the root `AGENTS.md`. Backend routers: `hermes_cli/web_routers/*.py`, one file per
dashboard surface, mounted by `hermes_cli/web_server.py` (+ `web_server_*.py` siblings). Frontend:
`web/src/`. Shared JSON-RPC/WS client: `apps/shared` (`@hermes/shared`), also used by the desktop.

## Retained terminal view — the real `hermes --tui`

`hermes_cli/pty_bridge.py` + the `@app.websocket("/api/pty")` endpoint in `web_server.py`:

- `web/src/pages/ChatPage.tsx` mounts xterm.js `Terminal` with the WebGL renderer, `@xterm/addon-fit`
  (container-driven resize) and `@xterm/addon-unicode11` (wide-character widths).
- `/api/pty?token=…` upgrades to a WebSocket; auth uses the same ephemeral `_SESSION_TOKEN` as REST,
  passed as a query param because browsers cannot set `Authorization` on a WS upgrade.
- The server spawns exactly what `hermes --tui` would spawn, through `ptyprocess` (POSIX PTY — WSL
  works, native Windows does not).
- Frames are raw PTY bytes each way; resize travels as `\x1b[RESIZE:<cols>;<rows>]`, intercepted
  on the server and applied with `TIOCSWINSZ`.

## Fork web conversation design

The user's explicit October 10, 2026 request supersedes the upstream terminal-only web design:
`ConversationPage.tsx` is the primary readable, ChatGPT-style web surface. It calls the **existing**
`/api/ws` dispatcher through `GatewayClient` / `@hermes/shared`; it must not introduce another agent,
auth scheme, history store or model loop. Feature-owned code lives in `src/features/conversation/`.
Persisted and runtime session IDs are distinct; reconnect/resume uses the persisted ID. Approval
requests require an explicit user answer and remain scoped to the displayed runtime. The browser's
sessionStorage contains only its current persisted ID; private conversation text stays in SQLite.

The original `ChatPage.tsx` / `/api/pty` experience remains available through `?view=terminal` for
advanced terminal commands. Keep its transport behavior and tests intact. Support new slash behavior
through the canonical backend; commands requiring Ink panels are accessed through terminal view.
The new surface is portaled to `document.body` to escape dashboard transforms/stacking contexts;
while visible, it hides the old shell. On management routes, the normal dashboard remains visible.

## `dashboard` vs `serve`

`dashboard` and `serve` share `cmd_dashboard` / `start_server` but are independent surfaces — neither
launches the other. `serve` is the headless backend the desktop app spawns (`headless_backend=True`:
`cmd_dashboard` skips `_build_web_ui` and exports `HERMES_SERVE_HEADLESS=1` so `mount_spa()`
disables the SPA even if a stray `web_dist/` exists — only JSON-RPC/WS/API is reachable). The
desktop has no build/runtime dependency on this frontend. Details: `apps/desktop/src/AGENTS.md`.

## Rules

- Auth: every new REST route and WS endpoint uses the same session token; never a second scheme.
- Routers are one-file-per-surface; a new surface is a new `web_routers/<surface>.py`, not a growing
  `web_server.py`.
- Tests: Python in `tests/hermes_cli/` (routers, pty bridge); JS in the `web/` vitest suite. Python
  tests must not assert about `package.json` / `.tsx` sources (root testing rules). Root TypeScript
  style rules apply.
