import { navigate, useAuth, useMutation } from "lakebed/client";
import { useEffect, useState } from "preact/hooks";
import { GAME_MODE_LABELS, parseGameSettings } from "../../shared/gameSettings";
import type { GameInfo, GameMode, PlayerRecord } from "../../shared/gameTypes";

type LobbyViewProps = {
  game: GameInfo & { players: PlayerRecord[] };
  players: PlayerRecord[];
};

const SEAT_COLORS = [
  "bg-red-600/20 text-red-400 border-red-500/20",
  "bg-blue-600/20 text-blue-400 border-blue-500/20",
  "bg-green-600/20 text-green-400 border-green-500/20",
  "bg-amber-600/20 text-amber-400 border-amber-500/20",
];

const GAME_MODE_OPTIONS: GameMode[] = ["regular", "noMercy"];

export function LobbyView({ game, players }: LobbyViewProps) {
  const auth = useAuth();
  const toggleReady = useMutation<[gameId: string], void>("toggleReady");
  const startGame = useMutation<[gameId: string], void>("startGame");
  const leaveGame = useMutation<[gameId: string], void>("leaveGame");
  const closeRoom = useMutation<[gameId: string], void>("closeRoom");
  const kickPlayer = useMutation<[gameId: string, targetUserId: string], void>("kickPlayer");
  const updateDisplayName = useMutation<[gameId: string, displayName: string], void>("updateDisplayName");
  const updateGameSettings = useMutation<[gameId: string, settingsJson: string], void>("updateGameSettings");
  const settings = parseGameSettings(game.settings);

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
  const [copied, setCopied] = useState(false);
  const canEditSettings = isHost && (game.status === "lobby" || game.status === "finished");

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
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCloseRoom = async () => {
    await closeRoom(game.id);
    navigate("/");
  };

  const handleLeave = async () => {
    await leaveGame(game.id);
    navigate("/");
  };

  const handleModeChange = async (gameMode: GameMode) => {
    if (!canEditSettings || gameMode === settings.gameMode) return;
    await updateGameSettings(game.id, JSON.stringify({ ...settings, gameMode }));
  };

  return (
    <div className="flex flex-col items-center min-h-[90vh] py-8 px-6 gap-5">
      {game.status === "finished" && winner && (
        <div
          className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-6 py-3 text-center"
          style={{ animation: "fade-slide-in 0.3s ease-out" }}
        >
          <span className="text-amber-400 text-sm font-medium">
            {winner.displayName} won the last round!
          </span>
        </div>
      )}

      <div
        className="bg-neutral-900/60 border border-neutral-800 rounded-2xl px-8 py-6 text-center"
        style={{ animation: "fade-slide-in 0.3s ease-out" }}
      >
        <div className="text-neutral-500 text-xs uppercase tracking-wider font-medium mb-2">
          Room Code
        </div>
        <button
          onClick={handleCopyCode}
          className="text-4xl md:text-5xl font-mono font-black tracking-[0.3em] text-white hover:text-neutral-200 transition-colors relative active:scale-[0.98] cursor-pointer"
        >
          {game.code}
        </button>
        <div className="mt-2 h-5">
          {copied ? (
            <span
              className="text-green-400 text-xs font-medium"
              style={{ animation: "fade-slide-in 0.2s ease-out" }}
            >
              Copied to clipboard!
            </span>
          ) : (
            <span className="text-neutral-600 text-xs">tap to copy</span>
          )}
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4">

        <div
          className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4"
          style={{ animation: "fade-slide-in 0.3s ease-out 0.15s both" }}
        >
          <div className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500">
            Game mode
          </div>
          {isHost ? (
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-950 p-1">
              {GAME_MODE_OPTIONS.map((gameMode) => {
                const selected = settings.gameMode === gameMode;
                return (
                  <button
                    key={gameMode}
                    onClick={() => handleModeChange(gameMode)}
                    disabled={!canEditSettings}
                    className={`rounded-lg px-3 py-2.5 text-xs font-black transition-all cursor-pointer disabled:cursor-not-allowed ${
                      selected
                        ? gameMode === "noMercy"
                          ? "bg-red-600 text-white shadow-lg shadow-red-600/25"
                          : "bg-white text-black"
                        : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    }`}
                  >
                    {GAME_MODE_LABELS[gameMode]}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-center text-sm font-bold text-white">
              {GAME_MODE_LABELS[settings.gameMode]}
            </div>
          )}
        </div>

        {myPlayer && (
          <div
            className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4"
            style={{ animation: "fade-slide-in 0.3s ease-out 0.2s both" }}
          >
            <div className="text-neutral-500 text-xs mb-2 text-center font-medium uppercase tracking-wider">
              Your display name
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                maxLength={24}
                onInput={(event) => setDisplayName((event.target as HTMLInputElement).value)}
                className="min-w-0 flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-neutral-400 transition-colors"
              />
              <button
                onClick={handleSaveDisplayName}
                disabled={displayName.trim() === myPlayer.displayName}
                className="px-4 py-2.5 bg-neutral-700 text-white rounded-xl text-sm font-medium hover:bg-neutral-600 transition-all disabled:opacity-30 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
            {nameError && (
              <div className="text-red-400 text-xs text-center mt-2">{nameError}</div>
            )}
          </div>
        )}

        <div
          className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4"
          style={{ animation: "fade-slide-in 0.3s ease-out 0.1s both" }}
        >
          <div className="text-neutral-500 text-xs mb-3 text-center font-medium uppercase tracking-wider">
            Players ({players.length}/{settings.maxPlayers})
          </div>
          <div className="space-y-2">
            {players.map((player, index) => {
              const isMe = player.userId === auth.userId;
              const colorClass = SEAT_COLORS[index % SEAT_COLORS.length];
              const isReady = player.isReady || player.userId === game.hostId;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-all ${
                    isMe
                      ? "bg-neutral-800/80 border-neutral-600"
                      : "bg-neutral-800/40 border-neutral-800"
                  }`}
                  style={{ animation: `fade-slide-in 0.3s ease-out ${index * 60}ms both` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center border ${colorClass}`}>
                      {player.picture ? (
                        <img
                          src={player.picture}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="font-bold text-sm">
                          {player.displayName.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium flex items-center gap-1.5">
                        {player.displayName}
                        {player.userId === game.hostId && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                            HOST
                          </span>
                        )}
                        {isMe && (
                          <span className="text-neutral-500 text-[10px]">(you)</span>
                        )}
                      </div>
                      {Number(player.wins || 0) > 0 && (
                        <div className="text-yellow-400/70 text-[10px]">
                          {Number(player.wins || 0)} win{Number(player.wins || 0) !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isReady ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold">
                        Ready
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-400">
                        Waiting
                      </span>
                    )}
                    {isHost && player.userId !== auth.userId && (
                      <button
                        onClick={() => kickPlayer(game.id, player.userId)}
                        className="text-[10px] text-neutral-600 hover:text-red-400 transition-colors px-1 cursor-pointer"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {players.length < settings.maxPlayers && (
              <div className="flex items-center justify-center py-3 border border-dashed border-neutral-700 rounded-xl text-neutral-600 text-xs">
                {settings.maxPlayers - players.length} spot{settings.maxPlayers - players.length !== 1 ? "s" : ""} available
              </div>
            )}
          </div>
        </div>


        {leaderboard.some((p) => Number(p.wins || 0) > 0) && (
          <div
            className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4"
            style={{ animation: "fade-slide-in 0.3s ease-out 0.3s both" }}
          >
            <div className="text-neutral-500 text-xs mb-3 text-center font-medium uppercase tracking-wider">
              Leaderboard
            </div>
            <div className="space-y-1.5">
              {leaderboard.filter((p) => Number(p.wins || 0) > 0).map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-sm font-bold w-5 text-center ${
                      index === 0 ? "text-yellow-400" : index === 1 ? "text-neutral-400" : "text-neutral-600"
                    }`}>
                      {index === 0 ? "\u{1F451}" : index + 1}
                    </span>
                    <span className="text-white text-sm truncate">
                      {player.displayName}
                    </span>
                  </div>
                  <span className="text-yellow-400 text-sm font-bold tabular-nums">
                    {Number(player.wins || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className="flex flex-wrap justify-center gap-3 mt-2"
        style={{ animation: "fade-slide-in 0.3s ease-out 0.4s both" }}
      >
        {!isHost && myPlayer && (
          <button
            onClick={() => toggleReady(game.id)}
            className={`px-7 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] cursor-pointer ${
              myPlayer.isReady
                ? "bg-amber-800 text-neutral-300 border border-amber-700 hover:bg-amber-700"
                : "bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-600/20"
            }`}
          >
            {myPlayer.isReady ? "Not ready" : "I'm Ready!"}
          </button>
        )}
        {isHost && (
          <button
            onClick={() => startGame(game.id)}
            disabled={!canStart}
            className="px-7 py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-neutral-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-neutral-600/20 active:scale-[0.98] cursor-pointer"
          >
            {game.status === "finished" ? "Next Round" : "Start Game"}
          </button>
        )}
        {isHost && game.status === "finished" && (
          <button
            onClick={handleCloseRoom}
            className="px-5 py-3 bg-red-800 rounded-xl text-white text-sm hover:bg-red-700 hover:text-white transition-colors cursor-pointer"
          >
            Close room
          </button>
        )}
        <button
          onClick={handleLeave}
          className="px-5 py-3 bg-neutral-800 rounded-xl text-neutral-500 text-sm hover:bg-neutral-700 hover:text-red-400 transition-colors cursor-pointer"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
