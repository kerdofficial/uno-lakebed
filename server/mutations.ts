import { mutation } from "lakebed/server";
import { applyAction, initializeGame } from "../shared/gameLogic";
import type { GameAction, GameState } from "../shared/gameTypes";
import {
  findPlayerInGame,
  findPlayerView,
  generateRoomCode,
  normalizeDisplayName,
  numberField,
  refreshPlayerViews,
} from "./helpers";

export const mutations = {
  createGame: mutation((ctx) => {
    const code = generateRoomCode();
    ctx.db.games.insert({
      code,
      hostId: ctx.auth.userId,
      status: "lobby",
      state: "",
      settings: JSON.stringify({ maxPlayers: 4 }),
      winnerId: "",
      roundsPlayed: "0",
    });

    const game = ctx.db.games.where("code", code).all()[0];
    if (!game) throw new Error("Failed to create game");

    ctx.db.players.insert({
      gameId: game.id,
      userId: ctx.auth.userId,
      displayName: ctx.auth.displayName || "Player",
      picture: ctx.auth.picture || "",
      seatIndex: "0",
      wins: "0",
      isReady: false,
    });

    return { gameId: game.id, code };
  }),

  joinGame: mutation((ctx, code: string) => {
    const game = ctx.db.games.where("code", code.toUpperCase()).all()[0];
    if (!game) throw new Error("Game not found");
    if (game.status !== "lobby" && game.status !== "finished") {
      throw new Error("Room is not joinable");
    }

    const existing = findPlayerInGame(ctx, game.id, ctx.auth.userId);
    if (existing) return { gameId: game.id };

    const currentPlayers = ctx.db.players.where("gameId", game.id).all();
    const settings = JSON.parse(game.settings || '{"maxPlayers":4}');
    if (currentPlayers.length >= settings.maxPlayers) {
      throw new Error("Game is full");
    }

    ctx.db.players.insert({
      gameId: game.id,
      userId: ctx.auth.userId,
      displayName: ctx.auth.displayName || "Player",
      picture: ctx.auth.picture || "",
      seatIndex: String(currentPlayers.length),
      wins: "0",
      isReady: false,
    });

    return { gameId: game.id };
  }),

  toggleReady: mutation((ctx, gameId: string) => {
    const player = findPlayerInGame(ctx, gameId, ctx.auth.userId);
    if (!player) throw new Error("Not in this game");
    ctx.db.players.update(player.id, { isReady: !player.isReady });
  }),

  startGame: mutation((ctx, gameId: string) => {
    const game = ctx.db.games.get(gameId);
    if (!game) throw new Error("Game not found");
    if (game.hostId !== ctx.auth.userId) throw new Error("Only host can start");
    if (game.status === "playing") throw new Error("Game already started");
    if (game.status === "closed") throw new Error("Room is closed");
    if (numberField(game.roundsPlayed) >= 100) {
      throw new Error("Room reached the game limit");
    }

    const players = ctx.db.players.where("gameId", gameId).orderBy("seatIndex", "asc").all();
    if (players.length < 2) throw new Error("Need at least 2 players");

    const gameState = initializeGame(players.map((player: any) => player.userId));
    ctx.db.games.update(gameId, {
      status: "playing",
      state: JSON.stringify(gameState),
      winnerId: "",
    });

    refreshPlayerViews(ctx, gameId, gameState);
  }),

  closeRoom: mutation((ctx, gameId: string) => {
    const game = ctx.db.games.get(gameId);
    if (!game) throw new Error("Game not found");
    if (game.hostId !== ctx.auth.userId) throw new Error("Only host can close");
    if (game.status === "playing") throw new Error("Cannot close during a game");
    ctx.db.games.update(gameId, { status: "closed" });
  }),

  kickPlayer: mutation((ctx, gameId: string, targetUserId: string) => {
    const game = ctx.db.games.get(gameId);
    if (!game) throw new Error("Game not found");
    if (game.hostId !== ctx.auth.userId) throw new Error("Only host can kick");
    if (game.status === "playing") throw new Error("Cannot kick during a game");
    if (targetUserId === game.hostId) throw new Error("Host cannot be kicked");

    const player = findPlayerInGame(ctx, gameId, targetUserId);
    if (!player) throw new Error("Player not in this room");

    ctx.db.players.delete(player.id);
    const view = findPlayerView(ctx, gameId, targetUserId);
    if (view) ctx.db.playerViews.delete(view.id);
  }),

  updateDisplayName: mutation((ctx, gameId: string, displayName: string) => {
    const player = findPlayerInGame(ctx, gameId, ctx.auth.userId);
    if (!player) throw new Error("Not in this game");

    ctx.db.players.update(player.id, {
      displayName: normalizeDisplayName(displayName),
    });

    const game = ctx.db.games.get(gameId);
    if (game?.state && game.status === "playing") {
      refreshPlayerViews(ctx, gameId, JSON.parse(game.state));
    }
  }),

  gameAction: mutation((ctx, gameId: string, actionJson: string) => {
    const game = ctx.db.games.get(gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "playing") throw new Error("Game not in progress");

    const players = ctx.db.players.where("gameId", gameId).all();
    if (!players.some((player: any) => player.userId === ctx.auth.userId)) {
      throw new Error("Not a player in this game");
    }

    const gameState: GameState = JSON.parse(game.state);
    const action: GameAction = JSON.parse(actionJson);
    const newState = applyAction(gameState, ctx.auth.userId, action);
    const updateData: any = { state: JSON.stringify(newState) };

    if (newState.winner) {
      updateData.status = "finished";
      updateData.winnerId = newState.winner;
      updateData.roundsPlayed = String(numberField(game.roundsPlayed) + 1);

      const winner = players.find((player: any) => player.userId === newState.winner);
      if (winner) {
        ctx.db.players.update(winner.id, {
          wins: String(numberField(winner.wins) + 1),
        });
      }
    }

    ctx.db.games.update(gameId, updateData);
    refreshPlayerViews(ctx, gameId, newState);
  }),

  leaveGame: mutation((ctx, gameId: string) => {
    const player = findPlayerInGame(ctx, gameId, ctx.auth.userId);
    if (!player) return;

    ctx.db.players.delete(player.id);
    const remaining = ctx.db.players.where("gameId", gameId).all();
    if (remaining.length === 0) {
      ctx.db.games.delete(gameId);
    }
  }),
};
