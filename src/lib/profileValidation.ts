const NAME_MAX = 50;
const NAME_PART_PATTERN = /^[\p{L}\p{M}''’\-\s]+$/u;
/** Має бути хоча б одна літера (не лише дефіси, пробіли тощо). */
const HAS_LETTER = /\p{L}/u;
const EMAIL_PATTERN =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;

export type ProfileFieldKey = 'firstName' | 'surname' | 'email' | 'phone';

export type ProfileFieldErrors = Partial<Record<ProfileFieldKey, string>>;

export function normalizePhoneInput(raw: string): string {
  return raw.trim().replace(/[\s().-]/g, '');
}

export function validateFirstName(value: string): string | undefined {
  const trimmed = value.trim();

  if (!trimmed) return `Ім'я обов'язкове.`;

  if (trimmed.length > NAME_MAX) return `Ім'я: не більше ${NAME_MAX} символів.`;

  if (!NAME_PART_PATTERN.test(trimmed)) {
    return `Ім'я: дозволені лише літери, пробіл, дефіс та апостроф.`;
  }
  if (!HAS_LETTER.test(trimmed)) {
    return `Ім'я має містити хоча б одну літеру.`;
  }
  return undefined;
}

export function validateSurname(value: string, options?: { allowDashPlaceholder?: boolean }): string | undefined {
  const trimmed = value.trim();

  if (options?.allowDashPlaceholder && trimmed === '-') return undefined;

  if (!trimmed) return `Прізвище обов'язкове.`;
  if (trimmed.length > NAME_MAX) return `Прізвище: не більше ${NAME_MAX} символів.`;

  if (!NAME_PART_PATTERN.test(trimmed)) {
    return `Прізвище: дозволені лише літери, пробіл, дефіс та апостроф.`;
  }
  if (!HAS_LETTER.test(trimmed)) {
    return `Прізвище має містити хоча б одну літеру.`;
  }

  return undefined;
}

export function validateEmailField(value: string): string | undefined {
  const email = value.trim();

  if (!email) return `Email обов'язковий.`;

  if (email.length > 254) 
    return `Email: не більше 254 символів.`;

  if (!EMAIL_PATTERN.test(email)) {
    return `Некоректний формат email (дозволені латинські літери, цифри та символи ._%+- у локальній частині).`;
  }

  return undefined;
}


export function ValidatePhone(phoneValue: string): string | undefined {
  const phone = normalizePhoneInput(phoneValue);

  if (phone === '') 
    return undefined;

  if (phone.length > 15) 
    return `Телефон: не більше 15 символів (включно з «+»)`;

  if (!/^\+?[0-9]+$/.test(phone)) {
    return `Телефон: дозволені лише цифри та символ «+» на початку.`;
  }

  const digitsOnly = phone.startsWith('+') ? phone.slice(1) : phone;

  if (digitsOnly.length < 10) 
    return `Телефон занадто короткий (мінімум 10 цифр).`;
  if (digitsOnly.length > 15) 
    return `Телефон: не більше 15 цифр.`;

  return undefined;
}

/** Профіль з окремих полів ім’я / прізвище. */
export function validateSplitProfile(
  firstName: string,
  surname: string,
  email: string,
  phone: string
): ProfileFieldErrors {


  const errors: ProfileFieldErrors = {};

  const firstNameError = validateFirstName(firstName);
  if (firstNameError) 
    errors.firstName = firstNameError;

  const surnameError = validateSurname(surname);
  if (surnameError) 
    errors.surname = surnameError;

  const emailError = validateEmailField(email);
  if (emailError) 
    errors.email = emailError;

  const phoneError = ValidatePhone(phone);
  if (phoneError)
     errors.phone = phoneError;

  return errors;
}

export function hasProfileErrors(errors: ProfileFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
