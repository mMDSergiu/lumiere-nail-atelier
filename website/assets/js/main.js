// The salon website: renders the editable content, language and theme, gallery, team and booking.
// The design studio widget is imported straight from its source.
import '../../../widget/src/main.ts';
import { setupAdmin } from './admin.js';
import { DEFAULT_CONTENT, clone, loc, safeUrl, sanitizeContent } from './content.js';
import { INSPIRATIONS } from './designs.js';
import { LANGS, createT, toLang } from './i18n.js';

const $ = (sel, root = document) => root.querySelector(sel);
const lookByName = (name) => INSPIRATIONS.find((l) => l.name === name) ?? INSPIRATIONS[0];

const state = {
  content: clone(DEFAULT_CONTENT),
  saved: clone(DEFAULT_CONTENT), // last content from the server (the editor's baseline)
  lang: toLang(document.documentElement.lang),
  theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  designImage: '',
  t: createT('en'),
};

const store = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
  },
};

/* --------------------------------------------------------------- text */

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Safe "rich" text: *word* becomes an accent word, new lines become <br>. */
function setRich(el, text) {
  el.innerHTML = escapeHtml(text)
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');
}

function applyTexts() {
  const t = state.t;
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-rich]').forEach((el) => setRich(el, t(el.dataset.i18nRich)));
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr, t(key));
    }
  });
  document.title = t('meta.title');
  $('meta[name="description"]').setAttribute('content', t('meta.description'));
}

/* --------------------------------------------------------------- settings */

function applySettings() {
  const s = state.content.settings;
  document.querySelectorAll('[data-brand]').forEach((el) => (el.textContent = s.brand));
  document.querySelectorAll('[data-brand-sub]').forEach((el) => {
    el.textContent = s.brandSub;
    el.hidden = !s.brandSub;
  });
  const full = [s.brand, s.brandSub].filter(Boolean).join(' ');
  document.querySelectorAll('[data-brand-full]').forEach((el) => (el.textContent = full));
  document.querySelectorAll('[data-setting="address"]').forEach((el) => (el.textContent = s.address));
  $('#designer').setAttribute('salon-name', full);

  const links = $('#contact-links');
  links.replaceChildren();
  const add = (text, href) => {
    if (!text) return;
    const a = document.createElement('a');
    a.textContent = text;
    a.href = href;
    if (href.startsWith('http')) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    links.append(a);
  };
  add(s.phone, `tel:${s.phone.replace(/[^\d+]/g, '')}`);
  add(s.email, `mailto:${s.email}`);
  if (s.instagram) add('Instagram', s.instagram);

  const photo = $('#hero-photo');
  photo.hidden = !s.heroImage;
  $('#hero-arch').classList.toggle('has-photo', !!s.heroImage);
  if (s.heroImage) photo.src = s.heroImage;
}

/* --------------------------------------------------------------- nav */

function setupNav() {
  const btn = $('#menu-btn');
  const links = $('#nav-links');
  const close = () => {
    document.body.classList.remove('menu-open');
    btn.setAttribute('aria-expanded', 'false');
  };
  btn.addEventListener('click', () => {
    const open = !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
  });
  links.addEventListener('click', (e) => e.target.closest('a') && close());

  const nav = $('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function setupLanguage() {
  const btn = $('#lang-btn');
  const menu = $('#lang-menu');
  for (const l of LANGS) {
    const item = document.createElement('button');
    item.type = 'button';
    item.setAttribute('role', 'menuitemradio');
    item.dataset.lang = l.id;
    item.innerHTML = '<b></b><span></span>';
    $('b', item).textContent = l.label;
    $('span', item).textContent = l.name;
    menu.append(item);
  }
  const toggle = (open) => {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle(menu.hidden);
  });
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-lang]');
    if (!item) return;
    setLanguage(item.dataset.lang);
    toggle(false);
    btn.focus();
  });
  document.addEventListener('click', () => toggle(false));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && !menu.hidden && toggle(false));
}

function setLanguage(lang) {
  state.lang = toLang(lang);
  store.set('site-lang', state.lang);
  render();
  document.dispatchEvent(new CustomEvent('site-language', { detail: state.lang }));
}

function setupTheme() {
  $('#theme-btn').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    store.set('site-theme', state.theme);
    applyTheme();
    renderGallery(); // previews are drawn on the section background
  });
}

function applyTheme() {
  const dark = state.theme === 'dark';
  document.documentElement.dataset.theme = state.theme;
  $('meta[name="theme-color"]').setAttribute('content', dark ? '#151012' : '#fbf8f4');
  $('#designer').setAttribute('theme', state.theme);
  const label = state.t(dark ? 'ui.themeLight' : 'ui.themeDark');
  $('#theme-btn').setAttribute('aria-label', label);
  $('#theme-btn').title = label;
}

