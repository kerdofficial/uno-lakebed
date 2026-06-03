import {
  Link,
  navigate,
  Route,
  Router,
  Routes,
  SignInWithGoogle,
  signOut,
  useAuth,
  useMutation,
  useQuery,
} from "lakebed/client";
import { useState, useEffect, useCallback } from "preact/hooks";
import type {
  Card,
  CardColor,
  PlayerView,
  PlayerInfo,
  PlayerRecord,
  GameInfo,
} from "../shared/gameTypes";

type GameWithPlayers = GameInfo & { players: PlayerRecord[] };
type GameLobbyState = { games: GameWithPlayers[] };

const CARD_COLORS: Record<string, string> = {
  red: "bg-red-600",
  yellow: "bg-yellow-400",
  green: "bg-green-600",
  blue: "bg-blue-600",
};

const CARD_TEXT_COLORS: Record<string, string> = {
  red: "text-red-600",
  yellow: "text-yellow-500",
  green: "text-green-600",
  blue: "text-blue-600",
};

const CARD_BORDER_COLORS: Record<string, string> = {
  red: "border-red-500",
  yellow: "border-yellow-400",
  green: "border-green-500",
  blue: "border-blue-500",
};

const CARD_GLOW: Record<string, string> = {
  red: "shadow-red-500/40",
  yellow: "shadow-yellow-400/40",
  green: "shadow-green-500/40",
  blue: "shadow-blue-500/40",
};

function cardDisplay(card: Card): string {
  if (card.type === "number") return String(card.value);
  if (card.type === "skip") return "\u{20E0}";
  if (card.type === "reverse") return "\u{21C4}";
  if (card.type === "draw2") return "+2";
  if (card.type === "wild") return "W";
  if (card.type === "wild4") return "+4";
  return "?";
}

function UnoCard({
  card,
  playable = false,
  selected = false,
  faceDown = false,
  small = false,
  onClick,
}: {
  card: Card;
  playable?: boolean;
  selected?: boolean;
  faceDown?: boolean;
  small?: boolean;
  onClick?: () => void;
}) {
  const size = small
    ? "w-[40px] h-[60px] text-sm"
    : "w-[56px] h-[84px] md:w-[72px] md:h-[108px] text-lg md:text-xl";

  const cornerSize = small ? "text-[7px]" : "text-[9px] md:text-[11px]";

  if (faceDown) {
    return (
      <div
        className={`${size} relative flex-shrink-0 rounded-lg border-2 border-neutral-600 bg-neutral-800 flex items-center justify-center cursor-default`}
      >
        <div className="w-[60%] h-[60%] rounded-full bg-red-700 flex items-center justify-center">
          <span className="text-white font-black text-[10px] md:text-xs">
            UNO
          </span>
        </div>
      </div>
    );
  }

  const isWild = card.type === "wild" || card.type === "wild4";
  const bgColor = isWild ? "bg-neutral-900" : CARD_COLORS[card.color!] || "bg-neutral-700";
  const borderColor = playable
    ? "border-white ring-2 ring-white/50"
    : selected
    ? "border-yellow-300 ring-2 ring-yellow-300/50"
    : isWild
    ? "border-neutral-500"
    : CARD_BORDER_COLORS[card.color!] || "border-neutral-600";

  const textColor = isWild ? "text-white" : CARD_TEXT_COLORS[card.color!] || "text-white";
  const display = cardDisplay(card);

  const glowClass = selected
    ? "shadow-lg shadow-yellow-300/40"
    : playable
    ? `shadow-lg ${CARD_GLOW[card.color!] || "shadow-white/30"}`
    : "brightness-50";

  const transform = selected ? "-translate-y-3" : playable ? "hover:-translate-y-2" : "";

  return (
    <div
      onClick={onClick}
      className={`${size} relative flex-shrink-0 rounded-lg border-2 ${borderColor} ${bgColor} flex items-center justify-center cursor-pointer transition-all duration-150 ${glowClass} ${transform} select-none`}
    >
      {isWild ? (
        <div className="absolute inset-[3px] md:inset-1 rounded-md overflow-hidden grid grid-cols-2 grid-rows-2">
          <div className="bg-red-600" />
          <div className="bg-blue-600" />
          <div className="bg-yellow-400" />
          <div className="bg-green-600" />
        </div>
      ) : (
        <div className="absolute inset-[4px] md:inset-[6px] rounded-[40%] bg-white/90 rotate-[15deg]" />
      )}
      <span
        className={`relative z-10 font-extrabold ${
          small ? "text-xs" : "text-lg md:text-2xl"
        } ${isWild ? "text-white" : textColor} drop-shadow-sm`}
      >
        {display}
      </span>
      <span
        className={`absolute top-0.5 left-1 ${cornerSize} font-bold text-white drop-shadow-md z-10`}
      >
        {display}
      </span>
      <span
        className={`absolute bottom-0.5 right-1 ${cornerSize} font-bold text-white drop-shadow-md z-10 rotate-180`}
      >
        {display}
      </span>
    </div>
  );
}

