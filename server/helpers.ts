import { computePlayerView } from "../shared/gameLogic";
import { parseGameSettings } from "../shared/gameSettings";
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
    settings: JSON.stringify(parseGameSettings(game.settings || "")),
    roundsPlayed: String(numberField(game.roundsPlayed)),
  };
}

export async function findPlayerInGame(ctx: any, gameId: string, userId: string) {
  const gamePlayers = await ctx.db.players
    .withIndex("by_game_seat", (q: any) => q.eq("gameId", gameId))
    .collect();
  return gamePlayers.find((player: any) => player.userId === userId) || null;
}

export async function findPlayerView(ctx: any, gameId: string, userId: string) {
  const views = await ctx.db.playerViews
    .withIndex("by_game", (q: any) => q.eq("gameId", gameId))
    .collect();
  return views.find((view: any) => view.pvUserId === userId) || null;
}

export async function upsertPlayerView(ctx: any, gameId: string, userId: string, viewJson: string) {
  const existing = await findPlayerView(ctx, gameId, userId);
  if (existing) {
    await ctx.db.playerViews.update(existing.id, { view: viewJson });
    return;
  }
  await ctx.db.playerViews.insert({ gameId, pvUserId: userId, view: viewJson });
}

function playerInfos(players: any[]) {
  return players.map((player: any) => ({
    userId: player.userId,
    displayName: player.displayName,
    picture: player.picture,
  }));
}

export async function refreshPlayerViews(ctx: any, gameId: string, state: GameState) {
  const players = await ctx.db.players
    .withIndex("by_game_seat", (q: any) => q.eq("gameId", gameId))
    .order("asc")
    .collect();
  const infos = playerInfos(players);

  for (const player of players) {
    const view = computePlayerView(state, player.userId, gameId, infos);
    await upsertPlayerView(ctx, gameId, player.userId, JSON.stringify(view));
  }
}

export async function gamesForUser(ctx: any, includeFinished: boolean) {
  const myPlayers = await ctx.db.players
    .withIndex("by_user", (q: any) => q.eq("userId", ctx.auth.userId))
    .collect();
  const results: any[] = [];

  for (const player of myPlayers) {
    const game = await ctx.db.games.get(player.gameId);
    if (
      game &&
      game.status !== "closed" &&
      (includeFinished || game.status !== "finished")
    ) {
      const gamePlayers = await ctx.db.players
        .withIndex("by_game_seat", (q: any) => q.eq("gameId", player.gameId))
        .collect();
      results.push({
        ...normalizeGameRecord(game),
        players: gamePlayers.map(normalizePlayerRecord),
      });
    }
  }

  return results;
}
