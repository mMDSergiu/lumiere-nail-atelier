// Salon editor: login, then edit texts, prices, photos, team and the booking link with a live preview.
// Saved through the server API (server/api.js). Everything typed here is shown with textContent only.

import { LOOK_NAMES, clone, loc, safeUrl } from './content.js';
import { EDITABLE_KEYS, LANGS, STRINGS, createT } from './i18n.js';

const ICON = {
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4.5 3.5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  logout: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
};

const TABS = [
  ['general', 'admin.tabGeneral'],
  ['texts', 'admin.tabTexts'],
  ['services', 'admin.tabServices'],
  ['gallery', 'admin.tabGallery'],
  ['team', 'admin.tabTeam'],
  ['booking', 'admin.tabBooking'],
];

const SECTION_NAMES = {
  meta: 'SEO',
  announce: 'Banner',
  nav: 'Menu',
  hero: 'Hero',
  marquee: 'Marquee',
  services: 'Services',
  studio: 'Studio',
  gallery: 'Gallery',
  work: 'Portfolio',
  team: 'Team',
  about: 'About',
  book: 'Booking',
  design: 'Design card',
  contact: 'Contact',
  hours: 'Hours',
  online: 'Online booking',
  form: 'Request form',
  footer: 'Footer',
  look: 'Looks',
};

/* ------------------------------------------------------------- dom helper */

/** Tiny element builder. Text children are always inserted as text, never as HTML. */
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

/** replaceChildren that skips false/null (from cond && el). */
function fill(el, ...kids) {
  el.replaceChildren(...kids.flat().filter((k) => k !== null && k !== undefined && k !== false));
}

function icon(name) {
  const span = document.createElement('span');
  span.className = 'a-ico';
  span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`; // static markup only
  return span;
}

/* ------------------------------------------------------------- api */

async function api(path, options = {}) {
  const res = await fetch(`./api/${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }
  return { ok: res.ok, status: res.status, body };
}

/** Shrinks a photo in the browser (max 1800 px, JPEG) before uploading it. */
async function prepareImage(file, max = 1800) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 15_000_000) throw new Error('type');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.86);
}

/* ============================================================= editor */

