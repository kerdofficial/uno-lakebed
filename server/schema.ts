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
    view: string(),
  }),
};
