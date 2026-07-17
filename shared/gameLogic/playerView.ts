import type { Card, GameAction, GameState, PlayerInfo, PlayerView } from "../gameTypes";
import { actionWithDisplayNames, buildActionParts } from "./descriptions";
import { normalizeGameState } from "./state";
import {
  canStackCard,
  cardNeedsColorChoice,
  getDrawAmount,
  getLastDrawCard,
  getNumberParity,
  isDrawCard,
} from "./effects";
import { getPlayableCards, getStackableCards } from "./rules";

export function computePlayerView(
  state: GameState,
  userId: string,
  gameId: string,
  players: { userId: string; displayName: string; picture: string }[]
): PlayerView {
  state = normalizeGameState(state);
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
    ? getPlayableCards(myHand, discardTop, state.currentColor, state.gameMode).map((card) => card.id)
    : [];

  const canStack =
    state.phase === "stacking" &&
    state.pendingDrawTarget === userId &&
    !hasPendingDrawDecision;
  const stackableCardIds = canStack
    ? getStackableCards(myHand, state.discardPile, state.gameMode).map((card) => card.id)
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
  const pendingSevenSwapTargets =
    state.phase === "chooseSevenSwapTarget" && state.pendingSevenSwap?.playerId === userId
      ? state.turnOrder
          .filter((playerId) => playerId !== userId && !state.finishedPlayers.includes(playerId))
          .map((playerId) => {
            const player = players.find((entry) => entry.userId === playerId);
            return {
              userId: playerId,
              displayName: player?.displayName || "Unknown",
              picture: player?.picture || "",
              cardCount: (state.hands[playerId] || []).length,
              calledUno: !!state.unoCallStatus[playerId],
            };
          })
      : [];
  const revivableFinishedPlayers = new Set(state.revivableFinishedPlayers);
  const canInspectHands =
    (state.finishedPlayers.includes(userId) || state.eliminatedPlayers.includes(userId)) &&
    !revivableFinishedPlayers.has(userId);
  const spectatorHands: Record<string, Card[]> = {};

  if (canInspectHands) {
    for (const playerId of state.turnOrder) {
      if (playerId === userId) continue;
      if (state.phase !== "finished" && state.finishedPlayers.includes(playerId)) continue;
      spectatorHands[playerId] = state.hands[playerId] || [];
    }
  }

  return {
    gameId,
    gameMode: state.gameMode,
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
    selectableCardIds: [...playableCardIds, ...stackableCardIds],
    mustDraw,
    pendingDrawCount: state.pendingDrawStack,
    unoCallable,
    unoCatchable,
    drawPileCount: state.drawPile.length,
    pendingDrawDecisionCard,
    pendingSevenSwapTargets,
    spectatorHands,
    publicEvent: state.publicEvent,
    winner: state.winner,
    finishedPlayers: state.finishedPlayers,
    eliminatedPlayers: state.eliminatedPlayers,
    placements: state.placements || (state.winner ? [state.winner] : []),
  };
}

