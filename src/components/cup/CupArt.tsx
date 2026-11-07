import { ReactElement, useId } from 'react';
import { keyframes, styled } from 'styled-components';
import { CupThemeType } from '../../models/cupModel';
import { ICupTheme } from './cupThemes';

/*
 * The hero illustrations, drawn as inline SVG in a graphic novel style: layered
 * silhouettes, dramatic light, halftone shading, speed lines and athletes as bold
 * pictograms with heavy ink outlines and motion ghosts. No external images.
 */

const W = 1600;
const H = 520;

const drift = keyframes`
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(-40px); }
`;
const twinkle = keyframes`
  0%, 100% { opacity: 0.9; }
  50% { opacity: 0.2; }
`;
const fallDiagonal = keyframes`
  0% { transform: translate(0, -60px) rotate(0deg); }
  100% { transform: translate(-260px, 620px) rotate(540deg); }
`;
const sweep = keyframes`
  0%, 100% { transform: rotate(-2.5deg); }
  50% { transform: rotate(2.5deg); }
`;
const pulse = keyframes`
  0%, 100% { opacity: 0.75; }
  50% { opacity: 1; }
`;
const flap = keyframes`
  from { transform: scaleY(1); }
  to { transform: scaleY(0.35); }
`;
const dash = keyframes`
  from { transform: translateX(60px); opacity: 0; }
  30% { opacity: 1; }
  to { transform: translateX(-120px); opacity: 0; }
`;

const StyledSvg = styled.svg`
  display: block;
  width: 100%;
  height: 100%;

  .cup-drift {
    animation: ${drift} 18s ease-in-out infinite;
  }
  .cup-twinkle {
    animation: ${twinkle} 3.2s ease-in-out infinite;
  }
  .cup-fall {
    animation: ${fallDiagonal} 11s linear infinite;
    transform-box: fill-box;
    transform-origin: center;
  }
  .cup-sweep {
    animation: ${sweep} 6s ease-in-out infinite;
    transform-box: view-box;
  }
  .cup-pulse {
    animation: ${pulse} 4s ease-in-out infinite;
  }
  .cup-dash {
    animation: ${dash} 1.6s linear infinite;
  }
  .cup-flap {
    animation: ${flap} 0.28s ease-in-out infinite alternate;
    transform-box: fill-box;
    transform-origin: center;
  }

  /* Without animation effects (e.g. turned off in Windows) nothing moves, the stars still twinkle and
     the glow still pulses, they only fade */
  @media (prefers-reduced-motion: reduce) {
    .cup-drift,
    .cup-fall,
    .cup-sweep,
    .cup-dash,
    .cup-flap {
      animation: none;
    }
  }
`;

/** Deterministic pseudo random numbers, the scenes look the same every time */
const random = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

type Point = [number, number];

/** A tapered limb as a polygon */
const limb = (a: Point, b: Point, wa: number, wb: number) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts = [
    [a[0] + (nx * wa) / 2, a[1] + (ny * wa) / 2],
    [b[0] + (nx * wb) / 2, b[1] + (ny * wb) / 2],
    [b[0] - (nx * wb) / 2, b[1] - (ny * wb) / 2],
    [a[0] - (nx * wa) / 2, a[1] - (ny * wa) / 2]
  ];
  return pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
};

interface IPose {
  head: Point;
  neck: Point;
  hip: Point;
  /** shoulder, elbow, hand */
  nearArm: [Point, Point, Point];
  farArm: [Point, Point, Point];
  /** hip, knee, ankle, toe */
  nearLeg: [Point, Point, Point, Point];
  farLeg: [Point, Point, Point, Point];
  /** The hand holding the map */
  mapHand: Point;
}

/** Two phases of a sprinting stride, the athlete faces right, 200 x 260 units, ground at y = 250 */
const poses: IPose[] = [
  {
    head: [128, 30],
    neck: [117, 56],
    hip: [98, 128],
    nearArm: [
      [114, 62],
      [140, 82],
      [162, 58]
    ],
    farArm: [
      [110, 62],
      [84, 86],
      [60, 104]
    ],
    nearLeg: [
      [100, 128],
      [150, 142],
      [150, 192],
      [168, 198]
    ],
    farLeg: [
      [96, 130],
      [70, 176],
      [32, 214],
      [22, 230]
    ],
    mapHand: [162, 58]
  },
  {
    head: [128, 30],
    neck: [117, 56],
    hip: [98, 128],
    nearArm: [
      [114, 64],
      [88, 88],
      [64, 106]
    ],
    farArm: [
      [110, 62],
      [136, 82],
      [158, 58]
    ],
    nearLeg: [
      [100, 130],
      [74, 178],
      [36, 216],
      [26, 232]
    ],
    farLeg: [
      [96, 128],
      [146, 142],
      [146, 192],
      [164, 198]
    ],
    mapHand: [158, 58]
  }
];

type Headwear = 'none' | 'cap' | 'headlamp' | 'beanie';

interface IAthleteProps {
  x: number;
  y: number;
  scale?: number;
  pose?: 0 | 1;
  ink: string;
  /** The near side of the body */
  body: string;
  /** The far side limbs, darker for depth */
  shade: string;
  /** A thin light along the back and the front leg */
  rim?: string;
  /** Stripes on the shirt, e.g. reflective strips at night */
  stripe?: string;
  headwear?: Headwear;
  headwearColor?: string;
  withMap?: boolean;
  /** Only the silhouette, used for the motion ghosts */
  ghost?: boolean;
  opacity?: number;
}

