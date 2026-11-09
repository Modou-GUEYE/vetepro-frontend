import { describe, expect, it } from 'vitest';
import { cabinetFormSchema, logoProblem } from './cabinet';

const ok = { nom: 'Cabinet du Sud', ordre: 'ODVS-1142', adresse: 'Ziguinchor', telephone: '77 123 45 67', email: 'a@b.sn', logo: null, twofaObligatoire: false };

describe('informations du cabinet', () => {
  it('accepte une saisie complète', () => expect(cabinetFormSchema.safeParse(ok).success).toBe(true));
  it('signale chaque champ invalide', () => {
    const r = cabinetFormSchema.safeParse({ ...ok, nom: ' ', ordre: '1142', telephone: '12', email: 'x' });
    expect(r.success ? [] : r.error.issues.map((i) => i.path[0])).toEqual(['nom', 'ordre', 'telephone', 'email']);
  });
  it('limite le logo à une image PNG ou JPG de 2 Mo', () => {
    expect(logoProblem({ type: 'image/png', size: 1000 })).toBeNull();
    expect(logoProblem({ type: 'image/gif', size: 1000 })).toMatch(/PNG ou JPG/);
    expect(logoProblem({ type: 'image/jpeg', size: 3 * 1024 * 1024 })).toMatch(/2 Mo/);
  });
});
