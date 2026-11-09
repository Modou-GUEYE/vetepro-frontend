import { beforeEach, describe, expect, it } from 'vitest';
import * as db from './inseminDb';
import { INVOICES, addPayment, remaining, resetBilling } from './billingDb';
import { OWNERS, PATIENTS, resetPatients } from './patientsDb';
import { NOTIFS, SENDS, resetNotifications } from './notifDb';

type Fail = { code: string; status: number; message: string };
function ok<T>(r: T): Exclude<T, Fail> {
  if (typeof r === 'object' && r && 'code' in r && 'status' in r) throw new Error((r as unknown as Fail).message);
  return r as Exclude<T, Fail>;
}
const NOW = new Date('2030-03-10T10:00:00Z');
const input = (o: Partial<db.InsemInput> = {}): db.InsemInput => ({
  patientId: '5', nouveauPatient: null, date: '2030-03-10', methode: 'ia_congelee', vetId: '2', statut: 'realise', observations: '',
  semence: { raceGeniteur: 'Zébu Gobra', nomGeniteur: 'Toro-9', lot: 'L-9', dose: '', origine: '', dateCollecte: null }, tarif: 0, modePaiement: '', confirmerDoublon: false, confirmerReinitialisation: false, ...o,
});
beforeEach(() => { db.resetInseminations(); resetBilling(); resetPatients(); resetNotifications(); });

describe('insémination : création', () => {
  it('exige date, méthode et statut', () => {
    expect(db.createInsemination(input({ date: '' }), 'x', NOW)).toHaveProperty('code', 'invalid');
    expect(db.createInsemination(input({ methode: 'x' }), 'x', NOW)).toHaveProperty('code', 'invalid');
    expect(db.createInsemination(input({ statut: '' }), 'x', NOW)).toHaveProperty('code', 'invalid');
  });
  it('n\'accepte une date future que pour un acte planifié', () => {
    expect(db.createInsemination(input({ date: '2030-03-20' }), 'x', NOW)).toHaveProperty('code', 'invalid');
    expect(db.createInsemination(input({ date: '2030-03-20', statut: 'planifie' }), 'x', NOW)).toHaveProperty('numero');
  });
  it('exige le lot ou le géniteur pour une IA réalisée', () => {
    const vide = { raceGeniteur: '', nomGeniteur: '', lot: '', dose: '', origine: '', dateCollecte: null };
    expect(db.createInsemination(input({ semence: vide }), 'x', NOW)).toHaveProperty('code', 'traceability');
    expect(db.createInsemination(input({ semence: { ...vide, lot: 'L' } }), 'x', NOW)).toHaveProperty('numero');
    expect(db.createInsemination(input({ semence: vide, methode: 'naturelle', patientId: '7', date: '2030-03-01' }), 'x', NOW)).toHaveProperty('numero');
  });
  it('signale un doublon à moins de 15 jours, à confirmer', () => {
    ok(db.createInsemination(input(), 'x', NOW));
    expect(db.createInsemination(input({ date: '2030-03-20', statut: 'planifie' }), 'x', NOW)).toHaveProperty('code', 'duplicate');
    expect(db.createInsemination(input({ date: '2030-03-20', statut: 'planifie', confirmerDoublon: true }), 'x', NOW)).toHaveProperty('numero');
    expect(db.createInsemination(input({ date: '2030-04-30', statut: 'planifie' }), 'x', NOW)).toHaveProperty('numero');
  });
  it('un tarif crée la facture impayée avec la ligne de l\'acte ; le mode de paiement reste indicatif', () => {
    const a = ok(db.createInsemination(input({ tarif: 25000, modePaiement: 'Espèces' }), 'Dr Sy', NOW));
    const f = INVOICES.find((x) => x.id === a.factureId)!;
    expect(f.source).toBe('insemination');
    expect(f.lines[0].description).toBe('Insémination, IA semence congelée, Zébu Gobra');
    expect(remaining(f)).toBe(25000);
    expect(f.payments).toHaveLength(0);
  });
  it('crée une fiche provisoire pour un animal inconnu', () => {
    const nb = PATIENTS.length;
    const a = ok(db.createInsemination(input({ patientId: null, nouveauPatient: { nom: 'Vaillante', especeId: 'bovin', raceId: null, naissance: null, sexe: 'F', ownerId: '1', owner: null } }), 'x', NOW));
    expect(PATIENTS).toHaveLength(nb + 1);
    expect(PATIENTS.find((p) => p.id === a.patientId)).toMatchObject({ nom: 'Vaillante', provisoire: true });
  });
});

