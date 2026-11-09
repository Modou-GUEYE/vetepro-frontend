import { describe, expect, it } from 'vitest';
import { ownerFormSchema } from './proprietaire';

const ok = { prenom: 'Ibou', nom: 'Faye', telephone: '77 123 45 67', email: 'ibou@email.com', adresse: 'Dakar' };

describe('formulaire propriétaire', () => {
  it('accepte un propriétaire complet ou avec seulement prénom et nom', () => {
    expect(ownerFormSchema.safeParse(ok).success).toBe(true);
    expect(ownerFormSchema.safeParse({ ...ok, telephone: '', email: '', adresse: '' }).success).toBe(true);
  });
  it('exige le prénom et le nom', () => {
    expect(ownerFormSchema.safeParse({ ...ok, prenom: ' ' }).success).toBe(false);
    expect(ownerFormSchema.safeParse({ ...ok, nom: '' }).success).toBe(false);
  });
  it("refuse un e-mail ou un téléphone invalide", () => {
    expect(ownerFormSchema.safeParse({ ...ok, email: 'pas-un-mail' }).success).toBe(false);
    expect(ownerFormSchema.safeParse({ ...ok, telephone: 'abc' }).success).toBe(false);
  });
});
