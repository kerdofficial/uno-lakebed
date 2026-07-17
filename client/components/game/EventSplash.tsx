export type EventSplashData =
  | { id: string; kind: "wentOut"; playerName: string }
  | { id: string; kind: "eliminated"; playerName: string }
  | { id: string; kind: "handsPassed"; actorName: string }
  | { id: string; kind: "handsSwapped"; actorName: string; targetName: string };

export function EventSplash({ splash }: { splash: EventSplashData }) {
  let title = "";
  let subtitle: string | null = null;
  let titleClass = "";
  let glow = "";

  if (splash.kind === "wentOut") {
    title = `${splash.playerName} is out!`;
    titleClass = "text-emerald-400";
    glow = "0 0 40px rgba(52,211,153,0.8), 0 4px 8px rgba(0,0,0,0.5)";
  } else if (splash.kind === "eliminated") {
    title = `${splash.playerName} eliminated`;
    titleClass = "text-red-500";
    glow = "0 0 40px rgba(239,68,68,0.8), 0 4px 8px rgba(0,0,0,0.5)";
  } else if (splash.kind === "handsPassed") {
    title = "Hands passed";
    titleClass = "text-amber-300";
    glow = "0 0 40px rgba(252,211,77,0.7), 0 4px 8px rgba(0,0,0,0.5)";
    subtitle = `${splash.actorName} played a 0 - everyone passed their hand`;
  } else {
    title = "Hands swapped";
    titleClass = "text-amber-300";
    glow = "0 0 40px rgba(252,211,77,0.7), 0 4px 8px rgba(0,0,0,0.5)";
    subtitle = `${splash.actorName} ⇄ ${splash.targetName}`;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
      style={{ animation: "event-splash 3s ease-out forwards" }}
    >
      <div className="flex max-w-[90vw] flex-col items-center gap-3 px-6 text-center">
        <span
          className={`font-black uppercase leading-tight text-5xl md:text-8xl ${titleClass}`}
          style={{ textShadow: glow }}
        >
          {title}
        </span>
        {subtitle && (
          <span
            className="text-base md:text-xl font-bold text-neutral-200"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
