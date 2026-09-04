import { Chess } from "chess.js";

export interface MoveInput {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
}

export interface GameState {
  fen: string;
  turn: "w" | "b";
  legalMoves: number;
  inCheck: boolean;
  isGameOver: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  result: string;
  history: string[];
  board: string[][];
}

export interface GameMoveResult {
  move: string;
  from: string;
  to: string;
  promotion?: string;
  san: string;
  state: GameState;
}

export type MoveError = { error: string };

function emptyBoardState(): string[][] {
  return Array.from({ length: 8 }, () => Array(8).fill(""));
}

function boardToMatrix(board: ReturnType<Chess["board"]>): string[][] {
  return board.map((row) =>
    row.map((square) => (square ? `${square.color}${square.type}` : "")),
  );
}

function toResult(chess: Chess): GameState {
  const board = boardToMatrix(chess.board());
  const result = {
    fen: chess.fen(),
    turn: chess.turn(),
    legalMoves: chess.moves().length,
    inCheck: chess.isCheck(),
    isGameOver: chess.isGameOver(),
    isCheckmate: chess.isCheckmate(),
    isStalemate: chess.isStalemate(),
    isDraw: chess.isStalemate() || chess.isThreefoldRepetition(),
    result: chess.isGameOver()
      ? chess.isCheckmate()
        ? (chess.turn() === "w" ? "0-1" : "1-0")
        : chess.isStalemate()
          ? "1/2-1/2"
          : "*"
      : "*",
    history: chess.history(),
    board,
  };

  return result;
}

export class ChessGame {
  private game: Chess;

  constructor(fen?: string) {
    this.game = fen ? new Chess(fen) : new Chess();
  }

  reset(fen?: string): GameState {
    this.game = fen ? new Chess(fen) : new Chess();
    return this.state();
  }

  state(): GameState {
    return toResult(this.game);
  }

  submitHumanMove(input: MoveInput): GameMoveResult {
    if (this.game.turn() !== "w") {
      throw new Error("not_whites_turn");
    }

    return this.apply(input);
  }

  submitBlackMove(input: MoveInput): GameMoveResult {
    if (this.game.turn() !== "b") {
      throw new Error("not_blacks_turn");
    }

    return this.apply(input);
  }

  requestAgentMove(): GameMoveResult {
    const moves = this.game.moves({ verbose: true });
    if (moves.length === 0) {
      throw new Error("no_legal_moves");
    }

    const selectedMove = moves[0];
    return this.apply({
      from: selectedMove.from,
      to: selectedMove.to,
      promotion: selectedMove.promotion as MoveInput["promotion"] | undefined,
    });
  }

  private apply(input: MoveInput): GameMoveResult {
    if (!/^[a-h][1-8]$/.test(input.from) || !/^[a-h][1-8]$/.test(input.to)) {
      throw new Error("invalid_square");
    }

    const move = this.game.move({
      from: input.from,
      to: input.to,
      promotion: input.promotion,
    });

    if (!move) {
      throw new Error("illegal_move");
    }

    return {
      move: `${input.from}${input.to}`,
      from: input.from,
      to: input.to,
      promotion: input.promotion,
      san: move.san,
      state: this.state(),
    };
  }
}
