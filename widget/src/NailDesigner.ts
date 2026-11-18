import { PALETTE, SKIN_TONES, normalizeHex, parseColor } from './colors';
import { FINGERS, HAND_VIEW, LENGTHS, LENGTH_OPTIONS, MAX_LENGTH, SHAPE_OPTIONS, fingerAt } from './geometry';
import { makeTranslator, toLang, type Translate } from './i18n';
import { ICONS } from './icons';
import { SHAPES, SHAPE_CATS, STICKERS, STICKER_CATS, shapeById, type ShapeCat, type StickerCat } from './presets';
import {
  drawFingerTip,
  drawSelection,
  drawStrokePath,
  exportImage,
  handlePoints,
  handPreview,
  hitElement,
  nailCloseup,
  nailThumb,
  renderHand,
  renderNail,
  stickerThumb,
} from './render';
import { sanitizeDesign } from './sanitize';
import { Store } from './store';
import { CSS } from './styles';
import type {
  BaseType,
  DesignState,
  ElementLayer,
  Finish,
  NailDesign,
  NailLength,
  NailShape,
  ShapeLayer,
  StrokeLayer,
  Tool,
} from './types';

/* ------------------------------------------------------------- constants */

const DEFAULT_ACCENT = '#d4567a';
const BRUSH_UNIT = 0.006;
const ERASER_UNIT = 0.008;
const WEIGHT_UNIT = 0.007;

const TOOLS: { id: Tool; label: string; icon: string; title: string; desc: string; hint: string }[] = [
  {
    id: 'nails',
    label: 'Nails',
    icon: ICONS.nail,
    title: 'Shape & length',
    desc: 'Choose how your nails are shaped and how long they are.',
    hint: 'Tap a finger on the hand to pick a nail',
  },
  {
    id: 'base',
    label: 'Polish',
    icon: ICONS.drop,
    title: 'Polish',
    desc: 'Pick a base color, a gradient style and a finish.',
    hint: 'Pick a style, colors and a finish on the left',
  },
  {
    id: 'brush',
    label: 'Brush',
    icon: ICONS.brush,
    title: 'Brush',
    desc: 'Draw freehand on the nail. Raise smoothness for clean curves.',
    hint: 'Draw on the nail with your finger or mouse',
  },
  {
    id: 'shapes',
    label: 'Shapes',
    icon: ICONS.shapes,
    title: 'Shapes & lines',
    desc: 'Add lines, circles, symbols and little drawings.',
    hint: 'Drag to move · corner handle resizes & rotates',
  },
  {
    id: 'stickers',
    label: 'Stickers',
    icon: ICONS.sparkle,
    title: 'Stickers',
    desc: 'Rhinestones, pearls, charms and cute decorations.',
    hint: 'Drag to move · corner handle resizes & rotates',
  },
  {
    id: 'eraser',
    label: 'Eraser',
    icon: ICONS.eraser,
    title: 'Eraser',
    desc: 'Rub out parts of your drawing. Your polish stays.',
    hint: 'Rub over the parts you want to remove',
  },
];

const BASE_TYPES: { id: BaseType; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'linear', label: 'Gradient' },
  { id: 'radial', label: 'Radial' },
  { id: 'ombre', label: 'Ombré' },
  { id: 'french', label: 'French' },
];

const FINISHES: { id: Finish; label: string }[] = [
  { id: 'gloss', label: 'Glossy' },
  { id: 'matte', label: 'Matte' },
  { id: 'glitter', label: 'Glitter' },
  { id: 'chrome', label: 'Chrome' },
];

/* --------------------------------------------------------------- helpers */

const uid = () => Math.random().toString(36).slice(2, 10);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function defaultNail(): NailDesign {
  return { base: { type: 'solid', colors: ['#f8ccd8', '#ffffff', '#e75a8c'], count: 2, angle: 0 }, finish: 'gloss', layers: [] };
}

function defaultState(): DesignState {
  return { nails: Array.from({ length: 5 }, defaultNail), length: 'medium', shape: 'almond', skin: SKIN_TONES[1] };
}

/** English labels (translate with t()). */
function slotLabels(type: BaseType, count: number): string[] {
  switch (type) {
    case 'solid':
      return ['Color'];
    case 'french':
      return ['Base', 'Tip'];
    case 'ombre':
      return ['Cuticle', 'Tip'];
    default:
      return count === 3 ? ['Color 1', 'Color 2', 'Color 3'] : ['Color 1', 'Color 2'];
  }
}

/** Corner-cutting smoothing that keeps the end points. */
function chaikin(pts: number[]): number[] {
  if (pts.length < 6) return pts;
  const out = [pts[0], pts[1]];
  for (let i = 0; i < pts.length - 2; i += 2) {
    const [x0, y0, x1, y1] = [pts[i], pts[i + 1], pts[i + 2], pts[i + 3]];
    out.push(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1, 0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1);
  }
  out.push(pts[pts.length - 2], pts[pts.length - 1]);
  return out;
}

function smoothPasses(smooth: number): number {
  return smooth >= 0.67 ? 2 : smooth >= 0.25 ? 1 : 0;
}

type Drag =
  | { mode: 'move'; id: string; dx: number; dy: number }
  | { mode: 'transform'; id: string; a0: number; d0: number; rot0: number; scale0: number };

/* ============================================================= component */

export class NailDesigner extends HTMLElement {
  static get observedAttributes() {
    return ['accent', 'salon-name', 'lang', 'theme'];
  }

  private shadow: ShadowRoot;
  private store = new Store(defaultState());
  private built = false;
  private t: Translate = makeTranslator('en');

  private ui = {
    tool: 'nails' as Tool,
    active: 1,
    applyAll: false,
    selectedId: null as string | null,
    shapeCat: 'lines' as ShapeCat,
    stickerCat: 'gems' as StickerCat,
    baseSlot: 0,
  };
  private brush = { color: '#e75a8c', size: 6, smooth: 55, opacity: 100 };
  private eraser = { size: 12 };
  private shapeOpt = { color: '#ffffff', style: 'fill' as 'fill' | 'outline', weight: 4 };
  private recent: string[] = [];
  private nailClipboard: NailDesign | null = null;
  private elementClipboard: ElementLayer | null = null;

  private els!: {
    panel: HTMLElement;
    editor: HTMLCanvasElement;
    hand: HTMLCanvasElement;
    editorWrap: HTMLElement;
    handWrap: HTMLElement;
    nailLabel: HTMLElement;
    hint: HTMLElement;
    allBadge: HTMLElement;
    salon: HTMLElement;
    modal: HTMLElement;
    modalImg: HTMLImageElement;
    toast: HTMLElement;
  };

  private dpr = 1;
  private view = { px: 100, ox: 0, oy: 0 };
  private handView = { s: 1, ox: 0, oy: 0 };
  private raf = 0;
  private dirtyEditor = false;
  private dirtyHand = false;
  private ro: ResizeObserver | null = null;
  private toastTimer = 0;
  private accentColor = DEFAULT_ACCENT;
  private fadeColor: string | undefined;
  private pointerId: number | null = null;
  private returnFocus: HTMLElement | null = null;
  private lastImage = '';

