// Scene `star-forge`: a pure function of (t seconds, aspect). No hooks that read
// the clock, no Math.random: the site drives `t` from its own clock, and the
// Remotion wrapper in Root.tsx drives it from useCurrentFrame.
import React from 'react';
import {Easing, interpolate, spring} from 'remotion';
import {fromCircle} from 'flubber';
import {loadFont as loadSpaceGrotesk} from '@remotion/google-fonts/SpaceGrotesk';
import {loadFont as loadJetBrainsMono} from '@remotion/google-fonts/JetBrainsMono';
import {GLYPH_C, GLYPH_C_HEIGHT} from './glyph-c';

export type Aspect = '9:16' | '16:9';
export const STAR_FORGE_SECONDS = 13;

const {fontFamily: SANS} = loadSpaceGrotesk('normal', {weights: ['400', '700'], subsets: ['latin']});
const {fontFamily: MONO} = loadJetBrainsMono('normal', {weights: ['500', '700'], subsets: ['latin']});

// Arcade Cosmos tokens (dark).
const C = {
  space: '#0d0626',
  pink: '#ff4fd8',
  purple: '#b44dff',
  blue: '#2340ff',
  cyan: '#3ee8ff',
  orange: '#ff9a1f',
  white: '#ffffff',
  muted: '#b9a8e8',
  surface: '#1a0f3d',
  line: '#6a4bd1',
  ink: '#1a0d3d',
};

// ---------- time helpers ----------
const smooth = Easing.inOut(Easing.cubic);
const ramp = (t: number, a: number, b: number, ease: (x: number) => number = smooth) =>
  interpolate(t, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp2 = (a: Pt, b: Pt, k: number): Pt => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const logLerp = (a: number, b: number, k: number) => Math.exp(lerp(Math.log(a), Math.log(b), k));
const FPS = 30;
// Remotion's spring, evaluated on the Scene's own clock (seconds -> frames).
const pop = (t: number, start: number) =>
  t < start ? 0 : spring({frame: (t - start) * FPS, fps: FPS, config: {damping: 13, stiffness: 160, mass: 0.7}});

type Pt = [number, number];

// Seeded PRNG (mulberry32) so the star field is identical every frame and every render.
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
};

// ---------- per-aspect layout (viewBox is centred on 0,0; short side = 1080) ----------
const LAYOUTS = {
  '16:9': {
    W: 1920,
    H: 1080,
    eqY: 360,
    eqSize: 84,
    starEnd: [-690, -360] as Pt,
    cellCentre: [0, -10] as Pt,
    cell: [330, 290] as Pt,
    cHeight: 300,
    cTop: [0, -262] as Pt,
    cTopScale: 0.6,
    card: {y: 197, w: 1560, h: 290},
    line1: {size: 60, ys: [165], text: ['Every carbon atom in you was forged in a star.']},
    line2: {size: 42, ys: [260], text: ['Organic chemistry is what that carbon learned to do next.']},
  },
  '9:16': {
    W: 1080,
    H: 1920,
    eqY: 560,
    eqSize: 92,
    starEnd: [-360, -740] as Pt,
    cellCentre: [0, -60] as Pt,
    cell: [380, 360] as Pt,
    cHeight: 340,
    cTop: [0, -520] as Pt,
    cTopScale: 0.72,
    card: {y: 282, w: 960, h: 650},
    line1: {size: 76, ys: [70, 160, 250], text: ['Every carbon atom', 'in you was forged', 'in a star.']},
    line2: {size: 46, ys: [400, 466, 532], text: ['Organic chemistry is', 'what that carbon', 'learned to do next.']},
  },
} as const;

