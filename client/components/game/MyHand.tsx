import { useEffect, useRef, useState } from "preact/hooks";
import type { Card, PlayerView } from "../../../shared/gameTypes";
import { UnoCard } from "../cards/UnoCard";

type MyHandProps = {
  view: PlayerView;
  selectedCards: Set<string>;
  unoArmed: boolean;
  onToggleCard: (id: string) => void;
  onToggleUnoArmed: () => void;
  onPlaySelected: () => void;
  onClearSelection: () => void;
  colorPickerVisible: boolean;
};

function canToggleCard(view: PlayerView, selectedCards: Set<string>, card: Card) {
  if (selectedCards.has(card.id)) return true;

  const playableSet = new Set([...view.playableCardIds, ...view.stackableCardIds]);
  const selectedHandCards = Array.from(selectedCards)
    .map((id) => view.myHand.find((handCard) => handCard.id === id))
    .filter(Boolean) as Card[];

  if (selectedHandCards.length === 0) return playableSet.has(card.id);
  if (view.canStack) return playableSet.has(card.id);

  const first = selectedHandCards[0];
  if (first.type === "number" && card.type === "number") {
    return first.value === card.value;
  }
  if (first.type === "skip" || first.type === "reverse") {
    return card.type === first.type;
  }
  return false;
}

export function MyHand({
  view,
  selectedCards,
  unoArmed,
  onToggleCard,
  onToggleUnoArmed,
  onPlaySelected,
  onClearSelection,
  colorPickerVisible,
}: MyHandProps) {
  const overlapPx = Math.max(16, 42 - view.myHand.length * 2);
  const hasDealt = useRef(false);
  const prevCardIds = useRef<Set<string>>(new Set());
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());

  const isFirstDeal = !hasDealt.current && view.myHand.length > 0;

  useEffect(() => {
    if (view.myHand.length > 0 && !hasDealt.current) {
      hasDealt.current = true;
    }
  }, [view.myHand.length]);

  useEffect(() => {
    if (!hasDealt.current) {
      prevCardIds.current = new Set(view.myHand.map((c) => c.id));
      return;
    }

    const currentIds = new Set(view.myHand.map((c) => c.id));
    const entering = new Set<string>();
    for (const id of currentIds) {
      if (!prevCardIds.current.has(id)) {
        entering.add(id);
      }
    }

    prevCardIds.current = currentIds;

    if (entering.size > 0) {
      setNewCardIds(entering);
      const timeout = setTimeout(() => setNewCardIds(new Set()), 300);
      return () => clearTimeout(timeout);
    }
  }, [view.myHand]);

  const length = view.myHand.length;
  const showUnoToggle =
    selectedCards.size > 0 && view.myHand.length - selectedCards.size === 1;

  return (
    <div className="flex flex-col items-center gap-2 pb-4">
      {selectedCards.size > 0 && (
        <div className="flex items-center gap-2 mb-2" style={{ animation: "bounce-in 0.3s ease-out" }}>
          {showUnoToggle && (
            <button
              onClick={onToggleUnoArmed}
              className={`font-black text-sm px-4 py-2 rounded-full shadow-lg transition-colors cursor-pointer ${
                unoArmed
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {unoArmed ? "UNO armed" : "Call UNO"}
            </button>
          )}
          <button
            onClick={onPlaySelected}
            className="bg-red-600 text-white font-bold text-sm px-5 py-2 rounded-full shadow-lg hover:bg-red-700 transition-colors cursor-pointer"
          >
            Play {selectedCards.size} card{selectedCards.size > 1 ? "s" : ""}
          </button>
          <button
            onClick={onClearSelection}
            className="bg-neutral-700 text-white rounded-full w-7 h-7 text-xs flex items-center justify-center hover:bg-neutral-600 transition-colors cursor-pointer"
          >
            X
          </button>
        </div>
      )}
      <div
        className="flex justify-center items-end overflow-x-visible max-w-full px-2 py-4"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {view.myHand.map((card, index) => {
          const isPlayable = canToggleCard(view, selectedCards, card);
          const isSelected = selectedCards.has(card.id);
          const marginLeft = index === 0 ? 0 : -overlapPx;

          const angle = (index - (length - 1) / 2) * 2.5;
          const offsetY = Math.abs(index - (length - 1) / 2) * 3;

          let animationStyle: string | undefined;
          if (isFirstDeal) {
            animationStyle = `card-deal 0.4s ease-out ${index * 80}ms both`;
          } else if (newCardIds.has(card.id)) {
            animationStyle = "card-enter-hand 0.3s ease-out";
          }

          return (
            <div
              key={card.id}
              style={{
                marginLeft: `${marginLeft}px`,
                zIndex: isSelected || colorPickerVisible ? 50 : index,
                scrollSnapAlign: "center",
                animation: animationStyle,
              }}
            >
              <div
                style={{
                  transform: `rotate(${angle}deg) translateY(${offsetY}px)`,
                  transformOrigin: "bottom center",
                  transition: "transform 0.4s ease-out",
                }}
              >
                <UnoCard
                  card={card}
                  playable={isPlayable}
                  colorPickerVisible={colorPickerVisible}
                  selected={isSelected}
                  onClick={() => isPlayable && onToggleCard(card.id)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
