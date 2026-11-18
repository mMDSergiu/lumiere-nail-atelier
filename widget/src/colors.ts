export const PALETTE: { name: string; hex: string }[] = [
  { name: 'Ballet', hex: '#f6e3dc' },
  { name: 'Nude', hex: '#e8c4b0' },
  { name: 'Latte', hex: '#cf9f86' },
  { name: 'Mocha', hex: '#8f5f4a' },
  { name: 'Blush', hex: '#f8ccd8' },
  { name: 'Bubblegum', hex: '#f49ac1' },
  { name: 'Rose', hex: '#e75a8c' },
  { name: 'Fuchsia', hex: '#c2185b' },
  { name: 'Coral', hex: '#ff8a70' },
  { name: 'Cherry', hex: '#e0303f' },
  { name: 'Classic red', hex: '#b3122e' },
  { name: 'Wine', hex: '#6e1a32' },
  { name: 'Apricot', hex: '#ffb877' },
  { name: 'Butter', hex: '#ffe39a' },
  { name: 'Mint', hex: '#aee6cf' },
  { name: 'Sage', hex: '#9fb89a' },
  { name: 'Emerald', hex: '#1f7a55' },
  { name: 'Baby blue', hex: '#bcdcff' },
  { name: 'Sky', hex: '#5c9ded' },
  { name: 'Navy', hex: '#1e2f6e' },
  { name: 'Lilac', hex: '#dcc6f0' },
  { name: 'Lavender', hex: '#9c7ade' },
  { name: 'Plum', hex: '#5b2a6e' },
  { name: 'Gold', hex: '#d4af37' },
  { name: 'Rose gold', hex: '#c98b8b' },
  { name: 'Silver', hex: '#c7c9cf' },
  { name: 'Grey', hex: '#8d8a8c' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Black', hex: '#1b1719' },
];

export const SKIN_TONES = ['#f7dcc9', '#edc3a6', '#d9a37f', '#b97e58', '#8d5a3c', '#5c3826'];

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(a: string, b: string, t: number): RGB {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return [0, 1, 2].map((i) => Math.round(A[i] + (B[i] - A[i]) * t)) as RGB;
}

const css = (c: RGB, a = 1) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

export const darken = (hex: string, t: number, a = 1) => css(mixRgb(hex, '#2a1410', t), a);
export const lighten = (hex: string, t: number, a = 1) => css(mixRgb(hex, '#ffffff', t), a);
export const rgba = (hex: string, a: number) => css(hexToRgb(hex), a);

let parser: CanvasRenderingContext2D | null = null;

/**
 * Parses any CSS color (hex, rgb(), hsl(), names…) using the browser's own canvas parser.
 * Returns null for values the browser does not accept.
 */
export function parseColor(color: string): { rgb: RGB; a: number } | null {
  parser ??= document.createElement('canvas').getContext('2d');
  if (!parser) return null;
  const sentinel = '#010203';
  parser.fillStyle = sentinel;
  parser.fillStyle = color;
  const out = String(parser.fillStyle);
  if (out === sentinel && color.trim().toLowerCase() !== sentinel) return null;
  if (out.startsWith('#')) return { rgb: hexToRgb(out), a: 1 };
  const m = out.match(/[\d.]+/g);
  if (!m || m.length < 3) return null;
  return { rgb: [+m[0], +m[1], +m[2]], a: m[3] !== undefined ? +m[3] : 1 };
}

/** Any CSS color with a new alpha. */
export function withAlpha(color: string, a: number): string {
  const p = parseColor(color);
  return p ? css(p.rgb, a) : `rgba(255, 255, 255, ${a})`;
}

export function normalizeHex(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}
