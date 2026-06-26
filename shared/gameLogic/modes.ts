import type { CardType, GameMode } from "../gameTypes";

export type StackRule = "regular" | "equalOrHigher";

export type GameModeConfig = {
  gameMode: GameMode;
  stackRule: StackRule;
  mercyLimit: number | null;
  sevenSwap: boolean;
  zeroPass: boolean;
  discardAll: boolean;
  skipAll: boolean;
  colorRoulette: boolean;
  drawTypes: CardType[];
};

export const GAME_MODES: Record<GameMode, GameModeConfig> = {
  regular: {
    gameMode: "regular",
    stackRule: "regular",
    mercyLimit: null,
    sevenSwap: false,
    zeroPass: false,
    discardAll: false,
    skipAll: false,
    colorRoulette: false,
    drawTypes: ["draw2", "wild4"],
  },
  noMercy: {
    gameMode: "noMercy",
    stackRule: "equalOrHigher",
    mercyLimit: 30,
    sevenSwap: true,
    zeroPass: true,
    discardAll: true,
    skipAll: true,
    colorRoulette: true,
    drawTypes: ["draw2", "draw4", "wild4", "wildReverseDraw4", "wildDraw6", "wildDraw10"],
  },
};

export function getGameModeConfig(gameMode: GameMode): GameModeConfig {
  return GAME_MODES[gameMode] || GAME_MODES.regular;
}
