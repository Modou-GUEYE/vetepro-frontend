import { beforeEach, describe, expect, it } from 'vitest';
import * as db from './accountsDb';
import type { Failure } from './profilesDb';

const T0 = new Date('2026-10-29T10:00:00.000Z');
const later = (s: number) => new Date(T0.getTime() + s * 1000);
const ok = <T>(x: T): Exclude<T, Failure> => { expect('code' in (x as object) && !('id' in (x as object))).toBe(false); return x as Exclude<T, Failure>; };
const withCode = (now = T0) => db.requestCode('1', now).code;
const solde = (id: string) => db.getAccount(id)!.solde;

beforeEach(db.resetAccounts);

describe('alias', () => {
  it('valide le format selon le type et refuse un doublon', () => {
    expect(db.addAlias({ compteId: '2', type: 'Téléphone', valeur: '12', defaut: false }, T0)).toMatchObject({ code: 'invalid' });
    expect(db.addAlias({ compteId: '2', type: 'E-mail', valeur: 'pas-un-mail', defaut: false }, T0)).toMatchObject({ code: 'invalid' });
    ok(db.addAlias({ compteId: '2', type: 'E-mail', valeur: 'caisse@vetsud.sn', defaut: false }, T0));
    expect(db.addAlias({ compteId: '2', type: 'E-mail', valeur: 'CAISSE@vetsud.sn', defaut: false }, T0)).toMatchObject({ code: 'duplicate' });
  });
  it('un alias ne se rattache pas au compte bancaire', () => {
    expect(db.addAlias({ compteId: '1', type: 'Téléphone', valeur: '77 000 00 00', defaut: false }, T0)).toMatchObject({ code: 'invalid' });
  });
  it('un seul alias par défaut par compte', () => {
    const a = ok(db.addAlias({ compteId: '2', type: 'E-mail', valeur: 'caisse@vetsud.sn', defaut: true }, T0));
    expect(a.defaut).toBe(true);
    expect(db.listAlias().filter((x) => x.compteId === '2' && x.defaut)).toHaveLength(1);
  });
  it('refuse de désactiver ou supprimer l\'alias par défaut', () => {
    expect(db.toggleAlias('1')).toMatchObject({ code: 'is_default' });
    expect(db.deleteAlias('1')).toMatchObject({ code: 'is_default' });
    ok(db.setDefaultAlias('2'));
    expect(ok(db.toggleAlias('1')).actif).toBe(false);
    expect(db.setDefaultAlias('1')).toMatchObject({ code: 'inactive' });
    expect(db.deleteAlias('1')).toBe(true);
  });
});

describe('transferts', () => {
  const inter = (o: Partial<db.TransferInput> = {}): db.TransferInput => ({ type: 'Intercomptes', deId: '2', versId: '1', benefs: [], montant: 100000, motif: 'Reversement', ...o, code: o.code ?? withCode() });
  it('intercomptes : débite et crédite immédiatement', () => {
    const before = solde('1') + solde('2');
    const t = ok(db.createTransfer(inter(), '1', T0));
    expect(t.statut).toBe('succes');
    expect(solde('2')).toBe(412500 - 100000);
    expect(solde('1') + solde('2')).toBe(before);
  });
  it('refuse le même compte, un solde insuffisant et un motif vide', () => {
    expect(db.createTransfer(inter({ versId: '2' }), '1', T0)).toMatchObject({ code: 'invalid' });
    expect(db.createTransfer(inter({ montant: 999999999 }), '1', T0)).toMatchObject({ code: 'insufficient_funds' });
    expect(db.createTransfer(inter({ motif: ' ' }), '1', T0)).toMatchObject({ code: 'invalid' });
  });
  it('exige le code de validation, à usage unique', () => {
    withCode();
    expect(db.createTransfer(inter({ code: '000000' }), '1', T0)).toMatchObject({ code: 'code_invalid' });
    const code = withCode();
    ok(db.createTransfer(inter({ code }), '1', T0));
    expect(db.createTransfer(inter({ code }), '1', T0)).toMatchObject({ code: 'code_required' });
  });
  it('le code expire et reste propre à son utilisateur', () => {
    const code = db.requestCode('1', T0).code;
    expect(db.createTransfer(inter({ code }), '2', T0)).toMatchObject({ code: 'code_required' });
    expect(db.createTransfer(inter({ code }), '1', later(6 * 60))).toMatchObject({ code: 'code_required' });
  });
  it('simple : un bénéficiaire, transmis puis confirmé après le délai', () => {
    const input: db.TransferInput = { type: 'Simple', deId: '1', benefs: [{ nom: 'Sodipharm', alias: '77 003 00 00', montant: 85000 }], motif: 'Facture F-2210', code: withCode() };
    const t = ok(db.createTransfer(input, '1', T0));
    expect(t.statut).toBe('attente');
    expect(solde('1')).toBe(2845000 - 85000);
    expect(db.listTransfers(later(db.CONFIRM_DELAY_S)).find((x) => x.id === t.id)!.statut).toBe('succes');
  });
  it('multiple : au moins deux bénéficiaires, total débité', () => {
    const b = (n: string, a: string, m: number) => ({ nom: n, alias: a, montant: m });
    expect(db.createTransfer({ type: 'Multiple', deId: '1', benefs: [b('A', '77 003 00 00', 1000)], motif: 'x', code: withCode() }, '1', T0)).toMatchObject({ code: 'invalid' });
    const t = ok(db.createTransfer({ type: 'Multiple', deId: '1', benefs: [b('A', '77 003 00 00', 1000), b('B', 'b@x.sn', 2000)], motif: 'x', code: withCode() }, '1', T0));
    expect(t.montant).toBe(3000);
  });
  it('refuse un alias invalide ou un montant nul', () => {
    const base = { type: 'Simple', deId: '1', motif: 'x' };
    expect(db.createTransfer({ ...base, benefs: [{ nom: 'A', alias: '!!', montant: 100 }], code: withCode() }, '1', T0)).toMatchObject({ code: 'invalid' });
    expect(db.createTransfer({ ...base, benefs: [{ nom: 'A', alias: '77 003 00 00', montant: 0 }], code: withCode() }, '1', T0)).toMatchObject({ code: 'invalid' });
  });
});

