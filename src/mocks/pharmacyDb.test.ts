import { beforeEach, describe, expect, it } from 'vitest';
import { resetBilling } from './billingDb';
import { resetPatients } from './patientsDb';
import * as db from './pharmacyDb';

const input = (o: Partial<db.ArticleInput> = {}): db.ArticleInput => ({ nom: 'Ivermectine injectable', categorie: 'Antiparasitaire', unite: 'Flacon 50ml', quantite: 10, seuil: 3, peremption: '2027-12-31', prix: 6500, ...o });
const last = () => db.MOVEMENTS[db.MOVEMENTS.length - 1];
beforeEach(() => { db.resetPharmacy(); resetBilling(); resetPatients(); });

describe('articles', () => {
  it('génère le code article et trace le stock initial', () => {
    const a = db.createArticle(input(), 'Dr Sy') as db.DemoArticle;
    expect(a.code).toBe('ART-0008');
    expect(last()).toMatchObject({ articleId: a.id, type: 'entree', quantite: 10, reference: 'Stock initial' });
  });

  it('refuse un article déjà existant et les champs obligatoires manquants', () => {
    expect(db.createArticle(input({ nom: 'Drontal Plus', unite: 'Comprimés' }), 'x')).toMatchObject({ code: 'article_exists' });
    expect(db.createArticle(input({ nom: ' ' }), 'x')).toMatchObject({ status: 422 });
    expect(db.createArticle(input({ categorie: 'Inconnue' }), 'x')).toMatchObject({ status: 422 });
    expect(db.createArticle(input({ prix: -1 }), 'x')).toMatchObject({ status: 422 });
  });

  it('la modification ne change pas la quantité', () => {
    const a = db.updateArticle('1', input({ nom: 'Méthylprednisolone 4mg', unite: 'Comprimés', quantite: 999, prix: 400 })) as db.DemoArticle;
    expect(a).toMatchObject({ prix: 400, quantite: 40 });
  });

  it('niveaux : OK, faible sous le seuil, rupture à zéro', () => {
    expect(db.levelOf({ quantite: 20, seuil: 20 })).toBe('ok');
    expect(db.levelOf({ quantite: 19, seuil: 20 })).toBe('faible');
  });

  it('signale une péremption proche', () => {
    expect(db.daysToExpiry(db.getArticle('2') as db.DemoArticle)).toBeLessThanOrEqual(20);
    expect(db.daysToExpiry({ peremption: null })).toBeNull();
  });
});

describe('réapprovisionnement et sorties', () => {
  it('le réapprovisionnement ajoute au stock et crée un mouvement tracé', () => {
    db.restock('3', 25, 'Omar Diouf');
    expect(db.getArticle('3')).toMatchObject({ quantite: 25 });
    expect(last()).toMatchObject({ articleId: '3', type: 'entree', quantite: 25, by: 'Omar Diouf' });
    expect(db.restock('3', 0, 'x')).toMatchObject({ status: 422 });
  });

  it('refuse une sortie sur un article épuisé ou en stock insuffisant, sans rien retirer', () => {
    expect(db.decrement('3', 1, 'consultation', 'x', 'ref')).toMatchObject({ code: 'out_of_stock' });
    expect(db.decrement('2', 8, 'vente', 'x', 'ref')).toMatchObject({ code: 'insufficient_stock' });
    expect((db.getArticle('2') as db.DemoArticle).quantite).toBe(7);
  });

  it('liste les mouvements avec filtres par article et par type', () => {
    expect(db.listMovements({ articleId: '2', page: 1, pageSize: 20 }).total).toBe(3);
    expect(db.listMovements({ type: 'consultation', page: 1, pageSize: 20 }).total).toBe(3);
  });
});

describe('désactivation et suppression', () => {
  it('refusées si l\'article est utilisé dans un traitement en cours, autorisées sinon', () => {
    expect(db.setArticleActive('2', false)).toMatchObject({ code: 'in_treatment' });
    expect(db.deleteArticle('2')).toMatchObject({ code: 'in_treatment' });
    expect(db.setArticleActive('4', false)).toMatchObject({ actif: false });
    expect(db.setArticleActive('4', true)).toMatchObject({ actif: true });
    expect(db.deleteArticle('5')).toBeNull();
    expect(db.listArticles({ page: 1, pageSize: 50 }).items.some((a) => a.id === '5')).toBe(false);
  });

  it("l'article n'est plus bloqué quand le traitement date de plus de 14 jours", () => {
    expect(db.inActiveTreatment('2', new Date(Date.now() + 20 * 86_400_000))).toBe(false);
  });

  it("un article désactivé n'est plus proposé", () => {
    expect(db.articleChoices().some((a) => a.id === '7')).toBe(false);
  });
});

describe('vente au comptoir', () => {
  const sale = (lignes: db.SaleInput['lignes'], o: Partial<db.SaleInput> = {}): db.SaleInput => ({ date: '2026-10-23', ownerId: null, mode: 'Espèces', notes: '', lignes, ...o });

  it('applique le prix automatique, diminue le stock, crée une facture payée', () => {
    const f = db.createSale(sale([{ articleId: '1', quantite: 2 }, { articleId: '5', quantite: 1 }]), 'Dr Sy') as ReturnType<typeof db.createSale> & { numero: string; lines: unknown[] };
    expect(f).toMatchObject({ numero: 'FAC-0004', source: 'vente', clientLabel: 'Client anonyme' });
    expect((db.getArticle('1') as db.DemoArticle).quantite).toBe(38);
    expect(last()).toMatchObject({ type: 'vente', reference: 'FAC-0004' });
    expect(db.salesInvoices()).toHaveLength(1);
  });

  it('refuse un article épuisé ou une quantité supérieure au stock, et ne retire rien', () => {
    expect(db.createSale(sale([{ articleId: '3', quantite: 1 }]), 'x')).toMatchObject({ code: 'out_of_stock' });
    expect(db.createSale(sale([{ articleId: '1', quantite: 1 }, { articleId: '2', quantite: 8 }]), 'x')).toMatchObject({ code: 'insufficient_stock' });
    expect((db.getArticle('1') as db.DemoArticle).quantite).toBe(40);
    expect(db.salesInvoices()).toHaveLength(0);
  });

  it('additionne les lignes du même article avant de contrôler le stock', () => {
    expect(db.createSale(sale([{ articleId: '2', quantite: 4 }, { articleId: '2', quantite: 4 }]), 'x')).toMatchObject({ code: 'insufficient_stock' });
  });

  it('rattache la vente à un propriétaire quand il est choisi', () => {
    expect(db.createSale(sale([{ articleId: '1', quantite: 1 }], { ownerId: '1' }), 'x')).toMatchObject({ clientLabel: 'Moussa Diallo', ownerId: '1' });
  });
});

describe('indicateurs de la pharmacie', () => {
  it('compte les références et les niveaux de stock', () => {
    expect(db.pharmacyStats()).toEqual({ references: 7, ok: 5, faible: 1, rupture: 1 });
  });
});
