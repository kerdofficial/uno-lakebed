import type { Card } from "../../../shared/gameTypes";
import {
  CARD_BORDER_COLORS,
  CARD_GRADIENT_STYLES,
  CARD_GLOW,
  CARD_GLOW_COLORS,
  CARD_SIZES,
  CARD_TEXT_COLORS,
  WILD_GRADIENT,
  cardDisplay,
  type CardSize,
} from "../../utils/cardUi";

type UnoCardProps = {
  card: Card;
  playable?: boolean;
  selected?: boolean;
  faceDown?: boolean;
  size?: CardSize;
  onClick?: () => void;
  animationStyle?: Record<string, string>;
  hoverable?: boolean;
  colorPickerVisible?: boolean;
};

export function UnoCard({
  card,
  playable = false,
  hoverable = true,
  selected = false,
  faceDown = false,
  size = "normal",
  onClick,
  animationStyle,
  colorPickerVisible = false,
}: UnoCardProps) {
  const sizeConfig = CARD_SIZES[size];

  if (faceDown) {
    return (
      <div
        className={`${sizeConfig.container} relative flex-shrink-0 rounded-lg overflow-hidden cursor-default select-none`}
        style={{
          background: "linear-gradient(135deg, #1a1a1a, #0d0d0d)",
          border: "2px solid #333",
          ...animationStyle,
        }}
      >
        <div className="absolute inset-[3px] rounded-md border border-yellow-600/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex items-center justify-center"
            style={{
              width: "60%",
              height: "50%",
              borderRadius: "50%/40%",
              background: "linear-gradient(135deg, #dc2626, #991b1b)",
            }}
          >
            <span className={`text-white font-black italic ${size === "small" ? "text-[7px]" : "text-[10px] md:text-xs"}`}>
              UNO
            </span>
          </div>
        </div>
      </div>
    );
  }

  const isWild = card.type === "wild" || card.type === "wild4";
  const display = cardDisplay(card);
  const textColor = isWild ? "text-white" : CARD_TEXT_COLORS[card.color!] || "text-white";

  const borderClass = selected
    ? "border-yellow-300 ring-2 ring-yellow-300/60"
    : playable
      ? "border-white/80 ring-1 ring-white/40"
      : isWild
        ? "border-neutral-500"
        : CARD_BORDER_COLORS[card.color!] || "border-neutral-600";

  const glowStyle: Record<string, string> = {};
  if (selected && card.color) {
    glowStyle.boxShadow = `0 4px 20px ${CARD_GLOW_COLORS[card.color] || "rgba(255,255,255,0.3)"}`;
  } else if (selected) {
    glowStyle.boxShadow = "0 4px 20px rgba(253, 224, 71, 0.4)";
  } else if (playable && card.color) {
    glowStyle["--glow-color"] = CARD_GLOW_COLORS[card.color] || "rgba(255,255,255,0.3)";
    glowStyle.animation = "glow-pulse 2s ease-in-out infinite";
  } else if (playable) {
    glowStyle["--glow-color"] = "rgba(255,255,255,0.3)";
    glowStyle.animation = "glow-pulse 2s ease-in-out infinite";
  }

  const transform = selected
    ? "-translate-y-5"
    : playable && hoverable
      ? "hover:-translate-y-3"
      : "";

  const dimClass = colorPickerVisible 
    ? "brightness-[0.65]" 
    : !playable && !selected 
      ? "brightness-[0.35] saturate-50" 
      : "";

  const bgStyle: Record<string, string> = isWild
    ? { background: WILD_GRADIENT }
    : CARD_GRADIENT_STYLES[card.color!] || {};

  return (
    <div
      onClick={onClick}
      className={`${sizeConfig.container} relative flex-shrink-0 rounded-lg border-2 ${borderClass} flex items-center justify-center cursor-pointer transition-all duration-200 ${transform} ${dimClass} select-none overflow-hidden`}
      style={{ ...bgStyle, ...glowStyle, ...animationStyle }}
    >
      {isWild ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex items-center justify-center bg-white rounded-full shadow-md aspect-square!"
            style={{
              width: size === "small" ? "18px" : undefined,
              height: size === "small" ? "18px" : "40%",
            }}
          >
            <span className={`font-black ${sizeConfig.centerText} ${card.type === "wild4" ? "text-neutral-900" : "text-neutral-800"}`}>
              {display}
            </span>
          </div>
        </div>
      ) : (
        <>
          <div
            className="absolute bg-white/90"
            style={{
              inset: size === "small" ? "3px" : "10px",
              borderRadius: "50%/40%",
              transform: "rotate(20deg)",
            }}
          />
          <span className={`relative z-10 font-black ${sizeConfig.centerText} ${textColor} drop-shadow-sm`}>
            {display}
          </span>
        </>
      )}

      <span className={`absolute top-0.5 left-1 ${sizeConfig.cornerText} font-bold text-white drop-shadow-md z-10`}>
        {display}
      </span>
      <span className={`absolute bottom-0.5 right-1 ${sizeConfig.cornerText} font-bold text-white drop-shadow-md z-10 rotate-180`}>
        {display}
      </span>

      {isWild && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            boxShadow: "inset 0 0 12px rgba(255,255,255,0.15)",
          }}
        />
      )}
    </div>
  );
}
