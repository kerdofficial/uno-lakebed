export type CardColor = "red" | "yellow" | "green" | "blue";

export type GameMode = "regular" | "noMercy";

export type CardType =
  | "number"
  | "skip"
  | "reverse"
  | "draw2"
  | "draw4"
  | "wild"
  | "wild4"
  | "skipAll"
  | "discardAll"
  | "wildReverseDraw4"
  | "wildDraw6"
  | "wildDraw10"
  | "wildColorRoulette";

export type Card = {
  id: string;
  color: CardColor | null;
  type: CardType;
  value: number | null;
};

export type GamePhase =
  | "play"
  | "stacking"
  | "chooseColor"
  | "chooseSevenSwapTarget"
  | "finished";

export type PublicGameEvent =
  | {
      id: string;
      type: "colorRouletteReveal";
      actorId: string;
      targetId: string;
      chosenColor: CardColor;
      revealedCard: Card | null;
      drawnCount: number;
    };

export type GameState = {
  gameMode: GameMode;
  drawPile: Card[];
  discardPile: Card[];
  hands: Record<string, Card[]>;
  currentPlayerIndex: number;
  direction: 1 | -1;
  currentColor: CardColor;
  turnOrder: string[];
  phase: GamePhase;
  pendingDrawStack: number;
  pendingDrawTarget: string | null;
  finishedPlayers: string[];
  revivableFinishedPlayers: string[];
  eliminatedPlayers: string[];
  placements: string[];
  winner: string | null;
  lastAction: string | null;
  unoCallStatus: Record<string, boolean>;
  pendingDrawDecision: {
    playerId: string;
    cardId: string;
  } | null;
  pendingSevenSwap: {
    playerId: string;
    cardIds: string[];
  } | null;
  publicEvent: PublicGameEvent | null;
};

export type PlayerInfo = {
  userId: string;
  displayName: string;
  picture: string;
  cardCount: number;
  calledUno: boolean;
};

export type ActionTextPart = {
  text: string;
  kind: "text" | "player" | "color" | "card";
  color?: CardColor | null;
};

export type PlayerView = {
  gameId: string;
  gameMode: GameMode;
  myHand: Card[];
  handCounts: Record<string, number>;
  discardTop: Card;
  currentColor: CardColor;
  currentPlayerIndex: number;
  direction: 1 | -1;
  turnOrder: PlayerInfo[];
  phase: GamePhase;
  lastAction: string | null;
  lastActionParts?: ActionTextPart[];
  canPlay: boolean;
  playableCardIds: string[];
  canStack: boolean;
  stackableCardIds: string[];
  selectableCardIds: string[];
  mustDraw: boolean;
  pendingDrawCount: number;
  unoCallable: boolean;
  unoCatchable: string[];
  drawPileCount: number;
  pendingDrawDecisionCard: Card | null;
  pendingSevenSwapTargets: PlayerInfo[];
  publicEvent: PublicGameEvent | null;
  winner: string | null;
  finishedPlayers: string[];
  eliminatedPlayers: string[];
  placements: string[];
};

export type PlayCardsAction = {
  type: "playCards";
  cardIds: string[];
  chosenColor?: CardColor;
  callUno?: boolean;
};

export type StackCardsAction = {
  type: "stackCards";
  cardIds: string[];
  chosenColor?: CardColor;
  callUno?: boolean;
};

export type DrawCardsAction = {
  type: "drawCards";
};

export type ChooseColorAction = {
  type: "chooseColor";
  chosenColor: CardColor;
};

export type CallUnoAction = {
  type: "callUno";
};

export type CatchUnoAction = {
  type: "catchUno";
  targetUserId: string;
};

export type ResolveDrawDecisionAction = {
  type: "resolveDrawDecision";
  decision: "keep" | "play";
  chosenColor?: CardColor;
  callUno?: boolean;
};

export type ChooseSevenSwapTargetAction = {
  type: "chooseSevenSwapTarget";
  targetUserId: string;
};

export type GameAction =
  | PlayCardsAction
  | StackCardsAction
  | DrawCardsAction
  | ChooseColorAction
  | CallUnoAction
  | CatchUnoAction
  | ResolveDrawDecisionAction
  | ChooseSevenSwapTargetAction;

export type GameSettings = {
  maxPlayers: number;
  gameMode: GameMode;
};

export type GameStatus = "lobby" | "playing" | "finished" | "closed";

export type GameInfo = {
  id: string;
  code: string;
  hostId: string;
  status: GameStatus;
  settings: string;
  winnerId: string;
  roundsPlayed: string;
  createdAt: string;
  updatedAt: string;
};

export type PlayerRecord = {
  id: string;
  gameId: string;
  userId: string;
  displayName: string;
  picture: string;
  seatIndex: string;
  wins: string;
  isReady: boolean;
  createdAt: string;
  updatedAt: string;
};
