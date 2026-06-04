import type { GameAction, GameState, PlayerInfo, PlayerView } from "../gameTypes";
import { actionWithDisplayNames, buildActionParts } from "./descriptions";
import { determineLastDrawType } from "./state";
import { getPlayableCards, getStackableCards } from "./rules";

export function computePlayerView(
  state: GameState,
  userId: string,
  gameId: string,
  players: { userId: string; displayName: string; picture: string }[]
): PlayerView {
  const myHand = state.hands[userId] || [];
  const discardTop = state.discardPile[state.discardPile.length - 1];
  const handCounts: Record<string, number> = {};

  for (const playerId of state.turnOrder) {
    if (playerId !== userId) {
      handCounts[playerId] = (state.hands[playerId] || []).length;
    }
  }

  const isMyTurn = state.turnOrder[state.currentPlayerIndex] === userId;
  const pendingDrawDecisionCard =
    state.pendingDrawDecision?.playerId === userId
      ? myHand.find((card) => card.id === state.pendingDrawDecision?.cardId) || null
      : null;
  const hasPendingDrawDecision = !!pendingDrawDecisionCard;
  const canPlay = isMyTurn && state.phase === "play" && !hasPendingDrawDecision;
  const playableCardIds = canPlay
    ? getPlayableCards(myHand, discardTop, state.currentColor).map((card) => card.id)
    : [];

  const canStack =
    state.phase === "stacking" &&
    state.pendingDrawTarget === userId &&
    !hasPendingDrawDecision;
  const stackableCardIds = canStack
    ? getStackableCards(myHand, determineLastDrawType(state.discardPile)).map((card) => card.id)
    : [];

  const mustDraw =
    (canStack && stackableCardIds.length === 0) ||
    (canPlay && playableCardIds.length === 0);
  const unoCallable = myHand.length === 1 && !state.unoCallStatus[userId] && state.phase !== "finished";
  const unoCatchable = state.turnOrder.filter((playerId) => {
    if (playerId === userId) return false;
    const hand = state.hands[playerId] || [];
    return hand.length === 1 && !state.unoCallStatus[playerId];
  });

  const turnOrder: PlayerInfo[] = state.turnOrder.map((playerId) => {
    const player = players.find((entry) => entry.userId === playerId);
    return {
      userId: playerId,
      displayName: player?.displayName || "Unknown",
      picture: player?.picture || "",
      cardCount: (state.hands[playerId] || []).length,
      calledUno: !!state.unoCallStatus[playerId],
    };
  });

  const lastAction = actionWithDisplayNames(state.lastAction, players);

  return {
    gameId,
    myHand,
    handCounts,
    discardTop,
    currentColor: state.currentColor,
    currentPlayerIndex: state.currentPlayerIndex,
    direction: state.direction,
    turnOrder,
    phase: state.phase,
    lastAction,
    lastActionParts: buildActionParts(state.lastAction, players),
    canPlay,
    playableCardIds,
    canStack,
    stackableCardIds,
    mustDraw,
    pendingDrawCount: state.pendingDrawStack,
    unoCallable,
    unoCatchable,
    drawPileCount: state.drawPile.length,
    pendingDrawDecisionCard,
    winner: state.winner,
    finishedPlayers: state.finishedPlayers,
  };
}

