import { useMutation, useQuery, useAuth } from "lakebed/client";
import { useCallback, useEffect, useState } from "preact/hooks";
import type { Card, CardColor, PlayerInfo, PlayerView } from "../../shared/gameTypes";
import { cardNeedsColorChoice, getNumberParity } from "../../shared/gameLogic/effects";
import { useGameAnimations } from "../hooks/useGameAnimations";
import { ColorPicker } from "../components/game/ColorPicker";
import { ColorRouletteRevealToast } from "../components/game/ColorRouletteRevealToast";
import { Confetti } from "../components/game/Confetti";
import { DrawDecisionModal } from "../components/game/DrawDecisionModal";
import { GameControls } from "../components/game/GameControls";
import { HelperText } from "../components/game/HelperText";
import { MyHand } from "../components/game/MyHand";
import { OpponentBar } from "../components/game/OpponentBar";
import { PlayArea } from "../components/game/PlayArea";
import { SevenSwapTargetModal } from "../components/game/SevenSwapTargetModal";
import { UnoSplash } from "../components/game/UnoSplash";

type PlayerViewRecord = {
  id: string;
  gameId: string;
  pvUserId: string;
  view: string;
};

const FINISH_SCREEN_DELAY_MS = 1400;

export function GameView({
  gameId,
  onBackToLobby,
}: {
  gameId: string;
  onBackToLobby?: () => void;
}) {
  const auth = useAuth();
  const allViews = useQuery<PlayerViewRecord[]>("myGameView");
  const gameAction = useMutation<[gameId: string, actionJson: string], void>(
    "gameAction",
  );
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    kind: "playSelected" | "playDrawnCard";
    cardIds: string[];
  } | null>(null);
  const [triggerCard, setTriggerCard] = useState<Card | null>(null);
  const [pendingSwapTargets, setPendingSwapTargets] = useState<PlayerInfo[] | null>(null);
  const [unoArmed, setUnoArmed] = useState(false);
  const [drawDecisionUnoArmed, setDrawDecisionUnoArmed] = useState(false);
  const [showFinishedScreen, setShowFinishedScreen] = useState(false);
  const [showPublicEventId, setShowPublicEventId] = useState<string | null>(null);

  const viewRecord = allViews.find((entry) => entry.gameId === gameId);
  const view: PlayerView | null = viewRecord
    ? JSON.parse(viewRecord.view)
    : null;

  const animations = useGameAnimations(view);
  const isFinished = view?.phase === "finished";

  const isMyTurn =
    !!view && view.turnOrder[view.currentPlayerIndex]?.userId === auth.userId;
  const mustChooseColor = !!view && view.phase === "chooseColor" && isMyTurn;
  const selectedCount = selectedCards.size;
  const willHaveOneCardAfterSelectedPlay = !!view && view.myHand.length - selectedCount === 1;
  const pendingDrawDecisionCard = view?.pendingDrawDecisionCard || null;
  const canCallUnoForDrawDecision = !!view && view.myHand.length - 1 === 1;

  useEffect(() => {
    if (!isFinished) {
      setShowFinishedScreen(false);
      return;
    }

    setShowFinishedScreen(false);
    const timeout = setTimeout(() => {
      setShowFinishedScreen(true);
    }, FINISH_SCREEN_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [isFinished, view?.winner, view?.lastAction]);

  useEffect(() => {
    const eventId = view?.publicEvent?.id;
    if (!eventId) {
      setShowPublicEventId(null);
      return;
    }

    setShowPublicEventId(eventId);
    const timeout = setTimeout(() => {
      setShowPublicEventId((current) => (current === eventId ? null : current));
    }, 2200);

    return () => clearTimeout(timeout);
  }, [view?.publicEvent?.id]);

  useEffect(() => {
    if (!willHaveOneCardAfterSelectedPlay && unoArmed) {
      setUnoArmed(false);
    }
  }, [unoArmed, willHaveOneCardAfterSelectedPlay]);

  useEffect(() => {
    if (!pendingDrawDecisionCard) {
      setDrawDecisionUnoArmed(false);
    }
  }, [pendingDrawDecisionCard]);

  useEffect(() => {
    if (!isFinished) return;
    setPendingAction(null);
    setTriggerCard(null);
    setSelectedCards(new Set());
    setUnoArmed(false);
    setDrawDecisionUnoArmed(false);
    setShowColorPicker(false);
    setPendingSwapTargets(null);
  }, [isFinished]);

  useEffect(() => {
    if (view?.pendingSevenSwapTargets.length) setPendingSwapTargets(null);
  }, [view?.pendingSevenSwapTargets.length]);

  const handleToggleCard = useCallback((cardId: string) => {
    if (!view || view.phase === "finished") return;
    setSelectedCards((previous) => {
      const next = new Set(previous);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, [view]);

  const clearSelections = () => {
    setPendingAction(null);
    setTriggerCard(null);
    setSelectedCards(new Set());
    setUnoArmed(false);
    setShowColorPicker(false);
    setPendingSwapTargets(null);
  };

  const submitSelectedPlay = useCallback(
    async (cardIds: string[], chosenColor?: CardColor, sevenSwapTargetUserId?: string) => {
      if (!view || view.phase === "finished") return;

      const actionType = view.canStack ? "stackCards" : "playCards";
      await gameAction(
        gameId,
        JSON.stringify({
          type: actionType,
          cardIds,
          chosenColor,
          callUno: unoArmed && view.myHand.length - cardIds.length === 1,
          ...(actionType === "playCards" && sevenSwapTargetUserId ? { sevenSwapTargetUserId } : {}),
        }),
      );
      clearSelections();
    },
    [gameAction, gameId, unoArmed, view],
  );

  const submitDrawDecision = useCallback(
    async (decision: "keep" | "play", chosenColor?: CardColor) => {
      if (view?.phase === "finished") return;
      await gameAction(
        gameId,
        JSON.stringify({
          type: "resolveDrawDecision",
          decision,
          chosenColor,
          callUno: decision === "play" && drawDecisionUnoArmed,
        }),
      );
      setPendingAction(null);
      setTriggerCard(null);
      setDrawDecisionUnoArmed(false);
      setShowColorPicker(false);
    },
    [drawDecisionUnoArmed, gameAction, gameId, view?.phase],
  );

  const handlePlaySelected = useCallback(async () => {
    if (!view || view.phase === "finished" || selectedCards.size === 0) return;

    const cardIds = Array.from(selectedCards);
    const cards = cardIds
      .map((id) => view.myHand.find((card) => card.id === id))
      .filter(Boolean) as Card[];
    const needsColor = cards.some((card) => cardNeedsColorChoice(card));

    if (needsColor) {
      setPendingAction({
        kind: "playSelected",
        cardIds,
      });
      setTriggerCard(
        cards.find((card) => cardNeedsColorChoice(card)) || null,
      );
      setShowColorPicker(true);
      return;
    }

    if (view.gameMode === "noMercy" && getNumberParity(cards, 7) === "odd") {
      const targets = view.turnOrder.filter(
        (p) => p.userId !== auth.userId && !view.finishedPlayers.includes(p.userId),
      );
      if (targets.length > 1) {
        setPendingAction({ kind: "playSelected", cardIds });
        setPendingSwapTargets(targets);
        return;
      }
    }

    await submitSelectedPlay(cardIds);
  }, [auth.userId, selectedCards, submitSelectedPlay, view]);

  const handleColorChosen = useCallback(
    async (color: CardColor) => {
      if (view?.phase === "finished") return;
      setShowColorPicker(false);

      if (!pendingAction) {
        await gameAction(
          gameId,
          JSON.stringify({ type: "chooseColor", chosenColor: color }),
        );
        clearSelections();
        return;
      }

      if (pendingAction.kind === "playDrawnCard") {
        await submitDrawDecision("play", color);
        return;
      }

      await submitSelectedPlay(pendingAction.cardIds, color);
    },
    [gameAction, gameId, pendingAction, submitDrawDecision, submitSelectedPlay, view?.phase],
  );

  const handleDraw = useCallback(async () => {
    if (view?.phase === "finished") return;
    await gameAction(gameId, JSON.stringify({ type: "drawCards" }));
    setSelectedCards(new Set());
    setUnoArmed(false);
  }, [gameAction, gameId, view?.phase]);

  const handleUno = useCallback(async () => {
    if (view?.phase === "finished") return;
    await gameAction(gameId, JSON.stringify({ type: "callUno" }));
  }, [gameAction, gameId, view?.phase]);

  const handleCatchUno = useCallback(
    async (targetUserId: string) => {
      if (view?.phase === "finished") return;
      await gameAction(
        gameId,
        JSON.stringify({ type: "catchUno", targetUserId }),
      );
    },
    [gameAction, gameId, view?.phase],
  );

  const handleClearSelection = useCallback(() => {
    setSelectedCards(new Set());
    setUnoArmed(false);
  }, []);

  const handleKeepDrawnCard = useCallback(async () => {
    if (view?.phase === "finished") return;
    await submitDrawDecision("keep");
  }, [submitDrawDecision, view?.phase]);

  const handlePlayDrawnCard = useCallback(async () => {
    if (!pendingDrawDecisionCard || view?.phase === "finished") return;

    const needsColor = cardNeedsColorChoice(pendingDrawDecisionCard);

    if (needsColor) {
      setPendingAction({
        kind: "playDrawnCard",
        cardIds: [pendingDrawDecisionCard.id],
      });
      setTriggerCard(pendingDrawDecisionCard);
      setShowColorPicker(true);
      return;
    }

    await submitDrawDecision("play");
  }, [pendingDrawDecisionCard, submitDrawDecision, view?.phase]);

  const handleSevenSwapTarget = useCallback(
    async (targetUserId: string) => {
      if (view?.phase === "finished") return;
      await gameAction(
        gameId,
        JSON.stringify({ type: "chooseSevenSwapTarget", targetUserId }),
      );
    },
    [gameAction, gameId, view?.phase],
  );

  const handleCancelColorPicker = useCallback(() => {
    setShowColorPicker(false);
    setPendingAction(null);
    setTriggerCard(null);
  }, []);

  const handleCancelSwapPicker = useCallback(() => {
    setPendingSwapTargets(null);
    setPendingAction(null);
  }, []);

  const handleClientSwapTargetChosen = useCallback(async (targetUserId: string) => {
    if (!pendingAction || view?.phase === "finished") return;
    setPendingSwapTargets(null);
    await submitSelectedPlay(pendingAction.cardIds, undefined, targetUserId);
  }, [pendingAction, submitSelectedPlay, view?.phase]);

  if (!view) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-400">
        Loading game...
      </div>
    );
  }

  if (view.phase === "finished" && showFinishedScreen) {
    const winner = view.turnOrder.find(
      (player) => player.userId === view.winner,
    );
    const isMe = view.winner === auth.userId;
    const myPlacement = view.placements.findIndex((playerId) => playerId === auth.userId);
    const placementLabel =
      myPlacement === 0
        ? "1st"
        : myPlacement === 1
          ? "2nd"
          : myPlacement === 2
            ? "3rd"
            : myPlacement >= 3
              ? `${myPlacement + 1}th`
              : null;

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
        {placementLabel && (
          <p
            className="text-neutral-300 text-sm"
            style={{ animation: "fade-slide-in 0.4s ease-out 0.3s both" }}
          >
            You finished {placementLabel}
          </p>
        )}
        {!isMe && (
          <p
            className="text-neutral-400 text-sm"
            style={{ animation: "fade-slide-in 0.4s ease-out 0.4s both" }}
          >
            Better luck next time!
          </p>
        )}
        <div
          className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900/60 px-4 py-4"
          style={{ animation: "fade-slide-in 0.4s ease-out 0.5s both" }}
        >
          <div className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500">
            Final Standings
          </div>
          <div className="space-y-2">
            {view.placements.map((playerId, index) => {
              const player = view.turnOrder.find((entry) => entry.userId === playerId);
              const label =
                index === 0 ? "1st" : index === 1 ? "2nd" : index === 2 ? "3rd" : `${index + 1}th`;
              const isCurrentUser = playerId === auth.userId;
              return (
                <div
                  key={playerId}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                    isCurrentUser ? "bg-neutral-800 text-white" : "bg-neutral-950/60 text-neutral-300"
                  }`}
                >
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-sm">
                    {player?.displayName || "Unknown"}
                    {isCurrentUser ? " (you)" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <button
          onClick={onBackToLobby}
          className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-neutral-200 transition-colors"
          style={{ animation: "fade-slide-in 0.4s ease-out 0.6s both" }}
        >
          Back to lobby
        </button>
      </div>
    );
  }

  const colorPickerTrigger =
    mustChooseColor && !triggerCard
      ? cardNeedsColorChoice(view.discardTop)
        ? view.discardTop
        : null
      : triggerCard;

  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden"
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
          onCancel={mustChooseColor ? undefined : handleCancelColorPicker}
        />
      )}
      {showPublicEventId === view.publicEvent?.id && (
        <ColorRouletteRevealToast view={view} />
      )}
      {pendingSwapTargets && view.pendingSevenSwapTargets.length === 0 && (
        <SevenSwapTargetModal
          targets={pendingSwapTargets}
          onChoose={handleClientSwapTargetChosen}
          onCancel={handleCancelSwapPicker}
        />
      )}
      {view.pendingSevenSwapTargets.length > 0 && !showColorPicker && !pendingSwapTargets && (
        <SevenSwapTargetModal
          targets={view.pendingSevenSwapTargets}
          onChoose={handleSevenSwapTarget}
        />
      )}
      {pendingDrawDecisionCard && !showColorPicker && (
        <DrawDecisionModal
          card={pendingDrawDecisionCard}
          canCallUno={canCallUnoForDrawDecision}
          unoArmed={drawDecisionUnoArmed}
          onToggleUnoArmed={() =>
            setDrawDecisionUnoArmed((current) => !current)
          }
          onKeep={handleKeepDrawnCard}
          onPlay={handlePlayDrawnCard}
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
        {view.phase === "finished" && !showFinishedScreen && (
          <div className="pointer-events-none absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-xs font-medium uppercase tracking-wider text-amber-200">
            Round over
          </div>
        )}
        <PlayArea view={view} onDraw={handleDraw} isMyTurn={isMyTurn} onPlaySelected={handlePlaySelected} />
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
          unoArmed={unoArmed}
          onToggleCard={handleToggleCard}
          onToggleUnoArmed={() => setUnoArmed((current) => !current)}
          onPlaySelected={handlePlaySelected}
          onClearSelection={handleClearSelection}
          colorPickerVisible={!!(showColorPicker || mustChooseColor || pendingDrawDecisionCard || pendingSwapTargets)}
        />
      </div>
    </div>
  );
}