  private draft: StrokeLayer | null = null;
  private lazy = { x: 0, y: 0, tx: 0, ty: 0 };
  private drag: Drag | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.build();
  }

  /* ------------------------------------------------------- lifecycle */

  connectedCallback() {
    this.readTheme();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.els.editorWrap);
    this.ro.observe(this.els.handWrap);
    this.resize();
  }

  disconnectedCallback() {
    this.ro?.disconnect();
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'accent') {
      if (value) this.style.setProperty('--nd-accent', value);
      else this.style.removeProperty('--nd-accent');
      if (this.isConnected) this.readTheme();
      this.requestDraw();
    }
    if (name === 'salon-name' && this.built) this.els.salon.textContent = value ?? '';
    if (name === 'lang') this.applyLang(value);
    if (name === 'theme' && this.isConnected) {
      this.readTheme();
      this.requestDraw();
    }
  }

  /** Re-labels the whole studio in the given language. */
  private applyLang(value: string | null) {
    this.t = makeTranslator(toLang(value));
    if (!this.built) return;
    const t = this.t;
    this.shadow.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n!)));
    this.shadow.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => (el.title = t(el.dataset.i18nTitle!)));
    this.shadow.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria!)));
    this.renderPanel();
    this.updateChrome();
  }

  /* ------------------------------------------------------- public API */

  /** Current design as plain JSON (can be saved and restored with setDesign). */
  getDesign(): DesignState {
    return clone(this.store.state);
  }

  setDesign(design: DesignState) {
    const safe = sanitizeDesign(design, defaultState());
    this.store.commit((s) => Object.assign(s, safe));
    this.ui.selectedId = null;
    this.renderPanel();
  }

  /** PNG data URL of the finished design. */
  /**
   * Picture of just the hand for any design (defaults to the current one),
   * e.g. for inspiration galleries. `background` should match where it is shown.
   */
  previewImage(design?: DesignState, width = 600, height = 700, background = '#faf4f1'): string {
    const s = design ? sanitizeDesign(design, defaultState()) : this.s;
    return handPreview(s, width, height, background);
  }

  /** Close-up of one nail (0 = thumb … 4 = pinky) of a design, on a transparent background. */
  nailImage(design?: DesignState, index = 1, width = 220, height = 420): string {
    const s = design ? sanitizeDesign(design, defaultState()) : this.s;
    const i = clamp(Math.round(index), 0, 4);
    return nailCloseup(s.nails[i], s.shape, LENGTHS[s.length], width, height, i + 1);
  }

  toDataURL(): string {
    return this.renderExport();
  }

  /* ------------------------------------------------------------ build */

  private build() {
    this.built = true;
    const rail = TOOLS.map(
      (t) =>
        `<button class="tool" role="tab" data-action="tool" data-value="${t.id}" aria-selected="false" data-i18n-title="${t.title}">${t.icon}<span data-i18n="${t.label}"></span></button>`,
    ).join('');

    this.shadow.innerHTML = `<style>${CSS}</style>
<div class="app" part="app">
  <header class="topbar">
    <div class="brand">
      <span class="logo">${ICONS.sparkle}</span>
      <div class="brand-text"><div class="brand-title" data-i18n="Nail Design Studio"></div><div class="brand-sub" data-ref="salon"></div></div>
    </div>
    <div class="top-actions">
      <button class="icon-btn" data-action="undo" data-i18n-title="Undo (Ctrl+Z)" data-i18n-aria="Undo">${ICONS.undo}</button>
      <button class="icon-btn" data-action="redo" data-i18n-title="Redo (Ctrl+Shift+Z)" data-i18n-aria="Redo">${ICONS.redo}</button>
      <button class="icon-btn" data-action="reset" data-i18n-title="Start over" data-i18n-aria="Start over">${ICONS.reset}</button>
      <span class="divider"></span>
      <button class="btn primary finish" data-action="finish" data-i18n-aria="Finish and preview">${ICONS.check}<span data-i18n="Finish"></span></button>
    </div>
  </header>
  <div class="body">
    <nav class="rail" role="tablist" data-i18n-aria="Tools">${rail}</nav>
    <aside class="panel" data-ref="panel"></aside>
    <main class="stage">
      <section class="card hand-card">
        <div class="card-head">
          <span class="card-title" data-i18n="Your hand"></span>
          <div class="seg" role="group" data-i18n-aria="Apply changes to">
            <button data-action="apply" data-value="one" aria-pressed="true" data-i18n="This nail"></button>
            <button data-action="apply" data-value="all" aria-pressed="false" data-i18n="All nails"></button>
          </div>
        </div>
        <div class="canvas-wrap hand-wrap" data-ref="handWrap"><canvas data-ref="hand" data-i18n-aria="Hand preview. Tap a finger to select its nail."></canvas></div>
        <div class="card-foot">
          <button class="mini" data-action="nail-copy" data-i18n-title="Copy this nail's design">${ICONS.copy}<span data-i18n="Copy"></span></button>
          <button class="mini" data-action="nail-paste" data-i18n-title="Paste design onto this nail" disabled>${ICONS.paste}<span data-i18n="Paste"></span></button>
          <button class="mini" data-action="nail-all" data-i18n-title="Copy this design to all nails">${ICONS.all}<span data-i18n="Use on all"></span></button>
          <button class="mini" data-action="nail-clear" data-i18n-title="Remove drawings, shapes and stickers">${ICONS.trash}<span data-i18n="Clear"></span></button>
        </div>
      </section>
      <section class="card nail-card">
        <div class="nail-nav">
          <button class="icon-btn" data-action="nail-prev" data-i18n-aria="Previous nail">${ICONS.left}</button>
          <span class="label" data-ref="nailLabel"></span>
          <button class="icon-btn" data-action="nail-next" data-i18n-aria="Next nail">${ICONS.right}</button>
        </div>
        <div class="all-badge" data-ref="allBadge" hidden data-i18n="Editing all 5 nails"></div>
        <div class="canvas-wrap" data-ref="editorWrap"><canvas data-ref="editor" tabindex="0" data-i18n-aria="Nail editor. Use the tools panel to draw or add decorations."></canvas></div>
        <div class="hint" data-ref="hint"></div>
      </section>
    </main>
  </div>
  <div class="modal" data-ref="modal" hidden role="dialog" aria-modal="true" data-i18n-aria="Your design">
    <div class="modal-card">
      <div class="modal-img"><img data-ref="modalImg" alt=""></div>
      <div class="modal-body">
        <h2 data-i18n="Your design is ready"></h2>
        <p data-i18n="Download the image and show it to your nail technician at your appointment."></p>
        <div class="modal-actions">
          <button class="btn" data-action="modal-close" data-i18n="Keep editing"></button>
          <button class="btn primary" data-action="download">${ICONS.download}<span data-i18n="Download image"></span></button>
        </div>
      </div>
    </div>
  </div>
  <div class="toast" data-ref="toast" role="status" aria-live="polite"></div>
</div>`;

    const ref = <T extends HTMLElement>(name: string) => this.shadow.querySelector(`[data-ref="${name}"]`) as T;
    this.els = {
      panel: ref('panel'),
      editor: ref<HTMLCanvasElement>('editor'),
      hand: ref<HTMLCanvasElement>('hand'),
      editorWrap: ref('editorWrap'),
      handWrap: ref('handWrap'),
      nailLabel: ref('nailLabel'),
      hint: ref('hint'),
      allBadge: ref('allBadge'),
      salon: ref('salon'),
      modal: ref('modal'),
      modalImg: ref<HTMLImageElement>('modalImg'),
      toast: ref('toast'),
    };
    this.els.salon.textContent = this.getAttribute('salon-name') ?? '';

    const app = this.shadow.querySelector('.app')!;
    app.addEventListener('click', (e) => this.onClick(e as MouseEvent));
    this.els.panel.addEventListener('input', (e) => this.onPanelInput(e));
    this.els.panel.addEventListener('change', (e) => this.onPanelChange(e));
    // Shortcuts only while focus is inside the designer, so the host page keeps its own keys.
    this.addEventListener('keydown', this.onKey);

    const ed = this.els.editor;
    ed.addEventListener('pointerdown', this.onEditorDown);
    ed.addEventListener('pointermove', this.onEditorMove);
    ed.addEventListener('pointerup', this.onEditorUp);
    ed.addEventListener('pointercancel', this.onEditorUp);
    this.els.hand.addEventListener('pointerdown', this.onHandDown);
    this.els.hand.addEventListener('pointermove', this.onHandHover);

    this.store.subscribe(() => {
      this.requestDraw();
      this.updateChrome();
    });
    this.applyLang(this.getAttribute('lang'));
  }

  /* ---------------------------------------------------------- helpers */

  private get s() {
    return this.store.state;
  }

  private get L() {
    return LENGTHS[this.s.length];
  }

  private get accent() {
    return this.accentColor;
  }

  /** Reads theme colors once (instead of on every frame). */
  private readTheme() {
    const raw = getComputedStyle(this).getPropertyValue('--nd-accent').trim();
    this.accentColor = raw && parseColor(raw) ? raw : DEFAULT_ACCENT;
    const bg = getComputedStyle(this.els.handWrap).backgroundColor;
    const parsed = parseColor(bg);
    this.fadeColor = parsed && parsed.a > 0.99 ? bg : undefined;
  }

  /** Indexes of the nails that edits apply to. */
  private targets(): number[] {
    return this.ui.applyAll ? [0, 1, 2, 3, 4] : [this.ui.active];
  }

  private selected(): ElementLayer | null {
    const id = this.ui.selectedId;
    if (!id) return null;
    const l = this.s.nails[this.ui.active].layers.find((x) => x.id === id);
    return l && l.type !== 'stroke' ? l : null;
  }

  private toast(msg: string) {
    const t = this.els.toast;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => t.classList.remove('show'), 1800);
  }

  private addRecent(hex: string) {
    hex = normalizeHex(hex);
    if (PALETTE.some((p) => p.hex === hex)) return;
    this.recent = [hex, ...this.recent.filter((c) => c !== hex)].slice(0, 8);
  }

  /* ---------------------------------------------------------- drawing */

  private resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    let changed = false;
    for (const [canvas, wrap] of [
      [this.els.editor, this.els.editorWrap],
      [this.els.hand, this.els.handWrap],
    ] as const) {
      const r = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width * this.dpr));
      const h = Math.max(1, Math.round(r.height * this.dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        changed = true;
      }
    }
    if (!changed) return;
    // Draw right away: resizing a canvas clears it, waiting a frame would flicker.
    this.drawEditor();
    this.drawHand();
    if (this.ui.tool === 'brush') this.drawBrushPreview();
  }

  private requestDraw(editor = true, hand = true) {
    this.dirtyEditor ||= editor;
    this.dirtyHand ||= hand;
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      if (this.dirtyEditor) this.drawEditor();
      if (this.dirtyHand) this.drawHand();
      this.dirtyEditor = this.dirtyHand = false;
    });
  }

  private drawEditor() {
    const c = this.els.editor;
    const ctx = c.getContext('2d')!;
    const dpr = this.dpr;
    const w = c.width / dpr;
    const h = c.height / dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    if (w < 10 || h < 10) return;

    const L = this.L;
    const top = -L - 0.12;
    const bottom = 0.8;
    const px = Math.max(12, Math.min(w / 1.9, (h - 96) / (bottom - top), 380));
    const mid = (top + bottom) / 2;
    this.view = { px, ox: w / 2, oy: h / 2 - mid * px + 8 };

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(this.view.ox, this.view.oy);
    ctx.scale(px, px);
    drawFingerTip(ctx, this.s.skin, this.s.shape, L, px * dpr);
    renderNail(ctx, this.s.nails[this.ui.active], this.s.shape, L, {
      k: px * dpr,
      cacheKey: 'editor',
      seed: this.ui.active + 1,
      draft: this.draft,
    });
    const sel = this.selected();
    if (sel) drawSelection(ctx, sel, px, this.accent);
  }

  private drawHand() {
    const c = this.els.hand;
    const ctx = c.getContext('2d')!;
    const dpr = this.dpr;
    const w = c.width / dpr;
    const h = c.height / dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    if (w < 10 || h < 10) return;

    const V = HAND_VIEW;
    const s = Math.min(w / V.w, h / V.h) * 0.98;
    this.handView = { s, ox: (w - V.w * s) / 2 - V.x * s, oy: (h - V.h * s) / 2 - V.y * s };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(this.handView.ox, this.handView.oy);
    ctx.scale(s, s);
    renderHand(ctx, this.s, {
      k: s * dpr,
      cachePrefix: 'hand',
      active: this.ui.active,
      highlightAll: this.ui.applyAll,
      accent: this.accent,
      fade: this.fadeColor,
      draft: this.draft,
      draftNails: this.targets(),
    });
  }

  private renderExport(): string {
    const t = this.t;
    const title = this.getAttribute('salon-name') || t('My nail design');
    const labels = {
      shape: t(SHAPE_OPTIONS.find((o) => o.id === this.s.shape)?.label ?? ''),
      length: t(LENGTH_OPTIONS.find((o) => o.id === this.s.length)?.label ?? ''),
      fingers: ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].map((n) => t(n)),
      footer: t('Designed with Nail Design Studio'),
    };
    return exportImage(this.s, { title, accent: this.accent, labels }).toDataURL('image/png');
  }

  /* ------------------------------------------------------- chrome/UI */

  private updateChrome() {
    const q = (sel: string) => this.shadow.querySelector(sel) as HTMLButtonElement;
    q('[data-action="undo"]').disabled = !this.store.canUndo;
    q('[data-action="redo"]').disabled = !this.store.canRedo;
    q('[data-action="nail-paste"]').disabled = !this.nailClipboard;
    this.shadow.querySelectorAll<HTMLElement>('.tool').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.value === this.ui.tool)));
    this.shadow
      .querySelectorAll<HTMLElement>('[data-action="apply"]')
      .forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.value === 'all') === this.ui.applyAll)));
    this.els.nailLabel.textContent = this.t(FINGERS[this.ui.active].name);
    this.els.allBadge.hidden = !this.ui.applyAll;
    this.els.hint.textContent = this.t(TOOLS.find((x) => x.id === this.ui.tool)!.hint);
  }

  private setTool(tool: Tool) {
    if (tool === this.ui.tool) return;
    this.ui.tool = tool;
    const sel = this.selected();
    const keep = (tool === 'shapes' && sel?.type === 'shape') || (tool === 'stickers' && sel?.type === 'sticker');
    if (!keep) this.ui.selectedId = null;
    this.els.editor.style.cursor = tool === 'brush' || tool === 'eraser' ? 'crosshair' : 'default';
    this.renderPanel();
    this.updateChrome();
    this.requestDraw(true, false);
    this.els.panel.scrollTop = 0;
  }

  private setActive(i: number) {
    this.ui.active = (i + 5) % 5;
    this.ui.selectedId = null;
    this.renderPanel();
    this.updateChrome();
    this.requestDraw();
  }

  /* ------------------------------------------------------------ panel */

  private renderPanel() {
    const t = TOOLS.find((x) => x.id === this.ui.tool)!;
    let html = `<h2>${this.t(t.title)}</h2><p class="desc">${this.t(t.desc)}</p>`;
    switch (this.ui.tool) {
      case 'nails':
        html += this.panelNails();
        break;
      case 'base':
        html += this.panelBase();
        break;
      case 'brush':
        html += this.panelBrush();
        break;
      case 'eraser':
        html += this.panelEraser();
        break;
      case 'shapes':
        html += this.panelShapes();
        break;
      case 'stickers':
        html += this.panelStickers();
        break;
    }
    this.els.panel.innerHTML = html;
    this.els.panel.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((r) => this.paintRange(r));
    if (this.ui.tool === 'brush') this.drawBrushPreview();
  }

  private slider(key: string, label: string, min: number, max: number, value: number, suffix = '', step = 1) {
    return `<div class="field"><div class="field-row"><label for="r-${key}">${this.t(label)}</label><output data-out="${key}">${Math.round(value)}${suffix}</output></div>
<input id="r-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-slider="${key}" data-suffix="${suffix}"></div>`;
  }

  private paintRange(r: HTMLInputElement) {
    const min = +r.min;
    const max = +r.max;
    r.style.setProperty('--p', `${((+r.value - min) / (max - min)) * 100}%`);
  }

  private colorPicker(target: string, current: string) {
    const cur = normalizeHex(current);
    const sw = (hex: string, name: string) =>
      `<button class="sw${hex === cur ? ' on' : ''}" style="--c:${hex}" data-color="${hex}" data-target="${target}" title="${this.t(name)}" aria-label="${this.t(name)}"></button>`;
    const custom = PALETTE.some((p) => p.hex === cur) ? '#e75a8c' : cur;
    return `<div class="swatches">${PALETTE.map((p) => sw(p.hex, p.name)).join('')}
<label class="sw custom" title="${this.t('Custom color')}"><input type="color" value="${custom}" data-color-input="${target}" aria-label="${this.t('Custom color')}"></label></div>
${this.recent.length ? `<div class="recent"><span>${this.t('Recent')}</span>${this.recent.map((h) => sw(h, h)).join('')}</div>` : ''}`;
  }

  private panelNails() {
    const nail = this.s.nails[this.ui.active];
    const shapes = SHAPE_OPTIONS.map(
      (o) =>
        `<button class="tile tall" data-action="shape-set" data-value="${o.id}" aria-pressed="${o.id === this.s.shape}"><img alt="" src="${nailThumb(
          nail,
          o.id,
          LENGTHS.long,
          80,
          100,
        )}"><span>${this.t(o.label)}</span></button>`,
    ).join('');
    const unit = 92 / (MAX_LENGTH + 0.15);
    const lengths = LENGTH_OPTIONS.map(
      (o) =>
        `<button class="tile tall" data-action="length-set" data-value="${o.id}" aria-pressed="${o.id === this.s.length}"><img alt="" src="${nailThumb(
          nail,
          this.s.shape,
          LENGTHS[o.id],
          70,
          100,
          unit,
        )}"><span>${this.t(o.label)}</span></button>`,
    ).join('');
    const skins = SKIN_TONES.map(
      (c, i) =>
        `<button class="sw${c === this.s.skin ? ' on' : ''}" style="--c:${c}" data-action="skin-set" data-value="${c}" aria-label="${this.t('Skin tone {n}', { n: i + 1 })}"></button>`,
    ).join('');
    const t = this.t;
    return `<h3>${t('Shape')}</h3><div class="tiles">${shapes}</div>
<h3>${t('Length')}</h3><div class="tiles four">${lengths}</div>
<h3>${t('Skin tone')}</h3><div class="swatches" style="grid-template-columns:repeat(6,minmax(0,1fr));max-width:240px">${skins}</div>`;
  }

  private panelBase() {
    const nail = this.s.nails[this.ui.active];
    const b = nail.base;
    const types = BASE_TYPES.map((o) => {
      const preview = clone(nail);
      preview.base.type = o.id;
      preview.layers = [];
      return `<button class="tile" data-action="base-type" data-value="${o.id}" aria-pressed="${o.id === b.type}"><img alt="" src="${nailThumb(
        preview,
        this.s.shape,
        1.5,
        64,
        76,
      )}"><span>${this.t(o.label)}</span></button>`;
    }).join('');
    const labels = slotLabels(b.type, b.count);
    const slot = Math.min(this.ui.baseSlot, labels.length - 1);
    const slots =
      labels
        .map(
          (l, i) =>
            `<button class="slot" data-action="base-slot" data-value="${i}" aria-pressed="${i === slot}"><i style="--c:${b.colors[i]}"></i>${this.t(l)}</button>`,
        )
        .join('') +
      (b.type === 'linear' || b.type === 'radial'
        ? b.count === 2
          ? `<button class="slot ghost" data-action="base-count" data-value="3">${ICONS.plus}${this.t('Add')}</button>`
          : `<button class="slot ghost" data-action="base-count" data-value="2" aria-label="${this.t('Remove third color')}">${ICONS.close}</button>`
        : '');
    const finishes = FINISHES.map((o) => {
      const preview = clone(nail);
      preview.finish = o.id;
      preview.layers = [];
      return `<button class="tile" data-action="finish-set" data-value="${o.id}" aria-pressed="${o.id === nail.finish}"><img alt="" src="${nailThumb(
        preview,
        this.s.shape,
        1.5,
        64,
        76,
      )}"><span>${this.t(o.label)}</span></button>`;
    }).join('');
    const t = this.t;
    return `<h3>${t('Style')}</h3><div class="tiles">${types}</div>
<h3>${t('Colors')}</h3><div class="slots">${slots}</div>${this.colorPicker('base', b.colors[slot])}
${b.type === 'linear' ? `<h3>${t('Direction')}</h3>${this.slider('base.angle', 'Angle', -180, 180, b.angle, '°')}` : ''}
<h3>${t('Finish')}</h3><div class="tiles four">${finishes}</div>`;
  }

  private panelBrush() {
    const b = this.brush;
    const t = this.t;
    return `<h3>${t('Color')}</h3>${this.colorPicker('brush', b.color)}
<h3>${t('Brush settings')}</h3>
${this.slider('brush.size', 'Size', 1, 40, b.size)}
${this.slider('brush.smooth', 'Smoothness', 0, 100, b.smooth, '%')}
<p class="help">${t('Higher smoothness makes curved lines look clean and even.')}</p>
${this.slider('brush.opacity', 'Opacity', 10, 100, b.opacity, '%')}
<h3>${t('Preview')}</h3><div class="preview"><canvas data-ref="brushPreview"></canvas></div>`;
  }

  private panelEraser() {
    return `${this.slider('eraser.size', 'Size', 2, 40, this.eraser.size)}
<button class="btn block" data-action="nail-clear">${ICONS.trash}${this.t(this.ui.applyAll ? 'Clear all art on all nails' : 'Clear all art on this nail')}</button>
<p class="note">${this.t('The eraser rubs out brush strokes. Rub over a shape or sticker to remove it. Your polish color stays.')}</p>`;
  }

  private selectedCard(el: ElementLayer) {
    const isShape = el.type === 'shape';
    const pr = isShape ? shapeById(el.preset) : null;
    const rot = Math.round((((el.rot * 180) / Math.PI + 540) % 360) - 180);
    const t = this.t;
    return `<div class="sel-card">
<div class="sel-head"><strong>${t(isShape ? 'Selected shape' : 'Selected sticker')}</strong><button class="icon-btn" data-action="sel-done" aria-label="${t('Deselect')}">${ICONS.close}</button></div>
${this.slider('sel.scale', 'Size', 4, 260, el.scale * 100, '%')}
${this.slider('sel.rot', 'Rotation', -180, 180, rot, '°')}
${isShape && (pr?.kind === 'stroke' || (el as ShapeLayer).style === 'outline') ? this.slider('sel.weight', 'Thickness', 1, 14, (el as ShapeLayer).weight / WEIGHT_UNIT) : ''}
<div class="actions">
  <button class="act" data-action="sel-dup">${ICONS.duplicate}${t('Copy')}</button>
  <button class="act" data-action="sel-flip">${ICONS.flip}${t('Flip')}</button>
  <button class="act" data-action="sel-up">${ICONS.up}${t('Forward')}</button>
  <button class="act" data-action="sel-down">${ICONS.down}${t('Back')}</button>
  <button class="act danger" data-action="sel-del">${ICONS.trash}${t('Delete')}</button>
</div></div>`;
  }

  private panelShapes() {
    const sel = this.selected();
    const selShape = sel?.type === 'shape' ? sel : null;
    const chips = SHAPE_CATS.map(
      (c) => `<button class="chip" data-action="shape-cat" data-value="${c.id}" aria-pressed="${c.id === this.ui.shapeCat}">${this.t(c.label)}</button>`,
    ).join('');
    const grid = SHAPES.filter((p) => p.cat === this.ui.shapeCat)
      .map((p) => {
        const body =
          p.kind === 'stroke'
            ? `<path d="${p.d}" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
            : `<path d="${p.d}" fill="currentColor" fill-rule="${p.rule ?? 'nonzero'}"/>`;
        return `<button class="shape-btn" data-action="shape-add" data-value="${p.id}" title="${this.t(p.name)}" aria-label="${this.t('Add {name}', { name: this.t(p.name) })}"><svg viewBox="-56 -56 112 112">${body}</svg></button>`;
      })
      .join('');
    const color = selShape ? selShape.color : this.shapeOpt.color;
    const style = selShape ? selShape.style : this.shapeOpt.style;
    const t = this.t;
    return `<div class="chips">${chips}</div><div class="shape-grid">${grid}</div>
<div style="height:16px"></div>${selShape ? this.selectedCard(selShape) : ''}
<h3>${t(selShape ? 'Shape color' : 'Color')}</h3>${this.colorPicker('shape', color)}
<h3>${t('Style')}</h3><div class="seg full">
  <button data-action="shape-style" data-value="fill" aria-pressed="${style === 'fill'}">${t('Filled')}</button>
  <button data-action="shape-style" data-value="outline" aria-pressed="${style === 'outline'}">${t('Outline')}</button>
</div>
${selShape ? '' : `<div style="height:12px"></div>${this.slider('shape.weight', 'Line thickness', 1, 14, this.shapeOpt.weight)}`}
<p class="note">${t('Tip: lines are great for French tips and borders — rotate them with the corner handle.')}</p>`;
  }

  private panelStickers() {
    const sel = this.selected();
    const selSticker = sel?.type === 'sticker' ? sel : null;
    const chips = STICKER_CATS.map(
      (c) => `<button class="chip" data-action="sticker-cat" data-value="${c.id}" aria-pressed="${c.id === this.ui.stickerCat}">${this.t(c.label)}</button>`,
    ).join('');
    const grid = STICKERS.filter((p) => p.cat === this.ui.stickerCat)
      .map(
        (p) =>
          `<button class="shape-btn" data-action="sticker-add" data-value="${p.id}" title="${this.t(p.name)}" aria-label="${this.t('Add {name}', { name: this.t(p.name) })}"><img alt="" src="${stickerThumb(p.id, 96)}"></button>`,
      )
      .join('');
    return `<div class="chips">${chips}</div><div class="shape-grid sticker-grid">${grid}</div>
<div style="height:16px"></div>${selSticker ? this.selectedCard(selSticker) : `<p class="note">${this.t('Tap a sticker to add it, then drag it into place.')}</p>`}`;
  }

  private drawBrushPreview() {
    const c = this.els.panel.querySelector<HTMLCanvasElement>('[data-ref="brushPreview"]');
    if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = this.dpr;
    c.width = Math.max(1, Math.round(r.width * dpr));
    c.height = Math.max(1, Math.round(r.height * dpr));
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = r.width;
    const h = r.height;
    // A slightly shaky hand-drawn wave, run through the same stabilizer as real strokes.
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
    const smooth = this.brush.smooth / 100;
    const f = 1 - smooth * 0.9;
    const pts: number[] = [];
    let lx = 18;
    let ly = h / 2;
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const tx = 18 + t * (w - 36) + rnd() * 2.5;
      const ty = h / 2 + Math.sin(t * Math.PI * 2) * h * 0.24 + rnd() * 3.5;
      lx += (tx - lx) * f;
      ly += (ty - ly) * f;
      pts.push(lx, ly);
    }
    let out = pts;
    for (let i = 0; i < smoothPasses(smooth); i++) out = chaikin(out);
    ctx.globalAlpha = this.brush.opacity / 100;
    ctx.strokeStyle = ctx.fillStyle = this.brush.color;
    drawStrokePath(ctx, out, Math.max(1, this.brush.size * BRUSH_UNIT * 150));
  }

  /* ---------------------------------------------------------- events */

  private onClick(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action], [data-color]');
    if (!el) return;
    if (el.dataset.color) {
      this.setColor(el.dataset.target!, el.dataset.color, true);
      return;
    }
    const v = el.dataset.value ?? '';
    switch (el.dataset.action) {
      case 'undo':
        this.store.undo();
        this.afterHistory();
        break;
      case 'redo':
        this.store.redo();
        this.afterHistory();
        break;
      case 'reset':
        this.store.commit((s) => Object.assign(s, defaultState()));
        this.ui.selectedId = null;
        this.renderPanel();
        this.toast(this.t('Started over — press Undo to bring your design back'));
        break;
      case 'finish':
        this.openFinish();
        break;
      case 'download':
        this.download();
        break;
      case 'modal-close':
        this.closeFinish();
        break;
      case 'tool':
        this.setTool(v as Tool);
        break;
      case 'apply':
        this.ui.applyAll = v === 'all';
        this.updateChrome();
        this.requestDraw();
        if (this.ui.tool === 'eraser') this.renderPanel();
        this.toast(this.t(this.ui.applyAll ? 'Changes now apply to all 5 nails' : 'Changes apply to this nail only'));
        break;
      case 'nail-prev':
        this.setActive(this.ui.active - 1);
        break;
      case 'nail-next':
        this.setActive(this.ui.active + 1);
        break;
      case 'nail-copy':
        this.nailClipboard = clone(this.s.nails[this.ui.active]);
        this.updateChrome();
        this.toast(this.t('Design copied — pick another nail and press Paste'));
        break;
      case 'nail-paste': {
        const src = this.nailClipboard;
        if (!src) break;
        this.store.commit((s) => this.targets().forEach((i) => (s.nails[i] = clone(src))));
        this.ui.selectedId = null;
        this.renderPanel();
        this.toast(this.t(this.ui.applyAll ? 'Pasted on all nails' : 'Design pasted'));
        break;
      }
      case 'nail-all': {
        const src = clone(this.s.nails[this.ui.active]);
        this.store.commit((s) => s.nails.forEach((_, i) => (s.nails[i] = clone(src))));
        this.toast(this.t('This design is now on all 5 nails'));
        break;
      }
      case 'nail-clear':
        this.store.commit((s) => this.targets().forEach((i) => (s.nails[i].layers = [])));
        this.ui.selectedId = null;
        this.renderPanel();
        this.toast(this.t(this.ui.applyAll ? 'Cleared all nails' : 'Nail cleared'));
        break;
      case 'shape-set':
        this.store.commit((s) => (s.shape = v as NailShape));
        this.renderPanel();
        break;
      case 'length-set':
        this.store.commit((s) => (s.length = v as NailLength));
        this.renderPanel();
        break;
      case 'skin-set':
        this.store.commit((s) => (s.skin = v));
        this.renderPanel();
        break;
      case 'base-type':
        this.store.commit((s) => this.targets().forEach((i) => (s.nails[i].base.type = v as BaseType)));
        this.renderPanel();
        break;
      case 'base-slot':
        this.ui.baseSlot = +v;
        this.renderPanel();
        break;
      case 'base-count':
        this.store.commit((s) => this.targets().forEach((i) => (s.nails[i].base.count = +v)));
        this.ui.baseSlot = +v === 3 ? 2 : Math.min(this.ui.baseSlot, 1);
        this.renderPanel();
        break;
      case 'finish-set':
        this.store.commit((s) => this.targets().forEach((i) => (s.nails[i].finish = v as Finish)));
        this.renderPanel();
        break;
      case 'shape-cat':
        this.ui.shapeCat = v as ShapeCat;
        this.renderPanel();
        break;
      case 'sticker-cat':
        this.ui.stickerCat = v as StickerCat;
        this.renderPanel();
        break;
      case 'shape-style': {
        const style = v as 'fill' | 'outline';
        this.shapeOpt.style = style;
        const sel = this.selected();
        if (sel?.type === 'shape') this.updateElement(sel.id, { style });
        this.renderPanel();
        break;
      }
      case 'shape-add':
        this.addShape(v);
        break;
      case 'sticker-add':
        this.addSticker(v);
        break;
      case 'sel-done':
        this.ui.selectedId = null;
        this.renderPanel();
        this.requestDraw(true, false);
        break;
      case 'sel-dup':
        this.duplicateSelected();
        break;
      case 'sel-flip': {
        const sel = this.selected();
        if (sel) this.updateElement(sel.id, { flip: !sel.flip });
        break;
      }
      case 'sel-up':
        this.reorderSelected(1);
        break;
      case 'sel-down':
        this.reorderSelected(-1);
        break;
      case 'sel-del':
        this.deleteSelected();
        break;
    }
  }

  private afterHistory() {
    if (!this.selected()) this.ui.selectedId = null;
    this.renderPanel();
  }

  private onPanelInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.dataset.colorInput) {
      this.setColor(input.dataset.colorInput, input.value, false);
      return;
    }
    const key = input.dataset.slider;
    if (!key) return;
    const v = +input.value;
    this.paintRange(input);
    const out = this.els.panel.querySelector(`[data-out="${key}"]`);
    if (out) out.textContent = `${Math.round(v)}${input.dataset.suffix ?? ''}`;
    const sel = this.selected();
    switch (key) {
      case 'brush.size':
        this.brush.size = v;
        this.drawBrushPreview();
        break;
      case 'brush.smooth':
        this.brush.smooth = v;
        this.drawBrushPreview();
        break;
      case 'brush.opacity':
        this.brush.opacity = v;
        this.drawBrushPreview();
        break;
      case 'eraser.size':
        this.eraser.size = v;
        break;
      case 'shape.weight':
        this.shapeOpt.weight = v;
        break;
      case 'base.angle':
        this.store.commit((s) => this.targets().forEach((i) => (s.nails[i].base.angle = v)), 'base-angle');
        break;
      case 'sel.scale':
        if (sel) this.updateElement(sel.id, { scale: v / 100 }, 'sel-scale');
        break;
      case 'sel.rot':
        if (sel) this.updateElement(sel.id, { rot: (v * Math.PI) / 180 }, 'sel-rot');
        break;
      case 'sel.weight':
        if (sel) this.updateElement(sel.id, { weight: v * WEIGHT_UNIT }, 'sel-weight');
        this.shapeOpt.weight = v;
        break;
    }
  }

  private onPanelChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.store.endGroup();
    if (input.dataset.colorInput) {
      this.addRecent(input.value);
      this.renderPanel();
    }
  }

  /** Applies a picked color to the given tool target. */
  private setColor(target: string, hex: string, rerender: boolean) {
    hex = normalizeHex(hex);
    if (target === 'brush') {
      this.brush.color = hex;
      if (!rerender) this.drawBrushPreview();
    } else if (target === 'shape') {
      this.shapeOpt.color = hex;
      const sel = this.selected();
      if (sel?.type === 'shape') this.updateElement(sel.id, { color: hex }, 'sel-color');
    } else if (target === 'base') {
      const labels = slotLabels(this.s.nails[this.ui.active].base.type, this.s.nails[this.ui.active].base.count);
      const slot = Math.min(this.ui.baseSlot, labels.length - 1);
      this.store.commit((s) => this.targets().forEach((i) => (s.nails[i].base.colors[slot] = hex)), 'base-color');
    }
    if (rerender) {
      this.store.endGroup();
      this.renderPanel();
    }
  }

  private onKey = (e: KeyboardEvent) => {
    const target = e.composedPath()[0] as HTMLElement;
    if (!this.els.modal.hidden) {
      if (e.key === 'Escape') this.closeFinish();
      else if (e.key === 'Tab') this.trapFocus(e);
      return;
    }
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    if (target?.isContentEditable) return;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && key === 'z') {
      e.preventDefault();
      if (e.shiftKey) this.store.redo();
      else this.store.undo();
      this.afterHistory();
    } else if (mod && key === 'y') {
      e.preventDefault();
      this.store.redo();
      this.afterHistory();
    } else if (mod && key === 'c' && this.selected()) {
      this.elementClipboard = clone(this.selected()!);
      this.toast(this.t('Copied'));
    } else if (mod && key === 'v' && this.elementClipboard) {
      e.preventDefault();
      this.pasteElement(this.elementClipboard);
    } else if (mod && key === 'd' && this.selected()) {
      e.preventDefault();
      this.duplicateSelected();
    } else if ((key === 'delete' || key === 'backspace') && this.selected()) {
      e.preventDefault();
      this.deleteSelected();
    } else if (key.startsWith('arrow') && this.selected()) {
      e.preventDefault();
      const sel = this.selected()!;
      const step = e.shiftKey ? 0.05 : 0.01;
      const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
      const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
      this.updateElement(sel.id, { x: sel.x + dx, y: sel.y + dy }, 'nudge');
    } else if (key === 'escape') {
      if (this.ui.selectedId) {
        this.ui.selectedId = null;
        this.renderPanel();
        this.requestDraw(true, false);
      }
    } else if (!mod && key === 'b') this.setTool('brush');
    else if (!mod && key === 'e') this.setTool('eraser');
  };

  private trapFocus(e: KeyboardEvent) {
    const items = [...this.els.modal.querySelectorAll<HTMLElement>('button')];
    const i = items.indexOf(this.shadow.activeElement as HTMLElement);
    const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i + 1) % items.length;
    e.preventDefault();
    items[next].focus();
  }

  /* -------------------------------------------------- editor pointer */

  private toNail(e: PointerEvent) {
    const r = this.els.editor.getBoundingClientRect();
    return { x: (e.clientX - r.left - this.view.ox) / this.view.px, y: (e.clientY - r.top - this.view.oy) / this.view.px };
  }

  private onEditorDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // One finger at a time: a resting palm or second finger must not hijack the stroke.
    if (this.pointerId !== null) return;
    const p = this.toNail(e);
    const tool = this.ui.tool;
    if (tool === 'brush' || tool === 'eraser') {
      this.capture(e);
      const erase = tool === 'eraser';
      this.draft = {
        id: uid(),
        type: 'stroke',
        color: erase ? '#000000' : this.brush.color,
        size: erase ? this.eraser.size * ERASER_UNIT : this.brush.size * BRUSH_UNIT,
        opacity: erase ? 1 : this.brush.opacity / 100,
        erase,
        points: [p.x, p.y],
      };
      this.lazy = { x: p.x, y: p.y, tx: p.x, ty: p.y };
      this.requestDraw();
      return;
    }
    // Shapes, stickers (and any other tool): select & move elements.
    const px = this.view.px;
    const sel = this.selected();
    if (sel) {
      const hp = handlePoints(sel, px);
      const near = (q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y) < 16 / px;
      if (near(hp.remove)) {
        this.deleteSelected();
        return;
      }
      if (near(hp.rotate)) {
        this.capture(e);
        this.drag = {
          mode: 'transform',
          id: sel.id,
          a0: Math.atan2(p.y - sel.y, p.x - sel.x),
          d0: Math.max(Math.hypot(p.x - sel.x, p.y - sel.y), 0.01),
          rot0: sel.rot,
          scale0: sel.scale,
        };
        return;
      }
    }
    const layers = this.s.nails[this.ui.active].layers;
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      if (l.type === 'stroke' || !hitElement(l, p.x, p.y, px)) continue;
      this.capture(e);
      this.drag = { mode: 'move', id: l.id, dx: p.x - l.x, dy: p.y - l.y };
      const changed = this.ui.selectedId !== l.id;
      this.ui.selectedId = l.id;
      const wantTool: Tool = l.type === 'shape' ? 'shapes' : 'stickers';
      if (this.ui.tool !== wantTool) {
        this.ui.tool = wantTool;
        this.updateChrome();
        this.renderPanel();
      } else if (changed) this.renderPanel();
      this.requestDraw(true, false);
      return;
    }
    if (this.ui.selectedId) {
      this.ui.selectedId = null;
      this.renderPanel();
      this.requestDraw(true, false);
    }
  };

  private capture(e: PointerEvent) {
    this.pointerId = e.pointerId;
    this.els.editor.setPointerCapture(e.pointerId);
  }

  private onEditorMove = (e: PointerEvent) => {
    if (this.pointerId !== null && e.pointerId !== this.pointerId) return;
    if (this.draft) {
      const events = e.getCoalescedEvents?.() ?? [];
      for (const ev of events.length ? events : [e]) {
        const q = this.toNail(ev);
        this.addDraftPoint(q.x, q.y);
      }
      this.requestDraw();
      return;
    }
    const d = this.drag;
    if (d) {
      const p = this.toNail(e);
      const el = this.selected();
      if (!el) return;
      if (d.mode === 'move') {
        const L = this.L;
        this.updateElement(d.id, { x: clamp(p.x - d.dx, -0.8, 0.8), y: clamp(p.y - d.dy, -L - 0.3, 0.3) }, 'drag');
      } else {
        const a = Math.atan2(p.y - el.y, p.x - el.x);
        const dist = Math.hypot(p.x - el.x, p.y - el.y);
        let rot = d.rot0 + (a - d.a0);
        // Gentle snap to 0/45/90°.
        const step = Math.PI / 4;
        const snapped = Math.round(rot / step) * step;
        if (Math.abs(rot - snapped) < 0.06) rot = snapped;
        this.updateElement(d.id, { rot, scale: clamp(d.scale0 * (dist / d.d0), 0.04, 2.6) }, 'drag');
      }
      return;
    }
    // Hover cursor feedback for elements.
    if (e.pointerType === 'mouse' && this.ui.tool !== 'brush' && this.ui.tool !== 'eraser') {
      const p = this.toNail(e);
      const sel = this.selected();
      let cursor = 'default';
      if (sel) {
        const hp = handlePoints(sel, this.view.px);
        if (Math.hypot(p.x - hp.rotate.x, p.y - hp.rotate.y) < 16 / this.view.px) cursor = 'alias';
        else if (Math.hypot(p.x - hp.remove.x, p.y - hp.remove.y) < 16 / this.view.px) cursor = 'pointer';
      }
      if (cursor === 'default' && this.s.nails[this.ui.active].layers.some((l) => l.type !== 'stroke' && hitElement(l, p.x, p.y, this.view.px)))
        cursor = 'move';
      this.els.editor.style.cursor = cursor;
    }
  };

  private addDraftPoint(x: number, y: number) {
    const d = this.draft!;
    const smooth = d.erase ? 0.15 : this.brush.smooth / 100;
    const f = 1 - smooth * 0.9;
    const z = this.lazy;
    z.tx = x;
    z.ty = y;
    z.x += (x - z.x) * f;
    z.y += (y - z.y) * f;
    const n = d.points.length;
    if (Math.hypot(z.x - d.points[n - 2], z.y - d.points[n - 1]) >= 0.003) d.points.push(z.x, z.y);
  }

  private onEditorUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    if (this.draft) {
      const d = this.draft;
      this.draft = null;
      // Let the stabilized point catch up with the finger, then smooth the curve.
      const z = this.lazy;
      const smooth = d.erase ? 0.15 : this.brush.smooth / 100;
      const f = 1 - smooth * 0.9;
      for (let i = 0; i < 10; i++) {
        z.x += (z.tx - z.x) * f;
        z.y += (z.ty - z.y) * f;
        const n = d.points.length;
        if (Math.hypot(z.x - d.points[n - 2], z.y - d.points[n - 1]) >= 0.003) d.points.push(z.x, z.y);
      }
      const n = d.points.length;
      if (Math.hypot(z.tx - d.points[n - 2], z.ty - d.points[n - 1]) >= 0.002) d.points.push(z.tx, z.ty);
      for (let i = 0; i < smoothPasses(smooth); i++) d.points = chaikin(d.points);
      d.points = d.points.map((v) => +v.toFixed(4));
      const erased = d.erase ? this.elementsUnder(d) : new Set<string>();
      this.store.commit((s) =>
        this.targets().forEach((i) => {
          const nail = s.nails[i];
          // Rubbing over a shape or sticker removes it; erase strokes only cut brush strokes.
          if (erased.size) nail.layers = nail.layers.filter((l) => !erased.has(l.id));
          nail.layers.push(clone(d));
        }),
      );
      if (this.ui.selectedId && erased.has(this.ui.selectedId)) {
        this.ui.selectedId = null;
        this.renderPanel();
      }
      return;
    }
    if (this.drag) {
      this.drag = null;
      this.store.endGroup();
    }
  };

  /** Ids of shapes/stickers on the active nail that an eraser stroke passes over. */
  private elementsUnder(stroke: StrokeLayer): Set<string> {
    const hit = new Set<string>();
    const pts = stroke.points;
    for (const l of this.s.nails[this.ui.active].layers) {
      if (l.type === 'stroke') continue;
      for (let i = 0; i < pts.length; i += 2) {
        if (hitElement(l, pts[i], pts[i + 1], this.view.px * 2)) {
          hit.add(l.id);
          break;
        }
      }
    }
    return hit;
  }

  /* ---------------------------------------------------- hand pointer */

  private toHand(e: PointerEvent) {
    const r = this.els.hand.getBoundingClientRect();
    const v = this.handView;
    return { x: (e.clientX - r.left - v.ox) / v.s, y: (e.clientY - r.top - v.oy) / v.s };
  }

  private onHandDown = (e: PointerEvent) => {
    const p = this.toHand(e);
    const i = fingerAt(p.x, p.y, this.s.shape, this.L);
    if (i >= 0 && i !== this.ui.active) this.setActive(i);
  };

  private onHandHover = (e: PointerEvent) => {
    const p = this.toHand(e);
    this.els.hand.style.cursor = fingerAt(p.x, p.y, this.s.shape, this.L) >= 0 ? 'pointer' : 'default';
  };

  /* -------------------------------------------------------- elements */

  private updateElement(id: string, patch: Partial<Omit<ShapeLayer, 'type'>>, key?: string) {
    this.store.commit((s) => {
      for (const i of this.targets()) {
        const l = s.nails[i].layers.find((x) => x.id === id);
        if (l) Object.assign(l, patch);
      }
    }, key);
    // Keep the panel sliders in sync while dragging on the canvas.
    if (key === 'drag') this.syncSelSliders();
  }

  private syncSelSliders() {
    const el = this.selected();
    if (!el) return;
    const set = (key: string, v: number, suffix: string) => {
      const r = this.els.panel.querySelector<HTMLInputElement>(`[data-slider="${key}"]`);
      if (!r) return;
      r.value = String(v);
      this.paintRange(r);
      const out = this.els.panel.querySelector(`[data-out="${key}"]`);
      if (out) out.textContent = `${Math.round(v)}${suffix}`;
    };
    set('sel.scale', el.scale * 100, '%');
    set('sel.rot', Math.round((((el.rot * 180) / Math.PI + 540) % 360) - 180), '°');
  }

  private insertElement(el: ElementLayer) {
    this.store.commit((s) => this.targets().forEach((i) => s.nails[i].layers.push(clone(el))));
    this.ui.selectedId = el.id;
    this.renderPanel();
  }

  /** Small offset so repeated adds don't stack exactly on top of each other. */
  private nextOffset() {
    const count = this.s.nails[this.ui.active].layers.filter((l) => l.type !== 'stroke').length;
    const o = (count % 5) * 0.05;
    return { x: o, y: -o };
  }

  private addShape(presetId: string) {
    const pr = shapeById(presetId);
    if (!pr) return;
    const off = pr.cat === 'lines' ? { x: 0, y: 0 } : this.nextOffset();
    this.insertElement({
      id: uid(),
      type: 'shape',
      preset: presetId,
      color: this.shapeOpt.color,
      x: off.x,
      y: -this.L * 0.5 + off.y,
      scale: pr.defScale,
      rot: 0,
      flip: false,
      style: this.shapeOpt.style,
      weight: this.shapeOpt.weight * WEIGHT_UNIT,
    });
  }

  private addSticker(presetId: string) {
    const off = this.nextOffset();
    this.insertElement({ id: uid(), type: 'sticker', preset: presetId, x: off.x, y: -this.L * 0.45 + off.y, scale: 0.34, rot: 0, flip: false });
  }

  private pasteElement(src: ElementLayer) {
    this.insertElement({ ...clone(src), id: uid(), x: src.x + 0.08, y: src.y - 0.08 });
  }

  private duplicateSelected() {
    const sel = this.selected();
    if (sel) this.pasteElement(sel);
  }

  private deleteSelected() {
    const id = this.ui.selectedId;
    if (!id) return;
    this.store.commit((s) => this.targets().forEach((i) => (s.nails[i].layers = s.nails[i].layers.filter((l) => l.id !== id))));
    this.ui.selectedId = null;
    this.renderPanel();
  }

  private reorderSelected(dir: 1 | -1) {
    const id = this.ui.selectedId;
    if (!id) return;
    this.store.commit((s) =>
      this.targets().forEach((i) => {
        const arr = s.nails[i].layers;
        const idx = arr.findIndex((l) => l.id === id);
        const to = idx + dir;
        if (idx < 0 || to < 0 || to >= arr.length) return;
        [arr[idx], arr[to]] = [arr[to], arr[idx]];
      }),
    );
  }

  /* ---------------------------------------------------------- finish */

  private openFinish() {
    this.ui.selectedId = null;
    this.renderPanel();
    this.requestDraw(true, false);
    this.returnFocus = this.shadow.activeElement as HTMLElement | null;
    this.lastImage = this.renderExport();
    this.els.modalImg.src = this.lastImage;
    this.els.modal.hidden = false;
    (this.shadow.querySelector('[data-action="download"]') as HTMLElement).focus();
    this.dispatchEvent(
      new CustomEvent('nail-design-finish', { detail: { image: this.lastImage, design: this.getDesign() }, bubbles: true, composed: true }),
    );
  }

  private closeFinish() {
    this.els.modal.hidden = true;
    (this.returnFocus ?? (this.shadow.querySelector('[data-action="finish"]') as HTMLElement)).focus();
  }

  private download() {
    const url = this.lastImage || this.renderExport();
    const a = document.createElement('a');
    a.href = url;
    a.download = `nail-design-${new Date().toISOString().slice(0, 10)}.png`;
    this.shadow.appendChild(a);
    a.click();
    a.remove();
    this.dispatchEvent(new CustomEvent('nail-design-download', { detail: { image: url }, bubbles: true, composed: true }));
    this.toast(this.t('Image downloaded'));
  }
}