/** An athlete as a bold pictogram with ink outline, cel shading and an orienteering map */
export const CupAthlete = ({
  x,
  y,
  scale = 1,
  pose = 0,
  ink,
  body,
  shade,
  rim,
  stripe,
  headwear = 'none',
  headwearColor,
  withMap = true,
  ghost = false,
  opacity = 1
}: IAthleteProps) => {
  const p = poses[pose];
  const far = (color: string, grow: number) => (
    <g fill={color}>
      {[p.farArm, p.farLeg].map((chain, i) => (
        <g key={`far${i}`}>
          <polygon points={limb(chain[0], chain[1], 17 + grow, 14 + grow)} />
          <polygon points={limb(chain[1], chain[2], 14 + grow, 11 + grow)} />
          {chain.length > 3 ? <polygon points={limb(chain[2], chain[3] as Point, 11 + grow, 8 + grow)} /> : null}
          {chain.map((pt, j) => (
            <circle key={j} cx={pt[0]} cy={pt[1]} r={(j === 0 ? 8.5 : 7) + grow / 2} />
          ))}
        </g>
      ))}
    </g>
  );
  const near = (color: string, grow: number) => (
    <g fill={color}>
      <polygon points={limb(p.neck, p.hip, 34 + grow, 25 + grow)} />
      <circle cx={p.neck[0]} cy={p.neck[1]} r={16 + grow / 2} />
      <circle cx={p.hip[0]} cy={p.hip[1]} r={13 + grow / 2} />
      <circle cx={p.head[0]} cy={p.head[1]} r={18 + grow / 2} />
      {[p.nearArm, p.nearLeg].map((chain, i) => (
        <g key={`near${i}`}>
          <polygon points={limb(chain[0], chain[1], (i ? 22 : 17) + grow, (i ? 16 : 14) + grow)} />
          <polygon points={limb(chain[1], chain[2], (i ? 16 : 14) + grow, (i ? 12 : 11) + grow)} />
          {chain.length > 3 ? <polygon points={limb(chain[2], chain[3] as Point, 12 + grow, 9 + grow)} /> : null}
          {chain.map((pt, j) => (
            <circle key={j} cx={pt[0]} cy={pt[1]} r={(j === 0 ? (i ? 11 : 8.5) : i ? 8 : 7) + grow / 2} />
          ))}
        </g>
      ))}
    </g>
  );

  if (ghost) {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
        {far(body, 0)}
        {near(body, 0)}
      </g>
    );
  }

  const hx = p.head[0];
  const hy = p.head[1];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      {/* the ink outline: every shape a little bigger, below the fill */}
      {far(ink, 9)}
      {near(ink, 9)}
      {withMap ? (
        <g transform={`translate(${p.mapHand[0]} ${p.mapHand[1]}) rotate(-18)`}>
          <rect x="-4" y="-26" width="38" height="30" rx="2" fill={ink} />
        </g>
      ) : null}
      {far(shade, 0)}
      {near(body, 0)}
      {rim ? (
        <g fill="none" stroke={rim} strokeWidth="3.5" strokeLinecap="round" opacity="0.9">
          <path d={`M${hx - 6} ${hy - 15} Q${hx + 14} ${hy - 14} ${hx + 16} ${hy + 2}`} />
          <path d={`M${p.neck[0] + 14} ${p.neck[1] + 4} L${p.hip[0] + 12} ${p.hip[1] - 6}`} />
          <path d={`M${p.nearLeg[1][0] + 4} ${p.nearLeg[1][1] - 8} L${p.nearLeg[2][0] + 6} ${p.nearLeg[2][1] - 4}`} />
        </g>
      ) : null}
      {stripe ? (
        <g stroke={stripe} strokeWidth="5">
          <line x1={p.neck[0] - 12} y1={p.neck[1] + 30} x2={p.neck[0] + 8} y2={p.neck[1] + 38} />
          <line x1={p.nearLeg[2][0] - 6} y1={p.nearLeg[2][1] - 6} x2={p.nearLeg[2][0] + 8} y2={p.nearLeg[2][1] - 2} />
        </g>
      ) : null}
      {headwear === 'cap' ? (
        <g fill={headwearColor ?? shade} stroke={ink} strokeWidth="4" strokeLinejoin="round">
          <path
            d={`M${hx - 18} ${hy - 2} Q${hx - 16} ${hy - 22} ${hx + 2} ${hy - 21} Q${hx + 18} ${hy - 18} ${hx + 18} ${hy - 4} Z`}
          />
          <path d={`M${hx + 10} ${hy - 7} L${hx + 34} ${hy - 3} L${hx + 16} ${hy + 1} Z`} />
        </g>
      ) : null}
      {headwear === 'beanie' ? (
        <g fill={headwearColor ?? shade} stroke={ink} strokeWidth="4" strokeLinejoin="round">
          <path
            d={`M${hx - 19} ${hy - 1} Q${hx - 18} ${hy - 26} ${hx + 1} ${hy - 26} Q${hx + 20} ${hy - 24} ${hx + 19} ${hy - 1} Z`}
          />
          <circle cx={hx - 2} cy={hy - 30} r="7" />
        </g>
      ) : null}
      {headwear === 'headlamp' ? (
        <g stroke={ink} strokeWidth="4">
          <path d={`M${hx - 18} ${hy - 4} L${hx + 16} ${hy - 10}`} fill="none" />
          <rect x={hx + 10} y={hy - 18} width="13" height="11" rx="2" fill={headwearColor ?? '#fff3b0'} />
        </g>
      ) : null}
      {withMap ? (
        <g transform={`translate(${p.mapHand[0]} ${p.mapHand[1]}) rotate(-18)`}>
          <rect x="0" y="-22" width="30" height="22" fill="#ffffff" />
          <path d="M3 -6 Q10 -18 17 -11 T28 -17" fill="none" stroke="#b5651d" strokeWidth="1.6" />
          <path d="M3 -14 Q8 -9 13 -15" fill="none" stroke="#2f8f4e" strokeWidth="1.6" />
          <circle cx="21" cy="-8" r="3.4" fill="none" stroke="#c2185b" strokeWidth="1.8" />
        </g>
      ) : null}
    </g>
  );
};

