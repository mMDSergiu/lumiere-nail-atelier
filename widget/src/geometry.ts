import type { NailLength, NailShape } from './types';

/* ------------------------------------------------------------------ nails */

/** Nail length in nail units (nail width = 1). */
export const LENGTHS: Record<NailLength, number> = { short: 1.05, medium: 1.4, long: 1.8, xl: 2.3 };
export const MAX_LENGTH = LENGTHS.xl;

export const LENGTH_OPTIONS: { id: NailLength; label: string }[] = [
  { id: 'short', label: 'Short' },
  { id: 'medium', label: 'Medium' },
  { id: 'long', label: 'Long' },
  { id: 'xl', label: 'Extra long' },
];

export const SHAPE_OPTIONS: { id: NailShape; label: string }[] = [
  { id: 'square', label: 'Square' },
  { id: 'squoval', label: 'Squoval' },
  { id: 'round', label: 'Round' },
  { id: 'almond', label: 'Almond' },
  { id: 'coffin', label: 'Coffin' },
  { id: 'stiletto', label: 'Stiletto' },
];

const n = (v: number) => +v.toFixed(4);
/** y where the cuticle curve meets the straight side walls. */
const SIDE = -0.2;

/** SVG path data of a nail outline in nail units (cuticle at y=0, tip at y=-L). */
export function nailPathD(shape: NailShape, L: number): string {
  const t = n(-L);
  const s = SIDE;
  const at = (f: number) => n(s + (t - s) * f);
  let d = `M-0.5 ${s} `;
  switch (shape) {
    case 'square':
      d += `L-0.5 ${n(t + 0.07)} Q-0.5 ${t} -0.43 ${t} L0.43 ${t} Q0.5 ${t} 0.5 ${n(t + 0.07)} `;
      break;
    case 'squoval':
      d += `L-0.5 ${n(t + 0.22)} Q-0.5 ${t} -0.28 ${t} L0.28 ${t} Q0.5 ${t} 0.5 ${n(t + 0.22)} `;
      break;
    case 'round':
      d += `L-0.5 ${n(t + 0.5)} C-0.5 ${n(t + 0.22)} -0.28 ${t} 0 ${t} C0.28 ${t} 0.5 ${n(t + 0.22)} 0.5 ${n(t + 0.5)} `;
      break;
    case 'almond':
      d += `C-0.53 ${at(0.62)} -0.2 ${t} 0 ${t} C0.2 ${t} 0.53 ${at(0.62)} 0.5 ${s} `;
      break;
    case 'coffin':
      d += `L-0.49 ${at(0.35)} L-0.3 ${n(t + 0.035)} Q-0.28 ${t} -0.25 ${t} L0.25 ${t} Q0.28 ${t} 0.3 ${n(t + 0.035)} L0.49 ${at(0.35)} `;
      break;
    case 'stiletto':
      d += `C-0.5 ${at(0.45)} -0.1 ${at(0.88)} 0 ${t} C0.1 ${at(0.88)} 0.5 ${at(0.45)} 0.5 ${s} `;
      break;
  }
  return d + `L0.5 ${s} C0.48 0.06 -0.48 0.06 -0.5 ${s}Z`;
}

const pathCache = new Map<string, Path2D>();
export function nailPath(shape: NailShape, L: number): Path2D {
  const key = `${shape}:${L}`;
  let p = pathCache.get(key);
  if (!p) {
    p = new Path2D(nailPathD(shape, L));
    pathCache.set(key, p);
  }
  return p;
}

/* ------------------------------------------------------------------- hand */

export const HAND_W = 1000;
export const HAND_H = 1180;
/** Tight crop around the hand (incl. extra-long nails) used when fitting it on screen. */
export const HAND_VIEW = { x: 50, y: 95, w: 820, h: 1085 };
/** Nail width relative to finger width. */
export const NAIL_RATIO = 0.72;
/** How far each finger capsule reaches back into the palm. */
const FINGER_BACK = 90;

