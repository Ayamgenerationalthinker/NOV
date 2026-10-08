/**
 * The fully grown tree as a static drawing. It is the hero image on low-power devices and
 * for visitors who prefer reduced motion, and the placeholder while the 3D scene loads.
 */

function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Whole numbers only, so the server and the browser always draw identical markup.
const rand = seeded(5);
const LEAVES = Array.from({ length: 110 }, () => {
  const angle = rand() * 360;
  const r = Math.sqrt(rand());
  const rad = (angle * Math.PI) / 180;
  return {
    x: Math.round(300 + Math.cos(rad) * 175 * r),
    y: Math.round(205 + Math.sin(rad) * 120 * r),
    size: Math.round(7 + rand() * 9),
    turn: Math.round(rand() * 180),
    tone: rand(),
    alpha: Math.round(55 + rand() * 45),
  };
});
const COINS = [
  [215, 170],
  [372, 150],
  [300, 105],
  [420, 235],
  [180, 250],
  [330, 240],
].map(([x, y]) => ({ x, y }));

export function TreePoster({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 700"
      role="img"
      aria-label="A tree with golden leaves and coins in its canopy, growing from a glowing seed in dark soil"
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <defs>
        <radialGradient id="tp-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D4A24C" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#D4A24C" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tp-bark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b98d4c" />
          <stop offset="100%" stopColor="#6e5230" />
        </linearGradient>
      </defs>

      <ellipse cx="300" cy="205" rx="260" ry="190" fill="url(#tp-glow)" />
      <ellipse cx="300" cy="545" rx="90" ry="60" fill="url(#tp-glow)" />

      {/* Soil line and roots */}
      <ellipse cx="300" cy="520" rx="250" ry="14" fill="#1a3a2b" opacity="0.7" />
      <g fill="none" stroke="#c79a52" strokeLinecap="round" opacity="0.85">
        <path d="M300 545 C270 570 220 580 150 640" strokeWidth="5" />
        <path d="M300 545 C330 575 390 585 455 635" strokeWidth="5" />
        <path d="M300 545 C290 590 270 630 250 680" strokeWidth="4" />
        <path d="M300 545 C312 595 335 630 360 675" strokeWidth="4" />
        <path d="M300 545 C250 555 190 560 110 585" strokeWidth="3" />
        <path d="M300 545 C355 555 420 560 495 590" strokeWidth="3" />
      </g>

      {/* Trunk and branches */}
      <path d="M284 545 C290 450 286 380 292 300 L308 300 C314 380 310 450 318 545 Z" fill="url(#tp-bark)" />
      <g fill="none" stroke="#8c6a3c" strokeLinecap="round">
        <path d="M298 330 C260 290 220 270 180 235" strokeWidth="9" />
        <path d="M302 320 C340 280 385 260 425 220" strokeWidth="9" />
        <path d="M300 310 C295 250 305 190 300 130" strokeWidth="8" />
        <path d="M296 300 C270 240 250 190 240 140" strokeWidth="6" />
        <path d="M304 300 C330 240 350 190 365 135" strokeWidth="6" />
      </g>

      {/* Canopy */}
      <g>
        {LEAVES.map((leaf, i) => (
          <ellipse
            key={i}
            cx={leaf.x}
            cy={leaf.y}
            rx={leaf.size}
            ry={Math.round(leaf.size * 0.55)}
            transform={`rotate(${leaf.turn} ${leaf.x} ${leaf.y})`}
            fill={leaf.tone < 0.7 ? '#D4A24C' : leaf.tone < 0.88 ? '#E9C98A' : '#9DB86A'}
            opacity={leaf.alpha / 100}
          />
        ))}
        {COINS.map((coin, i) => (
          <g key={i}>
            <circle cx={coin.x} cy={coin.y} r="13" fill="#E8C36A" />
            <circle cx={coin.x} cy={coin.y} r="8.5" fill="none" stroke="#9a6f1c" strokeWidth="1.5" />
          </g>
        ))}
      </g>

      {/* Seed */}
      <ellipse cx="300" cy="545" rx="13" ry="18" fill="#F0B64A" />
    </svg>
  );
}
