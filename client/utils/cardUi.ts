import type { Card } from "../../shared/gameTypes";

export const CARD_COLORS: Record<string, string> = {
  red: "bg-red-600",
  yellow: "bg-yellow-400",
  green: "bg-green-600",
  blue: "bg-blue-600",
};

export const CARD_TEXT_COLORS: Record<string, string> = {
  red: "text-red-600",
  yellow: "text-yellow-500",
  green: "text-green-600",
  blue: "text-blue-600",
};

export const CARD_BORDER_COLORS: Record<string, string> = {
  red: "border-red-500",
  yellow: "border-yellow-400",
  green: "border-green-500",
  blue: "border-blue-500",
};

export const CARD_GLOW: Record<string, string> = {
  red: "shadow-red-500/40",
  yellow: "shadow-yellow-400/40",
  green: "shadow-green-500/40",
  blue: "shadow-blue-500/40",
};

export function cardDisplay(card: Card): string {
  if (card.type === "number") return String(card.value);
  if (card.type === "skip") return "\u{20E0}";
  if (card.type === "reverse") return "\u{21C4}";
  if (card.type === "draw2") return "+2";
  if (card.type === "wild") return "W";
  if (card.type === "wild4") return "+4";
  return "?";
}
