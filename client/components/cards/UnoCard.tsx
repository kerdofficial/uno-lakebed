import type { Card } from "../../../shared/gameTypes";
import {
  CARD_BORDER_COLORS,
  CARD_COLORS,
  CARD_GLOW,
  CARD_TEXT_COLORS,
  cardDisplay,
} from "../../utils/cardUi";

type UnoCardProps = {
  card: Card;
  playable?: boolean;
  selected?: boolean;
  faceDown?: boolean;
  small?: boolean;
  onClick?: () => void;
};

export function UnoCard({
  card,
  playable = false,
  selected = false,
  faceDown = false,
  small = false,
  onClick,
}: UnoCardProps) {
  const size = small
    ? "w-[40px] h-[60px] text-sm"
    : "w-[56px] h-[84px] md:w-[72px] md:h-[108px] text-lg md:text-xl";
  const cornerSize = small ? "text-[7px]" : "text-[9px] md:text-[11px]";

  if (faceDown) {
    return (
      <div
        className={`${size} relative flex-shrink-0 rounded-lg border-2 border-neutral-600 bg-neutral-800 flex items-center justify-center cursor-default`}
      >
        <div className="w-[60%] h-[60%] rounded-full bg-red-700 flex items-center justify-center">
          <span className="text-white font-black text-[10px] md:text-xs">
            UNO
          </span>
        </div>
      </div>
    );
  }

  const isWild = card.type === "wild" || card.type === "wild4";
  const bgColor = isWild ? "bg-neutral-900" : CARD_COLORS[card.color!] || "bg-neutral-700";
  const borderColor = playable
    ? "border-white ring-2 ring-white/50"
    : selected
      ? "border-yellow-300 ring-2 ring-yellow-300/50"
      : isWild
        ? "border-neutral-500"
        : CARD_BORDER_COLORS[card.color!] || "border-neutral-600";
  const textColor = isWild ? "text-white" : CARD_TEXT_COLORS[card.color!] || "text-white";
  const display = cardDisplay(card);
  const glowClass = selected
    ? "shadow-lg shadow-yellow-300/40"
    : playable
      ? `shadow-lg ${CARD_GLOW[card.color!] || "shadow-white/30"}`
      : "brightness-50";
  const transform = selected ? "-translate-y-3" : playable ? "hover:-translate-y-2" : "";

  return (
    <div
      onClick={onClick}
      className={`${size} relative flex-shrink-0 rounded-lg border-2 ${borderColor} ${bgColor} flex items-center justify-center cursor-pointer transition-all duration-150 ${glowClass} ${transform} select-none`}
    >
      {isWild ? (
        <div className="absolute inset-[3px] md:inset-1 rounded-md overflow-hidden grid grid-cols-2 grid-rows-2">
          <div className="bg-red-600" />
          <div className="bg-blue-600" />
          <div className="bg-yellow-400" />
          <div className="bg-green-600" />
        </div>
      ) : (
        <div className="absolute inset-[4px] md:inset-[6px] rounded-[40%] bg-white/90 rotate-[15deg]" />
      )}
      <span
        className={`relative z-10 font-extrabold ${small ? "text-xs" : "text-lg md:text-2xl"} ${isWild ? "text-white" : textColor} drop-shadow-sm`}
      >
        {display}
      </span>
      <span
        className={`absolute top-0.5 left-1 ${cornerSize} font-bold text-white drop-shadow-md z-10`}
      >
        {display}
      </span>
      <span
        className={`absolute bottom-0.5 right-1 ${cornerSize} font-bold text-white drop-shadow-md z-10 rotate-180`}
      >
        {display}
      </span>
    </div>
  );
}
