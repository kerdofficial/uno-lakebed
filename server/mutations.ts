import { mutation } from "lakebed/server";
import { applyAction, initializeGame } from "../shared/gameLogic";
import { parseGameSettings, serializeGameSettings } from "../shared/gameSettings";
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
  createGame: mutation(async (ctx) => {
    const code = generateRoomCode();
    const game = await ctx.db.games.insert({
      code,
      hostId: ctx.auth.userId,
      status: "lobby",
      state: "",
      settings: serializeGameSettings({ maxPlayers: 4, gameMode: "regular" }),
      winnerId: "",
      roundsPlayed: "0",
    });

    await ctx.db.players.insert({
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

  joinGame: mutation(async (ctx, code: string) => {
    const game = await ctx.db.games
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .first();
    if (!game) throw new Error("Game not found");
    if (game.status !== "lobby" && game.status !== "finished") {
      throw new Error("Room is not joinable");
    }

    const existing = await findPlayerInGame(ctx, game.id, ctx.auth.userId);
    if (existing) return { gameId: game.id };

    const currentPlayers = await ctx.db.players
      .withIndex("by_game_seat", (q) => q.eq("gameId", game.id))
      .collect();
    const settings = parseGameSettings(game.settings);
    if (currentPlayers.length >= settings.maxPlayers) {
      throw new Error("Game is full");
    }

    await ctx.db.players.insert({
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

  toggleReady: mutation(async (ctx, gameId: string) => {
    const player = await findPlayerInGame(ctx, gameId, ctx.auth.userId);
    if (!player) throw new Error("Not in this game");
    await ctx.db.players.update(player.id, { isReady: !player.isReady });
  }),

  updateGameSettings: mutation(async (ctx, gameId: string, settingsJson: string) => {
    const game = await ctx.db.games.get(gameId);
    if (!game) throw new Error("Game not found");
    if (game.hostId !== ctx.auth.userId) throw new Error("Only host can update settings");
    if (game.status !== "lobby" && game.status !== "finished") {
      throw new Error("Cannot update settings during a game");
    }

    const settings = parseGameSettings(settingsJson);
    await ctx.db.games.update(gameId, {
      settings: JSON.stringify(settings),
    });
  }),

  startGame: mutation(async (ctx, gameId: string) => {
    const game = await ctx.db.games.get(gameId);
    if (!game) throw new Error("Game not found");
    if (game.hostId !== ctx.auth.userId) throw new Error("Only host can start");
    if (game.status === "playing") throw new Error("Game already started");
    if (game.status === "closed") throw new Error("Room is closed");
    if (numberField(game.roundsPlayed) >= 100) {
      throw new Error("Room reached the game limit");
    }

    const players = await ctx.db.players
      .withIndex("by_game_seat", (q) => q.eq("gameId", gameId))
      .order("asc")
      .collect();
    if (players.length < 2) throw new Error("Need at least 2 players");

    const settings = parseGameSettings(game.settings);
    const gameState = initializeGame(players.map((player: any) => player.userId), settings);
    await ctx.db.games.update(gameId, {
      status: "playing",
      state: JSON.stringify(gameState),
      winnerId: "",
    });

    await refreshPlayerViews(ctx, gameId, gameState);
  }),

  closeRoom: mutation(async (ctx, gameId: string) => {
    const game = await ctx.db.games.get(gameId);
    if (!game) throw new Error("Game not found");
    if (game.hostId !== ctx.auth.userId) throw new Error("Only host can close");
    if (game.status === "playing") throw new Error("Cannot close during a game");
    await ctx.db.games.update(gameId, { status: "closed" });
  }),

  kickPlayer: mutation(async (ctx, gameId: string, targetUserId: string) => {
    const game = await ctx.db.games.get(gameId);
    if (!game) throw new Error("Game not found");
    if (game.hostId !== ctx.auth.userId) throw new Error("Only host can kick");
    if (game.status === "playing") throw new Error("Cannot kick during a game");
    if (targetUserId === game.hostId) throw new Error("Host cannot be kicked");

    const player = await findPlayerInGame(ctx, gameId, targetUserId);
    if (!player) throw new Error("Player not in this room");

    await ctx.db.players.delete(player.id);
    const view = await findPlayerView(ctx, gameId, targetUserId);
    if (view) await ctx.db.playerViews.delete(view.id);
  }),

  updateDisplayName: mutation(async (ctx, gameId: string, displayName: string) => {
    const player = await findPlayerInGame(ctx, gameId, ctx.auth.userId);
    if (!player) throw new Error("Not in this game");

    await ctx.db.players.update(player.id, {
      displayName: normalizeDisplayName(displayName),
    });

    const game = await ctx.db.games.get(gameId);
    if (game?.state && game.status === "playing") {
      await refreshPlayerViews(ctx, gameId, JSON.parse(game.state));
    }
  }),

  gameAction: mutation(async (ctx, gameId: string, actionJson: string) => {
    const game = await ctx.db.games.get(gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "playing") throw new Error("Game not in progress");

    const players = await ctx.db.players
      .withIndex("by_game_seat", (q) => q.eq("gameId", gameId))
      .collect();
    if (!players.some((player: any) => player.userId === ctx.auth.userId)) {
      throw new Error("Not a player in this game");
    }

    const gameState: GameState = JSON.parse(game.state);
    const action: GameAction = JSON.parse(actionJson);
    const newState = applyAction(gameState, ctx.auth.userId, action);
    const updateData: any = {
      state: JSON.stringify(newState),
      winnerId: newState.winner || "",
    };

    if (newState.phase === "finished" && newState.winner) {
      updateData.status = "finished";
      updateData.winnerId = newState.winner;
      updateData.roundsPlayed = String(numberField(game.roundsPlayed) + 1);

      for (const player of players) {
        await ctx.db.players.update(player.id, { isReady: false });
      }

      const winner = players.find((player: any) => player.userId === newState.winner);
      if (winner) {
        await ctx.db.players.update(winner.id, {
          wins: String(numberField(winner.wins) + 1),
        });
      }
    }

    await ctx.db.games.update(gameId, updateData);
    await refreshPlayerViews(ctx, gameId, newState);
  }),

  leaveGame: mutation(async (ctx, gameId: string) => {
    const player = await findPlayerInGame(ctx, gameId, ctx.auth.userId);
    if (!player) return;

    await ctx.db.players.delete(player.id);
    const remaining = await ctx.db.players
      .withIndex("by_game_seat", (q) => q.eq("gameId", gameId))
      .collect();
    if (remaining.length === 0) {
      await ctx.db.games.delete(gameId);
    }
  }),
};
