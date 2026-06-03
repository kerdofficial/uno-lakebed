import type {
  Card,
  CardColor,
  CardType,
  GameState,
  GameAction,
  PlayerView,
  PlayerInfo,
  GamePhase,
} from "./gameTypes";

export function createDeck(): Card[] {
  const colors: CardColor[] = ["red", "yellow", "green", "blue"];
  const cards: Card[] = [];

  for (const color of colors) {
    cards.push({ id: `${color}-0-0`, color, type: "number", value: 0 });

    for (let n = 1; n <= 9; n++) {
      cards.push({ id: `${color}-${n}-0`, color, type: "number", value: n });
      cards.push({ id: `${color}-${n}-1`, color, type: "number", value: n });
    }

    for (const type of ["skip", "reverse", "draw2"] as CardType[]) {
      cards.push({ id: `${color}-${type}-0`, color, type, value: null });
      cards.push({ id: `${color}-${type}-1`, color, type, value: null });
    }
  }

  for (let i = 0; i < 4; i++) {
    cards.push({ id: `wild-${i}`, color: null, type: "wild", value: null });
    cards.push({ id: `wild4-${i}`, color: null, type: "wild4", value: null });
  }

  return cards;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function isCardPlayable(
  card: Card,
  topDiscard: Card,
  currentColor: CardColor
): boolean {
  if (card.type === "wild" || card.type === "wild4") return true;
  if (card.color === currentColor) return true;
  if (
    card.type === "number" &&
    topDiscard.type === "number" &&
    card.value === topDiscard.value
  )
    return true;
  if (card.type !== "number" && card.type === topDiscard.type) return true;
  return false;
}

export function getPlayableCards(
  hand: Card[],
  topDiscard: Card,
  currentColor: CardColor
): Card[] {
  return hand.filter((c) => isCardPlayable(c, topDiscard, currentColor));
}

export function getMultiPlayGroups(
  hand: Card[],
  topDiscard: Card,
  currentColor: CardColor
): Card[][] {
  const groups: Card[][] = [];

  const numberGroups: Record<number, Card[]> = {};
  const skipCards: Card[] = [];
  const reverseCards: Card[] = [];

  for (const card of hand) {
    if (card.type === "number" && card.value !== null) {
      if (!numberGroups[card.value]) numberGroups[card.value] = [];
      numberGroups[card.value].push(card);
    } else if (card.type === "skip") {
      skipCards.push(card);
    } else if (card.type === "reverse") {
      reverseCards.push(card);
    }
  }

  for (const value in numberGroups) {
    const cards = numberGroups[value];
    if (cards.length < 2) continue;
    const hasPlayable = cards.some((c) =>
      isCardPlayable(c, topDiscard, currentColor)
    );
    if (hasPlayable) groups.push(cards);
  }

  if (skipCards.length >= 2) {
    const hasPlayable = skipCards.some((c) =>
      isCardPlayable(c, topDiscard, currentColor)
    );
    if (hasPlayable) groups.push(skipCards);
  }

  if (reverseCards.length >= 2) {
    const hasPlayable = reverseCards.some((c) =>
      isCardPlayable(c, topDiscard, currentColor)
    );
    if (hasPlayable) groups.push(reverseCards);
  }

  return groups;
}

export function getStackableCards(
  hand: Card[],
  lastDrawType: "draw2" | "wild4"
): Card[] {
  if (lastDrawType === "draw2") {
    return hand.filter((c) => c.type === "draw2" || c.type === "wild4");
  }
  return hand.filter((c) => c.type === "wild4");
}

function getNextPlayerIndex(
  state: GameState,
  fromIndex: number,
  skip: number = 0,
  includeFinished: boolean = false
): number {
  const { turnOrder, direction, finishedPlayers } = state;
  let idx = fromIndex;
  let skipsLeft = skip + 1;

  while (skipsLeft > 0) {
    idx = (idx + direction + turnOrder.length) % turnOrder.length;
    const playerId = turnOrder[idx];
    if (includeFinished || !finishedPlayers.includes(playerId)) {
      skipsLeft--;
    }
  }

  return idx;
}

function getActivePlayerIds(state: GameState): string[] {
  return state.turnOrder.filter(
    (playerId) => !state.finishedPlayers.includes(playerId)
  );
}

function getNextMatchingPlayerIndex(
  state: GameState,
  fromIndex: number,
  canUsePlayer: (playerId: string) => boolean
): number {
  let idx = fromIndex;

  for (let i = 0; i < state.turnOrder.length; i++) {
    idx = (idx + state.direction + state.turnOrder.length) % state.turnOrder.length;
    const playerId = state.turnOrder[idx];
    if (canUsePlayer(playerId)) return idx;
  }

  return fromIndex;
}

function getNextPlayerIndexAfterSkips(
  state: GameState,
  skipCount: number
): number {
  if (skipCount <= 0) {
    return getNextPlayerIndex(state, state.currentPlayerIndex);
  }

  const currentPlayerId = state.turnOrder[state.currentPlayerIndex];
  const opponents = getActivePlayerIds(state).filter(
    (playerId) => playerId !== currentPlayerId
  );

  if (opponents.length === 0) return state.currentPlayerIndex;

  let skippedIndex = state.currentPlayerIndex;
  for (let i = 0; i < skipCount; i++) {
    skippedIndex = getNextMatchingPlayerIndex(
      state,
      skippedIndex,
      (playerId) =>
        playerId !== currentPlayerId &&
        !state.finishedPlayers.includes(playerId)
    );
  }

  return getNextMatchingPlayerIndex(
    state,
    skippedIndex,
    (playerId) => !state.finishedPlayers.includes(playerId)
  );
}

export function advanceTurn(state: GameState, skipCount: number = 0): GameState {
  const nextIndex = getNextPlayerIndexAfterSkips(state, skipCount);
  return { ...state, currentPlayerIndex: nextIndex };
}

function rebuildDrawPile(state: GameState): Card[] {
  const topDiscard = state.discardPile[state.discardPile.length - 1];
  const unavailableCardIds = new Set<string>();

  if (topDiscard) unavailableCardIds.add(topDiscard.id);

  for (const playerId of state.turnOrder) {
    for (const card of state.hands[playerId] || []) {
      unavailableCardIds.add(card.id);
    }
  }

  return shuffleDeck(
    createDeck().filter((card) => !unavailableCardIds.has(card.id))
  );
}

function ensureDrawPile(state: GameState, needed: number): GameState {
  if (state.drawPile.length >= needed) return state;

  const topDiscard = state.discardPile[state.discardPile.length - 1];
  const rebuiltDrawPile = rebuildDrawPile(state);
  return {
    ...state,
    drawPile: rebuiltDrawPile,
    discardPile: [topDiscard],
  };
}

function drawCards(state: GameState, count: number): { state: GameState; drawn: Card[] } {
  let s = ensureDrawPile(state, count);
  const available = Math.min(count, s.drawPile.length);
  const drawn = s.drawPile.slice(0, available);
  return {
    state: { ...s, drawPile: s.drawPile.slice(available) },
    drawn,
  };
}

function determineLastDrawType(discardPile: Card[]): "draw2" | "wild4" {
  for (let i = discardPile.length - 1; i >= 0; i--) {
    if (discardPile[i].type === "wild4") return "wild4";
    if (discardPile[i].type === "draw2") return "draw2";
  }
  return "draw2";
}

function actionWithDisplayNames(
  action: string | null,
  players: { userId: string; displayName: string; picture: string }[]
): string | null {
  if (!action) return action;

  let displayAction = action;
  const sortedPlayers = [...players].sort(
    (a, b) => b.userId.length - a.userId.length
  );

  for (const player of sortedPlayers) {
    displayAction = displayAction
      .split(player.userId)
      .join(player.displayName || player.userId);
  }

  return displayAction;
}

export function applyCards(
  state: GameState,
  playerId: string,
  cardIds: string[],
  chosenColor?: CardColor
): GameState {
  const hand = [...state.hands[playerId]];
  const playedCards: Card[] = [];

  for (const id of cardIds) {
    const idx = hand.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Card ${id} not in hand`);
    playedCards.push(hand[idx]);
    hand.splice(idx, 1);
  }

  const newDiscardPile = [...state.discardPile, ...playedCards];
  const newHands = { ...state.hands, [playerId]: hand };

  const lastCard = playedCards[playedCards.length - 1];
  let newColor: CardColor;
  if (lastCard.type === "wild" || lastCard.type === "wild4") {
    newColor = chosenColor || state.currentColor;
  } else {
    newColor = lastCard.color!;
  }

  let newState: GameState = {
    ...state,
    hands: newHands,
    discardPile: newDiscardPile,
    currentColor: newColor,
  };

  let newFinished = [...newState.finishedPlayers];
  if (hand.length === 0 && !newFinished.includes(playerId)) {
    newFinished.push(playerId);
    newState = { ...newState, finishedPlayers: newFinished };
  }

  if ((lastCard.type === "wild" || lastCard.type === "wild4") && !chosenColor) {
    return {
      ...newState,
      phase: "chooseColor",
      lastAction: buildActionDescription(playerId, playedCards),
    };
  }

  const hasDrawEffect = playedCards.some(
    (c) => c.type === "draw2" || c.type === "wild4"
  );
  const drawAmount = playedCards.reduce((sum, c) => {
    if (c.type === "draw2") return sum + 2;
    if (c.type === "wild4") return sum + 4;
    return sum;
  }, 0);

  if (hasDrawEffect) {
    const targetIndex = getNextPlayerIndex(
      newState,
      newState.currentPlayerIndex,
      0,
      true
    );
    const targetId = newState.turnOrder[targetIndex];
    return {
      ...newState,
      phase: "stacking",
      pendingDrawStack: newState.pendingDrawStack + drawAmount,
      pendingDrawTarget: targetId,
      currentPlayerIndex: targetIndex,
      lastAction: buildActionDescription(playerId, playedCards, chosenColor),
    };
  }

  let skipCount = playedCards.filter((c) => c.type === "skip").length;
  const reverseCount = playedCards.filter((c) => c.type === "reverse").length;
  const activePlayerCount = getActivePlayerIds(newState).length;

  if (activePlayerCount === 2 && reverseCount > 0) {
    skipCount += reverseCount;
  } else if (reverseCount > 0 && reverseCount % 2 === 1) {
    newState = { ...newState, direction: (newState.direction * -1) as 1 | -1 };
  }

  newState = advanceTurn(newState, skipCount);

  const winner = checkWinner(newState);
  if (winner) {
    return {
      ...newState,
      phase: "finished",
      winner,
      lastAction: buildActionDescription(playerId, playedCards, chosenColor),
    };
  }

  return {
    ...newState,
    phase: "play",
    lastAction: buildActionDescription(playerId, playedCards, chosenColor),
  };
}

export function applyStack(
  state: GameState,
  playerId: string,
  cardIds: string[],
  chosenColor?: CardColor
): GameState {
  const hand = [...state.hands[playerId]];
  const playedCards: Card[] = [];

  for (const id of cardIds) {
    const idx = hand.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Card ${id} not in hand`);
    playedCards.push(hand[idx]);
    hand.splice(idx, 1);
  }

  const drawAmount = playedCards.reduce((sum, c) => {
    if (c.type === "draw2") return sum + 2;
    if (c.type === "wild4") return sum + 4;
    return sum;
  }, 0);

  const newDiscardPile = [...state.discardPile, ...playedCards];
  const newHands = { ...state.hands, [playerId]: hand };

  const lastCard = playedCards[playedCards.length - 1];
  let newColor: CardColor;
  if (lastCard.type === "wild4") {
    newColor = chosenColor || state.currentColor;
  } else {
    newColor = lastCard.color || state.currentColor;
  }

  let newState: GameState = {
    ...state,
    hands: newHands,
    discardPile: newDiscardPile,
    currentColor: newColor,
    pendingDrawStack: state.pendingDrawStack + drawAmount,
  };

  let newFinished = [...newState.finishedPlayers];
  if (hand.length === 0 && !newFinished.includes(playerId)) {
    newFinished.push(playerId);
    newState = { ...newState, finishedPlayers: newFinished };
  }

  const targetIndex = getNextPlayerIndex(newState, state.currentPlayerIndex, 0, true);
  const targetId = newState.turnOrder[targetIndex];

  return {
    ...newState,
    pendingDrawTarget: targetId,
    currentPlayerIndex: targetIndex,
    lastAction: `${playerId} stacked ${playedCards.map(cardLabel).join(", ")}`,
  };
}