describe('insémination : modification', () => {
  it('trace la modification et met à jour la facture tant qu\'elle n\'est pas payée', () => {
    const a = ok(db.createInsemination(input({ tarif: 20000 }), 'x', NOW));
    const m = ok(db.updateInsemination(a.id, input({ tarif: 30000 }), 'Dr Sy', NOW));
    expect(m.history[0]).toMatchObject({ action: 'modification', by: 'Dr Sy' });
    expect(remaining(INVOICES.find((x) => x.id === m.factureId)!)).toBe(30000);
  });
  it('refuse de changer le tarif d\'une facture déjà payée', () => {
    const a = ok(db.createInsemination(input({ tarif: 20000 }), 'x', NOW));
    ok(addPayment(a.factureId!, 5000, 'Espèces', 'x', NOW));
    expect(db.updateInsemination(a.id, input({ tarif: 30000 }), 'x', NOW)).toHaveProperty('code', 'already_paid');
  });
  it('un résultat de diagnostic impose le statut Réalisé', () => {
    expect(db.updateInsemination('1', input({ patientId: '5', date: '2030-01-01', statut: 'planifie' }), 'x', NOW)).toHaveProperty('code', 'invalid');
  });
  it('repasser en Planifié un acte en attente de diagnostic demande confirmation et remet le résultat à zéro', () => {
    const a = ok(db.createInsemination(input({ date: '2030-01-01' }), 'x', NOW));
    ok(db.diagnose(a.id, { date: '2030-02-01', methode: 'echographie', resultat: 'attente', miseBasPrevue: null }, 'x', NOW));
    expect(db.updateInsemination(a.id, input({ date: '2030-01-01', statut: 'planifie' }), 'x', NOW)).toHaveProperty('code', 'reset_confirm');
    const m = ok(db.updateInsemination(a.id, input({ date: '2030-01-01', statut: 'planifie', confirmerReinitialisation: true }), 'x', NOW));
    expect(m.diagnostic).toBeNull();
  });
});

