import type { Card, CardColor } from "../../../shared/gameTypes";
import { CARD_GRADIENT_STYLES } from "../../utils/cardUi";
import { UnoCard } from "../cards/UnoCard";

const COLORS: { color: CardColor; label: string; rotate?: string }[] = [
  { color: "red", label: "Red", rotate: "-rotate-1" },
  { color: "yellow", label: "Yellow", rotate: "rotate-2" },
  { color: "green", label: "Green", rotate: "rotate-[1.5deg]" },
  { color: "blue", label: "Blue", rotate: "-rotate-2" },
];

type ColorPickerProps = {
  onChoose: (color: CardColor) => void;
  triggerCard?: Card | null;
};

export function ColorPicker({ onChoose, triggerCard }: ColorPickerProps) {
  const cardLabel =
    triggerCard?.type === "wild4"
      ? "+4"
      : triggerCard?.type === "wildReverseDraw4"
        ? "Reverse +4"
        : triggerCard?.type === "wildDraw6"
          ? "+6"
          : triggerCard?.type === "wildDraw10"
            ? "+10"
            : triggerCard?.type === "wildColorRoulette"
              ? "Color Roulette"
              : "Wild";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 text-center"
        style={{ animation: "bounce-in 0.3s ease-out" }}
      >
        {triggerCard && (
          <div className="flex flex-col items-center mb-4">
            <UnoCard card={triggerCard} size="normal" playable={true} hoverable={false} />
            <p className="text-neutral-400 text-xs mt-2">
              Choose a color for your {cardLabel}
            </p>
          </div>
        )}
        {!triggerCard && (
          <h3 className="text-white font-bold text-lg mb-4">Choose a color</h3>
        )}
        <div className="grid grid-cols-2 gap-3">
          {COLORS.map((entry) => (
            <button
              key={entry.color}
              onClick={() => onChoose(entry.color)}
              className={`w-24 h-24 rounded-xl transition-transform hover:scale-110 hover:${entry.rotate} border-2 border-white/20 flex items-center justify-center cursor-pointer`}
              style={{
                ...CARD_GRADIENT_STYLES[entry.color] || {},
              }}
              aria-label={entry.label}
            >
              <span className="text-white font-bold text-sm drop-shadow-md">
                {entry.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
