import { describe, expect, it } from 'vitest';
import { cuitProblem } from './cuit';

describe('cuitProblem', () => {
  it.each(['30-12345678-1', '30123456781', ' 30 12345678 1 ', '20-40000000-0'])(
    'accepts %s',
    (value) => {
      expect(cuitProblem(value)).toBeNull();
    },
  );

  it.each(['', '3012345678', '301234567810', '30-1234567a-1'])(
    'rejects the format of "%s"',
    (value) => {
      expect(cuitProblem(value)).toBe('format');
    },
  );

  // The last two have a weighted sum that leaves a remainder of 1, which no check digit can match.
  it.each(['30-12345678-9', '20-01000000-0', '30-12345679-0'])(
    'rejects the check digit of %s',
    (value) => {
      expect(cuitProblem(value)).toBe('check-digit');
    },
  );
});
