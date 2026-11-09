import { beforeEach, describe, expect, it } from 'vitest';
import * as bill from './billingDb';
import * as db from './paymentsDb';
import type { Failure } from './profilesDb';

const T0 = new Date('2026-10-29T10:00:00.000Z');
const later = (min: number) => new Date(T0.getTime() + min * 60000);
const ok = <T>(x: T): Exclude<T, Failure> => { expect('code' in (x as object) && !('id' in (x as object))).toBe(false); return x as Exclude<T, Failure>; };

beforeEach(() => { bill.resetBilling(); db.resetPayments(); });

describe('paiement électronique : création', () => {
  it('crée une transaction en attente sans toucher la facture', () => {
    const t = ok(db.createTx({ factureId: '3', canal: 'Wave', methode: 'qr', alias: '', montant: 5000 }, T0));
    expect(t.statut).toBe('attente');
    expect(bill.paid(bill.getInvoice('3') as bill.DemoInvoice)).toBe(0);
  });
  it('refuse un montant supérieur au reste dû', () => {
    const r = db.createTx({ factureId: '3', canal: 'Wave', methode: 'qr', alias: '', montant: 999999 }, T0);
    expect(r).toMatchObject({ code: 'overpayment' });
  });
  it('exige un numéro valide pour une demande de paiement', () => {
    expect(db.createTx({ factureId: '3', canal: 'Orange Money', methode: 'demande', alias: '12', montant: 1000 }, T0)).toMatchObject({ code: 'invalid' });
    expect(ok(db.createTx({ factureId: '3', canal: 'Orange Money', methode: 'demande', alias: '77 123 45 67', montant: 1000 }, T0)).statut).toBe('attente');
  });
  it('PI-SPI accepte un alias téléphone, e-mail ou SN-PI et refuse le reste', () => {
    for (const alias of ['77 123 45 67', 'awa@vet.sn', 'SN-PI-123456']) expect(ok(db.createTx({ factureId: null, canal: 'PI-SPI', methode: 'demande', alias, montant: 1000 }, T0)).canal).toBe('PI-SPI');
    expect(db.createTx({ factureId: null, canal: 'PI-SPI', methode: 'demande', alias: 'abc', montant: 1000 }, T0)).toMatchObject({ code: 'invalid' });
    expect(db.createTx({ factureId: null, canal: 'Wave', methode: 'demande', alias: 'awa@vet.sn', montant: 1000 }, T0)).toMatchObject({ code: 'invalid' });
  });
  it('refuse un canal inconnu et une facture déjà soldée', () => {
    expect(db.createTx({ factureId: '3', canal: 'Carte', methode: 'qr', alias: '', montant: 1000 }, T0)).toMatchObject({ code: 'invalid' });
    expect(db.createTx({ factureId: '1', canal: 'Wave', methode: 'qr', alias: '', montant: 1 }, T0)).toMatchObject({ code: 'overpayment' });
  });
  it('une seule transaction en attente par facture', () => {
    ok(db.createTx({ factureId: '3', canal: 'Wave', methode: 'qr', alias: '', montant: 1000 }, T0));
    expect(db.createTx({ factureId: '3', canal: 'Wave', methode: 'qr', alias: '', montant: 1000 }, later(1))).toMatchObject({ code: 'pending_exists' });
  });
});

describe('paiement électronique : confirmation, échec, expiration', () => {
  it('la facture n\'est mise à jour qu\'à la confirmation', () => {
    const t = ok(db.createTx({ factureId: '3', canal: 'Wave', methode: 'qr', alias: '', montant: 5000 }, T0));
    ok(db.settleTx(t.id, 'succes', later(1)));
    const inv = bill.getInvoice('3') as bill.DemoInvoice;
    expect(bill.paid(inv)).toBe(5000);
    expect(inv.payments[0].mode).toBe('Wave');
  });
  it('un refus laisse la facture inchangée', () => {
    const t = ok(db.createTx({ factureId: '3', canal: 'Wave', methode: 'qr', alias: '', montant: 5000 }, T0));
    expect(ok(db.settleTx(t.id, 'refus', later(1), 'Solde insuffisant')).motif).toBe('Solde insuffisant');
    expect(bill.paid(bill.getInvoice('3') as bill.DemoInvoice)).toBe(0);
  });
  it('expire après le délai paramétré', () => {
    ok(db.setExpiration(3));
    const t = ok(db.createTx({ factureId: '3', canal: 'Wave', methode: 'qr', alias: '', montant: 5000 }, T0));
    expect((db.getTx(t.id, later(2)) as db.DemoTx).statut).toBe('attente');
    expect((db.getTx(t.id, later(3)) as db.DemoTx).statut).toBe('expire');
    expect(db.settleTx(t.id, 'succes', later(4))).toMatchObject({ code: 'not_pending' });
  });
  it('refuse un délai hors de 1 à 60 minutes', () => {
    expect(db.setExpiration(0)).toMatchObject({ code: 'invalid' });
    expect(db.setExpiration(61)).toMatchObject({ code: 'invalid' });
  });
  it('annulation d\'une transaction en attente seulement', () => {
    const t = ok(db.createTx({ factureId: '3', canal: 'Wave', methode: 'qr', alias: '', montant: 5000 }, T0));
    expect(ok(db.cancelTx(t.id, later(1))).statut).toBe('annule');
    expect(db.cancelTx(t.id, later(2))).toMatchObject({ code: 'not_pending' });
  });
  it('relance : renvoie une demande en attente, recrée une transaction sinon', () => {
    const t = ok(db.createTx({ factureId: '3', canal: 'Orange Money', methode: 'demande', alias: '77 123 45 67', montant: 5000 }, T0));
    const again = ok(db.relaunchTx(t.id, later(2)));
    expect(again.id).toBe(t.id);
    expect(again.historique).toHaveLength(2);
    db.cancelTx(t.id, later(3));
    expect(ok(db.relaunchTx(t.id, later(4))).id).not.toBe(t.id);
  });
});

