import { Link, navigate, signInWithGoogle, useAuth, useMutation, useQuery } from "lakebed/client";
import { useRef, useState } from "preact/hooks";
import type { GameInfo, PlayerRecord } from "../../shared/gameTypes";
import { UnoCard } from "../components/cards/UnoCard";

type MyGame = GameInfo & { players: PlayerRecord[] };

const DECO_CARDS = [
  { color: "red" as const, type: "number" as const, value: 7, id: "d1" },
  { color: "blue" as const, type: "skip" as const, value: null, id: "d2" },
  { color: "green" as const, type: "reverse" as const, value: null, id: "d3" },
  { color: "yellow" as const, type: "number" as const, value: 1, id: "d4" },
  { color: null, type: "wild" as const, value: null, id: "d5" },
];

const DECO_TRANSFORMS = [
  "rotate(-25deg) translate(-95px, -30px)",
  "rotate(-12deg) translate(-55px, 15px)",
  "rotate(8deg) translate(45px, 20px)",
  "rotate(18deg) translate(85px, -25px)",
  "rotate(30deg) translate(110px, 10px)",
];

export function HomePage() {
  const auth = useAuth();
  const createGame = useMutation<[], { gameId: string; code: string }>("createGame");
  const joinGame = useMutation<[code: string], { gameId: string }>("joinGame");
  const myGames = useQuery<MyGame[]>("myGames");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const signInStartedRef = useRef(false);

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

  const handleGoogleSignIn = async () => {
    if (signInStartedRef.current) {
      return;
    }

    signInStartedRef.current = true;

    try {
      await signInWithGoogle();
    } catch (signInError) {
      signInStartedRef.current = false;
      const message = signInError instanceof Error ? signInError.message : "Sign in failed";
      setError(message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] gap-6 px-6">
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {DECO_CARDS.map((card, i) => (
            <div
              key={card.id}
              className="absolute opacity-[0.12]"
              style={{
                transform: DECO_TRANSFORMS[i],
                animation: `fade-slide-in 0.5s ease-out ${i * 100}ms both`,
              }}
            >
              <UnoCard card={card} size="small" />
            </div>
          ))}
        </div>

        <div className="text-center relative">
          <h1
            className="text-7xl md:text-8xl font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, #ef4444, #f59e0b, #22c55e, #3b82f6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 4px 12px rgba(239, 68, 68, 0.2))",
            }}
          >
            UNO
          </h1>
          <p className="text-neutral-400 text-sm mt-1 tracking-wide">Play with friends</p>
        </div>
      </div>

      {auth.isGuest ? (
        <div
          className="flex flex-col items-center gap-5 w-full max-w-xs"
          style={{ animation: "fade-slide-in 0.4s ease-out 0.3s both" }}
        >
          <div className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 text-center">
            <p className="text-neutral-300 text-sm mb-5">
              Sign in to start playing
            </p>
            <button
              type="button"
              onTouchEnd={() => {
                void handleGoogleSignIn();
              }}
              onClick={() => {
                void handleGoogleSignIn();
              }}
              className="relative z-20 border border-neutral-600 px-6 py-3 text-sm font-medium text-white hover:border-white hover:bg-neutral-800 rounded-xl transition-all w-full cursor-pointer"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      ) : (
        <div
          className="w-full max-w-xs flex flex-col gap-3"
          style={{ animation: "fade-slide-in 0.4s ease-out 0.2s both" }}
        >
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
            <button
              onClick={handleCreate}
              className="w-full py-3.5 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]"
            >
              Create Game
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-neutral-700" />
              <span className="text-neutral-500 text-xs">or join a friend</span>
              <div className="flex-1 h-px bg-neutral-700" />
            </div>

            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={joinCode}
                onInput={(event) => setJoinCode((event.target as HTMLInputElement).value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={6}
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white text-center font-mono tracking-widest text-lg uppercase placeholder:text-neutral-600 focus:border-neutral-400 outline-none transition-colors"
              />
              <button
                onClick={handleJoin}
                disabled={joinCode.length < 4}
                className="px-5 py-3 bg-neutral-700 text-white rounded-xl font-bold hover:bg-neutral-600 transition-all disabled:opacity-30 active:scale-[0.98]"
              >
                Join
              </button>
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center mt-3">{error}</div>
            )}
          </div>

          {myGames.length > 0 && (
            <div
              className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4"
              style={{ animation: "fade-slide-in 0.3s ease-out 0.4s both" }}
            >
              <div className="text-neutral-500 text-xs mb-3 text-center font-medium uppercase tracking-wider">
                Your games
              </div>
              <div className="space-y-2">
                {myGames.map((game) => (
                  <Link
                    key={game.id}
                    to={`/game/${game.id}`}
                    className="flex justify-between items-center bg-neutral-800/50 border border-neutral-700/50 rounded-xl px-4 py-3 hover:border-neutral-500 hover:bg-neutral-800 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center">
                        <span className="text-red-400 font-black text-[10px]">UNO</span>
                      </div>
                      <span className="font-mono text-white tracking-wider text-sm">
                        {game.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        game.status === "playing"
                          ? "bg-green-500/20 text-green-400"
                          : game.status === "lobby"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-neutral-700 text-neutral-400"
                      }`}>
                        {game.status}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {game.players?.length || 0}p
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