describe('demandes de paiement', () => {
  const dest = (n: string, a: string, m: number) => ({ nom: n, alias: a, montant: m });
  const input = (o: Partial<Parameters<typeof db.createRequest>[0]> = {}) => ({ multi: false, canal: 'Wave', echeance: '2026-11-05', motif: 'Acompte', destinataires: [dest('Moussa', '77 123 45 67', 5000)], ...o });
  it('PI-SPI accepte un destinataire par e-mail ou identifiant SN-PI, pas Wave', () => {
    const d = (a: string) => [{ nom: 'Awa', alias: a, montant: 5000 }];
    expect(db.createRequest(input({ canal: 'PI-SPI', destinataires: d('awa@vet.sn') }), T0)).toMatchObject({ canal: 'PI-SPI', compteId: '4' });
    expect(db.createRequest(input({ canal: 'PI-SPI', destinataires: d('SN-PI-123456') }), T0)).toMatchObject({ canal: 'PI-SPI' });
    expect(db.createRequest(input({ canal: 'Wave', destinataires: d('awa@vet.sn') }), T0)).toMatchObject({ code: 'invalid' });
  });
  it('valide le canal, le motif, l\'échéance et les numéros', () => {
    expect(db.createRequest(input({ canal: 'Carte' }), T0)).toMatchObject({ code: 'invalid' });
    expect(db.createRequest(input({ motif: '' }), T0)).toMatchObject({ code: 'invalid' });
    expect(db.createRequest(input({ echeance: '2026-10-01' }), T0)).toMatchObject({ code: 'invalid' });
    expect(db.createRequest(input({ destinataires: [dest('A', '12', 5000)] }), T0)).toMatchObject({ code: 'invalid' });
  });
  it('simple : un destinataire ; multiple : au moins deux', () => {
    expect(db.createRequest(input({ multi: true }), T0)).toMatchObject({ code: 'invalid' });
    expect(ok(db.createRequest(input({ multi: true, destinataires: [dest('A', '77 123 45 67', 1), dest('B', '70 987 65 43', 2)] }), T0)).type).toBe('Multiple');
  });
  it('un paiement reçu crédite le portefeuille et fait avancer la demande', () => {
    const d = ok(db.createRequest(input(), T0));
    expect(db.requestStatus(d)).toBe('attente');
    ok(db.actOnRequest(d.id, 0, 'paye'));
    expect(solde('2')).toBe(412500 + 5000);
    expect(db.requestStatus(d)).toBe('paye');
    expect(db.actOnRequest(d.id, 0, 'relance')).toMatchObject({ code: 'not_pending' });
  });
  it('un destinataire qui a refusé peut être relancé', () => {
    const d = ok(db.createRequest(input(), T0));
    ok(db.actOnRequest(d.id, 0, 'refuse'));
    expect(db.requestStatus(d)).toBe('cloturee');
    expect(ok(db.actOnRequest(d.id, 0, 'relance')).destinataires[0].statut).toBe('attente');
    ok(db.actOnRequest(d.id, 0, 'annule'));
    expect(db.actOnRequest(d.id, 0, 'relance')).toMatchObject({ code: 'not_pending' });
  });
  it('avancement partiel d\'une demande multiple', () => {
    const d = db.listRequests()[0];
    expect(db.requestStatus(d)).toBe('partiel');
  });
});

describe('opérations', () => {
  it('liste les transferts du plus récent au plus ancien', () => {
    const ops = db.operations(T0);
    expect(ops.length).toBeGreaterThan(0);
    expect([...ops].sort((a, b) => b.date.localeCompare(a.date))).toEqual(ops);
  });
});