export function validateAction(
  state: GameState,
  playerId: string,
  action: GameAction
): { valid: boolean; error?: string } {
  const currentPlayerId = state.turnOrder[state.currentPlayerIndex];
  const pendingDrawDecision = state.pendingDrawDecision;

  if (pendingDrawDecision) {
    if (action.type !== "resolveDrawDecision") {
      return { valid: false, error: "Resolve the drawn card first" };
    }
    if (pendingDrawDecision.playerId !== playerId) {
      return { valid: false, error: "Not your draw decision" };
    }
  }

  switch (action.type) {
    case "playCards": {
      if (currentPlayerId !== playerId) return { valid: false, error: "Not your turn" };
      if (state.phase !== "play") return { valid: false, error: "Cannot play cards now" };
      if (action.cardIds.length === 0) return { valid: false, error: "No cards selected" };

      const hand = state.hands[playerId];
      for (const cardId of action.cardIds) {
        if (!hand.find((card) => card.id === cardId)) {
          return { valid: false, error: `Card ${cardId} not in hand` };
        }
      }

      const cards = action.cardIds.map((cardId) => hand.find((card) => card.id === cardId)!);
      const topDiscard = state.discardPile[state.discardPile.length - 1];
      const firstCard = cards[0];
      const sameType = new Set(cards.map((card) => card.type));

      if (cards.length === 1) {
        if (!getPlayableCards([firstCard], topDiscard, state.currentColor).length) {
          return { valid: false, error: "Card not playable" };
        }
      } else {
        if (!getPlayableCards([firstCard], topDiscard, state.currentColor).length) {
          return { valid: false, error: "First card must be playable" };
        }
        if (sameType.size > 1) {
          return { valid: false, error: "Multi-play cards must be same type" };
        }
        if (firstCard.type === "number") {
          const sameValue = new Set(cards.map((card) => card.value));
          if (sameValue.size > 1) {
            return {
              valid: false,
              error: "Multi-play number cards must have same value",
            };
          }
        } else if (firstCard.type !== "skip" && firstCard.type !== "reverse") {
          return {
            valid: false,
            error: "Can only multi-play numbers, skips, or reverses",
          };
        }
      }

      const needsColor = cards.some((card) => card.type === "wild" || card.type === "wild4");
      if (needsColor && !action.chosenColor) {
        return { valid: false, error: "Must choose color for wild card" };
      }

      return { valid: true };
    }

    case "stackCards": {
      if (state.phase !== "stacking") return { valid: false, error: "Not in stacking phase" };
      if (state.pendingDrawTarget !== playerId) {
        return { valid: false, error: "Not the stack target" };
      }
      if (action.cardIds.length === 0) return { valid: false, error: "No cards selected" };

      const hand = state.hands[playerId];
      for (const cardId of action.cardIds) {
        if (!hand.find((card) => card.id === cardId)) {
          return { valid: false, error: `Card ${cardId} not in hand` };
        }
      }

      const cards = action.cardIds.map((cardId) => hand.find((card) => card.id === cardId)!);
      const lastDrawType = determineLastDrawType(state.discardPile);

      for (const card of cards) {
        if (lastDrawType === "draw2") {
          if (card.type !== "draw2" && card.type !== "wild4") {
            return { valid: false, error: "Can only stack +2 or +4 on +2" };
          }
        } else if (card.type !== "wild4") {
          return { valid: false, error: "Can only stack +4 on +4" };
        }
      }

      return { valid: true };
    }

    case "drawCards":
      if (state.phase === "stacking" && state.pendingDrawTarget === playerId) {
        return { valid: true };
      }
      if (state.phase === "play" && currentPlayerId === playerId) {
        return { valid: true };
      }
      return { valid: false, error: "Cannot draw now" };

    case "chooseColor": {
      if (state.phase !== "chooseColor") return { valid: false, error: "Cannot choose color now" };
      if (currentPlayerId !== playerId) return { valid: false, error: "Not your turn" };

      const topCard = state.discardPile[state.discardPile.length - 1];
      if (topCard.type !== "wild" && topCard.type !== "wild4") {
        return { valid: false, error: "Top card is not wild" };
      }

      return { valid: true };
    }

    case "callUno": {
      const hand = state.hands[playerId];
      if (!hand || hand.length > 2) {
        return { valid: false, error: "Can only call UNO with 1-2 cards" };
      }
      return { valid: true };
    }

    case "catchUno": {
      const targetHand = state.hands[action.targetUserId];
      if (!targetHand || targetHand.length !== 1) {
        return { valid: false, error: "Target does not have exactly 1 card" };
      }
      if (state.unoCallStatus[action.targetUserId]) {
        return { valid: false, error: "Target already called UNO" };
      }
      return { valid: true };
    }

    case "resolveDrawDecision": {
      if (!pendingDrawDecision) {
        return { valid: false, error: "No drawn card to resolve" };
      }

      if (action.decision === "keep") {
        return { valid: true };
      }

      const hand = state.hands[playerId];
      const drawnCard = hand.find((card) => card.id === pendingDrawDecision.cardId);
      if (!drawnCard) {
        return { valid: false, error: "Drawn card not in hand" };
      }

      const topDiscard = state.discardPile[state.discardPile.length - 1];
      if (!getPlayableCards([drawnCard], topDiscard, state.currentColor).length) {
        return { valid: false, error: "Drawn card is not playable" };
      }

      if ((drawnCard.type === "wild" || drawnCard.type === "wild4") && !action.chosenColor) {
        return { valid: false, error: "Must choose color for wild card" };
      }

      return { valid: true };
    }
  }
}
