/** Дефолтне зображення EV (Unsplash, стабільне посилання). */
export const DEFAULT_CAR_IMAGE =
  'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=900&q=80';

const MODEL_PRESETS: { pattern: RegExp; url: string }[] = [
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
    pattern: /vw|volkswagen|id\.?\s*4|id\.?\s*3/i,
    url: 'https://images.unsplash.com/photo-1632245889029-e4061e0b0c2c?auto=format&fit=crop&w=900&q=80',
  },
  {
    pattern: /porsche|taycan/i,
    url: 'https://images.unsplash.com/photo-1614200187524-dc4118d33b73?auto=format&fit=crop&w=900&q=80',
  },
];

/**
 * Підбір ілюстративного фото за назвою моделі (ключові слова, без зовнішнього API).
 * Якщо збігів немає — універсальне EV-фото.
 */
export function suggestCarImageByModel(model: string): string {
  const m = model.trim();
  if (!m) return DEFAULT_CAR_IMAGE;
  for (const { pattern, url } of MODEL_PRESETS) {
    if (pattern.test(m)) return url;
  }
  return DEFAULT_CAR_IMAGE;
}
