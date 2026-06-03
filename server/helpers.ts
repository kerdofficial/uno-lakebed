import { computePlayerView } from "../shared/gameLogic";
import type { GameState } from "../shared/gameTypes";

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(): string {
  let code = "";
  for (let index = 0; index < 6; index++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

export function numberField(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeDisplayName(displayName: string): string {
  const clean = String(displayName || "").replace(/\s+/g, " ").trim();
  if (clean.length < 2) throw new Error("Username must be at least 2 characters");
  return clean.slice(0, 24);
}

export function normalizePlayerRecord(player: any) {
  return {
    ...player,
    wins: String(numberField(player.wins)),
  };
}

export function normalizeGameRecord(game: any) {
  return {
    ...game,
    roundsPlayed: String(numberField(game.roundsPlayed)),
  };
}

export function findPlayerInGame(ctx: any, gameId: string, userId: string) {
  const gamePlayers = ctx.db.players.where("gameId", gameId).all();
  return gamePlayers.find((player: any) => player.userId === userId) || null;
}

export function findPlayerView(ctx: any, gameId: string, userId: string) {
  const views = ctx.db.playerViews.where("gameId", gameId).all();
  return views.find((view: any) => view.pvUserId === userId) || null;
}

export function upsertPlayerView(ctx: any, gameId: string, userId: string, viewJson: string) {
  const existing = findPlayerView(ctx, gameId, userId);
  if (existing) {
    ctx.db.playerViews.update(existing.id, { view: viewJson });
    return;
  }
  ctx.db.playerViews.insert({ gameId, pvUserId: userId, view: viewJson });
}

function playerInfos(players: any[]) {
  return players.map((player: any) => ({
    userId: player.userId,
    displayName: player.displayName,
    picture: player.picture,
  }));
}

export function refreshPlayerViews(ctx: any, gameId: string, state: GameState) {
  const players = ctx.db.players.where("gameId", gameId).orderBy("seatIndex", "asc").all();
  const infos = playerInfos(players);

  for (const player of players) {
    const view = computePlayerView(state, player.userId, gameId, infos);
    upsertPlayerView(ctx, gameId, player.userId, JSON.stringify(view));
  }
}

export function gamesForUser(ctx: any, includeFinished: boolean) {
  const myPlayers = ctx.db.players.where("userId", ctx.auth.userId).all();
  const results: any[] = [];

  for (const player of myPlayers) {
    const game = ctx.db.games.get(player.gameId);
    if (
      game &&
      game.status !== "closed" &&
      (includeFinished || game.status !== "finished")
    ) {
      const gamePlayers = ctx.db.players.where("gameId", player.gameId).all();
      results.push({
        ...normalizeGameRecord(game),
        players: gamePlayers.map(normalizePlayerRecord),
      });
    }
  }

  return results;
}
