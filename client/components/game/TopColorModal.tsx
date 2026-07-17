import type { CardColor } from "../../../shared/gameTypes";
import { CARD_GRADIENT_STYLES } from "../../utils/cardUi";

const COLOR_LABELS: Record<CardColor, string> = {
  red: "Red",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
};

type TopColorModalProps = {
  colors: CardColor[];
  onChoose: (color: CardColor) => void;
  onCancel: () => void;
};

export function TopColorModal({ colors, onChoose, onCancel }: TopColorModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 text-center max-w-xs w-full mx-4"
        style={{ animation: "bounce-in 0.3s ease-out" }}
      >
        <h3 className="text-white font-bold text-lg mb-1">Top color</h3>
        <p className="text-neutral-400 text-xs mb-4">
          The last card played sets the color
        </p>
        <div className="grid grid-cols-2 gap-3">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => onChoose(color)}
              className="h-16 rounded-xl border-2 border-white/20 flex items-center justify-center transition-transform hover:scale-105 active:scale-[0.98] cursor-pointer"
              style={CARD_GRADIENT_STYLES[color]}
              aria-label={COLOR_LABELS[color]}
            >
              <span className="text-white font-bold text-sm drop-shadow-md">
                {COLOR_LABELS[color]}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="mt-4 w-full rounded-full bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20 active:scale-[0.98] cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
