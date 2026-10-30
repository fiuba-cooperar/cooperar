const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export type CuitProblem = 'format' | 'check-digit';

/**
 * What is wrong with a CUIT, or null when it is valid: not 11 digits, or a modulo 11 check digit that does not
 * match. Dashes and spaces are ignored, as in the backend.
 */
export function cuitProblem(value: string): CuitProblem | null {
  const digits = value.replace(/[\s-]/g, '');
  if (!/^\d{11}$/.test(digits)) return 'format';
  const sum = WEIGHTS.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
  const result = 11 - (sum % 11);
  // A result of 10 is never assigned, so no digit can match it.
  return (result === 11 ? 0 : result) === Number(digits[10]) ? null : 'check-digit';
}
