import { describe, expect, it } from 'vitest';
import { articleFormSchema, emptyArticleForm, expiryAlert, levelRatio, restockFormSchema, saleFormSchema, saleSummary } from './pharmacie';

describe('article', () => {
  const ok = { ...emptyArticleForm, nom: 'Ivermectine', categorie: 'Antiparasitaire', unite: 'Flacon 50ml', prix: '6500' };
  it('accepte un article complet', () => expect(articleFormSchema.safeParse(ok).success).toBe(true));
  it('exige nom, catégorie, unité et un prix entier', () => {
    expect(articleFormSchema.safeParse({ ...ok, nom: ' ' }).success).toBe(false);
    expect(articleFormSchema.safeParse({ ...ok, categorie: '' }).success).toBe(false);
    expect(articleFormSchema.safeParse({ ...ok, unite: '' }).success).toBe(false);
    expect(articleFormSchema.safeParse({ ...ok, prix: '65,5' }).success).toBe(false);
  });
});

describe('niveau et péremption', () => {
  it('la barre de niveau est vide en rupture et pleine à deux fois le seuil', () => {
    expect(levelRatio({ quantite: 0, seuil: 10 })).toBe(0);
    expect(levelRatio({ quantite: 20, seuil: 10 })).toBe(1);
    expect(levelRatio({ quantite: 5, seuil: 10 })).toBe(0.25);
  });
  it("alerte de péremption à 30 jours, périmé sous zéro, rien au-delà", () => {
    expect(expiryAlert(null)).toBeNull();
    expect(expiryAlert(31)).toBeNull();
    expect(expiryAlert(12)).toEqual({ tone: 'amber', label: 'Expire dans 12 j' });
    expect(expiryAlert(-1)).toEqual({ tone: 'red', label: 'Périmé' });
  });
});

describe('réapprovisionnement et vente', () => {
  it('exige un médicament et une quantité entière positive', () => {
    expect(restockFormSchema.safeParse({ articleId: '', quantite: '5' }).success).toBe(false);
    expect(restockFormSchema.safeParse({ articleId: '1', quantite: '0' }).success).toBe(false);
    expect(restockFormSchema.safeParse({ articleId: '1', quantite: '25' }).success).toBe(true);
  });
  it('une vente exige au moins un article choisi, avec une quantité valide', () => {
    const base = { date: '2026-10-23', proprietaireId: '', mode: 'Espèces', notes: '' };
    expect(saleFormSchema.safeParse({ ...base, lignes: [] }).success).toBe(false);
    expect(saleFormSchema.safeParse({ ...base, lignes: [{ articleId: '', quantite: '1' }] }).success).toBe(false);
    expect(saleFormSchema.safeParse({ ...base, lignes: [{ articleId: '1', quantite: '2' }] }).success).toBe(true);
  });
  it('calcule le total avec le prix automatique et repère un dépassement de stock en additionnant les lignes', () => {
    const choices = [{ id: '1', code: 'A', nom: 'A', unite: 'u', quantite: 5, prix: 350 }, { id: '2', code: 'B', nom: 'B', unite: 'u', quantite: 3, prix: 1200 }];
    expect(saleSummary([{ articleId: '1', quantite: '2' }, { articleId: '2', quantite: '1' }], choices)).toEqual({ total: 1900, over: [] });
    expect(saleSummary([{ articleId: '2', quantite: '2' }, { articleId: '2', quantite: '2' }], choices).over).toEqual(['2']);
  });
});