// ---------- reusable defs ----------
const Defs: React.FC = () => (
  <defs>
    <radialGradient id="g-core">
      <stop offset="0" stopColor={C.white} stopOpacity={1} />
      <stop offset="0.22" stopColor={C.white} stopOpacity={0.95} />
      <stop offset="0.5" stopColor={C.orange} stopOpacity={0.95} />
      <stop offset="0.78" stopColor={C.orange} stopOpacity={0.35} />
      <stop offset="1" stopColor={C.orange} stopOpacity={0} />
    </radialGradient>
    <radialGradient id="g-halo">
      <stop offset="0" stopColor={C.orange} stopOpacity={0.55} />
      <stop offset="0.45" stopColor={C.orange} stopOpacity={0.16} />
      <stop offset="1" stopColor={C.orange} stopOpacity={0} />
    </radialGradient>
    <radialGradient id="g-corona">
      <stop offset="0" stopColor={C.pink} stopOpacity={0.0} />
      <stop offset="0.35" stopColor={C.pink} stopOpacity={0.12} />
      <stop offset="1" stopColor={C.pink} stopOpacity={0} />
    </radialGradient>
    {(['pink', 'purple', 'blue'] as const).map((k) => (
      <radialGradient id={`g-neb-${k}`} key={k}>
        <stop offset="0" stopColor={C[k]} stopOpacity={0.55} />
        <stop offset="0.45" stopColor={C[k]} stopOpacity={0.22} />
        <stop offset="1" stopColor={C[k]} stopOpacity={0} />
      </radialGradient>
    ))}
    <radialGradient id="g-glow-cyan">
      <stop offset="0" stopColor={C.cyan} stopOpacity={0.75} />
      <stop offset="0.4" stopColor={C.cyan} stopOpacity={0.25} />
      <stop offset="1" stopColor={C.cyan} stopOpacity={0} />
    </radialGradient>
    <radialGradient id="g-flash">
      <stop offset="0" stopColor={C.white} stopOpacity={1} />
      <stop offset="0.3" stopColor={C.white} stopOpacity={0.8} />
      <stop offset="0.6" stopColor={C.cyan} stopOpacity={0.35} />
      <stop offset="1" stopColor={C.cyan} stopOpacity={0} />
    </radialGradient>
    <radialGradient id="g-proton" cx="0.38" cy="0.35" r="0.7">
      <stop offset="0" stopColor={C.white} />
      <stop offset="0.35" stopColor={C.cyan} />
      <stop offset="1" stopColor={C.cyan} />
    </radialGradient>
    <radialGradient id="g-neutron" cx="0.38" cy="0.35" r="0.7">
      <stop offset="0" stopColor={C.white} />
      <stop offset="0.6" stopColor={C.white} />
      <stop offset="1" stopColor={C.muted} />
    </radialGradient>
    <radialGradient id="g-cell">
      <stop offset="0" stopColor={C.cyan} stopOpacity={0.0} />
      <stop offset="0.75" stopColor={C.cyan} stopOpacity={0.04} />
      <stop offset="1" stopColor={C.cyan} stopOpacity={0.12} />
    </radialGradient>
    {/* Wispy nebula texture: fixed-seed turbulence, used as a mask over the blobs. */}
    <filter id="f-wisp" x={-1800} y={-1800} width={3600} height={3600} filterUnits="userSpaceOnUse">
      <feTurbulence type="fractalNoise" baseFrequency="0.0022 0.0034" numOctaves={4} seed={7} />
      <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2.2 -0.75" />
    </filter>
    <filter id="f-blur-s" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" />
    </filter>
    <filter id="f-blur-m" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="16" />
    </filter>
  </defs>
);

// ---------- background ----------
const STARS = (() => {
  const rnd = mulberry32(20261018);
  return Array.from({length: 190}, () => ({
    x: (rnd() - 0.5) * 2400,
    y: (rnd() - 0.5) * 2400,
    r: 0.7 + rnd() * rnd() * 2.2,
    a: 0.35 + rnd() * 0.6,
    ph: rnd() * Math.PI * 2,
    sp: 0.6 + rnd() * 1.4,
    cyan: rnd() < 0.18,
  }));
})();

