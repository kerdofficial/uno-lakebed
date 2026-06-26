import type { Card } from "../../../shared/gameTypes";

const FONT = "ui-sans-serif, system-ui, sans-serif";

const CARD_FILL = "#e5e7eb";
const CARD_STROKE = "#374151";
const BADGE_FILL = "#111827";

function DrawFanArt({ angles, label }: { angles: number[]; label: string }) {
  const badgeW = label.length > 2 ? 32 : 24;
  return (
    <svg viewBox="0 0 64 68" width="100%" height="100%" fill="none">
      {angles.map((a, i) => (
        <g key={i} transform={`rotate(${a} 32 60)`}>
          <rect x="24" y="22" width="16" height="36" rx="3" fill={CARD_FILL} stroke={CARD_STROKE} stroke-width="1.5" />
          <rect x="27" y="26" width="6" height="28" rx="2" fill="#ffffff" opacity="0.5" />
        </g>
      ))}
      <rect x={32 - badgeW / 2} y="42" width={badgeW} height="20" rx="6" fill={BADGE_FILL} stroke="#ffffff" stroke-width="1.5" />
      <text x="32" y="52" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="900" fill="#ffffff" font-family={FONT}>
        {label}
      </text>
    </svg>
  );
}

function ReverseDraw4Art() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
      <g opacity="0.5">
        <rect x="26.5" y="18" width="11" height="16" rx="2.5" fill={CARD_FILL} stroke={CARD_STROKE} stroke-width="1.5" transform="rotate(-12 32 26)" />
        <rect x="26.5" y="18" width="11" height="16" rx="2.5" fill={CARD_FILL} stroke={CARD_STROKE} stroke-width="1.5" transform="rotate(12 32 26)" />
      </g>
      <path d="M44.1 33 A14 14 0 0 1 19.9 33" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
      <polygon points="16.9,27.8 23.8,30.8 16,35.3" fill="#ffffff" />
      <path d="M19.9 19 A14 14 0 0 1 44.1 19" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
      <polygon points="47.1,24.2 40.2,21.3 48,16.7" fill="#ffffff" />
      <rect x="18" y="44" width="28" height="16" rx="6" fill={BADGE_FILL} stroke="#ffffff" stroke-width="1.5" />
      <text x="32" y="52.5" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#ffffff" font-family={FONT}>
        +4
      </text>
    </svg>
  );
}

function Mask({ x, y, s, r }: { x: number; y: number; s: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}>
      <path
        d="M0 -13 C8 -13 12 -5 12 3 C12 12 7 17 0 17 C-7 17 -12 12 -12 3 C-12 -5 -8 -13 0 -13 Z"
        fill="#d4d4d8"
        stroke="#52525b"
        strokeWidth="1.2"
      />
      <path d="M-9 -5 L-3 -3" stroke="#3f3f46" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 -5 L3 -3" stroke="#3f3f46" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="-5" cy="0" r="1.8" fill="#3f3f46" />
      <circle cx="5" cy="0" r="1.8" fill="#3f3f46" />
      <path d="M-5 11 Q0 6 5 11" stroke="#3f3f46" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </g>
  );
}

function ColorRouletteArt() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
      <g opacity="0.5" strokeWidth="3" strokeLinecap="round">
        <path d="M56 32 A24 24 0 0 1 32 56" stroke="#dc2626" />
        <path d="M32 56 A24 24 0 0 1 8 32" stroke="#2563eb" />
        <path d="M8 32 A24 24 0 0 1 32 8" stroke="#16a34a" />
        <path d="M32 8 A24 24 0 0 1 56 32" stroke="#facc15" />
      </g>
      <Mask x={20} y={26} s={0.78} r={-8} />
      <Mask x={44} y={26} s={0.78} r={8} />
      <Mask x={32} y={32} s={1} r={0} />
    </svg>
  );
}

function SkipEveryoneArt() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
      <path d="M41 16.4 A18 18 0 1 1 25.8 15.1" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
      <polygon points="32.4,12.7 27.5,19.8 24.1,10.4" fill="#ffffff" />
      <circle cx="32" cy="32" r="4" fill="#ffffff" opacity="0.85" />
    </svg>
  );
}

function DiscardAllArt() {
  const WHITE = "#ffffff";
  const STROKE = "rgba(0,0,0,0.3)";
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
      <g>
        <rect x="25" y="4" width="14" height="20" rx="3" fill={WHITE} stroke={STROKE} strokeWidth="1.5" transform="rotate(-16 32 16)" />
        <rect x="25" y="4" width="14" height="20" rx="3" fill={WHITE} stroke={STROKE} strokeWidth="1.5" transform="rotate(16 32 16)" />
        <rect x="25" y="4" width="14" height="20" rx="3" fill={WHITE} stroke={STROKE} strokeWidth="1.5" />
      </g>
      <path d="M32 28 L32 40" stroke={WHITE} strokeWidth="4" strokeLinecap="round" />
      <polygon points="32,44 26,36 38,36" fill={WHITE} />
      <g>
        <rect x="16" y="50" width="32" height="8" rx="2.5" fill={WHITE} stroke={STROKE} strokeWidth="1.5" />
        <rect x="18" y="46" width="28" height="7" rx="2.5" fill={WHITE} stroke={STROKE} strokeWidth="1.5" />
      </g>
    </svg>
  );
}

export function NoMercyCardArt({ card }: { card: Card }) {
  switch (card.type) {
    case "wildDraw6":
      return <DrawFanArt angles={[-38, -19, 0, 19, 38]} label="+6" />;
    case "wildDraw10":
      return <DrawFanArt angles={[-42, -25, -8, 8, 25, 42]} label="+10" />;
    case "wildReverseDraw4":
      return <ReverseDraw4Art />;
    case "wildColorRoulette":
      return <ColorRouletteArt />;
    case "skipAll":
      return <SkipEveryoneArt />;
    case "discardAll":
      return <DiscardAllArt />;
    default:
      return null;
  }
}

export const NO_MERCY_ART_TYPES = new Set<Card["type"]>([
  "wildDraw6",
  "wildDraw10",
  "wildReverseDraw4",
  "wildColorRoulette",
  "skipAll",
  "discardAll",
]);
