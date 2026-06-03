import type { GameInfo, PlayerRecord } from "../shared/gameTypes";

export type GameWithPlayers = GameInfo & { players: PlayerRecord[] };

export type GameLobbyState = {
  games: GameWithPlayers[];
};