export function applyChosenColor(
  state: GameState,
  _playerId: string,
  chosenColor: CardColor
): GameState {
  const topCard = state.discardPile[state.discardPile.length - 1];
  const lastAction = state.lastAction
    ? `${state.lastAction} (chose ${chosenColor})`
    : `${_playerId} chose ${chosenColor}`;

  let result: GameState = {
    ...state,
    currentColor: chosenColor,
    lastAction,
  };

  if (topCard.type === "wild4") {
    const targetIndex = getNextPlayerIndex(
      result,
      result.currentPlayerIndex,
      0,
      true
    );
    return {
      ...result,
      phase: "stacking",
      pendingDrawStack: result.pendingDrawStack + 4,
      pendingDrawTarget: result.turnOrder[targetIndex],
      currentPlayerIndex: targetIndex,
    };
  }

  result = advanceTurn({ ...result, phase: "play" }, 0);

  const winner = checkWinner(result);
  if (winner) {
    return { ...result, phase: "finished", winner };
  }

  return result;
}

export function applyDraw(state: GameState, playerId: string): GameState {
  const count = state.pendingDrawStack;
  const { state: newState, drawn } = drawCards(state, count);

  const hand = [...(newState.hands[playerId] || []), ...drawn];
  const newHands = { ...newState.hands, [playerId]: hand };

  let newFinished = newState.finishedPlayers.filter((id) => id !== playerId);

  let result: GameState = {
    ...newState,
    hands: newHands,
    finishedPlayers: newFinished,
    pendingDrawStack: 0,
    pendingDrawTarget: null,
    phase: "play" as GamePhase,
    lastAction: `${playerId} drew ${count} cards`,
  };

  result = advanceTurn(result, 0);

  const winner = checkWinner(result);
  if (winner) {
    return { ...result, phase: "finished", winner };
  }

  return result;
}

