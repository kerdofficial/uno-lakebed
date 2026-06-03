export function AnimationStyles() {
  return (
    <style>{`
      html, body {
        background-color: #0a0a0a;
        color-scheme: dark;
      }
      @keyframes card-deal {
        0% { transform: scale(0.3) rotate(-10deg) translateY(-120px); opacity: 0; }
        60% { transform: scale(1.04) rotate(2deg) translateY(4px); opacity: 1; }
        100% { transform: scale(1) rotate(0deg) translateY(0); opacity: 1; }
      }
      @keyframes card-arrive {
        0% { transform: scale(1.3) rotate(12deg); opacity: 0; }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
      }
      @keyframes card-enter-hand {
        0% { transform: translateX(40px) translateY(-20px) scale(0.7); opacity: 0; }
        100% { transform: translateX(0) translateY(0) scale(1); opacity: 1; }
      }
      @keyframes card-play-out {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(0.6) translateY(-60px); opacity: 0; }
      }
      @keyframes bounce-in {
        0% { transform: scale(0.85); }
        50% { transform: scale(1.05); }
        70% { transform: scale(0.95); }
        100% { transform: scale(1); }
      }
      @keyframes fade-slide-in {
        0% { transform: translateY(8px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      @keyframes fade-slide-out {
        0% { transform: translateY(0); opacity: 1; }
        100% { transform: translateY(-8px); opacity: 0; }
      }
      @keyframes glow-pulse {
        0%, 100% { box-shadow: 0 0 6px 1px var(--glow-color, rgba(255,255,255,0.3)); }
        50% { box-shadow: 0 0 18px 4px var(--glow-color, rgba(255,255,255,0.3)); }
      }
      @keyframes turn-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5); }
        50% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
      }
      @keyframes uno-splash {
        0% { transform: scale(0) rotate(-15deg); opacity: 0; }
        40% { transform: scale(1.3) rotate(5deg); opacity: 1; }
        60% { transform: scale(0.95) rotate(-2deg); opacity: 1; }
        80% { transform: scale(1) rotate(0deg); opacity: 1; }
        100% { transform: scale(1) rotate(0deg); opacity: 0; }
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-6px); }
        40% { transform: translateX(6px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
      }
      @keyframes direction-flip {
        0% { transform: scaleX(1); }
        50% { transform: scaleX(0); }
        100% { transform: scaleX(-1); }
      }
      @keyframes stack-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); text-shadow: 0 0 16px rgba(239, 68, 68, 0.8); }
        100% { transform: scale(1); }
      }
      @keyframes confetti-fall {
        0% { transform: translate(0, -10vh) rotate(0deg); opacity: 1; }
        25% { transform: translate(var(--drift-x, 20px), 25vh) rotate(180deg); opacity: 1; }
        50% { transform: translate(calc(var(--drift-x, 20px) * -0.5), 50vh) rotate(360deg); opacity: 0.9; }
        75% { transform: translate(var(--drift-x, 20px), 75vh) rotate(540deg); opacity: 0.6; }
        100% { transform: translate(0, 100vh) rotate(720deg); opacity: 0; }
      }
      @keyframes skip-flash {
        0% { opacity: 0; transform: scale(0.5); }
        30% { opacity: 1; transform: scale(1.2); }
        100% { opacity: 0; transform: scale(1); }
      }
      @keyframes color-flash {
        0% { opacity: 0; }
        20% { opacity: 1; }
        100% { opacity: 0; }
      }
    `}</style>
  );
}