/* ------------------------------------------------------- scroll reveal */

let revealer = null;
function setupReveal() {
  if (!('IntersectionObserver' in window)) return;
  revealer = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          revealer.unobserve(e.target);
        }
      }),
    { rootMargin: '0px 0px -8% 0px' },
  );
  observeReveal();
}

function observeReveal() {
  document.querySelectorAll('.reveal:not(.in)').forEach((el) => (revealer ? revealer.observe(el) : el.classList.add('in')));
}

/* ------------------------------------------------------------- images */

const imageCache = new Map();
function cached(key, make) {
  if (!imageCache.has(key)) imageCache.set(key, make());
  return imageCache.get(key);
}

function nailPicture(look, nail, w, h, overrides = {}) {
  const designer = $('#designer');
  const design = { ...lookByName(look).design, ...overrides };
  return cached(`nail|${look}|${nail}|${w}|${JSON.stringify(overrides)}`, () => designer.nailImage(design, nail, w, h));
}

/* ------------------------------------------------------------- sections */

function renderHeroFan() {
  const fan = $('#hero-fan');
  if (fan.childElementCount) return;
  // A "press-on set" of five different nails, all almond & long.
  const picks = [
    ['Classic French', 1],
    ['Love Notes', 1],
    ['Golden Hour', 2],
    ['Midnight Stars', 1],
    ['Marble Luxe', 2],
  ];
  picks.forEach(([name, nail], i) => {
    const img = new Image();
    img.alt = '';
    img.src = nailPicture(name, nail, 240, 460, { shape: 'almond', length: 'long' });
    img.style.setProperty('--i', String(i - 2));
    fan.append(img);
  });
}

function renderMarquee() {
  const items = state.t('marquee.items').split(',').map((s) => s.trim()).filter(Boolean);
  const track = $('#marquee');
  track.replaceChildren();
  for (let round = 0; round < 2; round++) {
    for (const text of items) {
      const span = document.createElement('span');
      span.textContent = text;
      const star = document.createElement('i');
      star.textContent = '✦';
      track.append(span, star);
    }
  }
}

function formatTime(service) {
  const min = state.t('services.min');
  return `${service.addOn ? '+' : ''}${service.minutes} ${min}`;
}

function formatPrice(service) {
  const { currency } = state.content.settings;
  const note = loc(service.priceNote, state.lang);
  const amount = Number.isInteger(service.price) ? service.price : service.price.toFixed(2);
  const money = /^[A-Za-z]/.test(currency) || currency.length > 1 ? `${amount} ${currency}` : `${currency}${amount}`;
  return `${state.t('services.from')} ${money}${note ? ' ' + note : ''}`;
}

function renderServices() {
  const menu = $('#service-menu');
  const select = $('#f-service');
  const picked = select.value;
  menu.replaceChildren();
  select.replaceChildren();
  for (const s of state.content.services) {
    const item = document.createElement('article');
    item.className = 'menu-item reveal in';
    item.innerHTML = `<div class="menu-pic"><img alt=""></div>
      <div class="menu-body">
        <div class="menu-line"><h3></h3><span class="dots"></span><span class="price"></span></div>
        <p class="menu-desc"></p>
        <span class="menu-time"></span>
      </div>`;
    $('img', item).src = nailPicture(s.look, s.nail, 120, 200);
    $('h3', item).textContent = loc(s.name, state.lang);
    $('.price', item).textContent = formatPrice(s);
    $('.menu-desc', item).textContent = loc(s.desc, state.lang);
    $('.menu-time', item).textContent = formatTime(s);
    menu.append(item);

    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = loc(s.name, state.lang);
    select.append(opt);
  }
  if (picked) select.value = picked;
}