describe('remboursement', () => {
  const paid = () => { const t = ok(db.createTx({ factureId: '3', canal: 'Wave', methode: 'qr', alias: '', montant: 5000 }, T0)); ok(db.settleTx(t.id, 'succes', later(1))); return t; };
  it('exige un motif et émet un avoir sur la facture', () => {
    const t = paid();
    expect(db.refundTx(t.id, 1000, ' ', 'Admin', later(2))).toMatchObject({ code: 'invalid' });
    const r = ok(db.refundTx(t.id, 1000, 'Erreur de saisie', 'Admin', later(2)));
    expect(r.avoir).toBe('AV-0001');
    expect(r.reference).toBe('RMB-26-000041');
    expect(r.origine).toContain('FAC-0003');
    expect(bill.credited(bill.getInvoice('3') as bill.DemoInvoice)).toBe(1000);
  });
  it('l\'avoir est facultatif et le canal de remboursement contrôlé', () => {
    const t = paid();
    const r = ok(db.refundTx(t.id, 1000, 'Trop-perçu', 'Admin', later(2), { canal: 'Espèces', avoir: false }));
    expect(r).toMatchObject({ avoir: '', canal: 'Espèces' });
    expect(bill.credited(bill.getInvoice('3') as bill.DemoInvoice)).toBe(0);
    expect(db.refundTx(t.id, 100, 'x', 'Admin', later(3), { canal: 'Orange Money' })).toMatchObject({ code: 'invalid' });
  });
  it('ne dépasse pas le montant payé, cumul compris', () => {
    const t = paid();
    ok(db.refundTx(t.id, 4000, 'Annulation', 'Admin', later(2)));
    expect(db.refundTx(t.id, 1001, 'Trop', 'Admin', later(3))).toMatchObject({ code: 'invalid' });
  });
  it('refuse le remboursement d\'une transaction non confirmée', () => {
    const t = ok(db.createTx({ factureId: '3', canal: 'Wave', methode: 'qr', alias: '', montant: 5000 }, T0));
    expect(db.refundTx(t.id, 100, 'x', 'Admin', later(1))).toMatchObject({ code: 'not_paid' });
  });
});

describe('paiements non identifiés', () => {
  it('rattache à une facture sans dépasser le reste dû', () => {
    expect(db.attachSuspens('1', '1', T0)).toMatchObject({ code: 'overpayment' });
    ok(db.attachSuspens('1', '3', T0));
    expect(bill.paid(bill.getInvoice('3') as bill.DemoInvoice)).toBe(3000);
    expect(db.listSuspens()).toHaveLength(1);
    expect(db.allSuspens()).toHaveLength(2);
    expect(db.allSuspens()[0].statut).toBe('suspens');
  });
  it('remboursement avec motif obligatoire, une seule fois', () => {
    expect(db.refundSuspens('2', '', 'Admin', T0)).toMatchObject({ code: 'invalid' });
    const r = ok(db.refundSuspens('2', 'Payeur non reconnu', 'Admin', T0));
    expect(r.origine).toContain('en suspens');
    expect(db.listRefunds()).toHaveLength(1);
    expect(db.refundSuspens('2', 'Encore', 'Admin', T0)).toMatchObject({ code: 'already_processed' });
  });
});

describe('paiement libre (sans facture)', () => {
  it('crée une transaction sans facture, avec libellé', () => {
    const t = ok(db.createTx({ factureId: null, canal: 'Orange Money', methode: 'qr', alias: '', montant: 15000, libelle: 'Acompte' }, T0));
    expect(t).toMatchObject({ factureId: null, libelle: 'Acompte', payeur: 'Client comptoir', statut: 'attente' });
  });
  it('exige un montant positif et ne touche aucune facture à la confirmation', () => {
    expect(db.createTx({ factureId: null, canal: 'Wave', methode: 'qr', alias: '', montant: 0 }, T0)).toMatchObject({ code: 'invalid' });
    const before = bill.INVOICES.map((i) => bill.paid(i));
    const t = ok(db.createTx({ factureId: null, canal: 'Wave', methode: 'qr', alias: '', montant: 2000 }, T0));
    expect(ok(db.settleTx(t.id, 'succes', later(1))).statut).toBe('succes');
    expect(bill.INVOICES.map((i) => bill.paid(i))).toEqual(before);
  });
  it('plusieurs paiements libres en attente sont permis ; relance possible', () => {
    const a = ok(db.createTx({ factureId: null, canal: 'Wave', methode: 'qr', alias: '', montant: 1000 }, T0));
    ok(db.createTx({ factureId: null, canal: 'Wave', methode: 'qr', alias: '', montant: 1000 }, T0));
    db.cancelTx(a.id, later(1));
    expect(ok(db.relaunchTx(a.id, later(2))).libelle).toBe('Paiement libre');
  });
});
