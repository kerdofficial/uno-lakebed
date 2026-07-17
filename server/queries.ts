import { query } from "lakebed/server";
import { gamesForUser } from "./helpers";

export const queries = {
  myGames: query(async (ctx) => gamesForUser(ctx, true)),
  myGameView: query(async (ctx) =>
    ctx.db.playerViews
      .withIndex("by_pv_user", (q) => q.eq("pvUserId", ctx.auth.userId))
      .collect()
  ),
  gameLobby: query(async (ctx) => gamesForUser(ctx, true)),
  gameLobbyState: query(async (ctx) => ({ games: await gamesForUser(ctx, true) })),
};