/** An athlete with motion ghosts and speed lines behind */
const RunningAthlete = (props: IAthleteProps & { ghostColor: string; lines?: string }) => {
  const { x, y, scale = 1, ghostColor, lines, ...athlete } = props;
  return (
    <g>
      {lines ? (
        <g stroke={lines} strokeLinecap="round">
          {[60, 110, 150, 185].map((ly, i) => (
            <line
              key={ly}
              className="cup-dash"
              style={{ animationDelay: `${-i * 0.4}s` }}
              x1={x - 30 * scale}
              y1={y + ly * scale}
              x2={x - (170 + i * 30) * scale}
              y2={y + ly * scale}
              strokeWidth={(7 - i) * scale}
              opacity={0.85 - i * 0.12}
            />
          ))}
        </g>
      ) : null}
      <CupAthlete {...athlete} ghost y={y} scale={scale} x={x - 92 * scale} body={ghostColor} opacity={0.16} />
      <CupAthlete {...athlete} ghost y={y} scale={scale} x={x - 48 * scale} body={ghostColor} opacity={0.32} />
      <CupAthlete {...athlete} y={y} scale={scale} x={x} />
    </g>
  );
};

/** The orange and white orienteering control flag, big in the foreground */
const ControlFlag = ({ x, y, size, ink }: { x: number; y: number; size: number; ink: string }) => (
  <g transform={`translate(${x} ${y}) scale(${size / 100}) rotate(-6)`}>
    <rect x="-5" y="-10" width="10" height="190" fill={ink} />
    <g stroke={ink} strokeWidth="7" strokeLinejoin="round">
      <rect x="5" y="0" width="86" height="86" fill="#ffffff" />
      <path d="M5 0 L91 86 L5 86 Z" fill="#ff6a00" />
    </g>
    <path d="M91 0 L91 86 L5 86 Z" fill="#000000" opacity="0.12" />
  </g>
);

/** Radiating comic speed lines from a focal point */
const SpeedBurst = ({
  cx,
  cy,
  color,
  opacity,
  rays = 36
}: {
  cx: number;
  cy: number;
  color: string;
  opacity: number;
  rays?: number;
}) => {
  const r = 1400;
  return (
    <g fill={color} opacity={opacity}>
      {Array.from({ length: rays }).map((_, i) => {
        const a1 = (i / rays) * Math.PI * 2;
        const a2 = a1 + (Math.PI * 2) / rays / 2.4;
        return (
          <polygon
            key={i}
            points={`${cx},${cy} ${cx + Math.cos(a1) * r},${cy + Math.sin(a1) * r} ${cx + Math.cos(a2) * r},${cy + Math.sin(a2) * r}`}
          />
        );
      })}
    </g>
  );
};

