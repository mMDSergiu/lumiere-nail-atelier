export type NailShape = 'square' | 'squoval' | 'round' | 'almond' | 'coffin' | 'stiletto';
export type NailLength = 'short' | 'medium' | 'long' | 'xl';
export type BaseType = 'solid' | 'linear' | 'radial' | 'ombre' | 'french';
export type Finish = 'gloss' | 'matte' | 'glitter' | 'chrome';
export type Tool = 'nails' | 'base' | 'brush' | 'shapes' | 'stickers' | 'eraser';

/**
 * All design coordinates are in "nail units": the nail is 1 unit wide,
 * x runs from -0.5 (left) to 0.5 (right), the cuticle sits at y = 0 and the
 * tip at y = -length. This lets any design be copied to any nail.
 */
export interface Base {
  type: BaseType;
  /** Always 3 slots; how many are used depends on the type / `count`. */
  colors: string[];
  /** Number of colors used by linear / radial gradients (2 or 3). */
  count: number;
  /** Linear gradient angle in degrees (0 = cuticle to tip). */
  angle: number;
}

export interface StrokeLayer {
  id: string;
  type: 'stroke';
  color: string;
  size: number;
  opacity: number;
  erase: boolean;
  /** Flat list of points: x0, y0, x1, y1, ... */
  points: number[];
}

interface Placed {
  id: string;
  preset: string;
  x: number;
  y: number;
  /** Size in nail units of the preset's 100-unit box (1 = full nail width). */
  scale: number;
  /** Rotation in radians. */
  rot: number;
  flip: boolean;
}

export interface ShapeLayer extends Placed {
  type: 'shape';
  color: string;
  style: 'fill' | 'outline';
  /** Line thickness in nail units. */
  weight: number;
}

export interface StickerLayer extends Placed {
  type: 'sticker';
}

export type ElementLayer = ShapeLayer | StickerLayer;
export type Layer = StrokeLayer | ElementLayer;

export interface NailDesign {
  base: Base;
  finish: Finish;
  layers: Layer[];
}

export interface DesignState {
  nails: NailDesign[];
  length: NailLength;
  shape: NailShape;
  skin: string;
}
