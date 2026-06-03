import { Link } from "lakebed/client";
import { GamePage } from "../pages/GamePage";

export function GameRouteWrapper() {
  const match = window.location.pathname.match(/^\/game\/(.+)$/);
  const gameId = match ? match[1] : null;

  if (!gameId) {
    return (
      <div className="text-center text-neutral-400 pt-20">
        Invalid game URL.{" "}
        <Link to="/" className="text-white hover:underline">
          Go home
        </Link>
      </div>
    );
  }

  return <GamePage gameId={gameId} />;
}