describe('insémination : diagnostic, suivi et mise-bas', () => {
  it('calcule la mise-bas prévue avec la durée de gestation de l\'espèce', () => {
    const a = ok(db.createInsemination(input({ date: '2030-01-01' }), 'x', NOW));
    const d = ok(db.diagnose(a.id, { date: '2030-02-01', methode: 'echographie', resultat: 'positif', miseBasPrevue: null }, 'x', NOW));
    expect(d.miseBasPrevue).toBe('2030-10-11');
  });
  it('refuse un diagnostic avant l\'acte ou sur un acte planifié', () => {
    const a = ok(db.createInsemination(input({ date: '2030-01-01' }), 'x', NOW));
    expect(db.diagnose(a.id, { date: '2029-12-31', methode: '', resultat: 'positif', miseBasPrevue: null }, 'x', NOW)).toHaveProperty('code', 'invalid');
    const p = ok(db.createInsemination(input({ patientId: '6', date: '2030-03-20', statut: 'planifie' }), 'x', NOW));
    expect(db.diagnose(p.id, { date: '2030-03-10', methode: '', resultat: 'positif', miseBasPrevue: null }, 'x', NOW)).toHaveProperty('code', 'not_realised');
  });
  it('un diagnostic négatif clôt l\'acte et le retire du suivi', () => {
    const a = ok(db.createInsemination(input({ date: '2030-01-01' }), 'x', NOW));
    const d = ok(db.diagnose(a.id, { date: '2030-02-01', methode: 'palpation', resultat: 'negatif', miseBasPrevue: null }, 'x', NOW));
    expect(d.miseBasPrevue).toBeNull();
    expect(db.gestations(NOW).some((g) => g.acte.id === a.id)).toBe(false);
  });
  it('classe les gestantes : passée, imminente, en cours, à compléter', () => {
    const g = db.gestations(new Date('2030-01-01T00:00:00Z'));
    expect(g.length).toBe(2);
    expect(g.every((x) => x.etat !== 'a_completer')).toBe(true);
    const seed2 = db.INSEMS.find((a) => a.id === '2')!;
    seed2.miseBasPrevue = null;
    expect(db.gestations(NOW).find((x) => x.acte.id === '2')!.etat).toBe('a_completer');
  });
  it('enregistre la mise-bas : retire la femelle du suivi et refuse une date avant l\'acte', () => {
    const a = db.INSEMS.find((x) => x.id === '1')!;
    expect(db.recordMiseBas('1', { date: '2000-01-01', vivants: 1, morts: 0, observations: '' }, 'x', NOW)).toHaveProperty('code', 'invalid');
    ok(db.recordMiseBas('1', { date: '2030-03-01', vivants: 1, morts: 0, observations: 'RAS' }, 'x', NOW));
    expect(db.gestations(NOW).some((g) => g.acte.id === a.id)).toBe(false);
    expect(db.recordMiseBas('3', { date: '2030-03-01', vivants: 1, morts: 0, observations: '' }, 'x', NOW)).toHaveProperty('code', 'not_pregnant');
  });
  it('programme les rappels : diagnostic à J+30 après l\'acte, mise-bas 7 jours avant la date prévue', () => {
    const a = ok(db.createInsemination(input({ date: '2030-01-01' }), 'x', NOW));
    const r = db.rappels(NOW);
    expect(r.find((x) => x.id === `${a.id}-diag`)).toMatchObject({ date: '2030-01-31', statut: 'en_retard' });
    expect(db.rappels().find((x) => x.id === '1-mb')).toMatchObject({ type: 'mb', statut: 'programme' });
    const mb = db.INSEMS.find((x) => x.id === '1')!.miseBasPrevue!;
    expect(r.find((x) => x.id === '1-mb')!.date).toBe(new Date(Date.parse(mb) - 7 * 86_400_000).toISOString().slice(0, 10));
  });
  it('envoie un rappel à la main (SMS et notification) et le marque envoyé', () => {
    const r = ok(db.sendRappel('1-mb', NOW)) as { rappel: db.Rappel; ok: boolean };
    expect(r.ok).toBe(true);
    expect(r.rappel.statut).toBe('envoye');
    expect(SENDS.some((s) => s.reference === 'insem:1')).toBe(true);
    expect(NOTIFS.some((n) => n.type === 'insemination')).toBe(true);
    expect(db.sendRappel('99-mb', NOW)).toHaveProperty('code', 'not_found');
  });
  it('garde un rappel non envoyé si le propriétaire n\'a pas de numéro valide', () => {
    OWNERS.find((o) => o.id === '1')!.telephone = '';
    const r = ok(db.sendRappel('1-mb', NOW)) as { rappel: db.Rappel; ok: boolean; message: string };
    expect(r.ok).toBe(false);
    expect(r.rappel.statut).not.toBe('envoye');
  });
  it('envoie automatiquement les rappels dus ce jour, une seule fois, et alerte une mise-bas dépassée', () => {
    const t = new Date();
    const a = db.INSEMS.find((x) => x.id === '2')!;
    a.miseBasPrevue = new Date(t.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
    db.flagReminders(t);
    expect(SENDS.filter((s) => s.reference === 'insem:2')).toHaveLength(1);
    db.flagReminders(t);
    expect(SENDS.filter((s) => s.reference === 'insem:2')).toHaveLength(1);
    a.miseBasPrevue = new Date(t.getTime() - 3 * 86_400_000).toISOString().slice(0, 10);
    db.flagReminders(t);
    expect(NOTIFS.some((n) => n.titre === 'Mise-bas dépassée')).toBe(true);
  });
});

describe('insémination : suppression et liste', () => {
  it('exige un motif et refuse si la facture a reçu un paiement', () => {
    const a = ok(db.createInsemination(input({ tarif: 20000 }), 'x', NOW));
    expect(db.deleteInsemination(a.id, ' ', 'Admin', NOW)).toHaveProperty('code', 'invalid');
    ok(addPayment(a.factureId!, 1000, 'Espèces', 'x', NOW));
    expect(db.deleteInsemination(a.id, 'Erreur', 'Admin', NOW)).toHaveProperty('code', 'already_paid');
  });
  it('annule la facture non payée et retire l\'acte de la liste', () => {
    const a = ok(db.createInsemination(input({ tarif: 20000 }), 'x', NOW));
    expect(db.deleteInsemination(a.id, 'Saisie en double', 'Admin', NOW)).toBeNull();
    expect(db.listInseminations({}).some((x) => x.id === a.id)).toBe(false);
    expect(INVOICES.find((x) => x.id === a.factureId)!.credits).toHaveLength(1);
  });
  it('filtre par statut rapide, résultat et recherche', () => {
    expect(db.listInseminations({ filtre: 'planifie' }).map((a) => a.id)).toEqual(['4']);
    expect(db.listInseminations({ filtre: 'positif' }).map((a) => a.id).sort()).toEqual(['1', '2']);
    expect(db.listInseminations({ filtre: 'negatif' }).map((a) => a.id)).toEqual(['3']);
    expect(db.listInseminations({ q: 'toro' }).map((a) => a.id)).toEqual(['1']);
    expect(db.insemStats().taux_reussite).toBe(67);
  });
});
