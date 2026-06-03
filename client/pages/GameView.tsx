import { useMutation, useQuery, useAuth, Link } from "lakebed/client";
import { useCallback, useState } from "preact/hooks";
import type { CardColor, PlayerView } from "../../shared/gameTypes";
import { ColorPicker } from "../components/game/ColorPicker";
import { GameControls } from "../components/game/GameControls";
import { MyHand } from "../components/game/MyHand";
import { OpponentBar } from "../components/game/OpponentBar";
import { PlayArea } from "../components/game/PlayArea";

type PlayerViewRecord = {
  id: string;
  gameId: string;
  pvUserId: string;
  view: string;
};

export function GameView({ gameId }: { gameId: string }) {
  const auth = useAuth();
  const allViews = useQuery<PlayerViewRecord[]>("myGameView");
  const gameAction = useMutation<[gameId: string, actionJson: string], void>("gameAction");
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ cardIds: string[] } | null>(null);

  const viewRecord = allViews.find((entry) => entry.gameId === gameId);
  const view: PlayerView | null = viewRecord ? JSON.parse(viewRecord.view) : null;
  const mustChooseColor =
    !!view &&
    view.phase === "chooseColor" &&
    view.turnOrder[view.currentPlayerIndex]?.userId === auth.userId;

  const handleToggleCard = useCallback((cardId: string) => {
    setSelectedCards((previous) => {
      const next = new Set(previous);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  const clearSelections = () => {
    setPendingAction(null);
    setSelectedCards(new Set());
  };

  const handlePlaySelected = useCallback(async () => {
    if (!view || selectedCards.size === 0) return;

    const cardIds = Array.from(selectedCards);
    const cards = cardIds
      .map((id) => view.myHand.find((card) => card.id === id))
      .filter(Boolean);
    const needsColor = cards.some((card) => card!.type === "wild" || card!.type === "wild4");

    if (needsColor) {
      setPendingAction({ cardIds });
      setShowColorPicker(true);
      return;
    }

    const actionType = view.canStack ? "stackCards" : "playCards";
    await gameAction(gameId, JSON.stringify({ type: actionType, cardIds }));
    clearSelections();
  }, [gameAction, gameId, selectedCards, view]);

  const handleColorChosen = useCallback(async (color: CardColor) => {
    setShowColorPicker(false);

    if (!pendingAction) {
      await gameAction(gameId, JSON.stringify({ type: "chooseColor", chosenColor: color }));
      clearSelections();
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
    clearSelections();
  }, [gameAction, gameId, pendingAction, view]);

  const handleDraw = useCallback(async () => {
    await gameAction(gameId, JSON.stringify({ type: "drawCards" }));
    setSelectedCards(new Set());
  }, [gameAction, gameId]);

  const handleUno = useCallback(async () => {
    await gameAction(gameId, JSON.stringify({ type: "callUno" }));
  }, [gameAction, gameId]);

  const handleCatchUno = useCallback(async (targetUserId: string) => {
    await gameAction(gameId, JSON.stringify({ type: "catchUno", targetUserId }));
  }, [gameAction, gameId]);

  if (!view) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-400">
        Loading game...
      </div>
    );
  }

  if (view.phase === "finished") {
    const winner = view.turnOrder.find((player) => player.userId === view.winner);
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
        <GameControls
          view={view}
          onUno={handleUno}
          onDraw={handleDraw}
          onCatchUno={handleCatchUno}
        />
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
