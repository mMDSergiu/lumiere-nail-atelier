export const CSS = /* css */ `
:host {
  --nd-accent: #d4567a;
  --nd-bg: #faf6f4;
  --nd-surface: #ffffff;
  --nd-surface-2: #f6efec;
  --nd-border: #eee4e0;
  --nd-text: #2b2326;
  --nd-muted: #8b7c80;
  --nd-radius: 22px;
  --nd-font: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --soft: color-mix(in srgb, var(--nd-accent) 10%, var(--nd-surface));
  --soft-2: color-mix(in srgb, var(--nd-accent) 18%, var(--nd-surface));
  display: block;
  height: var(--nd-height, 780px);
  color: var(--nd-text);
  font-family: var(--nd-font);
  font-size: 14px;
  line-height: 1.4;
  -webkit-tap-highlight-color: transparent;
}
:host([theme="dark"]) {
  --nd-bg: #181214;
  --nd-surface: #221a1d;
  --nd-surface-2: #2c2326;
  --nd-border: #3a2f33;
  --nd-text: #f2e8e4;
  --nd-muted: #a8979c;
  color-scheme: dark;
}
:host([theme="dark"]) .act.danger { color: #ef8a80; }
:host([theme="dark"]) .toast { background: #f2e8e4; color: #221a1d; }
@media (max-width: 640px) {
  :host { height: var(--nd-height-mobile, 900px); }
}
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }
button { font: inherit; color: inherit; }
button:focus-visible, input:focus-visible, label:focus-within {
  outline: 2px solid var(--nd-accent);
  outline-offset: 2px;
}

.app {
  position: relative;
  height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  background: var(--nd-bg);
  border: 1px solid var(--nd-border);
  border-radius: var(--nd-radius);
  overflow: hidden;
  container-type: inline-size;
}

/* ---------- top bar ---------- */
.topbar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 14px 10px 16px;
  background: var(--nd-surface);
  border-bottom: 1px solid var(--nd-border);
}
.brand { display: flex; align-items: center; gap: 11px; min-width: 0; }
.logo {
  flex: none; width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; color: #fff;
  background: linear-gradient(140deg, color-mix(in srgb, var(--nd-accent) 55%, #fff), var(--nd-accent));
  box-shadow: 0 4px 12px color-mix(in srgb, var(--nd-accent) 30%, transparent);
}
.brand-text { min-width: 0; }
.brand-title { font-weight: 650; font-size: 15px; letter-spacing: -0.01em; white-space: nowrap; }
.brand-sub { font-size: 12px; color: var(--nd-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.brand-sub:empty { display: none; }
.top-actions { display: flex; align-items: center; gap: 4px; }
.divider { width: 1px; height: 22px; background: var(--nd-border); margin: 0 6px; }

.icon-btn {
  width: 38px; height: 38px; border-radius: 12px; border: 0; background: transparent;
  display: grid; place-items: center; cursor: pointer; color: var(--nd-text); transition: background .15s, color .15s;
}
.icon-btn:hover:not(:disabled) { background: var(--nd-surface-2); }
.icon-btn:disabled { opacity: .3; cursor: default; }

.btn {
  height: 38px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--nd-border); background: var(--nd-surface);
  font-weight: 600; font-size: 14px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  cursor: pointer; white-space: nowrap; transition: transform .1s, box-shadow .15s, background .15s;
}
.btn:hover { background: var(--nd-surface-2); }
.btn:active { transform: translateY(1px); }
.btn.primary {
  background: var(--nd-accent); border-color: var(--nd-accent); color: #fff;
  box-shadow: 0 6px 16px color-mix(in srgb, var(--nd-accent) 32%, transparent);
}
.btn.primary:hover { background: color-mix(in srgb, var(--nd-accent) 88%, #000); }
.btn.block { width: 100%; }
.btn.small { height: 32px; padding: 0 12px; font-size: 13px; border-radius: 10px; }

/* ---------- body layout ---------- */
.body {
  display: grid; min-height: 0;
  grid-template-columns: 82px 304px minmax(0, 1fr);
  grid-template-areas: "rail panel stage";
}
.rail {
  grid-area: rail; display: flex; flex-direction: column; gap: 4px; padding: 12px 8px;
  background: var(--nd-surface); border-right: 1px solid var(--nd-border);
}
.tool {
  display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 10px 4px 9px;
  border-radius: 14px; border: 0; background: transparent; color: var(--nd-muted);
  font-size: 11.5px; font-weight: 600; cursor: pointer; transition: background .15s, color .15s;
}
.tool:hover { color: var(--nd-text); background: var(--nd-surface-2); }
.tool[aria-selected="true"] { background: var(--soft); color: var(--nd-accent); }

.panel {
  grid-area: panel; overflow-y: auto; overscroll-behavior: contain; padding: 18px 18px 28px;
  background: var(--nd-surface); border-right: 1px solid var(--nd-border);
  scrollbar-width: thin; scrollbar-color: var(--nd-border) transparent;
}
.panel h2 { margin: 0; font-size: 17px; font-weight: 650; letter-spacing: -0.01em; }
.panel .desc { margin: 3px 0 18px; color: var(--nd-muted); font-size: 13px; }
.panel h3 {
  margin: 20px 0 10px; font-size: 11.5px; font-weight: 650; color: var(--nd-muted);
  text-transform: uppercase; letter-spacing: .06em;
}
.panel h3:first-of-type { margin-top: 0; }
.note { font-size: 12.5px; color: var(--nd-muted); margin: 10px 0 0; }

.stage {
  grid-area: stage; display: grid; gap: 14px; padding: 14px; min-height: 0;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr);
}
.card {
  position: relative; display: flex; flex-direction: column; min-height: 0; overflow: hidden;
  background: var(--nd-surface); border: 1px solid var(--nd-border); border-radius: 18px;
}
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 10px 0 14px; }
.card-title { font-weight: 650; font-size: 13px; }
.canvas-wrap { position: relative; flex: 1; min-height: 0; }
.canvas-wrap canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
.hand-wrap { background: var(--nd-surface); }
.hand-wrap canvas { cursor: pointer; touch-action: manipulation; }
.card-foot { display: flex; gap: 6px; padding: 0 10px 10px; flex-wrap: wrap; justify-content: center; }
.mini {
  display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 11px; border-radius: 10px;
  border: 1px solid var(--nd-border); background: var(--nd-surface); font-size: 12.5px; font-weight: 600; cursor: pointer;
}
.mini:hover:not(:disabled) { background: var(--nd-surface-2); }
.mini:disabled { opacity: .4; cursor: default; }
.mini svg { width: 16px; height: 16px; }

.nail-card { background: radial-gradient(circle at 50% 40%, var(--nd-surface) 0%, var(--nd-bg) 75%); }
.nail-card .canvas-wrap {
  background-image: radial-gradient(circle at 1px 1px, rgba(120, 80, 90, .09) 1px, transparent 0);
  background-size: 18px 18px;
}
.nail-nav {
  position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 2;
  display: flex; align-items: center; gap: 2px; padding: 3px; border-radius: 999px;
  background: color-mix(in srgb, var(--nd-surface) 92%, transparent); border: 1px solid var(--nd-border); box-shadow: 0 4px 14px rgba(60,30,40,.06);
  backdrop-filter: blur(6px);
}
.nail-nav .icon-btn { width: 30px; height: 30px; border-radius: 999px; }
.nail-nav .label { font-weight: 650; font-size: 13px; padding: 0 6px; min-width: 104px; text-align: center; white-space: nowrap; }
.hint {
  position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); z-index: 2; max-width: calc(100% - 24px);
  padding: 7px 13px; border-radius: 999px; background: rgba(43,35,38,.82); color: #fff; font-size: 12px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none; transition: opacity .3s;
}
.all-badge {
  position: absolute; top: 54px; left: 50%; transform: translateX(-50%); z-index: 2;
  padding: 4px 10px; border-radius: 999px; background: var(--soft-2); color: var(--nd-accent); font-size: 11.5px; font-weight: 650;
}

/* ---------- segmented control ---------- */
.seg { display: inline-flex; padding: 3px; gap: 2px; border-radius: 12px; background: var(--nd-surface-2); }
.seg button {
  border: 0; background: transparent; padding: 6px 12px; border-radius: 9px; font-size: 12.5px; font-weight: 600;
  color: var(--nd-muted); cursor: pointer; white-space: nowrap; transition: background .15s, color .15s, box-shadow .15s;
}
.seg button[aria-pressed="true"] { background: var(--nd-surface); color: var(--nd-text); box-shadow: 0 1px 4px rgba(60,30,40,.12); }
.seg.full { display: flex; }
.seg.full button { flex: 1; }

/* ---------- tiles ---------- */
.tiles { display: grid; gap: 8px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.tiles.four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.tile {
  display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 4px 7px; min-width: 0;
  border-radius: 14px; border: 1px solid var(--nd-border); background: var(--nd-surface); cursor: pointer;
  font-size: 11.5px; font-weight: 600; color: var(--nd-muted); transition: border-color .15s, background .15s, box-shadow .15s;
}
.tile:hover { border-color: color-mix(in srgb, var(--nd-accent) 35%, var(--nd-border)); }
.tile[aria-pressed="true"] {
  border-color: var(--nd-accent); background: var(--soft); color: var(--nd-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--nd-accent) 14%, transparent);
}
.tile img { width: 100%; height: 64px; object-fit: contain; pointer-events: none; }
.tile.tall img { height: 78px; }
.tile span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.chip {
  height: 30px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--nd-border); background: var(--nd-surface);
  font-size: 12.5px; font-weight: 600; color: var(--nd-muted); cursor: pointer;
}
.chip[aria-pressed="true"] { background: var(--nd-text); border-color: var(--nd-text); color: var(--nd-surface); }

.shape-grid { display: grid; gap: 6px; grid-template-columns: repeat(5, minmax(0, 1fr)); }
.shape-btn {
  aspect-ratio: 1; border-radius: 12px; border: 1px solid var(--nd-border); background: var(--nd-surface-2);
  display: grid; place-items: center; cursor: pointer; color: var(--nd-text); padding: 0; transition: transform .1s, background .15s, color .15s;
}
.shape-btn:hover { background: var(--soft); color: var(--nd-accent); }
.shape-btn:active { transform: scale(.94); }
.shape-btn svg { width: 64%; height: 64%; overflow: visible; }
.sticker-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.sticker-grid .shape-btn { background: var(--nd-surface); }
.sticker-grid img { width: 76%; height: 76%; object-fit: contain; pointer-events: none; }

/* ---------- color picker ---------- */
.swatches { display: grid; gap: 7px; grid-template-columns: repeat(8, minmax(0, 1fr)); }
.sw {
  position: relative; aspect-ratio: 1; border-radius: 50%; border: 2px solid var(--nd-surface); background: var(--c); padding: 0; cursor: pointer;
  box-shadow: 0 0 0 1px rgba(60, 30, 40, .14); transition: transform .12s, box-shadow .12s;
}
.sw:hover { transform: scale(1.1); }
.sw.on { box-shadow: 0 0 0 2px var(--nd-accent); transform: scale(1.06); }
.sw.custom { background: conic-gradient(#ff5f6d, #ffc371, #f9f871, #7be495, #5ec8f2, #9b7bff, #ff6bd6, #ff5f6d); overflow: hidden; display: block; }
.sw.custom input { position: absolute; inset: -6px; width: calc(100% + 12px); height: calc(100% + 12px); opacity: 0; cursor: pointer; border: 0; padding: 0; }
.recent { display: flex; align-items: center; gap: 7px; margin-top: 10px; }
.recent span { font-size: 11.5px; color: var(--nd-muted); margin-right: 2px; }
.recent .sw { width: 22px; flex: none; }

/* ---------- color slots ---------- */
.slots { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.slot {
  display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px 0 6px; border-radius: 12px;
  border: 1px solid var(--nd-border); background: var(--nd-surface); font-size: 12.5px; font-weight: 600; cursor: pointer;
}
.slot i { width: 24px; height: 24px; border-radius: 8px; background: var(--c); box-shadow: inset 0 0 0 1px rgba(0,0,0,.1); }
.slot[aria-pressed="true"] { border-color: var(--nd-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--nd-accent) 14%, transparent); }
.slot.ghost { padding: 0 10px; color: var(--nd-muted); }
.slot.ghost svg { width: 16px; height: 16px; }

/* ---------- sliders ---------- */
.field { margin-bottom: 14px; }
.field-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; font-size: 13px; font-weight: 600; }
.field-row output { color: var(--nd-muted); font-weight: 500; font-variant-numeric: tabular-nums; }
input[type="range"] {
  -webkit-appearance: none; appearance: none; width: 100%; height: 22px; background: transparent; margin: 0; cursor: pointer;
  --p: 50%;
}
input[type="range"]::-webkit-slider-runnable-track {
  height: 6px; border-radius: 999px;
  background: linear-gradient(to right, var(--nd-accent) var(--p), var(--nd-surface-2) var(--p));
}
input[type="range"]::-moz-range-track { height: 6px; border-radius: 999px; background: var(--nd-surface-2); }
input[type="range"]::-moz-range-progress { height: 6px; border-radius: 999px; background: var(--nd-accent); }
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 20px; height: 20px; margin-top: -7px; border-radius: 50%;
  background: #fff; border: 2px solid var(--nd-accent); box-shadow: 0 2px 6px rgba(60,30,40,.2);
}
input[type="range"]::-moz-range-thumb {
  width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 2px solid var(--nd-accent); box-shadow: 0 2px 6px rgba(60,30,40,.2);
}
.help { font-size: 12px; color: var(--nd-muted); margin-top: -8px; margin-bottom: 14px; }

.preview {
  height: 84px; border-radius: 14px; background: var(--nd-surface-2); margin-top: 4px; position: relative; overflow: hidden;
}
.preview canvas { position: absolute; inset: 0; width: 100%; height: 100%; }

/* ---------- selected element ---------- */
.sel-card {
  border-radius: 16px; padding: 12px 12px 4px; margin-bottom: 18px;
  background: var(--soft); border: 1px solid color-mix(in srgb, var(--nd-accent) 22%, transparent);
}
.sel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.sel-head strong { font-size: 13px; }
.sel-head .icon-btn { width: 28px; height: 28px; border-radius: 8px; }
.sel-card input[type="range"]::-webkit-slider-runnable-track { background: linear-gradient(to right, var(--nd-accent) var(--p), var(--nd-surface) var(--p)); }
.actions { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; margin: 4px 0 10px; }
.act {
  display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 7px 2px; border-radius: 10px;
  border: 0; background: var(--nd-surface); font-size: 10.5px; font-weight: 600; color: var(--nd-text); cursor: pointer;
}
.act:hover { color: var(--nd-accent); }
.act.danger { color: #c0392b; }
.act svg { width: 18px; height: 18px; }

/* ---------- modal & toast ---------- */
.modal {
  position: absolute; inset: 0; z-index: 20; display: grid; place-items: center; padding: 20px;
  background: rgba(34, 22, 27, .5); backdrop-filter: blur(5px); animation: fade .2s ease;
}
.modal-card {
  width: min(520px, 100%); max-height: 100%; display: flex; flex-direction: column; overflow: hidden;
  background: var(--nd-surface); border-radius: 24px; box-shadow: 0 30px 80px rgba(30, 10, 20, .35); animation: pop .25s ease;
}
.modal-img { flex: 1; min-height: 0; background: var(--nd-bg); display: grid; place-items: center; }
.modal-img img { display: block; width: 100%; height: 100%; max-height: min(62vh, 560px); object-fit: contain; }
.modal-body { padding: 18px 20px 20px; }
.modal-body h2 { margin: 0 0 4px; font-size: 18px; }
.modal-body p { margin: 0 0 16px; color: var(--nd-muted); font-size: 13.5px; }
.modal-actions { display: grid; grid-template-columns: 1fr 1.4fr; gap: 10px; }
.toast {
  position: absolute; left: 50%; bottom: 22px; z-index: 30; transform: translate(-50%, 12px); opacity: 0; pointer-events: none;
  padding: 10px 16px; border-radius: 12px; background: #2b2326; color: #fff; font-size: 13px; font-weight: 500;
  box-shadow: 0 10px 30px rgba(0,0,0,.2); transition: opacity .2s, transform .2s; white-space: nowrap;
}
.toast.show { opacity: 1; transform: translate(-50%, 0); }
@keyframes fade { from { opacity: 0; } }
@keyframes pop { from { opacity: 0; transform: translateY(12px) scale(.98); } }

/* ---------- responsive (based on the component's own width) ---------- */
@container (max-width: 1100px) {
  .body { grid-template-columns: 74px 272px minmax(0, 1fr); }
  .stage { gap: 10px; padding: 10px; }
}
@container (max-width: 860px) {
  .body {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto 300px;
    grid-template-areas: "stage" "rail" "panel";
  }
  .rail {
    flex-direction: row; justify-content: space-between; padding: 6px; gap: 2px; overflow-x: auto;
    border-right: 0; border-top: 1px solid var(--nd-border); border-bottom: 1px solid var(--nd-border);
  }
  .tool { flex: 1; padding: 7px 2px 6px; font-size: 11px; }
  .panel { border-right: 0; padding: 16px; }
  .panel .desc { margin-bottom: 14px; }
  .stage { grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr); }
}
@container (max-width: 560px) {
  .brand-sub, .divider { display: none; }
  .btn.finish span { display: none; }
  .btn.finish { padding: 0 12px; }
  .stage { padding: 8px; gap: 8px; }
  .card-head { padding: 8px 8px 0; }
  .card-title { display: none; }
  .card-head .seg { width: 100%; }
  .card-head .seg button { flex: 1; padding: 6px 4px; }
  .card-foot { padding: 0 6px 8px; gap: 4px; }
  .mini { padding: 0 8px; }
  .mini span { display: none; }
  .nail-nav .label { min-width: 0; font-size: 12px; }
  .hint { font-size: 11px; white-space: normal; text-align: center; width: max-content; line-height: 1.3; border-radius: 12px; }
  .tiles { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; }
  .tiles.four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .tile { padding: 6px 2px 5px; font-size: 10.5px; }
  .tile img, .tile.tall img { height: 54px; }
  .swatches { grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 6px; }
}
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
`;