/** The big gold trophy of the youth cup, shining with light rays behind */
const Trophy = ({
  cx,
  baseY,
  size,
  ink,
  glow
}: {
  cx: number;
  baseY: number;
  size: number;
  ink: string;
  glow: string;
}) => {
  const gold = '#ffcf33';
  const shade = '#e09400';
  const star = (x: number, y: number, r: number) =>
    Array.from({ length: 10 })
      .map((_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.45 : r;
        return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`;
      })
      .join(' ');
  const sparkle = (x: number, y: number, r: number) =>
    `M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z`;
  return (
    <g transform={`translate(${cx} ${baseY}) scale(${size})`}>
      <circle cx="0" cy="-170" r="230" fill={`url(#${glow})`} className="cup-pulse" />
      <SpeedBurst cx={0} cy={-170} color="#fff6b0" opacity={0.25} rays={20} />
      {/* the handles: ink below, gold on top */}
      <g fill="none" strokeLinecap="round">
        <path d="M-86 -238 C-160 -238 -160 -150 -60 -138" stroke={ink} strokeWidth="26" />
        <path d="M86 -238 C160 -238 160 -150 60 -138" stroke={ink} strokeWidth="26" />
        <path d="M-86 -238 C-160 -238 -160 -150 -60 -138" stroke={gold} strokeWidth="14" />
        <path d="M86 -238 C160 -238 160 -150 60 -138" stroke={gold} strokeWidth="14" />
      </g>
      {/* the bowl, with cel shading and a highlight */}
      <path
        d="M-96 -262 L96 -262 Q92 -140 18 -112 L-18 -112 Q-92 -140 -96 -262 Z"
        fill={gold}
        stroke={ink}
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path d="M40 -262 L93 -262 Q89 -142 18 -115 L8 -115 Q62 -150 40 -262 Z" fill={shade} />
      <path
        d="M-70 -246 Q-72 -170 -34 -134"
        fill="none"
        stroke="#ffffff"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.55"
      />
      <ellipse cx="0" cy="-262" rx="96" ry="16" fill={shade} stroke={ink} strokeWidth="7" />
      <polygon points={star(0, -196, 32)} fill="#ffffff" stroke={ink} strokeWidth="5" strokeLinejoin="round" />
      {/* the stem and the base */}
      <rect x="-16" y="-116" width="32" height="44" fill={gold} stroke={ink} strokeWidth="6" />
      <ellipse cx="0" cy="-94" rx="30" ry="11" fill={shade} stroke={ink} strokeWidth="6" />
      <path d="M-64 -46 L-40 -74 L40 -74 L64 -46 Z" fill={gold} stroke={ink} strokeWidth="6" strokeLinejoin="round" />
      <rect x="-92" y="-48" width="184" height="48" fill="#3a1f40" stroke={ink} strokeWidth="6" />
      <rect x="-52" y="-36" width="104" height="24" fill={gold} stroke={ink} strokeWidth="4" />
      {[
        [-150, -300, 18],
        [140, -320, 14],
        [175, -120, 12],
        [-175, -110, 10]
      ].map(([x, y, r], i) => (
        <path
          key={i}
          className="cup-twinkle"
          style={{ animationDelay: `${-i * 0.7}s` }}
          d={sparkle(x, y, r)}
          fill="#ffffff"
        />
      ))}
    </g>
  );
};

/** A bat with flapping wings */
const Bat = ({ x, y, scale, delay }: { x: number; y: number; scale: number; delay: number }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <g className="cup-flap" style={{ animationDelay: `${delay}s` }}>
      <path
        d="M0 -4 C-8 -16 -22 -22 -40 -20 C-34 -14 -34 -8 -38 -2 C-30 -6 -24 -2 -22 4 C-16 -2 -8 0 -4 6 Z M0 -4 C8 -16 22 -22 40 -20 C34 -14 34 -8 38 -2 C30 -6 24 -2 22 4 C16 -2 8 0 4 6 Z"
        fill="#000000"
      />
    </g>
    <ellipse cx="0" cy="2" rx="6" ry="9" fill="#000000" />
    <path d="M-5 -6 L-6 -13 L-1 -8 Z M5 -6 L6 -13 L1 -8 Z" fill="#000000" />
  </g>
);

/** A glowing jack-o'-lantern, face 0, 1 or 2 */
const Pumpkin = ({ x, y, scale, face, ink }: { x: number; y: number; scale: number; face: 0 | 1 | 2; ink: string }) => {
  const glow = '#ffd04d';
  const faces = [
    <>
      <polygon points="-34,-22 -14,-22 -24,-42" />
      <polygon points="34,-22 14,-22 24,-42" />
      <polygon points="-6,-10 6,-10 0,-22" />
      <path d="M-44 4 L-30 12 L-22 4 L-10 14 L0 4 L10 14 L22 4 L30 12 L44 4 Q36 34 0 36 Q-36 34 -44 4 Z" />
    </>,
    <>
      <path d="M-40 -24 Q-24 -40 -10 -22 Q-24 -16 -40 -24 Z" />
      <path d="M40 -24 Q24 -40 10 -22 Q24 -16 40 -24 Z" />
      <path d="M-46 0 Q0 22 46 0 Q40 30 0 34 Q-40 30 -46 0 Z M-18 8 L-10 20 L-2 9 Z M18 8 L10 20 L2 9 Z" />
    </>,
    <>
      <polygon points="-36,-36 -10,-20 -32,-14" />
      <polygon points="36,-36 10,-20 32,-14" />
      <polygon points="-4,-12 4,-12 0,-2" />
      <path d="M-40 6 L-26 2 L-20 14 L-8 6 L0 18 L8 6 L20 14 L26 2 L40 6 Q30 32 0 32 Q-30 32 -40 6 Z" />
    </>
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="6" rx="96" ry="22" fill={glow} opacity="0.16" />
      {/* the stem */}
      <path
        d="M-6 -66 Q-4 -86 10 -96 L18 -88 Q6 -80 8 -64 Z"
        fill="#4a5d23"
        stroke={ink}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {/* the ribs, darker at the sides */}
      <ellipse cx="-38" cy="-12" rx="38" ry="56" fill="#b8520a" stroke={ink} strokeWidth="5" />
      <ellipse cx="38" cy="-12" rx="38" ry="56" fill="#b8520a" stroke={ink} strokeWidth="5" />
      <ellipse cx="-16" cy="-12" rx="34" ry="60" fill="#e0700f" stroke={ink} strokeWidth="5" />
      <ellipse cx="16" cy="-12" rx="34" ry="60" fill="#e0700f" stroke={ink} strokeWidth="5" />
      <ellipse cx="0" cy="-12" rx="26" ry="62" fill="#f28a1d" stroke={ink} strokeWidth="5" />
      {/* the carved face, glowing from the inside */}
      <g fill={glow} stroke={ink} strokeWidth="4" strokeLinejoin="round" className="cup-pulse">
        {faces[face]}
      </g>
      <path
        d="M-58 -44 Q-64 -14 -54 14"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.25"
      />
    </g>
  );
};

/** A row of grass straws along baseY */
const grass = (seed: number, baseY: number, maxH: number) => {
  const rnd = random(seed);
  let d = `M0 ${H} L0 ${baseY}`;
  for (let x = 0; x <= W + 20; x += 6 + rnd() * 10) {
    const h = 8 + rnd() * maxH;
    const lean = (rnd() - 0.5) * 16;
    d += ` L${x.toFixed(0)} ${baseY} L${(x + 3 + lean).toFixed(0)} ${(baseY - h).toFixed(0)} L${(x + 7).toFixed(0)} ${baseY}`;
  }
  return `${d} L${W} ${H} Z`;
};

/** A forest edge of pines along baseY, as one path */
const treeline = (seed: number, baseY: number, minH: number, maxH: number, step: number) => {
  const rnd = random(seed);
  let d = `M0 ${H} L0 ${baseY}`;
  for (let x = 0; x <= W + step; x += step * (0.6 + rnd() * 0.8)) {
    const h = minH + rnd() * (maxH - minH);
    const w = step * (0.45 + rnd() * 0.3);
    const f = (v: number) => v.toFixed(0);
    d += ` L${f(x - w)} ${baseY} L${f(x - w * 0.55)} ${f(baseY - h * 0.45)} L${f(x - w * 0.7)} ${f(baseY - h * 0.45)}`;
    d += ` L${f(x)} ${f(baseY - h)} L${f(x + w * 0.7)} ${f(baseY - h * 0.45)} L${f(x + w * 0.55)} ${f(baseY - h * 0.45)} L${f(x + w)} ${baseY}`;
  }
  return `${d} L${W} ${baseY} L${W} ${H} Z`;
};

/** A smooth mountain ridge */
const ridge = (seed: number, baseY: number, amplitude: number, peaks: number) => {
  const rnd = random(seed);
  let d = `M0 ${H} L0 ${baseY}`;
  const step = W / peaks;
  for (let i = 0; i <= peaks; i++) {
    const x = i * step;
    const y = baseY - rnd() * amplitude;
    d += ` Q${(x - step / 2).toFixed(0)} ${(y - amplitude * 0.4).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)}`;
  }
  return `${d} L${W} ${H} Z`;
};

const Stars = ({ seed, count, color, maxY }: { seed: number; count: number; color: string; maxY: number }) => {
  const rnd = random(seed);
  return (
    <g fill={color}>
      {Array.from({ length: count }).map((_, i) => {
        const r = rnd() < 0.85 ? 1.2 + rnd() : 2.6;
        const cx = rnd() * W;
        const cy = rnd() * maxY;
        const delay = -rnd() * 3;
        return (
          <circle
            key={i}
            className={i % 3 === 0 ? 'cup-twinkle' : undefined}
            style={i % 3 === 0 ? { animationDelay: `${delay}s` } : undefined}
            cx={cx}
            cy={cy}
            r={r}
          />
        );
      })}
    </g>
  );
};

const Particles = ({
  seed,
  count,
  render
}: {
  seed: number;
  count: number;
  render: (i: number, x: number, y: number, s: number) => ReactElement;
}) => {
  const rnd = random(seed);
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const delay = -rnd() * 11;
        const duration = 8 + rnd() * 7;
        const x = rnd() * (W + 300);
        const y = -40 + rnd() * 120;
        const s = 0.5 + rnd();
        return (
          <g key={i} className="cup-fall" style={{ animationDelay: `${delay}s`, animationDuration: `${duration}s` }}>
            {render(i, x, y, s)}
          </g>
        );
      })}
    </>
  );
};

