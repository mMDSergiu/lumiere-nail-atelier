// Ready-made designs clients can start from. Coordinates are in "nail units":
// the nail is 1 wide, x = -0.5..0.5, cuticle at y = 0, tip at y = -length
// (short 1.05 · medium 1.4 · long 1.8 · xl 2.3).

let n = 0;
const id = () => `insp${n++}`;

const nail = (base, finish = 'gloss', layers = []) => ({
  base: { type: 'solid', colors: ['#f8ccd8', '#ffffff', '#e75a8c'], count: 2, angle: 0, ...base },
  finish,
  layers,
});
const five = (make) => Array.from({ length: 5 }, (_, i) => make(i));
const sticker = (preset, x, y, scale = 0.3, rot = 0) => ({ id: id(), type: 'sticker', preset, x, y, scale, rot, flip: false });
const shape = (preset, color, x, y, scale, rot = 0, style = 'fill', weight = 0.03) => ({
  id: id(),
  type: 'shape',
  preset,
  color,
  x,
  y,
  scale,
  rot,
  flip: false,
  style,
  weight,
});

export const INSPIRATIONS = [
  {
    name: 'Classic French',
    tags: 'Almond · Long',
    design: {
      shape: 'almond',
      length: 'long',
      skin: '#edc3a6',
      nails: five(() => nail({ type: 'french', colors: ['#f6dcd4', '#ffffff', '#ffffff'] })),
    },
  },
  {
    name: 'Baby Boomer',
    tags: 'Squoval · Medium',
    design: {
      shape: 'squoval',
      length: 'medium',
      skin: '#d9a37f',
      nails: five(() => nail({ type: 'ombre', colors: ['#efc2b4', '#fff8f4', '#ffffff'] })),
    },
  },
  {
    name: 'Golden Hour',
    tags: 'Coffin · Long',
    design: {
      shape: 'coffin',
      length: 'long',
      skin: '#edc3a6',
      nails: five((i) =>
        i === 3
          ? nail({ colors: ['#e0b53f', '#ffffff', '#ffffff'] }, 'glitter')
          : nail({ type: 'linear', colors: ['#ffb877', '#e75a8c', '#9c7ade'], count: 3, angle: 0 }, 'gloss',
              i === 2 ? [sticker('gold-sparkles', 0, -1.15, 0.42)] : []),
      ),
    },
  },
  {
    name: 'Love Notes',
    tags: 'Almond · Medium',
    design: {
      shape: 'almond',
      length: 'medium',
      skin: '#f7dcc9',
      nails: five((i) =>
        i === 1 || i === 3
          ? nail({ colors: ['#f8ccd8', '#ffffff', '#ffffff'] }, 'gloss', [shape('sym-heart', '#e0303f', 0, -0.72, 0.42)])
          : nail({ colors: ['#f8ccd8', '#ffffff', '#ffffff'] }, 'gloss', [shape('line-smile', '#e0303f', 0, -1.18, 1.05, 0, 'fill', 0.045)]),
      ),
    },
  },
  {
    name: 'Midnight Stars',
    tags: 'Stiletto · Long',
    design: {
      shape: 'stiletto',
      length: 'long',
      skin: '#b97e58',
      nails: five((i) =>
        nail({ colors: ['#1e2f6e', '#ffffff', '#ffffff'] }, 'glitter',
          i === 1
            ? [sticker('gold-moon', 0, -0.75, 0.42)]
            : i === 3
              ? [sticker('gold-star', -0.1, -0.6, 0.26), sticker('gold-star', 0.12, -1.05, 0.18)]
              : [],
        ),
      ),
    },
  },
  {
    name: 'Daisy Garden',
    tags: 'Round · Short',
    design: {
      shape: 'round',
      length: 'short',
      skin: '#8d5a3c',
      nails: five((i) =>
        nail({ colors: ['#aee6cf', '#ffffff', '#ffffff'] }, 'matte',
          i === 0 || i === 3
            ? [sticker('daisy', 0, -0.52, 0.55)]
            : [shape('doo-daisy', '#ffffff', 0.12, -0.7, 0.3), shape('line-dotted', '#ffffff', 0, -0.3, 0.75, 0.2)],
        ),
      ),
    },
  },
  {
    name: 'Lilac Chrome',
    tags: 'Almond · Extra long',
    design: {
      shape: 'almond',
      length: 'xl',
      skin: '#edc3a6',
      nails: five(() => nail({ type: 'radial', colors: ['#f1e6fb', '#9c7ade', '#ffffff'] }, 'chrome')),
    },
  },
  {
    name: 'Marble Luxe',
    tags: 'Squoval · Long',
    design: {
      shape: 'squoval',
      length: 'long',
      skin: '#5c3826',
      nails: five((i) =>
        nail({ colors: ['#ffffff', '#ffffff', '#ffffff'] }, 'gloss', [
          shape('abs-marble', '#9a979b', 0.05 * (i - 2), -0.95, 1.05, 0.3 * (i - 2), 'fill', 0.012),
          shape('abs-marble', '#d4af37', -0.08, -0.8, 0.8, 2.6, 'fill', 0.018),
          ...(i === 2 ? [sticker('pearl', 0, -0.35, 0.2)] : []),
        ]),
      ),
    },
  },
];