export interface Finger {
  name: string;
  /** Base point (where the finger leaves the palm). */
  bx: number;
  by: number;
  /** Lean in degrees, 0 = straight up, positive = to the right. */
  angle: number;
  len: number;
  w: number;
}

/** Back of a right hand, fingers up, thumb on the left. */
export const FINGERS: Finger[] = [
  { name: 'Thumb', bx: 300, by: 872, angle: -40, len: 250, w: 110 },
  { name: 'Index finger', bx: 400, by: 652, angle: -9, len: 370, w: 96 },
  { name: 'Middle finger', bx: 503, by: 632, angle: -1, len: 420, w: 100 },
  { name: 'Ring finger', bx: 604, by: 650, angle: 7, len: 385, w: 95 },
  { name: 'Pinky', bx: 696, by: 702, angle: 17, len: 290, w: 82 },
];

export const PALM_D =
  'M352 652 C420 612 620 604 740 670 C770 760 762 900 732 1010 C717 1080 714 1140 714 1180 ' +
  'L398 1180 C398 1100 360 1030 318 975 C290 940 300 880 322 820 C335 760 340 690 352 652Z';

/** Position, rotation and width of a finger's nail (cuticle point). */
export function nailFrame(f: Finger) {
  const nw = f.w * NAIL_RATIO;
  const a = (f.angle * Math.PI) / 180;
  const dist = f.len - nw;
  return { x: f.bx + Math.sin(a) * dist, y: f.by - Math.cos(a) * dist, rot: a, nw };
}

/** Finger capsule in finger-local coordinates (base at 0,0, tip at y=-len). */
export function fingerLocalPath(w: number, top: number, bottom: number): Path2D {
  const r = w / 2;
  const p = new Path2D();
  p.moveTo(-r, bottom);
  p.lineTo(-r, top + r);
  p.arc(0, top + r, r, Math.PI, 0);
  p.lineTo(r, bottom);
  p.closePath();
  return p;
}

const fingerPathCache = new Map<Finger, Path2D>();
export function fingerPath(f: Finger): Path2D {
  let p = fingerPathCache.get(f);
  if (!p) {
    p = new Path2D();
    p.addPath(fingerLocalPath(f.w, -f.len, FINGER_BACK), new DOMMatrix().translate(f.bx, f.by).rotate(f.angle));
    fingerPathCache.set(f, p);
  }
  return p;
}

let palm: Path2D | null = null;
export function palmPath(): Path2D {
  return (palm ??= new Path2D(PALM_D));
}

let scratch: CanvasRenderingContext2D | null = null;
function scratchCtx(): CanvasRenderingContext2D {
  return (scratch ??= document.createElement('canvas').getContext('2d')!);
}

/** Returns the finger index under a point in hand coordinates, or -1. */
export function fingerAt(x: number, y: number, shape: NailShape, L: number): number {
  const ctx = scratchCtx();
  // Nails first: long nails stick out past the fingertip.
  for (let i = 0; i < FINGERS.length; i++) {
    const fr = nailFrame(FINGERS[i]);
    const c = Math.cos(-fr.rot);
    const s = Math.sin(-fr.rot);
    const dx = x - fr.x;
    const dy = y - fr.y;
    const lx = (dx * c - dy * s) / fr.nw;
    const ly = (dx * s + dy * c) / fr.nw;
    if (ctx.isPointInPath(nailPath(shape, L), lx, ly)) return i;
  }
  for (let i = 0; i < FINGERS.length; i++) {
    const f = FINGERS[i];
    const a = (-f.angle * Math.PI) / 180;
    const dx = x - f.bx;
    const dy = y - f.by;
    const lx = dx * Math.cos(a) - dy * Math.sin(a);
    const ly = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(lx) <= f.w / 2 + 6 && ly >= -f.len - 6 && ly <= 30) return i;
  }
  return -1;
}