function ColorPicker({ onChoose }: { onChoose: (color: CardColor) => void }) {
  const colors: { color: CardColor; bg: string; label: string }[] = [
    { color: "red", bg: "bg-red-600 hover:bg-red-500", label: "Red" },
    { color: "yellow", bg: "bg-yellow-400 hover:bg-yellow-300", label: "Yellow" },
    { color: "green", bg: "bg-green-600 hover:bg-green-500", label: "Green" },
    { color: "blue", bg: "bg-blue-600 hover:bg-blue-500", label: "Blue" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 text-center">
        <h3 className="text-white font-bold text-lg mb-4">Choose a color</h3>
        <div className="grid grid-cols-2 gap-3">
          {colors.map((c) => (
            <button
              key={c.color}
              onClick={() => onChoose(c.color)}
              className={`${c.bg} w-20 h-20 rounded-xl transition-transform hover:scale-110 border-2 border-white/20`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DirectionIndicator({ direction }: { direction: 1 | -1 }) {
  return (
    <div className="text-neutral-500 text-xs font-mono">
      {direction === 1 ? "⟳ CW" : "⟲ CCW"}
    </div>
  );
}

function PlayerAvatar({
  player,
  isCurrentTurn,
  small = false,
}: {
  player: PlayerInfo;
  isCurrentTurn: boolean;
  small?: boolean;
}) {
  const size = small ? "w-8 h-8" : "w-10 h-10";
  const ring = isCurrentTurn ? "ring-2 ring-yellow-400" : "";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${size} rounded-full ${ring} overflow-hidden bg-neutral-700 flex items-center justify-center`}>
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
      <div className="text-center">
        <div className={`${small ? "text-[10px]" : "text-xs"} text-neutral-300 truncate max-w-[60px]`}>
          {player.displayName}
        </div>
        <div className={`${small ? "text-[9px]" : "text-[10px]"} text-neutral-500`}>
          {player.cardCount} cards
        </div>
        {player.calledUno && player.cardCount === 1 && (
          <div className="text-[9px] text-red-400 font-bold">UNO!</div>
        )}
      </div>
    </div>
  );
}

function OpponentBar({
  view,
  myUserId,
}: {
  view: PlayerView;
  myUserId: string;
}) {
  const opponents = view.turnOrder.filter((p) => p.userId !== myUserId);

  return (
    <div className="flex justify-center gap-4 md:gap-6 py-2">
      {opponents.map((player) => (
        <div key={player.userId} className="flex flex-col items-center gap-1">
          <PlayerAvatar
            player={player}
            isCurrentTurn={
              view.turnOrder[view.currentPlayerIndex]?.userId === player.userId
            }
          />
          <div className="flex -space-x-3">
            {Array.from({ length: Math.min(player.cardCount, 7) }).map(
              (_, i) => (
                <UnoCard
                  key={i}
                  card={{ id: "", color: null, type: "wild", value: null }}
                  faceDown
                  small
                />
              )
            )}
            {player.cardCount > 7 && (
              <div className="w-[40px] h-[60px] flex items-center justify-center text-neutral-400 text-xs">
                +{player.cardCount - 7}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlayArea({
  view,
  onDraw,
}: {
  view: PlayerView;
  onDraw: () => void;
}) {
  const currentPlayer = view.turnOrder[view.currentPlayerIndex];
  const colorBorder = CARD_BORDER_COLORS[view.currentColor] || "border-white";
  const colorGlow = CARD_GLOW[view.currentColor] || "";

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex items-center gap-2">
        <DirectionIndicator direction={view.direction} />
        {currentPlayer && (
          <span className="text-xs text-neutral-400">
            {currentPlayer.displayName}'s turn
          </span>
        )}
        {view.phase === "stacking" && (
          <span className="text-xs text-red-400 font-bold">
            Stack: +{view.pendingDrawCount}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onDraw}
          className="relative group"
          disabled={!view.canPlay && !view.canStack && !view.mustDraw}
        >
          <div className="w-[56px] h-[84px] md:w-[72px] md:h-[108px] rounded-lg border-2 border-neutral-600 bg-neutral-800 flex items-center justify-center transition-all group-hover:border-neutral-400 group-disabled:opacity-50">
            <div className="w-[60%] h-[60%] rounded-full bg-red-700 flex items-center justify-center">
              <span className="text-white font-black text-[10px] md:text-xs">
                UNO
              </span>
            </div>
          </div>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-neutral-500">
            {view.drawPileCount}
          </span>
        </button>

        <div className={`relative rounded-xl p-1 border-2 ${colorBorder} shadow-lg ${colorGlow}`}>
          {view.discardTop && (
            <UnoCard card={view.discardTop} />
          )}
        </div>
      </div>

      {view.lastAction && (
        <div className="text-[11px] text-neutral-500 text-center mt-4">
          {view.lastAction}
        </div>
      )}
    </div>
  );
}

function MyHand({
  view,
  selectedCards,
  onToggleCard,
  onPlaySelected,
}: {
  view: PlayerView;
  selectedCards: Set<string>;
  onToggleCard: (id: string) => void;
  onPlaySelected: () => void;
}) {
  const hand = view.myHand;
  const playableSet = new Set([
    ...view.playableCardIds,
    ...view.stackableCardIds,
  ]);

  const selectedHandCards = Array.from(selectedCards)
    .map((id) => hand.find((card) => card.id === id))
    .filter(Boolean) as Card[];

  const canToggleCard = (card: Card) => {
    if (selectedCards.has(card.id)) return true;
    if (selectedHandCards.length === 0) return playableSet.has(card.id);
    if (view.canStack) return playableSet.has(card.id);

    const first = selectedHandCards[0];
    if (first.type === "number" && card.type === "number") {
      return first.value === card.value;
    }
    if (first.type === "skip" || first.type === "reverse") {
      return card.type === first.type;
    }
    return false;
  };

  const overlapPx = Math.max(20, 46 - hand.length * 2);

  return (
    <div className="flex flex-col items-center gap-2 pb-4 relative">
      {selectedCards.size > 0 && (
        <button
          onClick={onPlaySelected}
          className="px-4 py-1.5 bg-white text-black text-sm font-bold rounded-full hover:bg-neutral-200 transition-colors absolute -top-8"
        >
          Play {selectedCards.size} card{selectedCards.size > 1 ? "s" : ""}
        </button>
      )}
      <div
        className="flex justify-center items-end overflow-x-auto max-w-full px-2 py-4"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {hand.map((card, i) => {
          const isPlayable = canToggleCard(card);
          const isSelected = selectedCards.has(card.id);
          const ml = i === 0 ? 0 : -overlapPx;

          return (
            <div
              key={card.id}
              style={{
                marginLeft: `${ml}px`,
                zIndex: isSelected ? 50 : i,
                scrollSnapAlign: "center",
              }}
            >
              <UnoCard
                card={card}
                playable={isPlayable}
                selected={isSelected}
                onClick={() => isPlayable && onToggleCard(card.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GameView({ gameId }: { gameId: string }) {
  const auth = useAuth();
  const allViews = useQuery<
    { id: string; gameId: string; pvUserId: string; view: string }[]
  >("myGameView");
  const gameAction = useMutation<[gameId: string, actionJson: string], void>(
    "gameAction"
  );

  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    cardIds: string[];
  } | null>(null);

  const viewRecord = allViews.find((v) => v.gameId === gameId);
  const view: PlayerView | null = viewRecord
    ? JSON.parse(viewRecord.view)
    : null;
  const mustChooseColor =
    !!view &&
    view.phase === "chooseColor" &&
    view.turnOrder[view.currentPlayerIndex]?.userId === auth.userId;

  const handleToggleCard = useCallback(
    (cardId: string) => {
      setSelectedCards((prev) => {
        const next = new Set(prev);
        if (next.has(cardId)) {
          next.delete(cardId);
        } else {
          next.add(cardId);
        }
        return next;
      });
    },
    []
  );

  const handlePlaySelected = useCallback(async () => {
    if (!view || selectedCards.size === 0) return;

    const cardIds = Array.from(selectedCards);
    const cards = cardIds
      .map((id) => view.myHand.find((c) => c.id === id))
      .filter(Boolean);

    const needsColor = cards.some(
      (c) => c!.type === "wild" || c!.type === "wild4"
    );

    if (needsColor) {
      setPendingAction({ cardIds });
      setShowColorPicker(true);
      return;
    }

    const actionType = view.canStack ? "stackCards" : "playCards";
    await gameAction(
      gameId,
      JSON.stringify({ type: actionType, cardIds })
    );
    setSelectedCards(new Set());
  }, [view, selectedCards, gameId]);

  const handleColorChosen = useCallback(
    async (color: CardColor) => {
      setShowColorPicker(false);

      if (!pendingAction) {
        await gameAction(
          gameId,
          JSON.stringify({ type: "chooseColor", chosenColor: color })
        );
        setSelectedCards(new Set());
        return;
      }

      const actionType = view?.canStack ? "stackCards" : "playCards";
      await gameAction(
        gameId,
        JSON.stringify({
          type: actionType,
          cardIds: pendingAction.cardIds,
          chosenColor: color,
        })
      );
      setPendingAction(null);
      setSelectedCards(new Set());
    },
    [pendingAction, view, gameId, gameAction]
  );

  const handleDraw = useCallback(async () => {
    await gameAction(gameId, JSON.stringify({ type: "drawCards" }));
    setSelectedCards(new Set());
  }, [gameId]);

  const handleUno = useCallback(async () => {
    await gameAction(gameId, JSON.stringify({ type: "callUno" }));
  }, [gameId]);

  if (!view) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-400">
        Loading game...
      </div>
    );
  }

  if (view.phase === "finished") {
    const winner = view.turnOrder.find((p) => p.userId === view.winner);
    const isMe = view.winner === auth.userId;

    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
        <div className="text-6xl">{isMe ? "\u{1F389}" : "\u{1F614}"}</div>
        <h2 className="text-3xl font-bold text-white">
          {isMe ? "You won!" : `${winner?.displayName || "Someone"} won!`}
        </h2>
        <Link
          to="/"
          className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-neutral-200 transition-colors"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-neutral-950">
      {(showColorPicker || mustChooseColor) && (
        <ColorPicker onChoose={handleColorChosen} />
      )}

      <div className="flex-shrink-0">
        <OpponentBar view={view} myUserId={auth.userId} />
      </div>

      <div className="flex-1 flex items-center justify-center">
        <PlayArea view={view} onDraw={handleDraw} />
      </div>

      <div className="flex-shrink-0">
        <div className="flex justify-center gap-2 mb-1">
          {view.unoCallable && (
            <button
              onClick={handleUno}
              className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full hover:bg-red-500 animate-pulse"
            >
              UNO!
            </button>
          )}
          {view.unoCatchable.length > 0 &&
            view.unoCatchable.map((uid) => {
              const player = view.turnOrder.find((p) => p.userId === uid);
              return (
                <button
                  key={uid}
                  onClick={() =>
                    gameAction(
                      gameId,
                      JSON.stringify({
                        type: "catchUno",
                        targetUserId: uid,
                      })
                    )
                  }
                  className="px-3 py-1 bg-orange-600 text-white text-xs font-bold rounded-full hover:bg-orange-500"
                >
                  Catch {player?.displayName}!
                </button>
              );
            })}
          {view.mustDraw && (
            <button
              onClick={handleDraw}
              className="px-3 py-1 bg-red-700 text-white text-xs font-bold rounded-full hover:bg-red-600 animate-pulse"
            >
              {view.phase === "stacking"
                ? `Draw ${view.pendingDrawCount}`
                : "Draw"}
            </button>
          )}
        </div>
        <MyHand
          view={view}
          selectedCards={selectedCards}
          onToggleCard={handleToggleCard}
          onPlaySelected={handlePlaySelected}
        />
      </div>
    </div>
  );
}

function LobbyView({
  game,
  players,
}: {
  game: GameInfo & { players: PlayerRecord[] };
  players: PlayerRecord[];
}) {
  const auth = useAuth();
  const toggleReady = useMutation<[gameId: string], void>("toggleReady");
  const startGame = useMutation<[gameId: string], void>("startGame");
  const leaveGame = useMutation<[gameId: string], void>("leaveGame");
  const updateDisplayName = useMutation<
    [gameId: string, displayName: string],
    void
  >("updateDisplayName");

  const isHost = game.hostId === auth.userId;
  const myPlayer = players.find((p) => p.userId === auth.userId);
  const allReady = players.every((p) => p.isReady || p.userId === game.hostId);
  const canStart = isHost && players.length >= 2 && allReady;
  const [displayName, setDisplayName] = useState(myPlayer?.displayName || "");
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    setDisplayName(myPlayer?.displayName || "");
  }, [myPlayer?.displayName]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(game.code);
  };

  const handleSaveDisplayName = async () => {
    if (!myPlayer) return;
    try {
      setNameError("");
      await updateDisplayName(game.id, displayName);
    } catch (e: any) {
      setNameError(e.message || "Failed to save username");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8">
      <h2 className="text-2xl font-bold text-white">Game Lobby</h2>

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
                onInput={(e) =>
                  setDisplayName((e.target as HTMLInputElement).value)
                }
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
              <div
                className={`text-xs font-bold ${
                  player.isReady || player.userId === game.hostId
                    ? "text-green-400"
                    : "text-neutral-500"
                }`}
              >
                {player.userId === game.hostId
                  ? "Ready"
                  : player.isReady
                  ? "Ready"
                  : "Waiting..."}
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
            Start Game
          </button>
        )}
        <button
          onClick={async () => {
            await leaveGame(game.id);
            navigate("/");
          }}
          className="px-4 py-2.5 text-neutral-400 text-sm hover:text-red-400 transition-colors"
        >
          Leave
        </button>
      </div>
    </div>
  );
}

function GamePage({ gameId }: { gameId: string }) {
  const auth = useAuth();
  const lobbyStateRaw = useQuery<GameLobbyState | []>("gameLobbyState");
  const lobbyState = Array.isArray(lobbyStateRaw) ? null : lobbyStateRaw;
  const lobbyData = lobbyState?.games || [];

  const gameData = lobbyData.find(
    (g) => g.id === gameId
  );

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

  if (gameData.status === "playing" || gameData.status === "finished") {
    return <GameView gameId={gameId} />;
  }

  return (
    <LobbyView game={gameData} players={gameData.players || []} />
  );
}

function HomePage() {
  const auth = useAuth();
  const createGame = useMutation<[], { gameId: string; code: string }>(
    "createGame"
  );
  const joinGame = useMutation<[code: string], { gameId: string }>(
    "joinGame"
  );
  const myGames = useQuery<(GameInfo & { players: PlayerRecord[] })[]>(
    "myGames"
  );

  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  const handleCreate = async () => {
    try {
      setError("");
      const result = await createGame();
      navigate(`/game/${result.gameId}`);
    } catch (e: any) {
      setError(e.message || "Failed to create game");
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    try {
      setError("");
      const result = await joinGame(joinCode.trim().toUpperCase());
      navigate(`/game/${result.gameId}`);
    } catch (e: any) {
      setError(e.message || "Failed to join game");
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
              onInput={(e) =>
                setJoinCode((e.target as HTMLInputElement).value.toUpperCase())
              }
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

function GameRouteWrapper() {
  const path = window.location.pathname;
  const match = path.match(/^\/game\/(.+)$/);
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

function AuthCallbackPage() {
  useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen text-neutral-400">
      Signing in...
    </div>
  );
}

export function App() {
  const auth = useAuth();

  return (
    <Router>
      <main className="min-h-screen bg-neutral-950 text-white">
        <Routes>
          <Route
            path="/"
            element={
              <div className="px-6 py-10">
                <div className="mx-auto max-w-lg">
                  {!auth.isLoading && !auth.isGuest && (
                    <div className="flex justify-end mb-4">
                      <button
                        className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
                        onClick={() => signOut()}
                      >
                        {auth.picture && (
                          <img
                            src={auth.picture}
                            alt=""
                            className="w-6 h-6 rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        Sign out
                      </button>
                    </div>
                  )}
                  <HomePage />
                </div>
              </div>
            }
          />
          <Route path="/game/:id" element={<GameRouteWrapper />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="*"
            element={
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <h1 className="text-4xl font-bold mb-4">404</h1>
                  <Link to="/" className="text-neutral-300 hover:text-white">
                    Go home
                  </Link>
                </div>
              </div>
            }
          />
        </Routes>
      </main>
    </Router>
  );
}