const StarField: React.FC<{t: number; off: Pt; opacity: number}> = ({t, off, opacity}) => (
  <g transform={`translate(${off[0]} ${off[1]})`} opacity={opacity}>
    {STARS.map((s, i) => (
      <circle
        key={i}
        cx={s.x}
        cy={s.y}
        r={s.r}
        fill={s.cyan ? C.cyan : C.white}
        opacity={s.a * (0.7 + 0.3 * Math.sin(t * s.sp + s.ph))}
      />
    ))}
  </g>
);

const NEB_BLOBS: {k: 'pink' | 'purple' | 'blue'; x: number; y: number; rx: number; ry: number; rot: number; o: number}[] = [
  {k: 'purple', x: -420, y: -160, rx: 900, ry: 520, rot: -18, o: 0.8},
  {k: 'pink', x: 380, y: 220, rx: 760, ry: 380, rot: 24, o: 0.55},
  {k: 'blue', x: 520, y: -380, rx: 820, ry: 460, rot: -8, o: 0.75},
  {k: 'pink', x: -620, y: 420, rx: 620, ry: 320, rot: 12, o: 0.45},
  {k: 'blue', x: -150, y: 640, rx: 900, ry: 380, rot: 4, o: 0.6},
  {k: 'purple', x: 760, y: 520, rx: 560, ry: 420, rot: -30, o: 0.6},
  {k: 'purple', x: 120, y: -760, rx: 700, ry: 340, rot: 10, o: 0.55},
];

const Nebula: React.FC<{t: number; off: Pt; scale: number; opacity: number}> = ({t, off, scale, opacity}) => {
  const drift = t * 6;
  return (
    <g opacity={opacity}>
      <mask id="m-wisp" maskUnits="userSpaceOnUse" x={-1800} y={-1800} width={3600} height={3600}>
        <rect x={-1800} y={-1800} width={3600} height={3600} fill="#fff" opacity={0.35} />
        <g transform={`translate(${off[0] * 0.8} ${off[1] * 0.8})`}>
          <rect x={-1800} y={-1800} width={3600} height={3600} filter="url(#f-wisp)" />
        </g>
      </mask>
      <g mask="url(#m-wisp)">
        <g transform={`translate(${off[0]} ${off[1]}) scale(${scale})`}>
          {NEB_BLOBS.map((b, i) => (
            <ellipse
              key={i}
              cx={0}
              cy={0}
              rx={b.rx}
              ry={b.ry}
              fill={`url(#g-neb-${b.k})`}
              opacity={b.o}
              transform={`translate(${b.x + Math.sin(i * 1.7) * drift} ${b.y + Math.cos(i * 2.3) * drift}) rotate(${b.rot})`}
            />
          ))}
        </g>
      </g>
    </g>
  );
};

// ---------- star core ----------
const StarCore: React.FC<{t: number; pos: Pt; scale: number; opacity: number; flash: number}> = ({
  t,
  pos,
  scale,
  opacity,
  flash,
}) => {
  const breath = 1 + 0.03 * Math.sin((t * 2 * Math.PI) / 2.8) + 0.012 * Math.sin((t * 2 * Math.PI) / 1.3 + 1);
  const s = scale * breath;
  return (
    <g transform={`translate(${pos[0]} ${pos[1]}) scale(${s})`} opacity={opacity}>
      <circle r={1000} fill="url(#g-corona)" />
      <circle r={760} fill="url(#g-halo)" />
      <circle r={330} fill="url(#g-core)" opacity={0.92 + 0.08 * flash} />
      {/* slow rotating "granulation" rays */}
      <g transform={`rotate(${t * 4})`} opacity={0.11}>
        {Array.from({length: 18}, (_, i) => (
          <ellipse key={i} rx={420 + (i % 3) * 60} ry={14} fill={C.orange} transform={`rotate(${i * 10 + (i % 2) * 3})`} filter="url(#f-blur-m)" />
        ))}
      </g>
    </g>
  );
};

// ---------- nuclei ----------
type Nucleon = {x: number; y: number; p: boolean};

const HE_LOCAL: Nucleon[] = [
  {x: -1, y: 0, p: true},
  {x: 1, y: 0, p: true},
  {x: 0, y: -1, p: false},
  {x: 0, y: 1, p: false},
];

