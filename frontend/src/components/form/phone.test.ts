import { describe, expect, it } from 'vitest';
import { formatNumber, joinPhone, numberDigits, phoneProblem, splitPhone } from './phone';

describe('phone', () => {
  it('writes the area code and the number as one text and splits it back', () => {
    const stored = joinPhone({ areaCode: '11', number: '44445555' });

    expect(stored).toBe('(011) 4444-5555');
    expect(splitPhone(stored)).toEqual({ areaCode: '11', number: '44445555' });
    expect(joinPhone({ areaCode: '0341', number: '0000000' })).toBe('(0341) 000-0000');
    expect(joinPhone({ areaCode: '', number: '' })).toBeUndefined();
  });

  it('keeps a text written some other way whole, as the digits of the number', () => {
    expect(splitPhone('341 000-0000')).toEqual({ areaCode: '', number: '3410000000' });
    expect(splitPhone(null)).toEqual({ areaCode: '', number: '' });
  });

  it('takes only digits in the number and draws the dash itself', () => {
    expect(numberDigits('4444-a 5555 99')).toBe('44445555');
    expect(formatNumber('44445555')).toBe('4444-5555');
    expect(formatNumber('4444')).toBe('4444');
    expect(formatNumber('')).toBe('');
  });

  it('asks for both parts and for ten digits between them', () => {
    expect(phoneProblem({ areaCode: '', number: '' })).toBeUndefined();
    expect(phoneProblem({ areaCode: '11', number: '' })).toBe(
      'Completá la característica y el número.',
    );
    expect(phoneProblem({ areaCode: '11', number: '4444' })).toBe(
      'Entre la característica y el número tienen que sumar 10 dígitos.',
    );
    expect(phoneProblem({ areaCode: '011', number: '44445555' })).toBeUndefined();
    expect(phoneProblem({ areaCode: '', number: '341 000-0000' })).toBe(
      'Completá la característica y el número.',
    );
  });
});
