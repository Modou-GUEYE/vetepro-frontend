import { describe, expect, it } from 'vitest';
import { aliasError, emptyRow, rowsError, rowsTotal } from './comptes';

describe('comptes : modèle', () => {
  it('contrôle le format de l\'alias selon son type', () => {
    expect(aliasError('Téléphone', '77 001 00 00')).toBeUndefined();
    expect(aliasError('Téléphone', 'abc')).toMatch(/Format invalide/);
    expect(aliasError('E-mail', 'caisse@vetsud.sn')).toBeUndefined();
    expect(aliasError('Identifiant marchand', 'VETSUD-ZIG')).toBeUndefined();
    expect(aliasError('Identifiant marchand', 'a')).toMatch(/Format invalide/);
    expect(aliasError('E-mail', '')).toBe('Valeur requise');
  });
  it('totalise les montants valides et signale la première ligne incomplète', () => {
    const rows = [{ nom: 'A', alias: '77 123 45 67', montant: '1500' }, { nom: 'B', alias: 'b@x.sn', montant: '500' }];
    expect(rowsTotal(rows)).toBe(2000);
    expect(rowsError(rows, false)).toBeUndefined();
    expect(rowsError(rows, true)).toMatch(/invalide/);
    expect(rowsError([emptyRow()], false)).toMatch(/Complétez/);
    expect(rowsError([{ nom: 'A', alias: '77 123 45 67', montant: '0' }], false)).toMatch(/positif/);
  });
});
