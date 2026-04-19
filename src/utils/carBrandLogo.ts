/**
 * Домени брендів для https://logo.clearbit.com/{domain} (логотип за першим словом у полі model).
 * Якщо немає збігу — повертаємо null, у UI показуємо іконку авто.
 */
const BRAND_TO_DOMAIN: Record<string, string> = {
  audi: 'audi.com',
  bmw: 'bmw.com',
  mercedes: 'mercedes-benz.com',
  tesla: 'tesla.com',
  toyota: 'toyota.com',
  honda: 'honda.com',
  ford: 'ford.com',
  volkswagen: 'volkswagen.com',
  vw: 'volkswagen.com',
  skoda: 'skoda-auto.com',
  kia: 'kia.com',
  hyundai: 'hyundai.com',
  nissan: 'nissan.com',
  mazda: 'mazda.com',
  volvo: 'volvocars.com',
  porsche: 'porsche.com',
  fiat: 'fiat.com',
  peugeot: 'peugeot.com',
  renault: 'renault.com',
  citroen: 'citroen.com',
  opel: 'opel.com',
  seat: 'seat.com',
  cupra: 'cupraofficial.com',
  byd: 'byd.com',
  jaguar: 'jaguar.com',
  land: 'landrover.com',
  mini: 'mini.com',
  smart: 'smart.com',
  dacia: 'dacia.com',
  lada: 'lada.ru',
  geely: 'geely.com',
  mg: 'mg.com',
  subaru: 'subaru.com',
  mitsubishi: 'mitsubishi-motors.com',
  lexus: 'lexus.com',
  acura: 'acura.com',
  infiniti: 'infiniti.com',
  genesis: 'genesis.com',
  polestar: 'polestar.com',
  rivian: 'rivian.com',
  lucid: 'lucidmotors.com',
  chevrolet: 'chevrolet.com',
  dodge: 'dodge.com',
  jeep: 'jeep.com',
  chrysler: 'chrysler.com',
  ram: 'ramtrucks.com',
  gmc: 'gmc.com',
  cadillac: 'cadillac.com',
  buick: 'buick.com',
  suzuki: 'suzuki.com',
  isuzu: 'isuzu.com',
  saab: 'saab.com',
  alfaromeo: 'alfaromeo.com',
  'alfa': 'alfaromeo.com',
  maserati: 'maserati.com',
  bentley: 'bentley.com',
  rolls: 'rolls-roycemotorcars.com',
  ferrari: 'ferrari.com',
  lamborghini: 'lamborghini.com',
  mclaren: 'mclaren.com',
  aston: 'astonmartin.com',
  bugatti: 'bugatti.com',
};

/**
 * URL логотипу бренду (перше слово model, латиницею) або null.
 */
export function getCarBrandLogoUrl(model: string): string | null {
  const raw = model.trim().split(/\s+/)[0];
  if (!raw) return null;
  const ascii = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9-]/gi, '');
  if (!ascii) return null;
  const domain = BRAND_TO_DOMAIN[ascii] ?? BRAND_TO_DOMAIN[ascii.split('-')[0] ?? ''];
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
}
