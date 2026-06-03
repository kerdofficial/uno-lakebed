import { Link, SignInWithGoogle, navigate, useAuth, useMutation, useQuery } from "lakebed/client";
import { useState } from "preact/hooks";
import type { GameInfo, PlayerRecord } from "../../shared/gameTypes";

type MyGame = GameInfo & { players: PlayerRecord[] };

export function HomePage() {
  const auth = useAuth();
  const createGame = useMutation<[], { gameId: string; code: string }>("createGame");
  const joinGame = useMutation<[code: string], { gameId: string }>("joinGame");
  const myGames = useQuery<MyGame[]>("myGames");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  const handleCreate = async () => {
    try {
      setError("");
      const result = await createGame();
      navigate(`/game/${result.gameId}`);
    } catch (error: any) {
      setError(error.message || "Failed to create game");
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    try {
      setError("");
      const result = await joinGame(joinCode.trim().toUpperCase());
      navigate(`/game/${result.gameId}`);
    } catch (error: any) {
      setError(error.message || "Failed to join game");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8">
      <div className="text-center">
        <h1 className="text-6xl md:text-7xl font-black text-white tracking-tight mb-2">
          UNO
        </h1>
        <p className="text-neutral-500 text-sm">Play with friends</p>
      </div>

      {auth.isGuest ? (
        <div className="text-center">
          <p className="text-neutral-400 text-sm mb-4">
            Sign in to play
          </p>
          <SignInWithGoogle className="border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-200 hover:border-white hover:text-white rounded-lg" />
        </div>
      ) : (
        <div className="w-full max-w-xs flex flex-col gap-4">
          <button
            onClick={handleCreate}
            className="w-full py-3 bg-white text-black rounded-full font-bold text-lg hover:bg-neutral-200 transition-colors"
          >
            Create Game
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onInput={(event) => setJoinCode((event.target as HTMLInputElement).value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={6}
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-center font-mono tracking-widest uppercase placeholder:text-neutral-600 focus:border-white outline-none"
            />
            <button
              onClick={handleJoin}
              disabled={joinCode.length < 4}
              className="px-5 py-2.5 bg-neutral-800 text-white rounded-lg font-medium hover:bg-neutral-700 transition-colors disabled:opacity-40"
            >
              Join
            </button>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}

          {myGames.length > 0 && (
            <div className="mt-4">
              <div className="text-neutral-500 text-xs mb-2 text-center">
                Active games
              </div>
              {myGames.map((game) => (
                <Link
                  key={game.id}
                  to={`/game/${game.id}`}
                  className="block bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 mb-2 hover:border-neutral-600 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-white tracking-wider">
                      {game.code}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {game.status} - {game.players?.length || 0} players
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