function renderGallery() {
  const block = $('#looks-block');
  block.hidden = !state.content.showLooks;
  const grid = $('#gallery-grid');
  grid.replaceChildren();
  if (!state.content.showLooks) return;
  const designer = $('#designer');
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--look-bg').trim() || '#f3ebe3';
  const t = state.t;
  for (const look of INSPIRATIONS) {
    const name = t(`look.${look.name}`);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'look reveal in';
    card.setAttribute('aria-label', t('gallery.open', { name }));
    card.innerHTML = `<div class="look-img"><img alt=""><span class="look-cta"></span></div>
      <div class="look-meta"><strong></strong><span></span></div>`;
    $('img', card).src = cached(`look|${look.name}|${bg}`, () => designer.previewImage(look.design, 480, 580, bg));
    $('.look-cta', card).textContent = t('gallery.cta');
    $('strong', card).textContent = name;
    $('.look-meta span', card).textContent = `${t(`shape.${look.design.shape}`)} · ${t(`length.${look.design.length}`)}`;
    card.addEventListener('click', () => {
      designer.setDesign(look.design);
      $('.studio-frame').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    grid.append(card);
  }
}

function renderWork() {
  const photos = state.content.photos;
  $('#work-block').hidden = photos.length === 0;
  const grid = $('#work-grid');
  grid.replaceChildren();
  photos.forEach((p) => {
    const caption = loc(p.caption, state.lang);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'work-item';
    item.setAttribute('aria-label', caption || state.t('ui.photo'));
    const img = new Image();
    img.loading = 'lazy';
    img.alt = caption;
    img.src = p.src;
    item.append(img);
    if (caption) {
      const cap = document.createElement('span');
      cap.textContent = caption;
      item.append(cap);
    }
    item.addEventListener('click', () => openLightbox(p.src, caption));
    grid.append(item);
  });
}

function renderTeam() {
  const grid = $('#team-grid');
  grid.replaceChildren();
  const team = state.content.team.filter((m) => m.name);
  $('#team').hidden = team.length === 0;
  document.querySelectorAll('a[href="#team"]').forEach((a) => (a.hidden = team.length === 0));
  for (const m of team) {
    const card = document.createElement('article');
    card.className = 'member reveal in';
    card.innerHTML = `<div class="member-photo"></div><h3></h3><p class="member-role"></p><p class="member-bio"></p>`;
    const photo = $('.member-photo', card);
    if (m.photo) {
      const img = new Image();
      img.alt = m.name;
      img.loading = 'lazy';
      img.src = m.photo;
      photo.append(img);
    } else {
      const initial = document.createElement('span');
      initial.textContent = m.name.trim().charAt(0).toUpperCase();
      photo.append(initial);
      photo.classList.add('monogram');
    }
    $('h3', card).textContent = m.name;
    $('.member-role', card).textContent = loc(m.role, state.lang);
    $('.member-bio', card).textContent = loc(m.bio, state.lang);
    const link = m.bookingUrl || state.content.settings.bookingUrl;
    if (link) {
      const a = document.createElement('a');
      a.className = 'text-link member-book';
      a.href = link;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = state.t('team.book', { name: m.name });
      a.addEventListener('click', (e) => openBooking(e, link));
      card.append(a);
    }
    grid.append(card);
  }
}

/* ------------------------------------------------------------- booking */

function bookingUrl() {
  const url = safeUrl(state.content.settings.bookingUrl);
  return url.startsWith('https:') ? url : '';
}

function renderBooking() {
  const url = bookingUrl();
  $('#book-online').hidden = !url;
  $('#book-form').hidden = !!url;
  $('#book-sub').textContent = state.t(url ? 'book.subOnline' : 'book.sub');
  const btn = $('#online-btn');
  btn.href = url || '#';
  renderDesignCard();
}

function openBooking(e, url) {
  if (state.content.settings.bookingMode !== 'embed') return; // the link opens in a new tab
  e.preventDefault();
  const modal = $('#booking-modal');
  $('#booking-frame').src = url;
  $('#booking-frame').title = state.t('online.title');
  $('#booking-newtab').href = url;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  $('#booking-close').focus();
}

function closeBooking() {
  $('#booking-modal').hidden = true;
  $('#booking-frame').src = 'about:blank';
  document.body.classList.remove('modal-open');
}

function setupBookingLinks() {
  const btn = $('#online-btn');
  btn.addEventListener('click', (e) => {
    const url = bookingUrl();
    if (!url) return e.preventDefault();
    openBooking(e, url);
  });
  for (const a of document.querySelectorAll('a[href="#book"]')) {
    // "Book now" buttons go straight to online booking when it is set up.
    a.addEventListener('click', (e) => {
      const url = bookingUrl();
      if (!url || a.closest('.nav-links') || a.closest('.footer')) return;
      if (state.content.settings.bookingMode === 'embed') openBooking(e, url);
      else {
        e.preventDefault();
        window.open(url, '_blank', 'noopener');
      }
    });
  }
  $('#booking-close').addEventListener('click', closeBooking);
  $('#booking-modal').addEventListener('click', (e) => e.target.id === 'booking-modal' && closeBooking());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && !$('#booking-modal').hidden && closeBooking());
}

function renderDesignCard() {
  const t = state.t;
  const has = !!state.designImage;
  $('#design-card').classList.toggle('filled', has);
  $('#design-title').textContent = t(has ? 'design.readyTitle' : 'design.emptyTitle');
  $('#design-desc').textContent = t(has ? (bookingUrl() ? 'design.readyText' : 'design.readyTextForm') : 'design.emptyText');
  $('#design-edit').textContent = t(has ? 'design.edit' : 'design.open');
}

function setupDesignCard() {
  $('#designer').addEventListener('nail-design-finish', (e) => {
    state.designImage = e.detail.image;
    const img = $('#design-img');
    img.src = state.designImage;
    img.hidden = false;
    $('#design-empty').hidden = true;
    const dl = $('#slot-download');
    dl.href = state.designImage;
    dl.hidden = false;
    renderDesignCard();
  });
}

function setupForm() {
  const form = $('#book-form');
  const date = $('#f-date');
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  date.min = today();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = state.t;
    const error = $('#form-error');
    const required = ['#f-name', '#f-phone', '#f-date'].map((s) => $(s));
    let ok = true;
    for (const input of required) {
      const value = input.value.trim();
      const valid = value !== '' && (input.type !== 'tel' || /^[\d+()\s-]{6,}$/.test(value));
      input.classList.toggle('invalid', !valid);
      if (!valid) ok = false;
    }
    if (!ok) {
      error.textContent = t('form.errRequired');
      error.hidden = false;
      required.find((i) => i.classList.contains('invalid'))?.focus();
      return;
    }
    if ($('#f-attach').checked && !state.designImage) {
      error.textContent = t('form.errDesign');
      error.hidden = false;
      return;
    }
    error.hidden = true;

    const service = state.content.services.find((s) => s.id === $('#f-service').value);
    // Everything the salon needs. Connect this event to email or a booking system.
    const request = {
      name: $('#f-name').value.trim(),
      phone: $('#f-phone').value.trim(),
      service: service ? loc(service.name, 'en') : '',
      date: date.value,
      notes: $('#f-notes').value.trim(),
      design: $('#f-attach').checked ? state.designImage : null,
    };
    form.dispatchEvent(new CustomEvent('booking-request', { detail: request, bubbles: true }));

    $('#ok-title').textContent = t('form.okTitle', { name: request.name.split(/\s+/)[0] });
    $('#form-success').hidden = false;
  });

  form.addEventListener('input', (e) => e.target.classList?.remove('invalid'));
  $('#book-again').addEventListener('click', () => {
    form.reset();
    date.min = today();
    $('#form-success').hidden = true;
  });
}

