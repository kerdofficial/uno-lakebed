import { boolean, capsule, mutation, query, string, table, text } from "lakebed/server";
import { initializeGame, applyAction, computePlayerView } from "../shared/gameLogic";
import type { GameState, GameAction } from "../shared/gameTypes";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function findPlayerInGame(ctx: any, gameId: string, userId: string) {
  const gamePlayers = ctx.db.players.where("gameId", gameId).all();
  return gamePlayers.find((p: any) => p.userId === userId) || null;
}

function findPlayerView(ctx: any, gameId: string, userId: string) {
  const views = ctx.db.playerViews.where("gameId", gameId).all();
  return views.find((v: any) => v.pvUserId === userId) || null;
}

function upsertPlayerView(ctx: any, gameId: string, userId: string, viewJson: string) {
  const existing = findPlayerView(ctx, gameId, userId);
  if (existing) {
    ctx.db.playerViews.update(existing.id, { view: viewJson });
  } else {
    ctx.db.playerViews.insert({ gameId, pvUserId: userId, view: viewJson });
  }
}

function normalizeDisplayName(displayName: string): string {
  const clean = String(displayName || "").replace(/\s+/g, " ").trim();
  if (clean.length < 2) throw new Error("Username must be at least 2 characters");
  return clean.slice(0, 24);
}

function numberField(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePlayerRecord(player: any) {
  return {
    ...player,
    wins: String(numberField(player.wins)),
  };
}

function normalizeGameRecord(game: any) {
  return {
    ...game,
    roundsPlayed: String(numberField(game.roundsPlayed)),
  };
}

function playerInfos(players: any[]) {
  return players.map((p: any) => ({
    userId: p.userId,
    displayName: p.displayName,
    picture: p.picture,
  }));
}

function refreshPlayerViews(ctx: any, gameId: string, state: GameState) {
  const players = ctx.db.players
    .where("gameId", gameId)
    .orderBy("seatIndex", "asc")
    .all();
  const infos = playerInfos(players);

  for (const p of players) {
    const view = computePlayerView(state, p.userId, gameId, infos);
    upsertPlayerView(ctx, gameId, p.userId, JSON.stringify(view));
  }
}

function gamesForUser(ctx: any, includeFinished: boolean) {
  const myPlayers = ctx.db.players
    .where("userId", ctx.auth.userId)
    .all();

  const results: any[] = [];
  for (const p of myPlayers) {
    const game = ctx.db.games.get(p.gameId);
    if (
      game &&
      game.status !== "closed" &&
      (includeFinished || game.status !== "finished")
    ) {
      const gamePlayers = ctx.db.players
        .where("gameId", p.gameId)
        .all();
      results.push({
        ...normalizeGameRecord(game),
        players: gamePlayers.map(normalizePlayerRecord),
      });
    }
  }
  return results;
}

export default capsule({
  name: "uno",

  schema: {
    games: table({
      code: string(),
      hostId: string(),
      status: string(),
      state: text(),
      settings: text(),
      winnerId: string(),
      roundsPlayed: string(),
    }),
    players: table({
      gameId: string(),
      userId: string(),
      displayName: string(),
      picture: string(),
      seatIndex: string(),
      wins: string(),
      isReady: boolean().default(false),
    }),
    playerViews: table({
      gameId: string(),
      pvUserId: string(),
      view: text(),
    }),
  },

  queries: {
    myGames: query((ctx) => {
      return gamesForUser(ctx, true);
    }),

    myGameView: query((ctx) => {
      return ctx.db.playerViews
        .where("pvUserId", ctx.auth.userId)
        .all();
    }),

    gameLobby: query((ctx) => {
      return gamesForUser(ctx, true);
    }),

    gameLobbyState: query((ctx) => {
      return { games: gamesForUser(ctx, true) };
    }),
  },

  mutations: {
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

      const games = ctx.db.games.where("code", code).all();
      const game = games[0];
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
      const games = ctx.db.games
        .where("code", code.toUpperCase())
        .all();

      if (games.length === 0) throw new Error("Game not found");
      const game = games[0];

      if (game.status !== "lobby" && game.status !== "finished")
        throw new Error("Room is not joinable");

      const existing = findPlayerInGame(ctx, game.id, ctx.auth.userId);
      if (existing) return { gameId: game.id };

      const currentPlayers = ctx.db.players
        .where("gameId", game.id)
        .all();

      const settings = JSON.parse(game.settings || '{"maxPlayers":4}');
      if (currentPlayers.length >= settings.maxPlayers)
        throw new Error("Game is full");

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
      if (numberField(game.roundsPlayed) >= 100)
        throw new Error("Room reached the game limit");

      const players = ctx.db.players
        .where("gameId", gameId)
        .orderBy("seatIndex", "asc")
        .all();

      if (players.length < 2) throw new Error("Need at least 2 players");

      const playerIds = players.map((p: any) => p.userId);
      const gameState = initializeGame(playerIds);

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

      const clean = normalizeDisplayName(displayName);
      ctx.db.players.update(player.id, { displayName: clean });

      const game = ctx.db.games.get(gameId);
      if (game?.state && game.status === "playing") {
        refreshPlayerViews(ctx, gameId, JSON.parse(game.state));
      }
    }),

    gameAction: mutation((ctx, gameId: string, actionJson: string) => {
      const game = ctx.db.games.get(gameId);
      if (!game) throw new Error("Game not found");
      if (game.status !== "playing") throw new Error("Game not in progress");

      const players = ctx.db.players
        .where("gameId", gameId)
        .all();

      const isPlayer = players.some((p: any) => p.userId === ctx.auth.userId);
      if (!isPlayer) throw new Error("Not a player in this game");

      const gameState: GameState = JSON.parse(game.state);
      const action: GameAction = JSON.parse(actionJson);

      const newState = applyAction(gameState, ctx.auth.userId, action);

      const updateData: any = { state: JSON.stringify(newState) };
      if (newState.winner) {
        updateData.status = "finished";
        updateData.winnerId = newState.winner;
        updateData.roundsPlayed = String(numberField(game.roundsPlayed) + 1);

        const winner = players.find((p: any) => p.userId === newState.winner);
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

      const remaining = ctx.db.players
        .where("gameId", gameId)
        .all();

      if (remaining.length === 0) {
        ctx.db.games.delete(gameId);
      }
    }),
  },

  endpoints: {},
});
