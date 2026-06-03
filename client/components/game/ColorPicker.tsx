import type { Card, CardColor } from "../../../shared/gameTypes";
import { CARD_GRADIENT_STYLES } from "../../utils/cardUi";
import { UnoCard } from "../cards/UnoCard";

const COLORS: { color: CardColor; label: string }[] = [
  { color: "red", label: "Red" },
  { color: "yellow", label: "Yellow" },
  { color: "green", label: "Green" },
  { color: "blue", label: "Blue" },
];

type ColorPickerProps = {
  onChoose: (color: CardColor) => void;
  triggerCard?: Card | null;
};

export function ColorPicker({ onChoose, triggerCard }: ColorPickerProps) {
  const cardLabel = triggerCard?.type === "wild4" ? "+4" : "Wild";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 text-center"
        style={{ animation: "bounce-in 0.3s ease-out" }}
      >
        {triggerCard && (
          <div className="flex flex-col items-center mb-4">
            <UnoCard card={triggerCard} size="normal" />
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
              className="w-24 h-24 rounded-xl transition-transform hover:scale-110 border-2 border-white/20 flex items-center justify-center"
              style={CARD_GRADIENT_STYLES[entry.color] || {}}
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