export function applyNormalDraw(state: GameState, playerId: string): GameState {
  const { state: newState, drawn } = drawCards(state, 1);

  if (drawn.length === 0) {
    const result = advanceTurn(newState, 0);
    return { ...result, lastAction: `${playerId} could not draw` };
  }

  const drawnCard = drawn[0];
  const topDiscard = state.discardPile[state.discardPile.length - 1];
  const hand = [...newState.hands[playerId], drawnCard];
  const newHands = { ...newState.hands, [playerId]: hand };
  const stateWithDrawn = {
    ...newState,
    hands: newHands,
    unoCallStatus: { ...newState.unoCallStatus, [playerId]: false },
  };

  if (isCardPlayable(drawnCard, topDiscard, state.currentColor)) {
    return applyCards(stateWithDrawn, playerId, [drawnCard.id]);
  }

  let result = advanceTurn(stateWithDrawn, 0);

  const winner = checkWinner(result);
  if (winner) {
    return { ...result, phase: "finished", winner };
  }

  return {
    ...result,
    lastAction: `${playerId} drew a card`,
  };
}

export function checkWinner(state: GameState): string | null {
  if (state.phase === "stacking") return null;

  for (const playerId of state.finishedPlayers) {
    const hand = state.hands[playerId];
    if (!hand || hand.length === 0) return playerId;
  }

  return null;
}

