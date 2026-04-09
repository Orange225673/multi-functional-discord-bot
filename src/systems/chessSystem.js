const { Chess } = require("chess.js");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");

const BOARD_SIZE = 800;
const SQUARE_SIZE = BOARD_SIZE / 8;

// simple in-memory games (you can replace later)
const games = new Map();

/**
 * Create a new chess game
 */
module.exports = s = function createGame(gameId) {
  const chess = new Chess();
  games.set(gameId, chess);
  return chess;
}

/**
 * Get existing game
 */
module.exports = function getGame(gameId) {
  return games.get(gameId);
}

/**
 * Apply algebraic notation move
 */
module.exports = function makeMove(gameId, algebraicMove) {
  const chess = games.get(gameId);
  if (!chess) return { error: "Game not found" };

  const move = chess.move(algebraicMove, { sloppy: true });
  if (!move) {
    return { error: "Invalid move" };
  }

  return {
    move,
    fen: chess.fen(),
    turn: chess.turn(),
    gameOver: chess.isGameOver(),
    check: chess.isCheck(),
  };
}
