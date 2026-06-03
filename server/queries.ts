import { query } from "lakebed/server";
import { gamesForUser } from "./helpers";

export const queries = {
  myGames: query((ctx) => gamesForUser(ctx, true)),
  myGameView: query((ctx) => {
    return ctx.db.playerViews.where("pvUserId", ctx.auth.userId).all();
  }),
  gameLobby: query((ctx) => gamesForUser(ctx, true)),
  gameLobbyState: query((ctx) => ({ games: gamesForUser(ctx, true) })),
};
