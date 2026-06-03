export type CardColor = "red" | "yellow" | "green" | "blue";

export type CardType =
  | "number"
  | "skip"
  | "reverse"
  | "draw2"
  | "wild"
  | "wild4";

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
  | "finished";

export type GameState = {
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
  winner: string | null;
  lastAction: string | null;
  unoCallStatus: Record<string, boolean>;
};

export type PlayerInfo = {
  userId: string;
  displayName: string;
  picture: string;
  cardCount: number;
  calledUno: boolean;
};

export type PlayerView = {
  gameId: string;
  myHand: Card[];
  handCounts: Record<string, number>;
  discardTop: Card;
  currentColor: CardColor;
  currentPlayerIndex: number;
  direction: 1 | -1;
  turnOrder: PlayerInfo[];
  phase: GamePhase;
  lastAction: string | null;
  canPlay: boolean;
  playableCardIds: string[];
  canStack: boolean;
  stackableCardIds: string[];
  mustDraw: boolean;
  pendingDrawCount: number;
  unoCallable: boolean;
  unoCatchable: string[];
  drawPileCount: number;
  winner: string | null;
  finishedPlayers: string[];
};

export type PlayCardsAction = {
  type: "playCards";
  cardIds: string[];
  chosenColor?: CardColor;
};

export type StackCardsAction = {
  type: "stackCards";
  cardIds: string[];
  chosenColor?: CardColor;
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

export type GameAction =
  | PlayCardsAction
  | StackCardsAction
  | DrawCardsAction
  | ChooseColorAction
  | CallUnoAction
  | CatchUnoAction;

export type GameSettings = {
  maxPlayers: number;
};

export type GameStatus = "lobby" | "playing" | "finished";

export type GameInfo = {
  id: string;
  code: string;
  hostId: string;
  status: GameStatus;
  winnerId: string;
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
  isReady: boolean;
  createdAt: string;
  updatedAt: string;
};