// Carbon-12 packing: 3 inner + 9 outer, alternating p/n. Slot order is chosen so
// helium i fills the slots that face the direction it arrived from.
const HE_ANGLES = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
const C12_SLOTS: Nucleon[][] = HE_ANGLES.map((a, i) => {
  const inner = {x: Math.cos(a) * 0.62, y: Math.sin(a) * 0.62, p: i % 2 === 0};
  const outer = [-0.7, 0, 0.7].map((da, j) => ({
    x: Math.cos(a + da) * 1.62,
    y: Math.sin(a + da) * 1.62,
    p: (j + i) % 2 === 1,
  }));
  // order matches HE_LOCAL: p, p, n, n
  const ps = [inner, ...outer].filter((n) => n.p);
  const ns = [inner, ...outer].filter((n) => !n.p);
  while (ps.length < 2) ps.push(ns.pop()!);
  while (ns.length < 2) ns.push(ps.pop()!);
  return [ps[0], ps[1], ns[0], ns[1]];
});

const NucleonDot: React.FC<{x: number; y: number; r: number; p: boolean; opacity?: number}> = ({x, y, r, p, opacity = 1}) => (
  <circle cx={x} cy={y} r={r} fill={p ? 'url(#g-proton)' : 'url(#g-neutron)'} stroke={C.ink} strokeWidth={r * 0.14} opacity={opacity} />
);

// ---------- text ----------
// Isotope label with a real superscript mass number.
const Iso: React.FC<{mass: string; sym: string; size: number; x: number; y: number; opacity: number; anchor?: 'start' | 'middle'}> = ({
  mass,
  sym,
  size,
  x,
  y,
  opacity,
  anchor = 'middle',
}) => (
  <text
    x={x}
    y={y}
    fontFamily={MONO}
    fontWeight={700}
    fontSize={size}
    fill={C.white}
    textAnchor={anchor}
    opacity={opacity}
    stroke={C.space}
    strokeWidth={size * 0.22}
    strokeLinejoin="round"
    paintOrder="stroke"
  >
    <tspan fontSize={size * 0.62} dy={-size * 0.4}>
      {mass}
    </tspan>
    <tspan dy={size * 0.4}>{sym}</tspan>
  </text>
);

// 3B1B-style Write: each glyph's outline draws on, then the fill floods in, glyphs staggered.
const writeStyle = (t: number, start: number, i: number, n: number, dur: number, size: number) => {
  const lag = n > 1 ? (dur * 0.55) / (n - 1) : 0;
  const s0 = start + i * lag;
  const draw = ramp(t, s0, s0 + dur * 0.45, Easing.inOut(Easing.quad));
  const fill = ramp(t, s0 + dur * 0.3, s0 + dur * 0.45 + 0.2);
  const L = size * 9;
  return {
    strokeDasharray: `${L} ${L}`,
    strokeDashoffset: L * (1 - draw),
    fillOpacity: fill,
    strokeOpacity: draw > 0 ? 1 - 0.85 * fill : 0,
  };
};

const WriteLine: React.FC<{
  text: string;
  x: number;
  y: number;
  size: number;
  weight: number;
  color: string;
  family: string;
  t: number;
  start: number;
  dur: number;
}> = ({text, x, y, size, weight, color, family, t, start, dur}) => {
  const chars = [...text];
  return (
    <text
      x={x}
      y={y}
      fontFamily={family}
      fontWeight={weight}
      fontSize={size}
      textAnchor="middle"
      fill={color}
      stroke={color}
      strokeWidth={Math.max(1.2, size * 0.028)}
      strokeLinejoin="round"
    >
      {chars.map((ch, i) => {
        const st = writeStyle(t, start, i, chars.length, dur, size);
        return (
          <tspan key={i} {...st}>
            {ch}
          </tspan>
        );
      })}
    </text>
  );
};

