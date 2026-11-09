import { describe, expect, it } from 'vitest';
import { parseGestation, serviceFormSchema } from './referentiels';

describe('durée de gestation saisie', () => {
  it('accepte un nombre de jours ou un champ vide', () => {
    expect(parseGestation('283')).toEqual({ ok: true, jours: 283 });
    expect(parseGestation('  ')).toEqual({ ok: true, jours: null });
  });
  it.each(['0', '1000', 'abc', '12,5', '-3'])('refuse « %s »', (v) => expect(parseGestation(v).ok).toBe(false));
});

describe('formulaire de service', () => {
  const base = { libelle: 'Détartrage', categorie: 'Soins', prix: '8000', description: '' };
  it('accepte un service valide', () => expect(serviceFormSchema.safeParse(base).success).toBe(true));
  it('refuse un prix décimal ou négatif et un libellé vide', () => {
    expect(serviceFormSchema.safeParse({ ...base, prix: '8,5' }).success).toBe(false);
    expect(serviceFormSchema.safeParse({ ...base, prix: '-1' }).success).toBe(false);
    expect(serviceFormSchema.safeParse({ ...base, libelle: ' ' }).success).toBe(false);
  });
});