const leafPath = 'M0,-20 L5,-8 L16,-12 L11,0 L20,6 L6,8 L4,20 L0,12 L-4,20 L-6,8 L-20,6 L-11,0 L-16,-12 L-5,-8 Z';

interface ISceneIds {
  dots: string;
  glow: string;
  beam: string;
}

const scenes: Record<CupThemeType, (t: ICupTheme, ids: ISceneIds) => ReactElement> = {
  NIGHT: (t, ids) => (
    <>
      <Stars seed={7} count={120} color="#ffffff" maxY={300} />
      {/* the moon with a halftone shadow */}
      <circle cx={1180} cy={120} r={150} fill={`url(#${ids.glow})`} className="cup-pulse" />
      <mask id={`${ids.dots}Moon`}>
        <rect width={W} height={H} fill="#ffffff" />
        <circle cx={1212} cy={100} r={60} fill="#000000" />
      </mask>
      <g mask={`url(#${ids.dots}Moon)`}>
        <circle cx={1180} cy={120} r={64} fill="#f4f1d8" />
        <circle cx={1180} cy={120} r={64} fill={`url(#${ids.dots})`} opacity="0.3" />
      </g>
      <path d={ridge(3, 330, 90, 7)} fill={t.ridges[0]} />
      <path d={treeline(11, 380, 60, 150, 46)} fill={t.ridges[1]} />
      {/* the headlamp beam, sweeping */}
      <g className="cup-sweep" style={{ transformOrigin: '1160px 245px' }}>
        <polygon points="1160,245 1600,110 1600,430" fill={`url(#${ids.beam})`} />
      </g>
      <path d={treeline(23, 455, 40, 110, 70)} fill={t.ridges[2]} />
      <rect x="0" y="470" width={W} height="50" fill={t.ridges[2]} />
      <RunningAthlete
        x={1010}
        y={210}
        scale={1.05}
        ink="#000000"
        body="#2a3460"
        shade="#161c38"
        rim={t.accent2}
        stripe={t.accent2}
        headwear="headlamp"
        headwearColor={t.glow}
        ghostColor={t.accent2}
        lines={t.accent2}
      />
      <ControlFlag x={1440} y={330} size={95} ink="#000000" />
    </>
  ),
  YOUTH: (t, ids) => (
    <>
      {/* the sun behind the forest, and the light falling through the trees */}
      <circle cx={420} cy={250} r={280} fill={`url(#${ids.glow})`} className="cup-pulse" />
      {[0, 1, 2, 3, 4, 5].map(i => (
        <polygon
          key={i}
          points={`${300 + i * 60},0 ${350 + i * 60},0 ${620 + i * 200},${H} ${520 + i * 200},${H}`}
          fill="#ffffff"
          opacity={0.1}
        />
      ))}
      <path d={ridge(44, 300, 70, 6)} fill={t.ridges[0]} />
      <path d={treeline(81, 360, 70, 170, 46)} fill={t.ridges[1]} />
      {/* round leafy trees in bright colors between the pines */}
      {(
        [
          [90, 330, 58, '#c6f432'],
          [250, 345, 44, '#ffb347'],
          [600, 338, 52, '#7ee081'],
          [760, 350, 40, '#ff8fab'],
          [980, 342, 50, '#c6f432']
        ] as [number, number, number, string][]
      ).map(([x, y, r, color], i) => (
        <g key={i}>
          <rect x={x - 6} y={y} width="12" height="60" fill="#6b3e1d" stroke={t.ink} strokeWidth="4" />
          <circle cx={x} cy={y} r={r} fill={color} stroke={t.ink} strokeWidth="5" />
          <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.35} fill="#ffffff" opacity="0.3" />
        </g>
      ))}
      <path d={treeline(93, 430, 50, 120, 64)} fill={t.ridges[2]} />
      {/* the hill with the trophy */}
      <path d={`M1060 480 Q1300 330 1640 350 L1640 ${H} L1060 ${H} Z`} fill="#2fbf71" stroke={t.ink} strokeWidth="6" />
      {/* the forest path the kids run on */}
      <path
        d={`M-20 ${H + 20} L-20 470 Q500 430 900 452 T1300 420 L1640 440 L1640 ${H + 20} Z`}
        fill="#46d17f"
        stroke={t.ink}
        strokeWidth="6"
      />
      <path
        d="M-20 520 Q420 470 760 478 T1240 432"
        fill="none"
        stroke="#f6d58e"
        strokeWidth="34"
        strokeLinecap="round"
      />
      <path
        d="M-20 520 Q420 470 760 478 T1240 432"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4"
        strokeDasharray="14 22"
        opacity="0.6"
      />
      <Trophy cx={1370} baseY={392} size={1.1} ink={t.ink} glow={ids.glow} />
      {/* flowers along the path */}
      {(
        [
          [160, 490, '#ff4f9a'],
          [420, 472, '#ffd21f'],
          [700, 480, '#ffffff'],
          [1010, 468, '#ff4f9a']
        ] as [number, number, string][]
      ).map(([x, y, color], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          {[0, 72, 144, 216, 288].map(a => (
            <ellipse
              key={a}
              cx="0"
              cy="-7"
              rx="4.5"
              ry="7"
              fill={color}
              stroke={t.ink}
              strokeWidth="2"
              transform={`rotate(${a})`}
            />
          ))}
          <circle r="4" fill="#ffd21f" stroke={t.ink} strokeWidth="2" />
        </g>
      ))}
      <RunningAthlete
        x={720}
        y={232}
        scale={0.86}
        pose={1}
        ink={t.ink}
        body="#1fd1ff"
        shade="#0b8fb3"
        rim="#ffffff"
        headwear="cap"
        headwearColor={t.accent}
        ghostColor="#ffffff"
      />
      <RunningAthlete
        x={1070}
        y={214}
        scale={0.84}
        ink={t.ink}
        body="#ffd21f"
        shade="#d9a400"
        rim="#ffffff"
        headwear="cap"
        headwearColor="#1fd1ff"
        ghostColor="#ffffff"
        withMap={false}
      />
      <RunningAthlete
        x={890}
        y={204}
        scale={1}
        ink={t.ink}
        body={t.accent}
        shade="#b3005a"
        rim="#ffffff"
        headwear="beanie"
        headwearColor="#7a2dff"
        ghostColor="#ffffff"
        lines="#ffffff"
      />
    </>
  ),
  HALLOWEEN: (t, ids) => (
    <>
      {/* the huge full moon with craters and a warm glow */}
      <circle cx={1150} cy={200} r={330} fill={`url(#${ids.glow})`} className="cup-pulse" />
      <circle cx={1150} cy={200} r={185} fill="#f7e3a3" stroke={t.ink} strokeWidth="5" />
      {(
        [
          [1090, 140, 34],
          [1210, 120, 22],
          [1180, 240, 44],
          [1075, 255, 18],
          [1250, 200, 16],
          [1130, 320, 20]
        ] as [number, number, number][]
      ).map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#d9b86a" opacity="0.45" />
      ))}
      <circle cx={1150} cy={200} r={185} fill={`url(#${ids.dots})`} opacity="0.12" />
      {/* bats, in front of the moon and around it */}
      {(
        [
          [980, 90, 1.2],
          [1290, 70, 0.9],
          [1380, 210, 1.1],
          [1050, 300, 0.8],
          [870, 190, 0.7],
          [1470, 120, 0.75],
          [600, 80, 0.8],
          [450, 160, 0.6],
          [1230, 330, 0.65]
        ] as [number, number, number][]
      ).map(([x, y, s], i) => (
        <Bat key={i} x={x} y={y} scale={s} delay={-i * 0.17} />
      ))}
      <path d={ridge(66, 380, 60, 6)} fill={t.ridges[0]} />
      <path d={treeline(105, 420, 40, 110, 70)} fill={t.ridges[1]} />
      {/* the grass along the ground */}
      <path d={grass(17, 440, 70)} fill={t.ridges[2]} />
      <rect x="0" y="456" width={W} height="70" fill="#1a0f07" />
      {/* the cobblestones */}
      {Array.from({ length: 22 }).map((_, i) => (
        <ellipse
          key={i}
          cx={(i % 11) * 150 + (i > 10 ? 75 : 0) + 30}
          cy={i > 10 ? 505 : 478}
          rx="58"
          ry="11"
          fill="#2a1a0d"
          stroke="#000000"
          strokeWidth="3"
        />
      ))}
      <Pumpkin x={150} y={452} scale={0.9} face={1} ink={t.ink} />
      <Pumpkin x={420} y={466} scale={0.7} face={2} ink={t.ink} />
      <RunningAthlete
        x={720}
        y={214}
        scale={1}
        ink="#000000"
        body="#2b1a3d"
        shade="#170d22"
        rim={t.accent}
        stripe={t.accent}
        headwear="headlamp"
        headwearColor={t.glow}
        ghostColor={t.accent}
        lines={t.glow}
      />
      <Pumpkin x={1000} y={440} scale={1.1} face={0} ink={t.ink} />
      <Pumpkin x={1200} y={424} scale={0.85} face={2} ink={t.ink} />
      <Pumpkin x={1380} y={426} scale={1.15} face={1} ink={t.ink} />
      <Pumpkin x={1560} y={418} scale={0.9} face={0} ink={t.ink} />
      <ControlFlag x={1265} y={290} size={70} ink="#000000" />
    </>
  ),
  WINTER: (t, ids) => (
    <>
      <Stars seed={5} count={70} color="#ffffff" maxY={220} />
      {/* the aurora */}
      <g className="cup-drift" opacity="0.85">
        {[0, 1, 2].map(i => (
          <path
            key={i}
            d={`M-100 ${190 + i * 34} C 300 ${60 + i * 30}, 600 ${260 + i * 20}, 900 ${120 + i * 30} S 1400 ${40 + i * 40}, 1800 ${150 + i * 30}`}
            fill="none"
            stroke={`url(#${ids.glow})`}
            strokeWidth={70 - i * 18}
            strokeLinecap="round"
            opacity={0.55 - i * 0.12}
          />
        ))}
      </g>
      <path d={ridge(9, 330, 150, 6)} fill={t.ridges[0]} />
      <path d={ridge(9, 330, 150, 6)} fill={`url(#${ids.dots})`} opacity="0.25" />
      <path d={treeline(31, 400, 70, 160, 44)} fill="#123a3a" />
      <path d={treeline(31, 400, 70, 160, 44)} fill="#ffffff" opacity="0.18" transform="translate(4 -6)" />
      <path d={`M0 420 Q400 380 800 410 T${W} 400 L${W} ${H} L0 ${H} Z`} fill={t.ridges[2]} />
      <Particles
        seed={17}
        count={46}
        render={(i, x, y, s) => <circle cx={x} cy={y} r={2 + s * 2.5} fill="#ffffff" opacity={0.85} />}
      />
      <RunningAthlete
        x={1060}
        y={196}
        scale={1.05}
        ink={t.ink}
        body={t.accent}
        shade="#8e0f28"
        rim="#ffffff"
        stripe="#ffffff"
        headwear="beanie"
        headwearColor="#0b1d33"
        ghostColor="#ffffff"
        lines="#ffffff"
      />
      <ControlFlag x={1450} y={300} size={95} ink={t.ink} />
    </>
  ),
  SUMMER: (t, ids) => (
    <>
      <SpeedBurst cx={1180} cy={330} color={t.glow} opacity={0.16} rays={30} />
      {/* the low sun with retro stripes cut out */}
      <circle cx={1180} cy={330} r={230} fill={`url(#${ids.glow})`} className="cup-pulse" />
      <circle cx={1180} cy={330} r={150} fill="#ffe28a" />
      {[0, 1, 2, 3, 4].map(i => (
        <rect key={i} x={1020} y={340 + i * 22} width="320" height={4 + i * 2.4} fill={t.sky[2]} />
      ))}
      <path d={ridge(14, 390, 70, 8)} fill={t.ridges[0]} />
      <path d={treeline(41, 430, 50, 130, 52)} fill={t.ridges[1]} />
      {/* the lake with the reflection of the sun */}
      <rect x="0" y="440" width={W} height="80" fill={t.ridges[2]} />
      {[0, 1, 2, 3, 4, 5].map(i => (
        <rect
          key={i}
          x={1080 + (i % 2) * 24}
          y={452 + i * 11}
          width={200 - i * 26}
          height="4"
          fill="#ffe28a"
          opacity={0.8 - i * 0.11}
        />
      ))}
      <RunningAthlete
        x={960}
        y={196}
        scale={1.05}
        ink="#1d0f1c"
        body="#3a1f40"
        shade="#1f0f22"
        rim={t.accent2}
        stripe={t.accent}
        headwear="cap"
        headwearColor={t.accent}
        ghostColor={t.accent2}
        lines="#ffe28a"
      />
      <ControlFlag x={1470} y={300} size={90} ink="#1d0f1c" />
    </>
  ),
  SPRING: (t, ids) => (
    <>
      {/* morning light rays */}
      {[0, 1, 2, 3, 4].map(i => (
        <polygon
          key={i}
          points={`${80 + i * 70},0 ${150 + i * 70},0 ${700 + i * 230},${H} ${560 + i * 230},${H}`}
          fill="#ffffff"
          opacity={0.1}
        />
      ))}
      <circle cx={1220} cy={140} r={170} fill={`url(#${ids.glow})`} className="cup-pulse" />
      <path d={ridge(21, 330, 80, 6)} fill={t.ridges[0]} />
      <rect x="0" y="300" width={W + 80} height="60" fill="#ffffff" opacity="0.35" className="cup-drift" />
      <path d={treeline(51, 410, 60, 140, 50)} fill={t.ridges[1]} />
      <path d={`M0 440 Q500 410 900 432 T${W} 425 L${W} ${H} L0 ${H} Z`} fill={t.ridges[2]} />
      {/* birch trunks in the foreground */}
      {[
        [1530, 28],
        [1582, 18]
      ].map(([bx, bw], i) => (
        <g key={i}>
          <rect x={bx} y={0} width={bw} height={H} fill="#f7f7f2" stroke={t.ink} strokeWidth="5" />
          {[60, 150, 230, 330, 410].map(by => (
            <rect key={by} x={bx + (by % 20 ? 0 : bw / 3)} y={by + i * 20} width={bw * 0.6} height="7" fill={t.ink} />
          ))}
        </g>
      ))}
      <Particles
        seed={29}
        count={22}
        render={(i, x, y, s) => (
          <ellipse cx={x} cy={y} rx={5 * s} ry={3 * s} fill={i % 2 ? '#ffffff' : t.accent} opacity="0.9" />
        )}
      />
      <RunningAthlete
        x={1020}
        y={196}
        scale={1.05}
        ink={t.ink}
        body={t.accent}
        shade="#b3203d"
        rim="#ffffff"
        stripe={t.accent2}
        headwear="cap"
        headwearColor={t.accent2}
        ghostColor="#ffffff"
        lines="#ffffff"
      />
      <ControlFlag x={1390} y={300} size={90} ink={t.ink} />
    </>
  ),
  AUTUMN: (t, ids) => (
    <>
      <circle cx={1150} cy={360} r={260} fill={`url(#${ids.glow})`} className="cup-pulse" />
      <path d={ridge(33, 350, 90, 7)} fill={t.ridges[0]} />
      <rect x="0" y="340" width={W + 80} height="70" fill="#ffb066" opacity="0.18" className="cup-drift" />
      <path d={treeline(61, 420, 70, 170, 48)} fill={t.ridges[1]} />
      <rect x="0" y="400" width={W} height="40" fill="#ff9a40" opacity="0.12" />
      <path d={treeline(73, 480, 50, 120, 80)} fill={t.ridges[2]} />
      <rect x="0" y="476" width={W} height="44" fill={t.ridges[2]} />
      <Particles
        seed={41}
        count={26}
        render={(i, x, y, s) => (
          <path
            d={leafPath}
            transform={`translate(${x} ${y}) scale(${s})`}
            fill={['#ff7a1a', '#ffd166', '#c1272d', '#e85d04'][i % 4]}
            stroke="#000000"
            strokeWidth="2.5"
          />
        )}
      />
      <RunningAthlete
        x={1000}
        y={206}
        scale={1.05}
        ink="#000000"
        body="#4a2614"
        shade="#26120a"
        rim={t.accent2}
        stripe={t.accent}
        headwear="cap"
        headwearColor={t.accent}
        ghostColor={t.accent}
        lines={t.accent2}
      />
      <ControlFlag x={1440} y={320} size={92} ink="#000000" />
    </>
  )
};