// "3 ⁴He → ¹²C": monospace, so the layout is exact (advance = 0.6 em).
const Equation: React.FC<{t: number; y: number; size: number; opacity: number}> = ({t, y, size, opacity}) => {
  const adv = size * 0.6;
  const sup = size * 0.62;
  const supAdv = sup * 0.6;
  const parts: {kind: 'txt' | 'sup' | 'arrow'; s: string; w: number}[] = [
    {kind: 'txt', s: '3', w: adv},
    {kind: 'txt', s: '', w: adv * 0.5},
    {kind: 'sup', s: '4', w: supAdv},
    {kind: 'txt', s: 'He', w: adv * 2},
    {kind: 'txt', s: '', w: adv * 0.7},
    {kind: 'arrow', s: '', w: adv * 2.2},
    {kind: 'txt', s: '', w: adv * 0.7},
    {kind: 'sup', s: '12', w: supAdv * 2},
    {kind: 'txt', s: 'C', w: adv},
  ];
  const total = parts.reduce((a, p) => a + p.w, 0);
  let x = -total / 2;
  const start = 4.85;
  const dur = 1.35;
  // glyph order for the stagger
  const glyphs: {x: number; kind: string; ch: string}[] = [];
  for (const p of parts) {
    if (p.kind === 'arrow') glyphs.push({x, kind: 'arrow', ch: ''});
    else [...p.s].forEach((ch, j) => glyphs.push({x: x + j * (p.kind === 'sup' ? supAdv : adv), kind: p.kind, ch}));
    x += p.w;
  }
  const n = glyphs.length;
  return (
    <g opacity={opacity} transform={`translate(0 ${y})`}>
      {glyphs.map((g, i) => {
        if (g.kind === 'arrow') {
          const lag = (dur * 0.55) / (n - 1);
          const s0 = start + i * lag;
          const k = ramp(t, s0, s0 + dur * 0.5);
          const w = adv * 2.2;
          const ay = -size * 0.3;
          const len = w - adv * 0.2;
          return (
            <g key={i} stroke={C.white} strokeWidth={size * 0.07} strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d={`M${g.x} ${ay} H${g.x + len}`} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - k} />
              <path
                d={`M${g.x + len - size * 0.22} ${ay - size * 0.2} L${g.x + len} ${ay} L${g.x + len - size * 0.22} ${ay + size * 0.2}`}
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - ramp(t, s0 + dur * 0.3, s0 + dur * 0.55)}
              />
            </g>
          );
        }
        const st = writeStyle(t, start, i, n, dur, g.kind === 'sup' ? sup : size);
        return (
          <text
            key={i}
            x={g.x}
            y={g.kind === 'sup' ? -size * 0.4 : 0}
            fontFamily={MONO}
            fontWeight={700}
            fontSize={g.kind === 'sup' ? sup : size}
            fill={g.kind === 'sup' ? C.cyan : C.white}
            stroke={g.kind === 'sup' ? C.cyan : C.white}
            strokeWidth={size * 0.025}
            {...st}
          >
            {g.ch}
          </text>
        );
      })}
    </g>
  );
};

// ---------- cell membrane ----------
const blobPath = (rx: number, ry: number, t: number, phase: number) => {
  const N = 96;
  let d = '';
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const w = 1 + 0.035 * Math.sin(3 * a + t * 0.9 + phase) + 0.025 * Math.sin(5 * a - t * 1.2 + 1 + phase) + 0.015 * Math.sin(2 * a + t * 0.5);
    d += `${i === 0 ? 'M' : 'L'}${(Math.cos(a) * rx * w).toFixed(1)} ${(Math.sin(a) * ry * w).toFixed(1)}`;
  }
  return d + 'Z';
};

