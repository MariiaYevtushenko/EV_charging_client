/**
 * Відображення поля `location.country`: якщо збережено ISO 3166-1 alpha-2 (UA, FR…),
 * показуємо українську назву через Intl; інакше — як є (повна назва або нестандартне значення).
 */

const regionNamesUk =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['uk'], { type: 'region' })
    : null;

export function formatCountryLabel(raw: string | null | undefined): string {
  const s = raw?.trim();
  if (!s) return '—';
  if (/^[A-Za-z]{2}$/.test(s)) {
    const code = s.toUpperCase();
    if (regionNamesUk) {
      try {
        const name = regionNamesUk.of(code);
        if (name) return name;
      } catch {
        /* ignore */
      }
    }
    return code;
  }
  return s;
}

/** Підказка з сирими кодом, якщо значення — ISO alpha-2. */
export function countryIsoTooltip(raw: string | null | undefined): string | undefined {
  const s = raw?.trim();
  if (!s || !/^[A-Za-z]{2}$/.test(s)) return undefined;
  return `Код ISO 3166-1 alpha-2: ${s.toUpperCase()}`;
}