export function computePlayerView(
  state: GameState,
  userId: string,
  gameId: string,
  players: { userId: string; displayName: string; picture: string }[]
): PlayerView {
  const myHand = state.hands[userId] || [];
  const discardTop = state.discardPile[state.discardPile.length - 1];

  const handCounts: Record<string, number> = {};
  for (const pid of state.turnOrder) {
    if (pid !== userId) {
      handCounts[pid] = (state.hands[pid] || []).length;
    }
  }

  const isMyTurn =
    state.turnOrder[state.currentPlayerIndex] === userId;

  const canPlay = isMyTurn && state.phase === "play";

  let playableCardIds: string[] = [];
  if (canPlay) {
    const playable = getPlayableCards(myHand, discardTop, state.currentColor);
    playableCardIds = playable.map((c) => c.id);
  }

  const canStack =
    state.phase === "stacking" && state.pendingDrawTarget === userId;

  let stackableCardIds: string[] = [];
  if (canStack) {
    const lastDrawType = determineLastDrawType(state.discardPile);
    const stackable = getStackableCards(myHand, lastDrawType);
    stackableCardIds = stackable.map((c) => c.id);
  }

  const mustDraw =
    (canStack && stackableCardIds.length === 0) ||
    (canPlay && playableCardIds.length === 0);

  const unoCallable = isMyTurn && myHand.length === 2 && state.phase === "play";

  const unoCatchable: string[] = [];
  for (const pid of state.turnOrder) {
    if (pid === userId) continue;
    const h = state.hands[pid] || [];
    if (h.length === 1 && !state.unoCallStatus[pid]) {
      unoCatchable.push(pid);
    }
  }

  const turnOrder: PlayerInfo[] = state.turnOrder.map((pid) => {
    const player = players.find((p) => p.userId === pid);
    return {
      userId: pid,
      displayName: player?.displayName || "Unknown",
      picture: player?.picture || "",
      cardCount: (state.hands[pid] || []).length,
      calledUno: !!state.unoCallStatus[pid],
    };
  });

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
    lastAction: actionWithDisplayNames(state.lastAction, players),
    canPlay,
    playableCardIds,
    canStack,
    stackableCardIds,
    mustDraw,
    pendingDrawCount: state.pendingDrawStack,
    unoCallable,
    unoCatchable,
    drawPileCount: state.drawPile.length,
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

  switch (action.type) {
    case "playCards": {
      if (currentPlayerId !== playerId)
        return { valid: false, error: "Not your turn" };
      if (state.phase !== "play")
        return { valid: false, error: "Cannot play cards now" };
      if (action.cardIds.length === 0)
        return { valid: false, error: "No cards selected" };

      const hand = state.hands[playerId];
      for (const id of action.cardIds) {
        if (!hand.find((c) => c.id === id))
          return { valid: false, error: `Card ${id} not in hand` };
      }

      const cards = action.cardIds.map(
        (id) => hand.find((c) => c.id === id)!
      );
      const topDiscard = state.discardPile[state.discardPile.length - 1];

      if (cards.length === 1) {
        if (!isCardPlayable(cards[0], topDiscard, state.currentColor))
          return { valid: false, error: "Card not playable" };
      } else {
        const firstPlayable = isCardPlayable(
          cards[0],
          topDiscard,
          state.currentColor
        );
        if (!firstPlayable)
          return { valid: false, error: "First card must be playable" };

        const types = new Set(cards.map((c) => c.type));
        if (types.size > 1)
          return { valid: false, error: "Multi-play cards must be same type" };

        const type = cards[0].type;
        if (type === "number") {
          const values = new Set(cards.map((c) => c.value));
          if (values.size > 1)
            return {
              valid: false,
              error: "Multi-play number cards must have same value",
            };
        } else if (type !== "skip" && type !== "reverse") {
          return {
            valid: false,
            error: "Can only multi-play numbers, skips, or reverses",
          };
        }
      }

      const needsColor = cards.some(
        (c) => c.type === "wild" || c.type === "wild4"
      );
      if (needsColor && !action.chosenColor)
        return { valid: false, error: "Must choose color for wild card" };

      return { valid: true };
    }

    case "stackCards": {
      if (state.phase !== "stacking")
        return { valid: false, error: "Not in stacking phase" };
      if (state.pendingDrawTarget !== playerId)
        return { valid: false, error: "Not the stack target" };
      if (action.cardIds.length === 0)
        return { valid: false, error: "No cards selected" };

      const hand = state.hands[playerId];
      for (const id of action.cardIds) {
        if (!hand.find((c) => c.id === id))
          return { valid: false, error: `Card ${id} not in hand` };
      }

      const cards = action.cardIds.map(
        (id) => hand.find((c) => c.id === id)!
      );
      const lastDrawType = determineLastDrawType(state.discardPile);

      for (const card of cards) {
        if (lastDrawType === "draw2") {
          if (card.type !== "draw2" && card.type !== "wild4")
            return { valid: false, error: "Can only stack +2 or +4 on +2" };
        } else {
          if (card.type !== "wild4")
            return { valid: false, error: "Can only stack +4 on +4" };
        }
      }

      return { valid: true };
    }

    case "drawCards": {
      if (state.phase === "stacking" && state.pendingDrawTarget === playerId) {
        return { valid: true };
      }
      if (state.phase === "play" && currentPlayerId === playerId) {
        return { valid: true };
      }
      return { valid: false, error: "Cannot draw now" };
    }

    case "chooseColor": {
      if (state.phase !== "chooseColor")
        return { valid: false, error: "Cannot choose color now" };
      if (currentPlayerId !== playerId)
        return { valid: false, error: "Not your turn" };

      const topCard = state.discardPile[state.discardPile.length - 1];
      if (topCard.type !== "wild" && topCard.type !== "wild4")
        return { valid: false, error: "Top card is not wild" };

      return { valid: true };
    }

    case "callUno": {
      const hand = state.hands[playerId];
      if (!hand || hand.length > 2)
        return { valid: false, error: "Can only call UNO with 1-2 cards" };
      return { valid: true };
    }

    case "catchUno": {
      const targetHand = state.hands[action.targetUserId];
      if (!targetHand || targetHand.length !== 1)
        return { valid: false, error: "Target does not have exactly 1 card" };
      if (state.unoCallStatus[action.targetUserId])
        return { valid: false, error: "Target already called UNO" };
      return { valid: true };
    }
  }
}