const Cell: React.FC<{t: number; pos: Pt; r: Pt; draw: number; opacity: number}> = ({t, pos, r, draw, opacity}) => {
  if (opacity <= 0) return null;
  const outer = blobPath(r[0], r[1], t, 0);
  const inner = blobPath(r[0] * 0.955, r[1] * 0.955, t, 0.25);
  return (
    <g transform={`translate(${pos[0]} ${pos[1]})`} opacity={opacity}>
      <path d={outer} fill="url(#g-cell)" opacity={draw} />
      <path d={outer} fill="none" stroke={C.cyan} strokeWidth={10} opacity={0.12 * draw} filter="url(#f-blur-s)" />
      <path d={outer} fill="none" stroke={C.cyan} strokeWidth={3} strokeOpacity={0.6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      <path
        d={inner}
        fill="none"
        stroke={C.cyan}
        strokeWidth={2}
        strokeOpacity={0.28}
        pathLength={1}
        strokeDasharray="1 1"
        strokeDashoffset={1 - ramp(draw, 0.15, 1, (x) => x)}
      />
    </g>
  );
};

// ---------- the Scene ----------
// flubber's fromCircle bakes the radius in; build one per radius lazily and memoise.
const morphCache = new Map<number, (k: number) => string>();
const morphFor = (r: number) => {
  let f = morphCache.get(r);
  if (!f) {
    f = fromCircle(0, 0, r, GLYPH_C, {maxSegmentLength: 6});
    morphCache.set(r, f);
  }
  return f;
};

export const StarForge: React.FC<{t: number; aspect: Aspect}> = ({t, aspect}) => {
  const L = LAYOUTS[aspect];
  const {W, H} = L;

  // ---- camera ----
  const fadeUp = ramp(t, 0, 1.6, Easing.out(Easing.quad));
  const push = 1 + 0.2 * ramp(t, 0, 6.5); // beats 1-3: slow push in
  const pull = ramp(t, 6.5, 8.9); // beat 4: calm pull back
  const starScale = logLerp(push, 0.03, pull);
  const starPos = lerp2([0, 0], L.starEnd, ramp(t, 6.7, 8.9));
  const nebOff = lerp2([0, 0], [-L.starEnd[0] * 0.45, -L.starEnd[1] * 0.45], pull);
  const nebScale = lerp(1.35, 1.0, pull);
  const nebOpacity = lerp(0.55, 1, pull) * fadeUp;
  const starsOff = lerp2([0, 0], [-L.starEnd[0] * 0.15, -L.starEnd[1] * 0.15], pull);

  // ---- helium approach (beat 2) ----
  const approach = ramp(t, 2.0, 4.55, Easing.inOut(Easing.sin));
  const heAppear = ramp(t, 2.0, 2.6);
  const nr = 13 * push; // nucleon radius in world px
  const heSpread = 14 * push;
  const heCentres: Pt[] = HE_ANGLES.map((a) => {
    const dist = lerp(aspect === '16:9' ? 640 : 600, 34 * push, approach);
    const ang = a - 0.75 * (1 - approach); // gentle spiral in
    return [Math.cos(ang) * dist, Math.sin(ang) * dist];
  });

  // ---- fusion (beat 3) ----
  const merge = ramp(t, 4.45, 5.25, Easing.inOut(Easing.quad));
  const flash = ramp(t, 4.5, 4.75, Easing.out(Easing.quad)) * (1 - ramp(t, 4.75, 5.9, Easing.out(Easing.quad)));
  const shock = ramp(t, 4.55, 5.8, Easing.out(Easing.cubic));

  // ---- carbon nucleus journey (beat 4) ----
  const travel = ramp(t, 6.6, 8.8);
  const bob: Pt = [Math.sin(travel * Math.PI) * (aspect === '16:9' ? 140 : 90), Math.sin(travel * Math.PI) * -40];
  const nucPos: Pt = [lerp(0, L.cellCentre[0], travel) + bob[0], lerp(0, L.cellCentre[1], travel) + bob[1]];
  const nucScale = lerp(push, 1.65, travel);
  const spin = t * 0.35 + merge * 0.6;
  const cellDraw = ramp(t, 7.5, 8.9);
  const cellFade = 1 - ramp(t, 10.5, 11.3);

  // ---- morph to C (beat 5) ----
  const collapse = ramp(t, 9.0, 9.35, Easing.in(Easing.quad));
  const morph = ramp(t, 9.15, 9.9, Easing.inOut(Easing.cubic));
  const cScale = L.cHeight / GLYPH_C_HEIGHT;
  const discR = (30 * nucScale) / cScale; // glyph-space radius matching the nucleus cluster
  const shapeD = morphFor(Math.round(discR))(morph);
  const dotStarts = [9.85, 10.05, 10.25, 10.45];

  // ---- slide up + card (beat 6) ----
  const slide = ramp(t, 10.5, 11.35);
  const groupPos = lerp2(L.cellCentre, L.cTop, slide);
  const groupScale = lerp(1, L.cTopScale, slide);
  const cardDraw = ramp(t, 10.85, 11.6);

  // nucleon positions (world, relative to star centre / nucleus)
  const nucleons: (Nucleon & {key: string})[] = [];
  HE_ANGLES.forEach((_, i) => {
    const rot = t * 0.9 + i * 2;
    HE_LOCAL.forEach((n, j) => {
      const lx = n.x * Math.cos(rot) - n.y * Math.sin(rot);
      const ly = n.x * Math.sin(rot) + n.y * Math.cos(rot);
      const heX = heCentres[i][0] + lx * heSpread;
      const heY = heCentres[i][1] + ly * heSpread;
      const slot = C12_SLOTS[i][j];
      const cx = (slot.x * Math.cos(spin) - slot.y * Math.sin(spin)) * 16 * nucScale;
      const cy = (slot.x * Math.sin(spin) + slot.y * Math.cos(spin)) * 16 * nucScale;
      // once merged the cluster rides the nucleus position (travel), then collapses to its centre
      const mx = lerp(heX, cx, merge) * (1 - collapse);
      const my = lerp(heY, cy, merge) * (1 - collapse);
      nucleons.push({x: mx, y: my, p: n.p, key: `${i}-${j}`});
    });
  });
  const nucleonR = lerp(nr, 13 * nucScale, merge);

  const heLabelOpacity = heAppear * (1 - ramp(t, 4.15, 4.5));
  const cLabelOpacity = ramp(t, 5.3, 5.8) * (1 - ramp(t, 8.85, 9.15));
  const eqOpacity = 1 - ramp(t, 6.55, 7.25);
  const nucleusVisible = t >= 2.0 && t < 9.4;
  const discOpacity = ramp(t, 9.05, 9.3);
  const glyphGlow = 1 - 0.6 * ramp(t, 9.9, 10.6);

  return (
    <svg width={W} height={H} viewBox={`${-W / 2} ${-H / 2} ${W} ${H}`} style={{display: 'block', background: C.space}}>
      <Defs />
      <rect x={-W / 2} y={-H / 2} width={W} height={H} fill={C.space} />
      <Nebula t={t} off={nebOff} scale={nebScale} opacity={nebOpacity} />
      <StarField t={t} off={starsOff} opacity={fadeUp} />
      <StarCore t={t} pos={starPos} scale={starScale} opacity={fadeUp} flash={flash} />

      <Cell t={t} pos={L.cellCentre} r={L.cell} draw={cellDraw} opacity={cellFade * ramp(t, 7.4, 8.0)} />

      {/* fusion flash + shockwave */}
      {flash > 0.001 && <circle r={60 + 380 * shock} fill="url(#g-flash)" opacity={flash} />}
      {shock > 0 && shock < 1 && (
        <circle r={40 + 520 * shock} fill="none" stroke={C.cyan} strokeWidth={4 * (1 - shock) + 0.5} opacity={0.8 * (1 - shock)} />
      )}

      {/* nuclei */}
      {nucleusVisible && (
        <g transform={`translate(${nucPos[0]} ${nucPos[1]})`} opacity={heAppear}>
          {/* soft cyan glow behind each helium / the carbon nucleus */}
          {merge < 1 &&
            heCentres.map((c, i) => <circle key={i} cx={c[0]} cy={c[1]} r={70 * push} fill="url(#g-glow-cyan)" opacity={1 - merge} />)}
          {merge > 0 && <circle r={110 * nucScale} fill="url(#g-glow-cyan)" opacity={merge * (1 - collapse)} />}
          {nucleons
            .slice()
            .sort((a, b) => a.y - b.y)
            .map((n) => (
              <NucleonDot key={n.key} x={n.x} y={n.y} r={nucleonR * (1 - 0.4 * collapse)} p={n.p} opacity={1 - ramp(t, 9.2, 9.4)} />
            ))}
        </g>
      )}

      {/* labels track their objects */}
      {heLabelOpacity > 0 &&
        heCentres.map((c, i) => (
          <Iso key={i} mass="4" sym="He" size={38} x={c[0]} y={c[1] - 46 * push - 14} opacity={heLabelOpacity} />
        ))}
      {cLabelOpacity > 0 && (
        <Iso
          mass="12"
          sym="C"
          size={46}
          x={nucPos[0] + 70 * nucScale}
          y={nucPos[1] - 52 * nucScale}
          opacity={cLabelOpacity}
          anchor="start"
        />
      )}

      {/* equation writes on */}
      {eqOpacity > 0 && t > 4.8 && <Equation t={t} y={L.eqY} size={L.eqSize} opacity={eqOpacity} />}

      {/* nucleus -> letter C, with four valence electrons */}
      {t >= 9.0 && (
        <g transform={`translate(${groupPos[0]} ${groupPos[1]}) scale(${groupScale})`}>
          <g transform={`scale(${cScale})`} opacity={discOpacity}>
            <path d={shapeD} fill={C.cyan} opacity={0.55 * glyphGlow} filter="url(#f-blur-m)" transform="scale(1.02)" />
            <path d={shapeD} fill={morph < 1 ? interpolateColour(morph) : C.white} />
          </g>
          {dotStarts.map((s, i) => {
            const k = pop(t, s);
            if (k <= 0) return null;
            const d = L.cHeight * 0.66;
            const [dx, dy] = [
              [0, -d],
              [d * 0.85, 0],
              [0, d],
              [-d * 0.85, 0],
            ][i];
            return (
              <g key={i} transform={`translate(${dx} ${dy}) scale(${k})`}>
                <circle r={40} fill="url(#g-glow-cyan)" />
                <circle r={15} fill={C.cyan} stroke={C.white} strokeWidth={2} strokeOpacity={0.5} />
              </g>
            );
          })}
        </g>
      )}

      {/* star-line card */}
      {t >= 10.8 && (
        <g transform={`translate(0 ${L.card.y})`}>
          <rect
            x={-L.card.w / 2}
            y={-L.card.h / 2}
            width={L.card.w}
            height={L.card.h}
            rx={32}
            fill={C.surface}
            fillOpacity={0.72 * ramp(t, 11.1, 11.7)}
            stroke={C.line}
            strokeWidth={2.5}
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - cardDraw}
          />
          {L.line1.text.map((txt, i) => (
            <WriteLine
              key={`a${i}`}
              text={txt}
              x={0}
              y={L.line1.ys[i] - L.card.y}
              size={L.line1.size}
              weight={700}
              color={C.white}
              family={SANS}
              t={t}
              start={11.0 + i * 0.32}
              dur={L.line1.text.length > 1 ? 0.75 : 1.15}
            />
          ))}
          {L.line2.text.map((txt, i) => (
            <WriteLine
              key={`b${i}`}
              text={txt}
              x={0}
              y={L.line2.ys[i] - L.card.y}
              size={L.line2.size}
              weight={400}
              color={C.muted}
              family={SANS}
              t={t}
              start={11.65 + i * 0.2}
              dur={L.line2.text.length > 1 ? 0.6 : 0.95}
            />
          ))}
        </g>
      )}
    </svg>
  );
};

// cyan -> white as the disc becomes the letter
const interpolateColour = (k: number) => {
  const a = [0x3e, 0xe8, 0xff];
  const b = [0xff, 0xff, 0xff];
  const e = smooth(k);
  return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], e))).join(',')})`;
};
