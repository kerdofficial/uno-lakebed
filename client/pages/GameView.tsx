import { useMutation, useQuery, useAuth, Link } from "lakebed/client";
import { useCallback, useState } from "preact/hooks";
import type { Card, CardColor, PlayerView } from "../../shared/gameTypes";
import { useGameAnimations } from "../hooks/useGameAnimations";
import { ColorPicker } from "../components/game/ColorPicker";
import { Confetti } from "../components/game/Confetti";
import { GameControls } from "../components/game/GameControls";
import { HelperText } from "../components/game/HelperText";
import { MyHand } from "../components/game/MyHand";
import { OpponentBar } from "../components/game/OpponentBar";
import { PlayArea } from "../components/game/PlayArea";
import { UnoSplash } from "../components/game/UnoSplash";

type PlayerViewRecord = {
  id: string;
  gameId: string;
  pvUserId: string;
  view: string;
};

export function GameView({ gameId }: { gameId: string }) {
  const auth = useAuth();
  const allViews = useQuery<PlayerViewRecord[]>("myGameView");
  const gameAction = useMutation<[gameId: string, actionJson: string], void>(
    "gameAction",
  );
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    cardIds: string[];
  } | null>(null);
  const [triggerCard, setTriggerCard] = useState<Card | null>(null);

  const viewRecord = allViews.find((entry) => entry.gameId === gameId);
  const view: PlayerView | null = viewRecord
    ? JSON.parse(viewRecord.view)
    : null;

  const animations = useGameAnimations(view);

  const isMyTurn =
    !!view && view.turnOrder[view.currentPlayerIndex]?.userId === auth.userId;
  const mustChooseColor = !!view && view.phase === "chooseColor" && isMyTurn;

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
    setTriggerCard(null);
    setSelectedCards(new Set());
    setShowColorPicker(false);
  };

  const handlePlaySelected = useCallback(async () => {
    if (!view || selectedCards.size === 0) return;

    const cardIds = Array.from(selectedCards);
    const cards = cardIds
      .map((id) => view.myHand.find((card) => card.id === id))
      .filter(Boolean) as Card[];
    const needsColor = cards.some(
      (card) => card.type === "wild" || card.type === "wild4",
    );

    if (needsColor) {
      setPendingAction({ cardIds });
      setTriggerCard(
        cards.find((c) => c.type === "wild" || c.type === "wild4") || null,
      );
      setShowColorPicker(true);
      return;
    }

    const actionType = view.canStack ? "stackCards" : "playCards";
    await gameAction(gameId, JSON.stringify({ type: actionType, cardIds }));
    clearSelections();
  }, [gameAction, gameId, selectedCards, view]);

  const handleColorChosen = useCallback(
    async (color: CardColor) => {
      setShowColorPicker(false);

      if (!pendingAction) {
        await gameAction(
          gameId,
          JSON.stringify({ type: "chooseColor", chosenColor: color }),
        );
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
        }),
      );
      clearSelections();
    },
    [gameAction, gameId, pendingAction, view],
  );

  const handleDraw = useCallback(async () => {
    await gameAction(gameId, JSON.stringify({ type: "drawCards" }));
    setSelectedCards(new Set());
  }, [gameAction, gameId]);

  const handleUno = useCallback(async () => {
    await gameAction(gameId, JSON.stringify({ type: "callUno" }));
  }, [gameAction, gameId]);

  const handleCatchUno = useCallback(
    async (targetUserId: string) => {
      await gameAction(
        gameId,
        JSON.stringify({ type: "catchUno", targetUserId }),
      );
    },
    [gameAction, gameId],
  );

  const handleClearSelection = useCallback(() => {
    setSelectedCards(new Set());
  }, []);

  if (!view) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-400">
        Loading game...
      </div>
    );
  }

  if (view.phase === "finished") {
    const winner = view.turnOrder.find(
      (player) => player.userId === view.winner,
    );
    const isMe = view.winner === auth.userId;

    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 relative">
        {isMe && <Confetti />}
        <div
          className="text-8xl"
          style={{ animation: "bounce-in 0.5s ease-out" }}
        >
          {isMe ? "\u{1F389}" : "\u{1F614}"}
        </div>
        <h2
          className="text-3xl font-bold text-white"
          style={{ animation: "fade-slide-in 0.4s ease-out 0.2s both" }}
        >
          {isMe ? "You won!" : `${winner?.displayName || "Someone"} won!`}
        </h2>
        {!isMe && (
          <p
            className="text-neutral-400 text-sm"
            style={{ animation: "fade-slide-in 0.4s ease-out 0.4s both" }}
          >
            Better luck next time!
          </p>
        )}
        <Link
          to="/"
          className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-neutral-200 transition-colors"
          style={{ animation: "fade-slide-in 0.4s ease-out 0.6s both" }}
        >
          Back to home
        </Link>
      </div>
    );
  }

  const colorPickerTrigger =
    mustChooseColor && !triggerCard
      ? view.discardTop.type === "wild" || view.discardTop.type === "wild4"
        ? view.discardTop
        : null
      : triggerCard;

  return (
    <div
      className="flex flex-col h-[100dvh]"
      style={{
        background:
          "radial-gradient(ellipse at 50% 60%, #1c1917 0%, #140f0b 40%, #0c0a09 70%, #050505 100%)",
        boxShadow: "inset 0 0 80px rgba(0,0,0,0.5)",
      }}
    >
      {(showColorPicker || mustChooseColor) && (
        <ColorPicker
          onChoose={handleColorChosen}
          triggerCard={colorPickerTrigger}
        />
      )}

      {animations.unoCalledBy && <UnoSplash />}

      <div className="flex-shrink-0">
        <OpponentBar
          view={view}
          myUserId={auth.userId}
          catchableUserIds={view.unoCatchable}
        />
      </div>

      <div className="flex-1 flex items-center justify-center relative h-full">
        <PlayArea view={view} onDraw={handleDraw} isMyTurn={isMyTurn} />
      </div>

      <div className="flex-shrink-0">
        <HelperText
          view={view}
          isMyTurn={isMyTurn}
          hasSelectedCards={selectedCards.size > 0}
        />
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
          onClearSelection={handleClearSelection}
        />
      </div>
    </div>
  );
}
