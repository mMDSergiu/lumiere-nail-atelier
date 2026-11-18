// Everything the salon can edit from the website editor: salon details, prices, team, photos,
// booking link and text overrides. DEFAULT_CONTENT is used until the salon saves its own.
// sanitizeContent() is shared with the server (server/api.js), so both check data the same way.

export const LANG_IDS = ['en', 'ro', 'ru'];
const LOOK_NAMES = [
  'Classic French',
  'Baby Boomer',
  'Golden Hour',
  'Love Notes',
  'Midnight Stars',
  'Daisy Garden',
  'Lilac Chrome',
  'Marble Luxe',
];

const L = (en, ro, ru) => ({ en, ro, ru });

export const DEFAULT_CONTENT = {
  version: 1,
  settings: {
    brand: 'Lumière',
    brandSub: 'Nail Atelier',
    phone: '+40 712 345 678',
    email: 'hello@lumiere-nails.example',
    address: '24 Rose Lane, Garden District',
    instagram: '',
    currency: '€',
    heroImage: '',
    bookingUrl: '',
    bookingMode: 'newtab',
  },
  texts: { en: {}, ro: {}, ru: {} },
  showLooks: true,
  services: [
    {
      id: 'gel-manicure',
      name: L('Gel Manicure', 'Manichiură cu gel', 'Маникюр с гель-лаком'),
      desc: L(
        'Long-lasting gel colour with cuticle care and a high-shine finish.',
        'Culoare cu gel de lungă durată, îngrijirea cuticulelor și luciu intens.',
        'Стойкое гелевое покрытие, уход за кутикулой и глянцевый финиш.',
      ),
      minutes: 45,
      addOn: false,
      price: 35,
      priceNote: L('', '', ''),
      look: 'Love Notes',
      nail: 2,
    },
    {
      id: 'biab',
      name: L('BIAB Structured Gel', 'Gel structurat BIAB', 'Укрепление BIAB'),
      desc: L(
        'Builder gel that strengthens and protects your natural nails.',
        'Gel de construcție care întărește și protejează unghiile naturale.',
        'Строительный гель, который укрепляет и защищает натуральные ногти.',
      ),
      minutes: 60,
      addOn: false,
      price: 45,
      priceNote: L('', '', ''),
      look: 'Baby Boomer',
      nail: 2,
    },
    {
      id: 'acrylic',
      name: L('Acrylic Full Set', 'Set complet acril', 'Наращивание акрилом'),
      desc: L(
        'Sculpted extensions in any shape and length, finished in gel colour.',
        'Extensii sculptate în orice formă și lungime, finisate cu culoare din gel.',
        'Наращивание любой формы и длины с гелевым покрытием.',
      ),
      minutes: 90,
      addOn: false,
      price: 55,
      priceNote: L('', '', ''),
      look: 'Golden Hour',
      nail: 1,
    },
    {
      id: 'gel-x',
      name: L('Gel-X Extensions', 'Extensii Gel-X', 'Наращивание Gel-X'),
      desc: L(
        'Lightweight soft-gel tips for a flawless, natural-looking length.',
        'Tips-uri ușoare din soft gel pentru o lungime naturală și impecabilă.',
        'Лёгкие типсы из мягкого геля для безупречной естественной длины.',
      ),
      minutes: 75,
      addOn: false,
      price: 60,
      priceNote: L('', '', ''),
      look: 'Lilac Chrome',
      nail: 2,
    },
    {
      id: 'nail-art',
      name: L('Hand-painted Nail Art', 'Nail art pictat manual', 'Ручная роспись'),
      desc: L(
        'From fine lines and French tips to gems and detailed designs.',
        'De la linii fine și french la pietre și desene detaliate.',
        'От тонких линий и френча до страз и детальных рисунков.',
      ),
      minutes: 15,
      addOn: true,
      price: 5,
      priceNote: L('per nail', 'per unghie', 'за ноготь'),
      look: 'Midnight Stars',
      nail: 1,
    },
    {
      id: 'pedicure',
      name: L('Luxury Pedicure', 'Pedichiură de lux', 'Педикюр люкс'),
      desc: L(
        'Soak, exfoliation, massage and gel colour for soft, polished feet.',
        'Baie, exfoliere, masaj și culoare cu gel pentru picioare fine și îngrijite.',
        'Ванночка, пилинг, массаж и гель-лак для мягких ухоженных стоп.',
      ),
      minutes: 60,
      addOn: false,
      price: 45,
      priceNote: L('', '', ''),
      look: 'Classic French',
      nail: 2,
    },
  ],
  team: [
    {
      id: 'artist-1',
      name: 'Ana',
      role: L('Founder & lead artist', 'Fondatoare și artist principal', 'Основательница и ведущий мастер'),
      bio: L(
        'Twelve years of structured gel and fine-line art. Loves a perfect almond.',
        'Doisprezece ani de gel structurat și linii fine. Iubește forma migdală perfectă.',
        'Двенадцать лет работы с гелем и тонкими линиями. Обожает идеальный миндаль.',
      ),
      photo: '',
      bookingUrl: '',
    },
    {
      id: 'artist-2',
      name: 'Elena',
      role: L('Nail art specialist', 'Specialist nail art', 'Мастер дизайна'),
      bio: L(
        'Chrome, gems and hand-painted details. Bring her your wildest idea.',
        'Crom, pietre și detalii pictate manual. Adu-i cea mai îndrăzneață idee.',
        'Хром, стразы и ручная роспись. Приносите ей самые смелые идеи.',
      ),
      photo: '',
      bookingUrl: '',
    },
    {
      id: 'artist-3',
      name: 'Maria',
      role: L('Extensions & pedicure', 'Extensii și pedichiură', 'Наращивание и педикюр'),
      bio: L(
        'Acrylic and Gel-X sets that look natural and last.',
        'Seturi din acril și Gel-X care arată natural și rezistă.',
        'Акрил и Gel-X, которые выглядят естественно и держатся долго.',
      ),
      photo: '',
      bookingUrl: '',
    },
  ],
  photos: [],
};

