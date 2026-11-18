import { LENGTHS } from './geometry';
import { shapeById, stickerById } from './presets';
import type { BaseType, DesignState, Finish, Layer, NailDesign, NailLength, NailShape } from './types';

/**
 * Designs passed to setDesign() can come from storage or other people, so every
 * value is rebuilt from known-safe pieces before it reaches the UI or innerHTML.
 */

const HEX = /^#[0-9a-f]{6}$/i;
const SHAPES: NailShape[] = ['square', 'squoval', 'round', 'almond', 'coffin', 'stiletto'];
const BASES: BaseType[] = ['solid', 'linear', 'radial', 'ombre', 'french'];
const FINISHES: Finish[] = ['gloss', 'matte', 'glitter', 'chrome'];
const MAX_LAYERS = 300;
const MAX_POINTS = 6000;

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const color = (v: unknown, fallback: string) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback);
const num = (v: unknown, fallback: number, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const pick = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
const id = (v: unknown) => (typeof v === 'string' && /^[\w-]{1,40}$/.test(v) ? v : Math.random().toString(36).slice(2, 10));

function layer(v: unknown): Layer | null {
  const l = obj(v);
  const placed = {
    id: id(l.id),
    preset: String(l.preset ?? ''),
    x: num(l.x, 0, -2, 2),
    y: num(l.y, -0.5, -4, 2),
    scale: num(l.scale, 0.4, 0.02, 4),
    rot: num(l.rot, 0, -100, 100),
    flip: l.flip === true,
  };
  if (l.type === 'stroke') {
    const pts = Array.isArray(l.points) ? l.points.slice(0, MAX_POINTS) : [];
    if (pts.length < 2 || pts.length % 2 || !pts.every((p) => typeof p === 'number' && Number.isFinite(p))) return null;
    return {
      id: placed.id,
      type: 'stroke',
      color: color(l.color, '#000000'),
      size: num(l.size, 0.03, 0.001, 0.5),
      opacity: num(l.opacity, 1, 0, 1),
      erase: l.erase === true,
      points: pts as number[],
    };
  }
  if (l.type === 'shape' && shapeById(placed.preset)) {
    return {
      ...placed,
      type: 'shape',
      color: color(l.color, '#ffffff'),
      style: l.style === 'outline' ? 'outline' : 'fill',
      weight: num(l.weight, 0.028, 0.002, 0.2),
    };
  }
  if (l.type === 'sticker' && stickerById(placed.preset)) return { ...placed, type: 'sticker' };
  return null;
}

function nail(v: unknown, fallback: NailDesign): NailDesign {
  const n = obj(v);
  const b = obj(n.base);
  const cols = Array.isArray(b.colors) ? b.colors : [];
  return {
    base: {
      type: pick(b.type, BASES, fallback.base.type),
      colors: [0, 1, 2].map((i) => color(cols[i], fallback.base.colors[i])),
      count: b.count === 3 ? 3 : 2,
      angle: num(b.angle, 0, -180, 180),
    },
    finish: pick(n.finish, FINISHES, fallback.finish),
    layers: (Array.isArray(n.layers) ? n.layers.slice(0, MAX_LAYERS) : []).map(layer).filter((l): l is Layer => l !== null),
  };
}

export function sanitizeDesign(input: unknown, fallback: DesignState): DesignState {
  const d = obj(input);
  const nails = Array.isArray(d.nails) ? d.nails : [];
  return {
    nails: fallback.nails.map((f, i) => nail(nails[i], f)),
    length: pick(d.length, Object.keys(LENGTHS) as NailLength[], fallback.length),
    shape: pick(d.shape, SHAPES, fallback.shape),
    skin: color(d.skin, fallback.skin),
  };
}
