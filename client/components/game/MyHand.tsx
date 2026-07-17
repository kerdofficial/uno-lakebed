import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { Card, PlayerView } from "../../../shared/gameTypes";
import { getRemainingHandCountAfterPlay } from "../../../shared/gameLogic/effects";
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

const ANGLE_STEP = 3;
const MAX_DROP = 20;
const LIFT_PAD = 36;
const DROP_PAD = 26;
const SELECT_GAP = 14;

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
  if (first.type === "skip" || first.type === "reverse" || first.type === "skipAll") {
    return card.type === first.type;
  }
  return false;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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
  const length = view.myHand.length;
  const overlapPx = Math.max(8, 30 - length * 2);

  const hasDealt = useRef(false);
  const prevCardIds = useRef<Set<string>>(new Set());
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());

  const isFirstDeal = !hasDealt.current && length > 0;

  useEffect(() => {
    if (length > 0 && !hasDealt.current) {
      hasDealt.current = true;
    }
  }, [length]);

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

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ containerWidth: 0, cardWidth: 64 });

  const measure = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth ?? 0;
    const cardWidth = cardRef.current?.offsetWidth || 64;
    setDims((prev) =>
      prev.containerWidth === containerWidth && prev.cardWidth === cardWidth
        ? prev
        : { containerWidth, cardWidth },
    );
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [length, measure]);

  useEffect(() => {
    const handler = () => measure();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [measure]);

  const spacing = Math.max(20, dims.cardWidth - overlapPx);
  const fanWidth = length > 0 ? dims.cardWidth + (length - 1) * spacing : 0;
  const needsSliding =
    dims.containerWidth > 0 && fanWidth > dims.containerWidth - 12;

  const centerC = (length - 1) / 2;
  const [center, setCenter] = useState(centerC);

  useEffect(() => {
    setCenter((length - 1) / 2);
  }, [length]);

  const activeC = needsSliding ? clamp(center, 0, length - 1) : centerC;
  const slideX = spacing * (centerC - activeC);

  const drag = useRef<{
    startX: number;
    startC: number;
    lastX: number;
    vc: number;
    pointerId: number;
    captured: boolean;
  } | null>(null);
  const didDrag = useRef(false);
  const animFrame = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (!needsSliding) return;
      cancelAnimationFrame(animFrame.current);
      didDrag.current = false;
      drag.current = {
        startX: e.clientX,
        startC: clamp(center, 0, length - 1),
        lastX: e.clientX,
        vc: 0,
        pointerId: e.pointerId,
        captured: false,
      };
      setIsDragging(true);
    },
    [needsSliding, center, length],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!drag.current) return;
      const dxTotal = e.clientX - drag.current.startX;
      if (Math.abs(dxTotal) > 6) {
        didDrag.current = true;
        if (!drag.current.captured) {
          (e.currentTarget as HTMLElement).setPointerCapture?.(drag.current.pointerId);
          drag.current.captured = true;
        }
      }
      const dxStep = e.clientX - drag.current.lastX;
      drag.current.lastX = e.clientX;
      drag.current.vc = -dxStep / spacing;
      setCenter(clamp(drag.current.startC - dxTotal / spacing, 0, length - 1));
    },
    [spacing, length],
  );

  const endDrag = useCallback(() => {
    if (!drag.current) return;
    let vc = drag.current.vc;
    drag.current = null;
    setIsDragging(false);

    const step = () => {
      vc *= 0.92;
      if (Math.abs(vc) < 0.003) return;
      setCenter((prev) => clamp(prev + vc, 0, length - 1));
      animFrame.current = requestAnimationFrame(step);
    };
    if (Math.abs(vc) > 0.01) {
      animFrame.current = requestAnimationFrame(step);
    }
  }, [length]);

  useEffect(() => {
    return () => cancelAnimationFrame(animFrame.current);
  }, []);

  const showUnoToggle =
    selectedCards.size > 0 &&
    getRemainingHandCountAfterPlay(view.myHand, Array.from(selectedCards), view.gameMode) === 1;

  const transformTransition = isDragging
    ? "none"
    : "transform 0.3s ease-out";
  const marginTransition = isDragging ? "none" : "margin-left 0.3s ease-out";

  return (
    <div className="relative flex flex-col items-center gap-2 pb-4">
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
        ref={containerRef}
        className="w-full overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          paddingTop: `${LIFT_PAD}px`,
          paddingBottom: `${DROP_PAD}px`,
          touchAction: needsSliding ? "pan-y" : "auto",
          cursor: needsSliding ? (isDragging ? "grabbing" : "grab") : "default",
        }}
      >
        <div
          className="flex justify-center items-end w-fit mx-auto"
          style={{
            transform: `translateX(${slideX}px)`,
            transition: isDragging ? "none" : "transform 0.25s ease-out",
            willChange: "transform",
          }}
        >
          {view.myHand.map((card, index) => {
            const isPlayable = canToggleCard(view, selectedCards, card);
            const isSelected = selectedCards.has(card.id);
            const leftNeighborSelected = index > 0 && selectedCards.has(view.myHand[index - 1].id);
            const marginLeft =
              index === 0
                ? 0
                : -overlapPx + (isSelected ? SELECT_GAP : 0) + (leftNeighborSelected ? SELECT_GAP : 0);

            const rel = index - activeC;
            const angle = clamp(rel, -6, 6) * ANGLE_STEP;
            const offsetY = Math.min(MAX_DROP, rel * rel * 1.2);

            let animationStyle: string | undefined;
            if (isFirstDeal) {
              animationStyle = `card-deal 0.4s ease-out ${index * 80}ms both`;
            } else if (newCardIds.has(card.id)) {
              animationStyle = "card-enter-hand 0.3s ease-out";
            }

            return (
              <div
                key={card.id}
                ref={index === 0 ? cardRef : undefined}
                className="flex-shrink-0"
                style={{
                  marginLeft: `${marginLeft}px`,
                  zIndex: isSelected || colorPickerVisible ? 50 : index,
                  animation: animationStyle,
                  transition: marginTransition,
                }}
              >
                <div
                  style={{
                    transform: `rotate(${angle}deg) translateY(${offsetY}px)`,
                    transformOrigin: "bottom center",
                    transition: transformTransition,
                  }}
                >
                  <UnoCard
                    card={card}
                    playable={isPlayable}
                    colorPickerVisible={colorPickerVisible}
                    selected={isSelected}
                    onClick={() => {
                      if (didDrag.current) return;
                      if (isPlayable) onToggleCard(card.id);
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {needsSliding && length > 1 && (
        <div className="relative h-1 w-12 rounded-full bg-white/15">
          <div
            className="absolute top-0 h-1 w-4 rounded-full bg-white/70"
            style={{
              left: `${clamp(activeC / (length - 1), 0, 1) * (48 - 16)}px`,
              transition: isDragging ? "none" : "left 0.2s ease-out",
            }}
          />
        </div>
      )}
      {length > 0 && (
        <div className="pointer-events-none absolute bottom-1 right-2 z-40 flex h-8 w-8 select-none items-center justify-center rounded-full bg-neutral-800/80 text-sm font-bold text-white">
          {length}
        </div>
      )}
    </div>
  );
}
