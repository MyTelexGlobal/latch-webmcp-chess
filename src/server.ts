import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { type MoveInput, ChessGame } from "./chess-game";

type ToolCallBody = {
  name: string;
  arguments?: Record<string, unknown>;
};

const game = new ChessGame();
const port = Number(process.env.PORT ?? 4173);
const publicRoot = resolve(process.cwd(), "public");

function toJson(value: unknown): string {
  return JSON.stringify(value);
}

function gameError(error: Error) {
  const message = error.message;
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

function gameStateResponse() {
  return {
    content: [{ type: "text", text: toJson({ state: game.state() }) }],
    state: game.state(),
  };
}

function normalizeMove(args?: Record<string, unknown>) {
  if (!args || typeof args !== "object") {
    throw new Error("invalid_args");
  }

  const from = String(args.from ?? "").toLowerCase();
  const to = String(args.to ?? "").toLowerCase();
  const promotion = (typeof args.promotion === "string" ? args.promotion : undefined) as
    | "q"
    | "r"
    | "b"
    | "n"
    | undefined;

  if (!from || !to) {
    throw new Error("missing_move");
  }
  return { from, to, promotion };
}

async function callTool(body: ToolCallBody) {
  const name = String(body.name || "");
  const args = body.arguments ?? {};

  switch (name) {
    case "get_game_state":
    case "get_board_state":
      return gameStateResponse();

    case "start_game": {
      const fen = typeof args.fen === "string" ? args.fen : undefined;
      const state = game.reset(fen);
      return {
        content: [{ type: "text", text: toJson({ state, message: "game reset" }) }],
        state,
      };
    }

    case "submit_human_move": {
      const move = normalizeMove(args as MoveInput);
      const result = game.submitHumanMove(move);
      const state = game.state();
      return {
        content: [{ type: "text", text: toJson({ move: result.san, state, result }) }],
        state,
      };
    }

    case "make_agent_move": {
      const move = normalizeMove(args as MoveInput);
      const result = game.submitBlackMove(move);
      return {
        content: [{ type: "text", text: toJson({ move: result.san, state: result.state, result }) }],
        state: result.state,
      };
    }

    case "request_agent_move": {
      const result = game.requestAgentMove();
      return {
        content: [{ type: "text", text: toJson({ move: result.san, state: result.state, result }) }],
        state: result.state,
      };
    }

    default:
      throw new Error(`unknown_tool:${name}`);
  }
}

function sendJson(res: any, payload: unknown, status = 200) {
  const body = toJson(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-cache",
  });
  res.end(body);
}

function mimeType(pathname: string) {
  switch (extname(pathname)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

async function readBody(req: any): Promise<Record<string, unknown> | null> {
  return new Promise((resolveBody) => {
    let text = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      text += chunk;
      if (text.length > 100_000) {
        resolveBody(null);
      }
    });
    req.on("end", () => {
      try {
        resolveBody(text ? (JSON.parse(text) as Record<string, unknown>) : {});
      } catch {
        resolveBody(null);
      }
    });
  });
}

const server = createServer(async (req, res) => {
  if (!req.url || !req.method) {
    res.statusCode = 400;
    res.end("bad request");
    return;
  }

  if (req.url === "/api/state" && req.method === "GET") {
    sendJson(res, { state: game.state() });
    return;
  }

  if (req.url === "/api/tools/call" && req.method === "POST") {
    try {
      const body = await readBody(req);
      if (!body) {
        sendJson(res, { error: "invalid_json" }, 400);
        return;
      }

      const result = await callTool(body as ToolCallBody);
      sendJson(res, result, 200);
      return;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("tool_failed");
      sendJson(res, gameError(error), 400);
      return;
    }
  }

  if (req.url === "/" || req.url.startsWith("/index.html")) {
    const file = await readFile(resolve(publicRoot, "index.html"));
    res.writeHead(200, { "content-type": mimeType("index.html") });
    res.end(file);
    return;
  }

  if (req.url.startsWith("/assets/")) {
    try {
      const file = await readFile(resolve(publicRoot, req.url.slice(1)));
      res.writeHead(200, { "content-type": mimeType(req.url) });
      res.end(file);
      return;
    } catch {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
  }

  res.statusCode = 404;
  res.end("not found");
});

server.listen(port, "127.0.0.1", () => {
  console.log(`latch-webmcp-chess is live at http://127.0.0.1:${port}`);
});