/* ------------------------------------------------------------- lightbox */

function openLightbox(src, caption) {
  $('#lightbox-img').src = src;
  $('#lightbox-img').alt = caption;
  $('#lightbox-cap').textContent = caption;
  $('#lightbox').hidden = false;
  document.body.classList.add('modal-open');
  $('#lightbox-close').focus();
}

function setupLightbox() {
  const close = () => {
    $('#lightbox').hidden = true;
    document.body.classList.remove('modal-open');
  };
  $('#lightbox-close').addEventListener('click', close);
  $('#lightbox').addEventListener('click', (e) => e.target.id === 'lightbox' && close());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && !$('#lightbox').hidden && close());
}

/* ------------------------------------------------------------- render */

function render() {
  const lang = state.lang;
  state.t = createT(lang, state.content.texts[lang]);
  document.documentElement.lang = lang;
  $('#lang-current').textContent = lang.toUpperCase();
  document.querySelectorAll('#lang-menu [data-lang]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.lang === lang)));
  $('#designer').setAttribute('lang', lang);

  applyTexts();
  applySettings();
  applyTheme();
  renderMarquee();
  renderServices();
  renderGallery();
  renderWork();
  renderTeam();
  renderBooking();
}

/** Shows new content right away (used by the salon editor for live preview). */
function preview(content) {
  state.content = sanitizeContent(content);
  render();
}

async function loadContent() {
  try {
    const res = await fetch('./api/content', { cache: 'no-store' });
    if (res.ok) return sanitizeContent(await res.json());
  } catch {
    /* opened from disk or without the server: use the built-in content */
  }
  return clone(DEFAULT_CONTENT);
}

async function start() {
  $('#year').textContent = String(new Date().getFullYear());
  setupNav();
  setupLanguage();
  setupTheme();
  setupBookingLinks();
  setupDesignCard();
  setupForm();
  setupLightbox();
  renderHeroFan();
  render();
  setupReveal();

  state.content = await loadContent();
  state.saved = clone(state.content);
  render();

  setupAdmin({
    getContent: () => state.content,
    getSavedContent: () => state.saved,
    onSaved: (content) => (state.saved = clone(content)),
    getLang: () => state.lang,
    setLang: setLanguage,
    preview,
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