function validatePlayCards(
  state: GameState,
  playerId: string,
  cardIds: string[],
  chosenColor?: string,
  sevenSwapTargetUserId?: string
): { valid: boolean; error?: string } {
  const hand = state.hands[playerId];
  for (const cardId of cardIds) {
    if (!hand.find((card) => card.id === cardId)) {
      return { valid: false, error: `Card ${cardId} not in hand` };
    }
  }

  const cards = cardIds.map((cardId) => hand.find((card) => card.id === cardId)!);
  const topDiscard = state.discardPile[state.discardPile.length - 1];
  const firstCard = cards[0];
  const sameType = new Set(cards.map((card) => card.type));

  if (cards.length === 1) {
    if (!getPlayableCards([firstCard], topDiscard, state.currentColor, state.gameMode).length) {
      return { valid: false, error: "Card not playable" };
    }
  } else {
    if (!getPlayableCards([firstCard], topDiscard, state.currentColor, state.gameMode).length) {
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
    } else if (
      firstCard.type !== "skip" &&
      firstCard.type !== "reverse" &&
      firstCard.type !== "skipAll"
    ) {
      return {
        valid: false,
        error: "Can only multi-play numbers, skips, reverses, or skip alls",
      };
    }
  }

  if (state.gameMode === "noMercy") {
    if (cards.length > 1 && cards.some((card) => isDrawCard(card, state.gameMode))) {
      return { valid: false, error: "Draw cards can only be multi-played while stacking" };
    }
    if (cards.length > 1 && cards.some((card) => cardNeedsColorChoice(card))) {
      return { valid: false, error: "Wild cards cannot be multi-played" };
    }
    if (cards.length > 1 && cards.some((card) => card.type === "discardAll")) {
      return { valid: false, error: "Discard All cannot be multi-played" };
    }
  }

  const needsColor = cards.some((card) => cardNeedsColorChoice(card));
  if (needsColor && !chosenColor) {
    return { valid: false, error: "Must choose color for wild card" };
  }

  if (sevenSwapTargetUserId) {
    if (state.gameMode !== "noMercy" || getNumberParity(cards, 7) !== "odd") {
      return { valid: false, error: "Hand swap target is only valid for a no mercy 7" };
    }
    if (sevenSwapTargetUserId === playerId) {
      return { valid: false, error: "Choose another player" };
    }
    if (!state.turnOrder.includes(sevenSwapTargetUserId)) {
      return { valid: false, error: "Target is not in this game" };
    }
    if (state.finishedPlayers.includes(sevenSwapTargetUserId)) {
      return { valid: false, error: "Target is not active" };
    }
  }

  return { valid: true };
}

export function validateAction(
  state: GameState,
  playerId: string,
  action: GameAction
): { valid: boolean; error?: string } {
  state = normalizeGameState(state);
  const currentPlayerId = state.turnOrder[state.currentPlayerIndex];
  const pendingDrawDecision = state.pendingDrawDecision;

  if (state.eliminatedPlayers.includes(playerId)) {
    return { valid: false, error: "You are out of this round" };
  }

  if (state.pendingSevenSwap) {
    if (action.type !== "chooseSevenSwapTarget") {
      return { valid: false, error: "Choose a hand swap target first" };
    }
    if (state.pendingSevenSwap.playerId !== playerId) {
      return { valid: false, error: "Not your hand swap choice" };
    }
  }

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
      return validatePlayCards(
        state,
        playerId,
        action.cardIds,
        action.chosenColor,
        action.sevenSwapTargetUserId
      );
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
      const lastDrawCard = getLastDrawCard(state.discardPile, state.gameMode);

      let requiredDrawAmount = getDrawAmount(lastDrawCard || cards[0]);
      for (const card of cards) {
        if (!canStackCard(card, lastDrawCard, state.gameMode)) {
          return { valid: false, error: "Cannot stack that draw card" };
        }
        if (state.gameMode === "noMercy" && getDrawAmount(card) < requiredDrawAmount) {
          return { valid: false, error: "Stacked draw card must be equal or higher" };
        }
        requiredDrawAmount = getDrawAmount(card);
      }

      if (cards.some((card) => cardNeedsColorChoice(card)) && !action.chosenColor) {
        return { valid: false, error: "Must choose color for wild card" };
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
      if (!cardNeedsColorChoice(topCard)) {
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
      if (!getPlayableCards([drawnCard], topDiscard, state.currentColor, state.gameMode).length) {
        return { valid: false, error: "Drawn card is not playable" };
      }

      if (cardNeedsColorChoice(drawnCard) && !action.chosenColor) {
        return { valid: false, error: "Must choose color for wild card" };
      }

      return { valid: true };
    }

    case "chooseSevenSwapTarget": {
      if (state.phase !== "chooseSevenSwapTarget" || !state.pendingSevenSwap) {
        return { valid: false, error: "No hand swap target needed" };
      }
      if (state.pendingSevenSwap.playerId !== playerId) {
        return { valid: false, error: "Not your hand swap choice" };
      }
      if (action.targetUserId === playerId) {
        return { valid: false, error: "Choose another player" };
      }
      if (state.finishedPlayers.includes(action.targetUserId)) {
        return { valid: false, error: "Target is not active" };
      }
      return { valid: true };
    }
  }
}
