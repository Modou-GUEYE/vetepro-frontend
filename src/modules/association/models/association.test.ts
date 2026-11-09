import { describe, expect, it } from 'vitest';
import {
  emptySurMesure, prolongationSchema, surMesureSchema, surMesureToDto,
  contenuFormSchema, annonceFormSchema, cvState, Cv,
} from './association';

describe('offre sur mesure', () => {
  const base = { ...emptySurMesure(), nom: 'Groupe Sud', telephone: '77 900 00 00', email: 'd@g.sn', responsable: 'Pape Badji', identifiant: 'pbadji', tarif: '120000', modules: ['patients'] };
  it('contrôle les champs obligatoires et le format du numéro d\'ordre', () => {
    expect(surMesureSchema.safeParse(base).success).toBe(true);
    expect(surMesureSchema.safeParse({ ...base, ordre: '12' }).success).toBe(false);
    expect(surMesureSchema.safeParse({ ...base, email: 'x' }).success).toBe(false);
    expect(surMesureSchema.safeParse({ ...base, modules: [] }).success).toBe(false);
    expect(surMesureSchema.safeParse({ ...base, telephone: '77' }).success).toBe(false);
  });
  it('convertit en DTO', () => {
    expect(surMesureToDto({ ...base, utilisateursMax: '20', veterinaires: '8' })).toMatchObject({ tarif: 120000, utilisateurs_max: 20, veterinaires: 8, essai: true });
    expect(surMesureToDto(base).utilisateurs_max).toBeNull();
  });
  it('limite la prolongation à 1-90 jours', () => {
    expect(prolongationSchema.safeParse({ jours: '15' }).success).toBe(true);
    expect(prolongationSchema.safeParse({ jours: '0' }).success).toBe(false);
    expect(prolongationSchema.safeParse({ jours: '91' }).success).toBe(false);
  });
});

describe('contenus', () => {
  it("exige titre, résumé, date et catégorie d'une annonce", () => {
    expect(annonceFormSchema.safeParse({ categorie: 'alerte', titre: ' ', resume: '', texte: '', zone: '', date: '', publie: true }).success).toBe(false);
    expect(annonceFormSchema.safeParse({ categorie: 'alerte', titre: 'T', resume: 'R', texte: '', zone: '', date: '2026-10-01', publie: true }).success).toBe(true);
  });
  it("vérifie l'e-mail de contact", () => {
    const f = { titre: 'T', sousTitre: 'S', telephone: '', email: 'x', adresse: '', pourquoi: [] };
    expect(contenuFormSchema.safeParse(f).success).toBe(false);
    expect(contenuFormSchema.safeParse({ ...f, email: 'a@b.sn' }).success).toBe(true);
  });
});

describe('état des CV', () => {
  it('un profil retiré prime sur son statut', () => {
    const cv = { statut: 'archive', retire: true } as Cv;
    expect(cvState(cv)).toBe('retire');
    expect(cvState({ ...cv, retire: false })).toBe('archive');
  });
});
