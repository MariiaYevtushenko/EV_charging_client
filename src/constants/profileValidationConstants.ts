export const NAME_MAX = 50;
export const NAME_PART_PATTERN = /^[\p{L}\p{M}''’\-\s]+$/u;
/** Має бути хоча б одна літера (не лише дефіси, пробіли тощо). */
export const HAS_LETTER = /\p{L}/u;
export const EMAIL_PATTERN =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