export function setupAdmin({ getContent, getSavedContent, onSaved, getLang, setLang, preview }) {
  const root = document.getElementById('admin-root');
  const ui = {
    signedIn: false,
    open: false,
    tab: 'general',
    search: '',
    saving: false,
    status: '',
    confirm: null, // id of an item waiting for a second "delete" click
  };
  let saved = clone(getContent());
  let draft = clone(saved);
  let previewTimer = 0;

  const t = () => createT(getLang());
  const dirty = () => JSON.stringify(draft) !== JSON.stringify(saved);

  /* ------------------------------------------------------- login */

  const login = h('div', { class: 'a-modal', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'a-login-title' });
  root.append(login);

  function renderLogin(message = '') {
    const tr = t();
    const user = h('input', { id: 'a-user', autocomplete: 'username', required: true });
    const pass = h('input', { id: 'a-pass', type: 'password', autocomplete: 'current-password', required: true });
    const error = h('p', { class: 'a-error', role: 'alert', hidden: !message }, message);
    const submit = h('button', { class: 'a-btn a-primary a-block', type: 'submit' }, tr('admin.signIn'));
    const form = h(
      'form',
      {
        class: 'a-login',
        onsubmit: async (e) => {
          e.preventDefault();
          submit.disabled = true;
          const msg = await signIn(user.value, pass.value);
          submit.disabled = false;
          if (msg) {
            error.textContent = msg;
            error.hidden = false;
            pass.select();
          }
        },
      },
      h('button', { class: 'a-icon-btn a-x', type: 'button', 'aria-label': tr('ui.close'), onclick: closeLogin }, icon('close')),
      h('div', { class: 'a-login-badge' }, icon('lock')),
      h('h2', { id: 'a-login-title' }, tr('admin.loginTitle')),
      h('p', { class: 'a-muted' }, tr('admin.loginText')),
      h('label', { class: 'a-field' }, h('span', {}, tr('admin.user')), user),
      h('label', { class: 'a-field' }, h('span', {}, tr('admin.pass')), pass),
      error,
      submit,
    );
    login.replaceChildren(form);
    return user;
  }

  function openLogin(message) {
    if (ui.signedIn) {
      openEditor();
      return;
    }
    const first = renderLogin(message);
    login.hidden = false;
    document.body.classList.add('modal-open');
    first.focus();
  }

  function closeLogin() {
    login.hidden = true;
    document.body.classList.remove('modal-open');
  }

  async function signIn(user, password) {
    const tr = t();
    try {
      const res = await api('login', { method: 'POST', body: JSON.stringify({ user, password }) });
      if (res.status === 429) return tr('admin.tooMany');
      if (!res.ok) return res.status === 401 ? tr('admin.badLogin') : tr('admin.noServer');
    } catch {
      return tr('admin.noServer');
    }
    closeLogin();
    ui.signedIn = true;
    // After an expired session the draft is kept, so unsaved edits can still be saved.
    saved = clone(getSavedContent());
    if (!ui.open) draft = clone(saved);
    openEditor();
    return '';
  }

  async function signOut() {
    try {
      await api('logout', { method: 'POST', body: '{}' });
    } catch {
      /* offline: still leave edit mode */
    }
    if (dirty()) preview(clone(saved));
    draft = clone(saved);
    ui.signedIn = false;
    ui.open = false;
    renderAll();
  }

  /* ------------------------------------------------------- bar + drawer */

  const bar = h('div', { class: 'a-bar', hidden: true });
  const drawer = h('aside', { class: 'a-drawer', hidden: true, 'aria-label': 'Salon editor' });
  root.append(bar, drawer);

  function openEditor() {
    ui.open = true;
    ui.status = '';
    renderAll();
    drawer.querySelector('.a-tab[aria-selected="true"]')?.focus();
  }

  function renderAll() {
    renderBar();
    renderDrawer();
    document.body.classList.toggle('admin-on', ui.signedIn);
    document.body.classList.toggle('admin-drawer-open', ui.signedIn && ui.open);
  }

  function renderBar() {
    bar.hidden = !ui.signedIn;
    if (!ui.signedIn) return;
    const tr = t();
    const isDirty = dirty();
    fill(bar,
      h('span', { class: 'a-bar-dot' + (isDirty ? ' warn' : '') }),
      h('span', { class: 'a-bar-label' }, isDirty ? tr('admin.unsaved') : tr('admin.editing')),
      !ui.open && h('button', { class: 'a-btn a-ghost-light', onclick: openEditor }, icon('edit'), tr('admin.openEditor')),
      isDirty && h('button', { class: 'a-btn a-primary', onclick: save, disabled: ui.saving }, ui.saving ? tr('admin.saving') : tr('admin.save')),
      h('button', { class: 'a-icon-btn a-light', 'aria-label': tr('admin.logout'), title: tr('admin.logout'), onclick: signOut }, icon('logout')),
    );
  }

  function renderDrawer() {
    drawer.hidden = !(ui.signedIn && ui.open);
    if (drawer.hidden) return;
    const tr = t();
    const lang = getLang();
    const scroll = drawer.querySelector('.a-body')?.scrollTop ?? 0;

    const tabs = h(
      'div',
      { class: 'a-tabs', role: 'tablist' },
      TABS.map(([id, key]) =>
        h(
          'button',
          {
            class: 'a-tab',
            role: 'tab',
            'aria-selected': String(ui.tab === id),
            onclick: () => {
              ui.tab = id;
              ui.confirm = null;
              renderDrawer();
              drawer.querySelector('.a-body').scrollTop = 0;
            },
          },
          tr(key),
        ),
      ),
    );

    const langs = h(
      'div',
      { class: 'a-langs' },
      h('span', {}, tr('admin.langNote')),
      h(
        'div',
        { class: 'a-seg' },
        LANGS.map((l) => h('button', { 'aria-pressed': String(l.id === lang), onclick: () => setLang(l.id) }, l.label)),
      ),
    );

    const body = h('div', { class: 'a-body' }, PANELS[ui.tab]());
    const isDirty = dirty();
    const foot = h(
      'footer',
      { class: 'a-foot' },
      h('p', { class: 'a-status', role: 'status' }, ui.status),
      isDirty && h('button', { class: 'a-btn a-ghost', onclick: discard }, tr('admin.discard')),
      h(
        'button',
        { class: 'a-btn a-primary', onclick: save, disabled: !isDirty || ui.saving },
        ui.saving ? tr('admin.saving') : isDirty ? tr('admin.save') : [icon('check'), tr('admin.savedShort')],
      ),
    );

    fill(drawer,
      h(
        'header',
        { class: 'a-head' },
        h('div', {}, h('strong', {}, tr('admin.editing')), h('span', {}, getContent().settings.brand)),
        h(
          'button',
          {
            class: 'a-icon-btn',
            'aria-label': tr('ui.close'),
            onclick: () => {
              ui.open = false;
              renderAll();
            },
          },
          icon('close'),
        ),
      ),
      tabs,
      ...(ui.tab !== 'booking' && ui.tab !== 'general' ? [langs] : []),
      body,
      foot,
    );
    drawer.querySelector('.a-body').scrollTop = scroll;
  }

  /* ------------------------------------------------------- changes */

  /** Called after every edit: live preview (debounced) and refresh of the save buttons. */
  function changed({ rerender = false } = {}) {
    ui.status = '';
    clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => preview(clone(draft)), 160);
    renderBar();
    if (rerender) renderDrawer();
    else refreshFoot();
  }

  function refreshFoot() {
    const foot = drawer.querySelector('.a-foot');
    if (!foot) return;
    const scroll = drawer.querySelector('.a-body').scrollTop;
    const active = document.activeElement;
    // Re-render only the footer, keeping focus in the field being typed in.
    const tr = t();
    const isDirty = dirty();
    fill(foot,
      h('p', { class: 'a-status', role: 'status' }, ui.status),
      isDirty && h('button', { class: 'a-btn a-ghost', onclick: discard }, tr('admin.discard')),
      h(
        'button',
        { class: 'a-btn a-primary', onclick: save, disabled: !isDirty || ui.saving },
        ui.saving ? tr('admin.saving') : isDirty ? tr('admin.save') : [icon('check'), tr('admin.savedShort')],
      ),
    );
    drawer.querySelector('.a-body').scrollTop = scroll;
    if (active && document.contains(active)) active.focus();
  }

  function discard() {
    draft = clone(saved);
    ui.confirm = null;
    preview(clone(saved));
    renderAll();
  }

  async function save() {
    const tr = t();
    ui.saving = true;
    renderBar();
    refreshFoot();
    try {
      const res = await api('content', { method: 'PUT', body: JSON.stringify(cleanTexts(draft)) });
      if (res.status === 401) {
        ui.signedIn = false;
        ui.saving = false;
        renderAll();
        openLogin(tr('admin.sessionEnded'));
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      saved = clone(res.body);
      draft = clone(res.body);
      onSaved(saved);
      preview(clone(saved));
      ui.status = tr('admin.saved');
    } catch {
      ui.status = tr('admin.saveFailed');
    }
    ui.saving = false;
    renderAll();
  }

  /** Drops text overrides that are empty or identical to the original text. */
  function cleanTexts(content) {
    const out = clone(content);
    for (const l of LANGS) {
      const texts = out.texts[l.id] ?? {};
      for (const [k, v] of Object.entries(texts)) if (!v.trim() || v === STRINGS[l.id][k]) delete texts[k];
    }
    return out;
  }

  /* ------------------------------------------------------- form parts */

  function field(label, control, help) {
    return h('label', { class: 'a-field' }, h('span', {}, label), control, help && h('small', {}, help));
  }

  function input(obj, key, { type = 'text', placeholder, rows, onInput, max } = {}) {
    const props = {
      value: obj[key] ?? '',
      placeholder,
      maxlength: max,
      oninput: (e) => {
        obj[key] = type === 'number' ? (e.target.value === '' ? 0 : Number(e.target.value)) : e.target.value;
        onInput?.(e);
        changed();
      },
    };
    if (rows) return h('textarea', { rows, ...props });
    return h('input', { type, ...(type === 'number' ? { min: 0, step: 'any', inputmode: 'decimal' } : {}), ...props });
  }

  /** Input for the current language of a {en, ro, ru} field. */
  function localInput(obj, key, opts = {}) {
    obj[key] ??= { en: '', ro: '', ru: '' };
    const lang = getLang();
    const fallback = obj[key].en;
    return input(obj[key], lang, { ...opts, placeholder: lang !== 'en' && fallback ? fallback : opts.placeholder });
  }

  function imageField(label, current, onPick, help) {
    const tr = t();
    const file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', hidden: true });
    const status = h('small', { class: 'a-error', hidden: true });
    const pickBtn = h('button', { type: 'button', class: 'a-btn a-ghost a-sm', onclick: () => file.click() }, icon('image'), tr('admin.upload'));
    file.addEventListener('change', async () => {
      const f = file.files?.[0];
      if (!f) return;
      pickBtn.disabled = true;
      pickBtn.lastChild.textContent = tr('admin.uploading');
      try {
        const url = await uploadFile(f);
        onPick(url);
        changed({ rerender: true });
      } catch (err) {
        if (err.message === 'signed_out') return;
        status.textContent = tr('admin.uploadFailed');
        status.hidden = false;
        pickBtn.disabled = false;
        pickBtn.lastChild.textContent = tr('admin.upload');
      }
    });
    return h(
      'div',
      { class: 'a-field' },
      h('span', {}, label),
      h(
        'div',
        { class: 'a-image' },
        h('div', { class: 'a-thumb' }, current ? h('img', { src: current, alt: '' }) : icon('image')),
        h(
          'div',
          { class: 'a-image-actions' },
          pickBtn,
          current &&
            h(
              'button',
              {
                type: 'button',
                class: 'a-btn a-ghost a-sm',
                onclick: () => {
                  onPick('');
                  changed({ rerender: true });
                },
              },
              tr('admin.remove'),
            ),
        ),
        file,
      ),
      help && h('small', {}, help),
      status,
    );
  }

  async function uploadFile(f) {
    const data = await prepareImage(f);
    const res = await api('upload', { method: 'POST', body: JSON.stringify({ data }) });
    if (res.status === 401) {
      ui.signedIn = false;
      renderAll();
      openLogin(t()('admin.sessionEnded'));
      throw new Error('signed_out');
    }
    if (!res.ok || !res.body?.url) throw new Error('upload');
    return res.body.url;
  }

  /** Header of a list item with move/delete buttons. */
  function itemHead(title, list, index, id) {
    const tr = t();
    const move = (dir) => {
      const to = index + dir;
      if (to < 0 || to >= list.length) return;
      [list[index], list[to]] = [list[to], list[index]];
      changed({ rerender: true });
    };
    const confirming = ui.confirm === id;
    return h(
      'div',
      { class: 'a-item-head' },
      h('strong', {}, title || tr('admin.untitled')),
      h(
        'div',
        { class: 'a-item-actions' },
        h('button', { type: 'button', class: 'a-icon-btn a-sm', 'aria-label': tr('admin.moveUp'), title: tr('admin.moveUp'), disabled: index === 0, onclick: () => move(-1) }, icon('up')),
        h(
          'button',
          { type: 'button', class: 'a-icon-btn a-sm', 'aria-label': tr('admin.moveDown'), title: tr('admin.moveDown'), disabled: index === list.length - 1, onclick: () => move(1) },
          icon('down'),
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'a-icon-btn a-sm a-danger' + (confirming ? ' confirm' : ''),
            'aria-label': confirming ? tr('admin.confirmDelete') : tr('admin.delete'),
            title: confirming ? tr('admin.confirmDelete') : tr('admin.delete'),
            onclick: () => {
              if (!confirming) {
                ui.confirm = id;
                renderDrawer();
                window.setTimeout(() => {
                  if (ui.confirm === id) {
                    ui.confirm = null;
                    renderDrawer();
                  }
                }, 4000);
                return;
              }
              list.splice(index, 1);
              ui.confirm = null;
              changed({ rerender: true });
            },
          },
          icon('trash'),
          confirming ? tr('admin.confirmDelete') : null,
        ),
      ),
    );
  }

  const newId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

  /* ------------------------------------------------------- panels */

  const PANELS = {
    general() {
      const tr = t();
      const s = draft.settings;
      return h(
        'div',
        { class: 'a-panel' },
        h('div', { class: 'a-row' }, field(tr('admin.brand'), input(s, 'brand', { max: 40 })), field(tr('admin.brandSub'), input(s, 'brandSub', { max: 40 }))),
        h('div', { class: 'a-row' }, field(tr('admin.phone'), input(s, 'phone', { type: 'tel', max: 40 })), field(tr('admin.currency'), input(s, 'currency', { max: 8 }))),
        field(tr('admin.email'), input(s, 'email', { type: 'email', max: 120 })),
        field(tr('admin.address'), input(s, 'address', { max: 200 })),
        field(tr('admin.instagram'), input(s, 'instagram', { type: 'url', placeholder: 'https://instagram.com/…', max: 300 })),
        imageField(tr('admin.heroImage'), s.heroImage, (url) => (s.heroImage = url), tr('admin.heroImageHelp')),
      );
    },

    texts() {
      const tr = t();
      const lang = getLang();
      const texts = (draft.texts[lang] ??= {});
      const q = ui.search.trim().toLowerCase();
      const groups = new Map();
      for (const key of EDITABLE_KEYS) {
        const original = STRINGS[lang][key] ?? STRINGS.en[key];
        const current = texts[key] ?? '';
        if (q && !`${key} ${original} ${current}`.toLowerCase().includes(q)) continue;
        const section = key.split('.')[0];
        if (!groups.has(section)) groups.set(section, []);
        groups.get(section).push([key, original]);
      }
      const search = h('input', {
        type: 'search',
        class: 'a-search',
        placeholder: tr('admin.search'),
        value: ui.search,
        oninput: (e) => {
          ui.search = e.target.value;
          const list = drawer.querySelector('.a-text-groups');
          list.replaceChildren(...PANELS.texts().querySelector('.a-text-groups').childNodes);
        },
      });
      const groupEls = [...groups].map(([section, keys]) =>
        h(
          'section',
          { class: 'a-group' },
          h('h3', {}, SECTION_NAMES[section] ?? section),
          keys.map(([key, original]) => {
            const long = original.length > 60 || original.includes('\n');
            const name = key.slice(key.indexOf('.') + 1);
            const el = h(long ? 'textarea' : 'input', {
              rows: long ? Math.min(6, Math.ceil(original.length / 48) + 1) : undefined,
              value: texts[key] ?? '',
              placeholder: original,
              oninput: (e) => {
                if (e.target.value.trim()) texts[key] = e.target.value;
                else delete texts[key];
                changed();
              },
            });
            return h('label', { class: 'a-field' + (texts[key] ? ' a-changed' : '') }, h('span', {}, name), el);
          }),
        ),
      );
      return h('div', { class: 'a-panel' }, h('p', { class: 'a-help' }, tr('admin.textsHelp')), search, h('div', { class: 'a-text-groups' }, groupEls));
    },

    services() {
      const tr = t();
      const lang = getLang();
      const list = draft.services;
      return h(
        'div',
        { class: 'a-panel' },
        list.map((s, i) =>
          h(
            'div',
            { class: 'a-item' },
            itemHead(loc(s.name, lang), list, i, s.id),
            field(
              tr('admin.name'),
              localInput(s, 'name', {
                max: 80,
                onInput: (e) => (e.target.closest('.a-item').querySelector('.a-item-head strong').textContent = e.target.value || tr('admin.untitled')),
              }),
            ),
            field(tr('admin.description'), localInput(s, 'desc', { rows: 2, max: 300 })),
            h(
              'div',
              { class: 'a-row a-row-3' },
              field(`${tr('admin.price')} (${draft.settings.currency})`, input(s, 'price', { type: 'number' })),
              field(tr('admin.minutes'), input(s, 'minutes', { type: 'number' })),
              field(tr('admin.priceNote'), localInput(s, 'priceNote', { max: 40 })),
            ),
            h(
              'div',
              { class: 'a-row' },
              field(
                tr('admin.picture'),
                h(
                  'select',
                  {
                    onchange: (e) => {
                      s.look = e.target.value;
                      changed();
                    },
                  },
                  LOOK_NAMES.map((n) => h('option', { value: n, selected: n === s.look }, createT(lang)(`look.${n}`))),
                ),
              ),
              h(
                'label',
                { class: 'a-check' },
                h('input', {
                  type: 'checkbox',
                  checked: s.addOn,
                  onchange: (e) => {
                    s.addOn = e.target.checked;
                    changed();
                  },
                }),
                h('span', {}, tr('admin.addOn')),
              ),
            ),
          ),
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'a-btn a-add',
            onclick: () => {
              list.push({
                id: newId('service'),
                name: { en: '', ro: '', ru: '' },
                desc: { en: '', ro: '', ru: '' },
                minutes: 60,
                addOn: false,
                price: 0,
                priceNote: { en: '', ro: '', ru: '' },
                look: LOOK_NAMES[list.length % LOOK_NAMES.length],
                nail: 1,
              });
              changed({ rerender: true });
              const body = drawer.querySelector('.a-body');
              body.scrollTop = body.scrollHeight;
              drawer.querySelector('.a-item:last-of-type input')?.focus();
            },
          },
          icon('plus'),
          tr('admin.addService'),
        ),
      );
    },

    gallery() {
      const tr = t();
      const list = draft.photos;
      const file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true, hidden: true });
      const status = h('p', { class: 'a-error', hidden: true });
      const addBtn = h('button', { type: 'button', class: 'a-btn a-add', onclick: () => file.click() }, icon('plus'), tr('admin.addPhotos'));
      file.addEventListener('change', async () => {
        const files = [...(file.files ?? [])].slice(0, 20);
        addBtn.disabled = true;
        addBtn.lastChild.textContent = tr('admin.uploading');
        let failed = false;
        for (const f of files) {
          try {
            const url = await uploadFile(f);
            list.push({ id: newId('photo'), src: url, caption: { en: '', ro: '', ru: '' } });
          } catch (err) {
            if (err.message === 'signed_out') break;
            failed = true;
          }
        }
        changed({ rerender: true });
        if (failed) {
          const msg = drawer.querySelector('.a-gallery-error');
          if (msg) {
            msg.textContent = tr('admin.uploadFailed');
            msg.hidden = false;
          }
        }
      });
      status.classList.add('a-gallery-error');
      return h(
        'div',
        { class: 'a-panel' },
        h(
          'label',
          { class: 'a-check a-check-block' },
          h('input', {
            type: 'checkbox',
            checked: draft.showLooks,
            onchange: (e) => {
              draft.showLooks = e.target.checked;
              changed();
            },
          }),
          h('span', {}, tr('admin.showLooks')),
        ),
        h('h3', { class: 'a-subhead' }, tr('admin.photos')),
        list.length === 0 && h('p', { class: 'a-help' }, tr('admin.noPhotos')),
        h(
          'div',
          { class: 'a-photos' },
          list.map((p, i) =>
            h(
              'div',
              { class: 'a-photo' },
              h('img', { src: p.src, alt: '' }),
              h('div', { class: 'a-photo-body' }, itemHead(`${i + 1}`, list, i, p.id), field(tr('admin.caption'), localInput(p, 'caption', { max: 120 }))),
            ),
          ),
        ),
        status,
        addBtn,
        file,
      );
    },

    team() {
      const tr = t();
      const list = draft.team;
      return h(
        'div',
        { class: 'a-panel' },
        list.map((m, i) =>
          h(
            'div',
            { class: 'a-item' },
            itemHead(m.name, list, i, m.id),
            h(
              'div',
              { class: 'a-row' },
              field(
                tr('admin.name'),
                input(m, 'name', {
                  max: 60,
                  onInput: (e) => {
                    const head = e.target.closest('.a-item').querySelector('.a-item-head strong');
                    head.textContent = e.target.value || tr('admin.untitled');
                  },
                }),
              ),
              field(tr('admin.role'), localInput(m, 'role', { max: 80 })),
            ),
            field(tr('admin.bio'), localInput(m, 'bio', { rows: 2, max: 300 })),
            imageField(tr('admin.photo'), m.photo, (url) => (m.photo = url)),
            field(tr('admin.memberBooking'), input(m, 'bookingUrl', { type: 'url', placeholder: 'https://…', max: 500 })),
          ),
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'a-btn a-add',
            onclick: () => {
              list.push({ id: newId('artist'), name: '', role: { en: '', ro: '', ru: '' }, bio: { en: '', ro: '', ru: '' }, photo: '', bookingUrl: '' });
              changed({ rerender: true });
              const body = drawer.querySelector('.a-body');
              body.scrollTop = body.scrollHeight;
              drawer.querySelectorAll('.a-item')[list.length - 1]?.querySelector('input')?.focus();
            },
          },
          icon('plus'),
          tr('admin.addMember'),
        ),
      );
    },

    booking() {
      const tr = t();
      const s = draft.settings;
      const warn = h('small', { class: 'a-error', hidden: true }, tr('admin.badUrl'));
      const check = () => {
        const v = s.bookingUrl.trim();
        warn.hidden = !v || safeUrl(v).startsWith('https:');
        test.disabled = !safeUrl(v).startsWith('https:');
      };
      const test = h(
        'button',
        { type: 'button', class: 'a-btn a-ghost a-sm', onclick: () => window.open(safeUrl(s.bookingUrl), '_blank', 'noopener') },
        icon('link'),
        tr('admin.test'),
      );
      const url = input(s, 'bookingUrl', { type: 'url', placeholder: 'https://…', max: 500, onInput: check });
      const panel = h(
        'div',
        { class: 'a-panel' },
        h('div', { class: 'a-callout' }, h('strong', {}, 'Masters Salon'), h('p', {}, tr('admin.bookingIntro'))),
        field(tr('admin.bookingUrl'), url, tr('admin.bookingHow')),
        warn,
        h('div', { class: 'a-inline' }, test),
        h(
          'fieldset',
          { class: 'a-radios' },
          h('legend', {}, tr('admin.bookingMode')),
          ['newtab', 'embed'].map((mode) =>
            h(
              'label',
              { class: 'a-check' },
              h('input', {
                type: 'radio',
                name: 'a-mode',
                checked: s.bookingMode === mode,
                onchange: () => {
                  s.bookingMode = mode;
                  changed();
                },
              }),
              h('span', {}, tr(mode === 'embed' ? 'admin.modeEmbed' : 'admin.modeTab')),
            ),
          ),
          h('small', {}, tr('admin.modeEmbedHelp')),
        ),
      );
      check();
      return panel;
    },
  };

  /* ------------------------------------------------------- wiring */

  document.getElementById('login-open').addEventListener('click', () => openLogin());
  if (location.hash === '#admin') openLogin();
  window.addEventListener('hashchange', () => location.hash === '#admin' && openLogin());
  login.addEventListener('click', (e) => e.target === login && closeLogin());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !login.hidden) closeLogin();
  });
  document.addEventListener('site-language', () => {
    renderAll();
    if (!login.hidden) renderLogin();
  });
  window.addEventListener('beforeunload', (e) => {
    if (ui.signedIn && dirty()) e.preventDefault();
  });

  // Already signed in (e.g. after a page reload)?
  api('me')
    .then((res) => {
      if (res.ok && res.body?.signedIn) {
        ui.signedIn = true;
        saved = clone(getSavedContent());
        draft = clone(saved);
        renderAll();
      }
    })
    .catch(() => {
      /* no server: editing is unavailable, the site works as usual */
    });
}