/** The illustrated hero scene for a theme, fills its container */
/** crop: the part of the scene to show [x, width], e.g. around the athlete on a portrait cover */
export const CupBannerScene = ({ theme, crop }: { theme: ICupTheme; crop?: [number, number] }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ids = {
    sky: `cupSky${uid}`,
    dots: `cupDots${uid}`,
    fade: `cupFade${uid}`,
    glow: `cupGlow${uid}`,
    beam: `cupBeam${uid}`
  };
  const glowIsBand = theme.type === 'WINTER';
  return (
    <StyledSvg
      viewBox={crop ? `${crop[0]} 0 ${crop[1]} ${H}` : `0 0 ${W} ${H}`}
      preserveAspectRatio={crop ? 'xMidYMax slice' : 'xMaxYMax slice'}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={ids.sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={theme.sky[0]} />
          <stop offset="0.55" stopColor={theme.sky[1]} />
          <stop offset="1" stopColor={theme.sky[2]} />
        </linearGradient>
        {glowIsBand ? (
          <linearGradient id={ids.glow} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={theme.glow} stopOpacity="0" />
            <stop offset="0.3" stopColor={theme.glow} stopOpacity="0.9" />
            <stop offset="0.65" stopColor="#7c6cff" stopOpacity="0.7" />
            <stop offset="1" stopColor={theme.glow} stopOpacity="0" />
          </linearGradient>
        ) : (
          <radialGradient id={ids.glow}>
            <stop offset="0" stopColor={theme.glow} stopOpacity="0.85" />
            <stop offset="0.4" stopColor={theme.glow} stopOpacity="0.3" />
            <stop offset="1" stopColor={theme.glow} stopOpacity="0" />
          </radialGradient>
        )}
        <linearGradient id={ids.beam} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={theme.glow} stopOpacity="0.75" />
          <stop offset="1" stopColor={theme.glow} stopOpacity="0" />
        </linearGradient>
        <pattern id={ids.dots} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <circle cx="4.5" cy="4.5" r="2.1" fill={theme.ink} />
        </pattern>
        <linearGradient id={ids.fade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.35" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="1" />
        </linearGradient>
        <mask id={`${ids.fade}Mask`}>
          <rect width={W} height={H} fill={`url(#${ids.fade})`} />
        </mask>
      </defs>
      <rect width={W} height={H} fill={`url(#${ids.sky})`} />
      {scenes[theme.type](theme, ids)}
      {/* halftone shading towards the ground, the comic book print */}
      <rect width={W} height={H} fill={`url(#${ids.dots})`} mask={`url(#${ids.fade}Mask)`} opacity="0.22" />
    </StyledSvg>
  );
};

/** A small preview of the theme, used when choosing theme */
export const CupThemePreview = ({ theme, width = 180 }: { theme: ICupTheme; width?: number }) => (
  <div
    style={{
      width,
      maxWidth: '100%',
      aspectRatio: `${W} / ${H}`,
      border: `3px solid ${theme.ink}`,
      boxShadow: `5px 5px 0 ${theme.accent}`,
      overflow: 'hidden',
      background: theme.sky[1]
    }}
  >
    <CupBannerScene theme={theme} />
  </div>
);
