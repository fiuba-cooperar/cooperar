/** Digits of a number: area code plus number never go over this many together (10), and the number over 8. */
export const MAX_NUMBER_DIGITS = 8;

/**
 * Argentine phone numbers are written as an area code and a number that, together, have 10 digits, shown as
 * "(011) 4444-5555". The API stores them as that same text.
 */
export interface PhoneParts {
  areaCode: string;
  number: string;
}

const TOTAL_DIGITS = 10;
const STORED = /^\(0?(\d{2,4})\)\s*(\d[\d-]*)$/;

function digits(value: string): string {
  return value.replace(/\D/g, '');
}

/** The area code is written without the national 0 and the number without the 15, so the person types less. */
function areaDigits(areaCode: string): string {
  return digits(areaCode).replace(/^0+/, '');
}

/** The digits a person typed in the number field, the only thing it takes. */
export function numberDigits(typed: string): string {
  return digits(typed).slice(0, MAX_NUMBER_DIGITS);
}

/** How the number shows: the last four digits after a dash, as in "4444-5555". */
export function formatNumber(numberDigitsOnly: string): string {
  return numberDigitsOnly.length > 4
    ? `${numberDigitsOnly.slice(0, -4)}-${numberDigitsOnly.slice(-4)}`
    : numberDigitsOnly;
}

/** Splits a stored phone; a text that was not written with this format goes whole into the number, as digits. */
export function splitPhone(stored: string | null | undefined): PhoneParts {
  if (!stored) return { areaCode: '', number: '' };
  const match = STORED.exec(stored.trim());
  if (!match) return { areaCode: '', number: digits(stored) };
  return { areaCode: match[1] ?? '', number: digits(match[2] ?? '') };
}

/** The text to store, or undefined when both parts are empty. Assumes {@link phoneProblem} found nothing. */
export function joinPhone({ areaCode, number }: PhoneParts): string | undefined {
  const area = areaDigits(areaCode);
  const rest = digits(number);
  if (!area && !rest) return undefined;
  return `(0${area}) ${formatNumber(rest)}`;
}

export function phoneProblem({ areaCode, number }: PhoneParts): string | undefined {
  const area = areaDigits(areaCode);
  const rest = digits(number);
  if (!area && !rest && !number.trim()) return undefined;
  if (!area || !rest) return 'Completá la característica y el número.';
  if (area.length + rest.length !== TOTAL_DIGITS) {
    return 'Entre la característica y el número tienen que sumar 10 dígitos.';
  }
  return undefined;
}
