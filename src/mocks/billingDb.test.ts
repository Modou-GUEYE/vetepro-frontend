import { beforeEach, describe, expect, it } from 'vitest';
import * as db from './billingDb';

const input = (o: Partial<db.InvoiceInput> = {}): db.InvoiceInput => ({
  date: '2026-10-23', source: 'manuel', ownerId: '1', clientLabel: 'Moussa Diallo', patientId: '1', consultationId: null,
  lines: [{ description: 'Consultation générale', quantite: 1, prixUnitaire: 5000 }, { description: 'Méthylprednisolone 4mg', quantite: 10, prixUnitaire: 350 }], remisePct: 0, notes: '', ...o,
});
beforeEach(db.resetBilling);

describe('facture : montants et statuts', () => {
  it('calcule sous-total, remise, total et reste', () => {
    const f = db.createInvoice(input({ remisePct: 10 }), 'x') as db.DemoInvoice;
    expect(db.subtotal(f)).toBe(8500);
    expect(db.total(f)).toBe(7650);
    expect(db.remaining(f)).toBe(7650);
  });

  it('statut : impayée, partielle, payée', () => {
    const f = db.createInvoice(input(), 'x') as db.DemoInvoice;
    expect(db.statusOf(f)).toBe('impayee');
    db.addPayment(f.id, 3000, 'Espèces', 'x');
    expect(db.statusOf(f)).toBe('partielle');
    db.addPayment(f.id, 5500, 'Mobile money', 'x');
    expect(db.statusOf(f)).toBe('payee');
    expect(db.remaining(f)).toBe(0);
  });

  it('les données de départ correspondent à V4', () => {
    expect(db.INVOICES.map((i) => [i.numero, db.total(i), db.paid(i), db.statusOf(i)])).toEqual([
      ['FAC-0001', 12900, 12900, 'payee'], ['FAC-0002', 15000, 8000, 'partielle'], ['FAC-0003', 14700, 0, 'impayee'],
    ]);
  });
});

describe('numérotation et immuabilité', () => {
  it('numérote dans l\'ordre, sans trou ni modification possible', () => {
    const a = db.createInvoice(input(), 'x') as db.DemoInvoice;
    const b = db.createInvoice(input(), 'x') as db.DemoInvoice;
    expect([a.numero, b.numero]).toEqual(['FAC-0004', 'FAC-0005']);
  });

  it('exige au moins une ligne tarifée, avec une quantité entière positive', () => {
    expect(db.createInvoice(input({ lines: [] }), 'x')).toMatchObject({ status: 422 });
    expect(db.createInvoice(input({ lines: [{ description: 'Acte', quantite: 0, prixUnitaire: 100 }] }), 'x')).toMatchObject({ status: 422 });
    expect(db.createInvoice(input({ lines: [{ description: 'Acte', quantite: 1, prixUnitaire: -5 }] }), 'x')).toMatchObject({ code: 'unpriced' });
  });

  it('refuse une remise hors 0 à 100 %, et de refacturer une consultation déjà facturée', () => {
    expect(db.createInvoice(input({ remisePct: 120 }), 'x')).toMatchObject({ status: 422 });
    expect(db.createInvoice(input({ consultationId: '1' }), 'x')).toMatchObject({ code: 'already_invoiced' });
  });
});

describe('paiements', () => {
  it('trace chaque paiement partiel et refuse un montant supérieur au reste dû', () => {
    const f = db.INVOICES[1];
    expect(db.addPayment(f.id, 9000, 'Espèces', 'x')).toMatchObject({ code: 'overpayment' });
    expect(db.addPayment(f.id, 7000, 'Carte', 'Dr Sy')).toMatchObject({ numero: 'FAC-0002' });
    expect(f.payments.map((p) => p.montant)).toEqual([8000, 7000]);
    expect(f.payments[1]).toMatchObject({ mode: 'Carte', by: 'Dr Sy' });
  });

  it('refuse un mode inconnu et un montant non entier', () => {
    expect(db.addPayment('3', 100, 'Troc', 'x')).toMatchObject({ status: 422 });
    expect(db.addPayment('3', 10.5, 'Espèces', 'x')).toMatchObject({ status: 422 });
  });

  it('enregistre le paiement reçu à la création', () => {
    const f = db.createInvoice(input({ paiement: { montant: 5000, mode: 'Espèces' } }), 'x') as db.DemoInvoice;
    expect(db.paid(f)).toBe(5000);
    expect(db.createInvoice(input({ paiement: { montant: 99999, mode: 'Espèces' } }), 'x')).toMatchObject({ code: 'overpayment' });
    expect(db.INVOICES.length).toBe(4); // la facture refusée n'est pas conservée
  });
});

describe('avoirs', () => {
  it('un avoir réduit le reste dû ; un avoir total annule la facture', () => {
    const f = db.INVOICES[2];
    db.addCredit(f.id, 4700, 'Remise commerciale', 'x');
    expect(db.remaining(f)).toBe(10000);
    expect(db.statusOf(f)).toBe('impayee');
    db.addCredit(f.id, 10000, 'Erreur de facturation', 'x');
    expect(db.statusOf(f)).toBe('annulee');
    expect(f.credits.map((c) => c.numero)).toEqual(['AV-0001', 'AV-0002']);
  });
  it('exige un motif et un montant dans la limite de la facture, et refuse un paiement sur une facture annulée', () => {
    const f = db.INVOICES[2];
    expect(db.addCredit(f.id, 100, ' ', 'x')).toMatchObject({ status: 422 });
    expect(db.addCredit(f.id, 20000, 'trop', 'x')).toMatchObject({ status: 422 });
    db.addCredit(f.id, 14700, 'Annulation', 'x');
    expect(db.addPayment(f.id, 100, 'Espèces', 'x')).toMatchObject({ code: 'cancelled' });
  });
});

describe('liste des factures : filtres période et animal', () => {
  it('filtre par période', () => {
    const r = db.listInvoices({ du: '2025-03-05', au: '2025-03-06', page: 1, pageSize: 10 });
    expect(r.items.map((x) => x.numero)).toEqual(['FAC-0002']);
  });
  it('retrouve une facture par le nom de l\'animal', () => {
    const r = db.listInvoices({ q: 'Mimi', page: 1, pageSize: 10 });
    expect(r.items.map((x) => x.numero)).toEqual(['FAC-0002']);
  });
});

describe('indicateurs', () => {
  it("compte chiffre d'affaires, encaissé, créances et factures non soldées", () => {
    expect(db.billingStats('2025-03')).toMatchObject({ chiffre_affaires: 42600, encaisse: 20900, creances: 21700, non_soldees: 2 });
  });
});