export function applyAction(
  state: GameState,
  playerId: string,
  action: GameAction
): GameState {
  const validation = validateAction(state, playerId, action);
  if (!validation.valid) throw new Error(validation.error);

  switch (action.type) {
    case "playCards": {
      let newState = state;
      if (state.hands[playerId].length === 2 && action.cardIds.length === 1) {
        if (!state.unoCallStatus[playerId]) {
          // did not call UNO before playing to 1 card - vulnerable to catch
        }
      }
      newState = {
        ...newState,
        unoCallStatus: { ...newState.unoCallStatus, [playerId]: false },
      };
      return applyCards(newState, playerId, action.cardIds, action.chosenColor);
    }

    case "stackCards":
      return applyStack(state, playerId, action.cardIds, action.chosenColor);

    case "drawCards": {
      if (state.phase === "stacking" && state.pendingDrawTarget === playerId) {
        return applyDraw(state, playerId);
      }
      return applyNormalDraw(state, playerId);
    }

    case "chooseColor":
      return applyChosenColor(state, playerId, action.chosenColor);

    case "callUno":
      return {
        ...state,
        unoCallStatus: { ...state.unoCallStatus, [playerId]: true },
      };

    case "catchUno": {
      const { state: newState, drawn } = drawCards(state, 2);
      const targetHand = [
        ...(newState.hands[action.targetUserId] || []),
        ...drawn,
      ];
      return {
        ...newState,
        hands: { ...newState.hands, [action.targetUserId]: targetHand },
        lastAction: `${playerId} caught ${action.targetUserId} not calling UNO!`,
      };
    }
  }
}

