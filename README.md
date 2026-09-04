# Latch - WebMCP Chess with ChatGPT

This repo is a fast prototype of a chess board that exposes WebMCP tools for an agent workflow.

Humans play White by clicking directly on the board.
After a human move, the client can either:

- ask for an automated Black response through `request_agent_move`, or
- pause for an external model-controlled move via `make_agent_move`.

Tools currently available:

- `get_game_state`
- `get_board_state`
- `start_game`
- `submit_human_move`
- `make_agent_move`
- `request_agent_move`

## Run locally

```bash
npm install
PORT=4174 npm run start:4174
```

Open `http://127.0.0.1:4174` (or next free port shown in terminal).

The app registers tools in page contexts that expose `document.modelContext` / `navigator.modelContext`.

If port 4174 is busy:

```bash
PORT=4175 npm run start:4175
```

The server will also fallback automatically from `PORT` to the next free port while running.

If you still see `ERR_CONNECTION_REFUSED`, it usually means the app is not running in the environment where your browser runs.  
Run it from a normal terminal window:

```bash
cd /Users/yura/Documents/Codex/2026-08-30/new-chat-2/latch-webmcp-chess
npm install
npm run start:4175
```

If you still can't connect, check a different port:

```bash
PORT=4176 npm run start:4176
```

## Architecture

- `src/chess-game.ts` keeps a single authoritative game state with legality checks.
- `src/server.ts` exposes:
  - a static page (`/`)
  - JSON state (`/api/state`)
  - tool calls (`/api/tools/call`)

## Note

This is a prototype for demo and learning, not a production chess engine.
