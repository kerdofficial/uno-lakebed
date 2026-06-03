import { navigate, useAuth, useMutation } from "lakebed/client";
import { useEffect, useState } from "preact/hooks";
import type { GameInfo, PlayerRecord } from "../../shared/gameTypes";

type LobbyViewProps = {
  game: GameInfo & { players: PlayerRecord[] };
  players: PlayerRecord[];
};

export function LobbyView({ game, players }: LobbyViewProps) {
  const auth = useAuth();
  const toggleReady = useMutation<[gameId: string], void>("toggleReady");
  const startGame = useMutation<[gameId: string], void>("startGame");
  const leaveGame = useMutation<[gameId: string], void>("leaveGame");
  const closeRoom = useMutation<[gameId: string], void>("closeRoom");
  const kickPlayer = useMutation<[gameId: string, targetUserId: string], void>("kickPlayer");
  const updateDisplayName = useMutation<[gameId: string, displayName: string], void>("updateDisplayName");

  const isHost = game.hostId === auth.userId;
  const myPlayer = players.find((player) => player.userId === auth.userId);
  const allReady = players.every((player) => player.isReady || player.userId === game.hostId);
  const roundsPlayed = Number(game.roundsPlayed || 0);
  const canStart =
    isHost &&
    game.status !== "closed" &&
    players.length >= 2 &&
    allReady &&
    roundsPlayed < 100;
  const winner = players.find((player) => player.userId === game.winnerId);
  const leaderboard = [...players].sort((left, right) => {
    const wins = Number(right.wins || 0) - Number(left.wins || 0);
    if (wins !== 0) return wins;
    return Number(left.seatIndex || 0) - Number(right.seatIndex || 0);
  });

  const [displayName, setDisplayName] = useState(myPlayer?.displayName || "");
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    setDisplayName(myPlayer?.displayName || "");
  }, [myPlayer?.displayName]);

  const handleSaveDisplayName = async () => {
    if (!myPlayer) return;
    try {
      setNameError("");
      await updateDisplayName(game.id, displayName);
    } catch (error: any) {
      setNameError(error.message || "Failed to save username");
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(game.code);
  };

  const handleCloseRoom = async () => {
    await closeRoom(game.id);
    navigate("/");
  };

  const handleLeave = async () => {
    await leaveGame(game.id);
    navigate("/");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8">
      <h2 className="text-2xl font-bold text-white">Game Lobby</h2>

      {game.status === "finished" && (
        <div className="text-center">
          <div className="text-neutral-500 text-xs uppercase tracking-widest">
            Last winner
          </div>
          <div className="text-white font-bold mt-1">
            {winner?.displayName || "Unknown"}
          </div>
        </div>
      )}

      <div className="text-center">
        <div className="text-neutral-400 text-sm mb-2">Room Code</div>
        <button
          onClick={handleCopyCode}
          className="text-4xl md:text-5xl font-mono font-black tracking-[0.3em] text-white hover:text-neutral-300 transition-colors"
        >
          {game.code}
        </button>
        <div className="text-neutral-500 text-xs mt-1">tap to copy</div>
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-5">
          <div className="text-neutral-400 text-sm mb-3 text-center">
            Leaderboard
          </div>
          <div className="space-y-2">
            {leaderboard.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-neutral-500 text-xs font-mono w-5">
                    {index + 1}
                  </span>
                  <span className="text-white text-sm truncate">
                    {player.displayName}
                  </span>
                </div>
                <span className="text-yellow-400 text-sm font-bold">
                  {Number(player.wins || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {myPlayer && (
          <div className="mb-5">
            <div className="text-neutral-400 text-sm mb-2 text-center">
              Your username
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                maxLength={24}
                onInput={(event) => setDisplayName((event.target as HTMLInputElement).value)}
                className="min-w-0 flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white"
              />
              <button
                onClick={handleSaveDisplayName}
                disabled={displayName.trim() === myPlayer.displayName}
                className="px-4 py-2 bg-neutral-800 text-white rounded-lg text-sm font-medium hover:bg-neutral-700 transition-colors disabled:opacity-40"
              >
                Save
              </button>
            </div>
            {nameError && (
              <div className="text-red-400 text-xs text-center mt-2">
                {nameError}
              </div>
            )}
          </div>
        )}

        <div className="text-neutral-400 text-sm mb-3 text-center">
          Players ({players.length}/4)
        </div>
        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-700 flex items-center justify-center">
                  {player.picture ? (
                    <img
                      src={player.picture}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-white font-bold text-sm">
                      {player.displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-white text-sm">
                  {player.displayName}
                  {player.userId === game.hostId && (
                    <span className="text-yellow-400 text-xs ml-1">HOST</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`text-xs font-bold ${
                    player.isReady || player.userId === game.hostId
                      ? "text-green-400"
                      : "text-neutral-500"
                  }`}
                >
                  {player.userId === game.hostId || player.isReady ? "Ready" : "Waiting..."}
                </div>
                {isHost && player.userId !== auth.userId && (
                  <button
                    onClick={() => kickPlayer(game.id, player.userId)}
                    className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                  >
                    Kick
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        {!isHost && myPlayer && (
          <button
            onClick={() => toggleReady(game.id)}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-colors ${
              myPlayer.isReady
                ? "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                : "bg-green-600 text-white hover:bg-green-500"
            }`}
          >
            {myPlayer.isReady ? "Not ready" : "Ready!"}
          </button>
        )}
        {isHost && (
          <button
            onClick={() => startGame(game.id)}
            disabled={!canStart}
            className="px-6 py-2.5 bg-white text-black rounded-full font-bold text-sm hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {game.status === "finished" ? "Start next game" : "Start Game"}
          </button>
        )}
        {isHost && game.status === "finished" && (
          <button
            onClick={handleCloseRoom}
            className="px-4 py-2.5 text-neutral-400 text-sm hover:text-red-400 transition-colors"
          >
            Close room
          </button>
        )}
        <button
          onClick={handleLeave}
          className="px-4 py-2.5 text-neutral-400 text-sm hover:text-red-400 transition-colors"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
