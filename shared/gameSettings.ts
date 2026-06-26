import type { GameMode, GameSettings } from "./gameTypes";

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  regular: "Regular UNO",
  noMercy: "Show 'Em No Mercy",
};

export function isGameMode(value: unknown): value is GameMode {
  return value === "regular" || value === "noMercy";
}

export function parseGameSettings(input: unknown): GameSettings {
  let parsed = input;

  if (typeof input === "string") {
    try {
      parsed = input ? JSON.parse(input) : {};
    } catch {
      parsed = {};
    }
  }

  const record =
    parsed && typeof parsed === "object"
      ? (parsed as Partial<GameSettings>)
      : {};

  return {
    maxPlayers: record.maxPlayers === 4 ? 4 : 4,
    gameMode: isGameMode(record.gameMode) ? record.gameMode : "regular",
  };
}

export function serializeGameSettings(settings: Partial<GameSettings>): string {
  return JSON.stringify(parseGameSettings(settings));
}
