import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, Cv, cvStats, experienceLabel, hasFilters, initials, isRecent, telHref, toParams, villesOf, waHref } from './cv';

describe('CVthèque, modèle', () => {
  it("n'envoie que les filtres renseignés", () => {
    expect(toParams({ ...EMPTY_FILTERS, profil: 'veterinaire', ville: 'Dakar' })).toEqual({ profil: 'veterinaire', ville: 'Dakar' });
    expect(hasFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasFilters({ ...EMPTY_FILTERS, competence: 'chirurgie' })).toBe(true);
  });
  it("formate l'expérience, les initiales et le lien d'appel", () => {
    expect(experienceLabel(0)).toBe('Débutant');
    expect(experienceLabel(1)).toBe("1 an d'expérience");
    expect(experienceLabel(6)).toBe("6 ans d'expérience");
    expect(initials('Dr Mariama Ba')).toBe('MB');
    expect(telHref('+221 77 123 45 67')).toBe('tel:+221771234567');
  });
  it('calcule les chiffres du bandeau, les villes et le caractère « nouveau »', () => {
    const now = Date.parse('2026-10-27T12:00:00Z');
    const day = (n: number) => new Date(now - n * 86_400_000).toISOString();
    const cv = (id: string, profil: Cv['profil'], ville: string, disponibilite: Cv['disponibilite'], age: number) => ({ id, nom: id, profil, ville, experience: 1, disponibilite, telephone: '', email: '', competences: [], presentation: '', statut: 'valide', depose_le: day(age), fichier: null }) as Cv;
    const items = [cv('a', 'veterinaire', 'Thiès', 'immediate', 3), cv('b', 'assistant', 'Dakar', '1mois', 20), cv('c', 'veterinaire', 'Dakar', 'immediate', 90)];
    expect(cvStats(items, now)).toEqual({ visibles: 3, veterinaires: 2, immediats: 2, nouveaux: 2 });
    expect(villesOf(items)).toEqual(['Dakar', 'Thiès']);
    expect(isRecent(day(7), now)).toBe(true);
    expect(isRecent(day(8), now)).toBe(false);
  });
  it('construit le lien WhatsApp avec l\'indicatif du Sénégal', () => {
    expect(waHref('77 123 45 67')).toBe('https://wa.me/221771234567');
    expect(waHref('+221 77 123 45 67')).toBe('https://wa.me/221771234567');
  });
});
