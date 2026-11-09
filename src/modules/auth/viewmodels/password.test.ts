import { describe, expect, it } from 'vitest';
import { isPasswordValid, passwordStrength } from './password';

describe('mot de passe', () => {
  it('accepte un mot de passe conforme aux règles', () => expect(isPasswordValid('Admin#2026')).toBe(true));
  it.each(['Court1#', 'sansmajuscule1#', 'SANSMINUSCULE1#', 'SansChiffre#', 'SansSpecial1'])('refuse %s', (pw) =>
    expect(isPasswordValid(pw)).toBe(false));
  it('évalue la force', () => {
    expect(passwordStrength('').label).toBe('Vide');
    expect(passwordStrength('abc').label).toBe('Faible');
    expect(passwordStrength('Admin#2026').label).toBe('Fort');
  });
});
