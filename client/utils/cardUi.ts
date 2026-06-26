import type { Card } from "../../shared/gameTypes";

export const CARD_COLORS: Record<string, string> = {
  red: "bg-red-600",
  yellow: "bg-yellow-400",
  green: "bg-green-600",
  blue: "bg-blue-600",
};

export const CARD_TEXT_COLORS: Record<string, string> = {
  red: "text-red-700",
  yellow: "text-yellow-600",
  green: "text-green-700",
  blue: "text-blue-700",
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

export const CARD_GRADIENT_STYLES: Record<string, Record<string, string>> = {
  red: { background: "linear-gradient(135deg, #dc2626, #991b1b)" },
  yellow: { background: "linear-gradient(135deg, #eab308, #ca8a04)" },
  green: { background: "linear-gradient(135deg, #16a34a, #15803d)" },
  blue: { background: "linear-gradient(135deg, #2563eb, #1e40af)" },
};

export const CARD_GLOW_COLORS: Record<string, string> = {
  red: "rgba(239, 68, 68, 0.4)",
  yellow: "rgba(234, 179, 8, 0.4)",
  green: "rgba(22, 163, 74, 0.4)",
  blue: "rgba(37, 99, 235, 0.4)",
};

export const CARD_GLOW_SHADOW: Record<string, string> = {
  red: "0 0 16px rgba(239, 68, 68, 0.5)",
  yellow: "0 0 16px rgba(234, 179, 8, 0.5)",
  green: "0 0 16px rgba(22, 163, 74, 0.5)",
  blue: "0 0 16px rgba(37, 99, 235, 0.5)",
};

export const WILD_GRADIENT = "conic-gradient(from 45deg, #dc2626 0deg 90deg, #2563eb 90deg 180deg, #16a34a 180deg 270deg, #facc15 270deg 360deg)";

export function cardDisplay(card: Card): string {
  if (card.type === "number") return String(card.value);
  if (card.type === "skip") return "\u{20E0}";
  if (card.type === "reverse") return "\u{21C4}";
  if (card.type === "draw2") return "+2";
  if (card.type === "draw4") return "+4";
  if (card.type === "wild") return "W";
  if (card.type === "wild4") return "+4";
  if (card.type === "skipAll") return "ALL";
  if (card.type === "discardAll") return "DROP";
  if (card.type === "wildReverseDraw4") return "REV +4";
  if (card.type === "wildDraw6") return "+6";
  if (card.type === "wildDraw10") return "+10";
  if (card.type === "wildColorRoulette") return "CLR";
  return "?";
}

export function cardDisplayLabel(card: Card): string {
  if (card.type === "number") return String(card.value);
  if (card.type === "skip") return "SKIP";
  if (card.type === "reverse") return "REV";
  if (card.type === "draw2") return "+2";
  if (card.type === "draw4") return "+4";
  if (card.type === "wild") return "W";
  if (card.type === "wild4") return "+4";
  if (card.type === "skipAll") return "ALL";
  if (card.type === "discardAll") return "DROP";
  if (card.type === "wildReverseDraw4") return "REV +4";
  if (card.type === "wildDraw6") return "+6";
  if (card.type === "wildDraw10") return "+10";
  if (card.type === "wildColorRoulette") return "CLR";
  return "?";
}

export type CardSize = "small" | "normal" | "large";

export const CARD_SIZES: Record<CardSize, { container: string; centerText: string; cornerText: string }> = {
  small: {
    container: "w-[36px] h-[54px]",
    centerText: "text-xs",
    cornerText: "text-[6px]",
  },
  normal: {
    container: "w-[64px] h-[96px] md:w-[80px] md:h-[120px]",
    centerText: "text-xl md:text-2xl",
    cornerText: "text-[8px] md:text-[10px]",
  },
  large: {
    container: "w-[76px] h-[114px] md:w-[96px] md:h-[144px]",
    centerText: "text-2xl md:text-3xl",
    cornerText: "text-[9px] md:text-[11px]",
  },
};
