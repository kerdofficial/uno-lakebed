import { Link, useAuth, useQuery } from "lakebed/client";
import { GameView } from "./GameView";
import { LobbyView } from "./LobbyView";
import type { GameLobbyState } from "../types";

export function GamePage({ gameId }: { gameId: string }) {
  const auth = useAuth();
  const lobbyStateRaw = useQuery<GameLobbyState | []>("gameLobbyState");
  const lobbyState = Array.isArray(lobbyStateRaw) ? null : lobbyStateRaw;
  const gameData = lobbyState?.games.find((game) => game.id === gameId);

  if (auth.isLoading || !lobbyState) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] text-neutral-400">
        Loading game...
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] text-neutral-400">
        <div className="text-center">
          <div className="text-lg mb-2">Game not found</div>
          <Link to="/" className="text-white hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (gameData.status === "playing") {
    return <GameView gameId={gameId} />;
  }

  return <LobbyView game={gameData} players={gameData.players || []} />;
}