export function initializeGame(
  playerIds: string[],
  settings?: { maxPlayers?: number }
): GameState {
  let deck = shuffleDeck(createDeck());

  const hands: Record<string, Card[]> = {};
  for (const pid of playerIds) {
    hands[pid] = deck.slice(0, 7);
    deck = deck.slice(7);
  }

  let firstCard = deck[0];
  deck = deck.slice(1);

  while (firstCard.type !== "number") {
    deck = [...deck, firstCard];
    deck = shuffleDeck(deck);
    firstCard = deck[0];
    deck = deck.slice(1);
  }

  let state: GameState = {
    drawPile: deck,
    discardPile: [firstCard],
    hands,
    currentPlayerIndex: 0,
    direction: 1,
    currentColor: firstCard.color!,
    turnOrder: playerIds,
    phase: "play",
    pendingDrawStack: 0,
    pendingDrawTarget: null,
    finishedPlayers: [],
    winner: null,
    lastAction: null,
    unoCallStatus: {},
  };

  return state;
}

function cardLabel(card: Card): string {
  if (card.type === "wild") return "Wild";
  if (card.type === "wild4") return "+4";
  if (card.type === "draw2") return `${card.color} +2`;
  if (card.type === "skip") return `${card.color} Skip`;
  if (card.type === "reverse") return `${card.color} Reverse`;
  return `${card.color} ${card.value}`;
}

function buildActionDescription(
  playerId: string,
  cards: Card[],
  chosenColor?: CardColor
): string {
  const labels = cards.map(cardLabel).join(", ");
  let desc = `${playerId} played ${labels}`;
  if (chosenColor) desc += ` (chose ${chosenColor})`;
  return desc;
}