/* ------------------------------------------------------------ helpers */

/** Text of a {en, ro, ru} field in the given language (falls back to English). */
export function loc(field, lang) {
  if (!field || typeof field !== 'object') return '';
  return field[lang] || field.en || '';
}

export const clone = (v) => JSON.parse(JSON.stringify(v));

/** Safe http(s) link or ''. Used for booking and Instagram links. */
export function safeUrl(value) {
  const v = String(value ?? '').trim();
  if (!v) return '';
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch {
    return '';
  }
}

/** Uploaded image paths look like uploads/<hex>.<ext>; nothing else is accepted. */
export const UPLOAD_RE = /^uploads\/[a-f0-9]{24}\.(jpg|png|webp)$/;

/* ------------------------------------------------------------ validation */

const str = (v, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v, min, max, fallback) => (Number.isFinite(+v) && v !== '' && v !== null ? Math.min(max, Math.max(min, +v)) : fallback);
const img = (v) => (typeof v === 'string' && UPLOAD_RE.test(v) ? v : '');
const id = (v, i) => (typeof v === 'string' && /^[a-z0-9-]{1,40}$/.test(v) ? v : `item-${i}`);
const local = (v, max = 400) => {
  const o = v && typeof v === 'object' ? v : {};
  return { en: str(o.en, max), ro: str(o.ro, max), ru: str(o.ru, max) };
};
const list = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);

/** Cleans untrusted content (from the server, or sent to it). Unknown fields are dropped. */
export function sanitizeContent(input) {
  const d = DEFAULT_CONTENT;
  const c = input && typeof input === 'object' ? input : {};
  const s = c.settings && typeof c.settings === 'object' ? c.settings : {};

  const texts = {};
  for (const lang of LANG_IDS) {
    const src = c.texts && typeof c.texts[lang] === 'object' && c.texts[lang] ? c.texts[lang] : {};
    texts[lang] = {};
    for (const [k, v] of Object.entries(src).slice(0, 400)) {
      if (/^[a-zA-Z0-9. ]{1,60}$/.test(k) && typeof v === 'string' && v.trim()) texts[lang][k] = v.slice(0, 1500);
    }
  }

  return {
    version: 1,
    settings: {
      brand: str(s.brand ?? d.settings.brand, 40) || d.settings.brand,
      brandSub: str(s.brandSub ?? d.settings.brandSub, 40),
      phone: str(s.phone ?? d.settings.phone, 40),
      email: str(s.email ?? d.settings.email, 120),
      address: str(s.address ?? d.settings.address, 200),
      instagram: safeUrl(s.instagram),
      currency: str(s.currency ?? d.settings.currency, 8),
      heroImage: img(s.heroImage),
      bookingUrl: safeUrl(s.bookingUrl).startsWith('https:') ? safeUrl(s.bookingUrl) : '',
      bookingMode: s.bookingMode === 'embed' ? 'embed' : 'newtab',
    },
    texts,
    showLooks: c.showLooks !== false,
    services: list(c.services ?? d.services, 40).map((x, i) => ({
      id: id(x?.id, i),
      name: local(x?.name, 80),
      desc: local(x?.desc, 300),
      minutes: Math.round(num(x?.minutes, 0, 600, 60)),
      addOn: x?.addOn === true,
      price: num(x?.price, 0, 1000000, 0),
      priceNote: local(x?.priceNote, 40),
      look: LOOK_NAMES.includes(x?.look) ? x.look : LOOK_NAMES[i % LOOK_NAMES.length],
      nail: Math.round(num(x?.nail, 0, 4, 1)),
    })),
    team: list(c.team ?? d.team, 30).map((x, i) => ({
      id: id(x?.id, i),
      name: str(x?.name, 60),
      role: local(x?.role, 80),
      bio: local(x?.bio, 300),
      photo: img(x?.photo),
      bookingUrl: safeUrl(x?.bookingUrl).startsWith('https:') ? safeUrl(x?.bookingUrl) : '',
    })),
    photos: list(c.photos, 200)
      .map((x, i) => ({ id: id(x?.id, i), src: img(x?.src), caption: local(x?.caption, 120) }))
      .filter((p) => p.src),
  };
}

export { LOOK_NAMES };
