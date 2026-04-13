import { Chess } from "chess.js";

export const pendingGames = new Map();
export const activeGames = new Map();

/**
 * Create pending chess request
 */
export function createPendingGame(player1, player2, duration) {
  pendingGames.set(player2, {
    player1,
    player2,
    duration,
    createdAt: Date.now()
  });
}

/**
 * Confirm pending game
 */
export function confirmGame(player2, player1) {
  const pending = pendingGames.get(player2);
  if (!pending || pending.player1 !== player1) return null;

  const chess = new Chess();
  const gameId = `${player1}-${player2}`;

  activeGames.set(gameId, {
    chess,
    players: {
      white: player1,
      black: player2
    },
    duration: pending.duration,
    lastMoveAt: Date.now()
  });

  pendingGames.delete(player2);
  return activeGames.get(gameId);
}

/**
 * Find game by player
 */
export function getGameByPlayer(userId) {
  for (const game of activeGames.values()) {
    if (game.players.white === userId || game.players.black === userId) {
      return game;
    }
  }
  return null;
}

/**
 * Try algebraic move
 */
export function tryMove(userId, content) {
  const game = getGameByPlayer(userId);
  if (!game) return null;

  const chess = game.chess;
  const isWhiteTurn = chess.turn() === "w";
  const correctPlayer =
    (isWhiteTurn && game.players.white === userId) ||
    (!isWhiteTurn && game.players.black === userId);

  if (!correctPlayer) return null;

  const move = chess.move(content, { sloppy: true });
  if (!move) return null;

  game.lastMoveAt = Date.now();
  return {
    move,
    fen: chess.fen(),
    check: chess.isCheck(),
    gameOver: chess.isGameOver()
  };
}
