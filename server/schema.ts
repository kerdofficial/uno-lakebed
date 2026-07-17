import { boolean, string, table } from "lakebed/server";

export const schema = {
  games: table({
    code: string(),
    hostId: string(),
    status: string(),
    state: string(),
    settings: string(),
    winnerId: string(),
    roundsPlayed: string(),
  }).index("by_code", ["code"]),
  players: table({
    gameId: string(),
    userId: string(),
    displayName: string(),
    picture: string(),
    seatIndex: string(),
    wins: string(),
    isReady: boolean().default(false),
  })
    .index("by_game_seat", ["gameId", "seatIndex"])
    .index("by_user", ["userId"]),
  playerViews: table({
    gameId: string(),
    pvUserId: string(),
    view: string(),
  })
    .index("by_pv_user", ["pvUserId"])
    .index("by_game", ["gameId"]),
};
