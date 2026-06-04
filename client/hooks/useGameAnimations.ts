import { useRef, useEffect, useState } from "preact/hooks";
import type { PlayerView } from "../../shared/gameTypes";

export type GameAnimations = {
  newDiscard: boolean;
  turnChanged: boolean;
  directionChanged: boolean;
  newAction: string | null;
  gameEnded: boolean;
  unoCalledBy: string | null;
  penaltyTarget: string | null;
};

type PrevState = {
  discardId: string;
  currentPlayerIndex: number;
  direction: number;
  lastAction: string | null;
  phase: string;
  turnOrder: Array<{ userId: string; cardCount: number; calledUno: boolean }>;
};

export function useGameAnimations(view: PlayerView | null): GameAnimations {
  const prevRef = useRef<PrevState | null>(null);
  const [unoCalledBy, setUnoCalledBy] = useState<string | null>(null);
  const [penaltyTarget, setPenaltyTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!view || !prevRef.current) return;
    const prev = prevRef.current;

    for (const player of view.turnOrder) {
      const prevPlayer = prev.turnOrder.find((p) => p.userId === player.userId);
      if (!prevPlayer) continue;

      const justCalledUno = player.calledUno && !prevPlayer.calledUno;
      const justReachedUnoHand = player.calledUno && player.cardCount === 1 && prevPlayer.cardCount !== 1;

      if (justCalledUno || justReachedUnoHand) {
        setUnoCalledBy(player.userId);
        const t = setTimeout(() => setUnoCalledBy(null), 1500);
        return () => clearTimeout(t);
      }

      if (player.cardCount - prevPlayer.cardCount >= 2) {
        setPenaltyTarget(player.userId);
        const t = setTimeout(() => setPenaltyTarget(null), 800);
        return () => clearTimeout(t);
      }
    }
  }, [view ? view.turnOrder.map((p) => `${p.userId}:${p.cardCount}:${p.calledUno}`).join(",") : ""]);

  useEffect(() => {
    if (!view) {
      prevRef.current = null;
      return;
    }
    prevRef.current = {
      discardId: view.discardTop.id,
      currentPlayerIndex: view.currentPlayerIndex,
      direction: view.direction,
      lastAction: view.lastAction,
      phase: view.phase,
      turnOrder: view.turnOrder.map((p) => ({
        userId: p.userId,
        cardCount: p.cardCount,
        calledUno: p.calledUno,
      })),
    };
  });

  if (!view) {
    return {
      newDiscard: false,
      turnChanged: false,
      directionChanged: false,
      newAction: null,
      gameEnded: false,
      unoCalledBy: null,
      penaltyTarget: null,
    };
  }

  const prev = prevRef.current;
  return {
    newDiscard: prev ? view.discardTop.id !== prev.discardId : false,
    turnChanged: prev ? view.currentPlayerIndex !== prev.currentPlayerIndex : false,
    directionChanged: prev ? view.direction !== prev.direction : false,
    newAction: prev && view.lastAction !== prev.lastAction ? view.lastAction : null,
    gameEnded: prev ? view.phase === "finished" && prev.phase !== "finished" : false,
    unoCalledBy,
    penaltyTarget,
  };
}
