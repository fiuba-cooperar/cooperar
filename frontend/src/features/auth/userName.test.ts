import { describe, expect, it } from 'vitest';
import { displayName, initials } from './userName';

describe('user name', () => {
  it('uses the first and last name', () => {
    const user = { email: 'ana@coop.local', firstName: 'Ana', lastName: 'Pérez' };

    expect(displayName(user)).toBe('Ana Pérez');
    expect(initials(user)).toBe('AP');
  });

  it('falls back to the email when the account has no name', () => {
    const user = { email: 'admin@cooperar.local' };

    expect(displayName(user)).toBe('admin@cooperar.local');
    expect(initials(user)).toBe('AD');
  });

  it('uses a single name when the other one is missing', () => {
    const user = { email: 'ana@coop.local', firstName: 'Ana' };

    expect(displayName(user)).toBe('Ana');
    expect(initials(user)).toBe('AN');
  });
});
