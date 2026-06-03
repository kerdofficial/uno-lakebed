import type { CardColor } from "../../../shared/gameTypes";

const COLORS: { color: CardColor; bg: string; label: string }[] = [
  { color: "red", bg: "bg-red-600 hover:bg-red-500", label: "Red" },
  { color: "yellow", bg: "bg-yellow-400 hover:bg-yellow-300", label: "Yellow" },
  { color: "green", bg: "bg-green-600 hover:bg-green-500", label: "Green" },
  { color: "blue", bg: "bg-blue-600 hover:bg-blue-500", label: "Blue" },
];

export function ColorPicker({ onChoose }: { onChoose: (color: CardColor) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 text-center">
        <h3 className="text-white font-bold text-lg mb-4">Choose a color</h3>
        <div className="grid grid-cols-2 gap-3">
          {COLORS.map((entry) => (
            <button
              key={entry.color}
              onClick={() => onChoose(entry.color)}
              className={`${entry.bg} w-20 h-20 rounded-xl transition-transform hover:scale-110 border-2 border-white/20`}
              aria-label={entry.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
