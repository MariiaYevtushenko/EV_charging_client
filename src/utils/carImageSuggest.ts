/** Дефолтне зображення EV (Unsplash — стабільне посилання). */
export const DEFAULT_CAR_IMAGE =
  'https://images.unsplash.com/photo-1621905251189-08b45d6a929e?auto=format&fit=crop&w=900&q=80';

const MODEL_PRESETS: { pattern: RegExp; url: string }[] = [
  {
    pattern: /rolls[\s-]?royce|rolls-royce/i,
    url: 'https://images.unsplash.com/photo-1631292780980-e2cbdc6b7704?auto=format&fit=crop&w=900&q=80',
  },
  {
    pattern: /tesla/i,
    url: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=900&q=80',
  },
  {
    pattern: /nissan|leaf/i,
    url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=900&q=80',
  },
  {
    pattern: /ioniq|hyundai|kona/i,
    url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=900&q=80',
  },
  {
    pattern: /bmw|i3|ix|i4/i,
    url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=900&q=80',
  },
  {
    pattern: /mercedes|eqc|eqs|eqe/i,
    url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=900&q=80',
  },
  {
    pattern: /audi|e-tron|etron/i,
    url: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=900&q=80',
  },
  {
    pattern: /vw|volkswagen|id\.?\s*4|id\.?\s*3/i,
    url: 'https://images.unsplash.com/photo-1632245889029-e4061e0b0c2c?auto=format&fit=crop&w=900&q=80',
  },
  {
    pattern: /porsche|taycan/i,
    url: 'https://images.unsplash.com/photo-1614200187524-dc4118d33b73?auto=format&fit=crop&w=900&q=80',
  },
  {
    pattern: /volvo/i,
    url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=900&q=80',
  },
  {
    pattern: /ford|mustang\s*mach/i,
    url: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=900&q=80',
  },
  {
    pattern: /kia|ev6|ev9|niro/i,
    url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=900&q=80',
  },
  {
    pattern: /byd|mg\s|polestar|rivian|lucid/i,
    url: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=900&q=80',
  },
];

/** Перше латинське «слово» з назви для тегу на loremflickr (g-rated). */
function latinKeywordForFlickr(model: string): string {
  const parts = model.trim().split(/[\s,;/]+/).filter(Boolean);
  for (const p of parts) {
    const latin = p.replace(/[^A-Za-z]/g, '');
    if (latin.length >= 3) return latin.toLowerCase().slice(0, 24);
  }
  return 'electric';
}

/**
 * Ілюстративне фото за назвою моделі: спочатку відомі бренди (Unsplash),
 * інакше — випадкове фото з Flickr за тегами car + ключове слово (g-rated).
 */
export function suggestCarImageByModel(model: string): string {
  const m = model.trim();
  if (!m) return DEFAULT_CAR_IMAGE;
  for (const { pattern, url } of MODEL_PRESETS) {
    if (pattern.test(m)) return url;
  }
  const tag = latinKeywordForFlickr(m);
  return `https://loremflickr.com/g/640/360/car,${encodeURIComponent(tag)}/all`;
}
