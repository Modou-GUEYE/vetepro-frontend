import { beforeEach, describe, expect, it } from 'vitest';
import * as db from './vaccDb';
import { INVOICES, remaining, resetBilling } from './billingDb';
import { resetPatients, OWNERS } from './patientsDb';
import { SENDS, resetNotifications } from './notifDb';

type Fail = { code: string; status: number; message: string };
function ok<T>(r: T): Exclude<T, Fail> {
  if (typeof r === 'object' && r && 'code' in r && 'status' in r) throw new Error((r as unknown as Fail).message);
  return r as Exclude<T, Fail>;
}
const NOW = new Date('2026-10-23T10:00:00Z');
const input = (o: Partial<db.VaccinationInput> = {}): db.VaccinationInput => ({ patientId: '1', vaccin: 'Rage', date: '2026-10-23', rappel: '2027-10-23', lot: 'L1', notes: '', tarif: 0, ...o });
beforeEach(() => { db.resetVaccinations(); resetBilling(); resetPatients(); resetNotifications(); });

describe('vaccinations : statuts de rappel', () => {
  it('compare la date de rappel à la date du jour', () => {
    expect(db.rappelStatut('2026-10-22', NOW)).toBe('en_retard');
    expect(db.rappelStatut('2026-10-23', NOW)).toBe('bientot');
    expect(db.rappelStatut('2026-11-21', NOW)).toBe('bientot');
    expect(db.rappelStatut('2026-11-22', NOW)).toBe('a_jour');
    expect(db.rappelStatut(null, NOW)).toBe('non_defini');
  });
  it('compte tout le registre, indépendamment de la recherche', () => {
    const s = db.vaccinationStats();
    expect(s.total).toBe(4);
    expect(s.a_jour + s.bientot + s.en_retard).toBe(3);
    expect(db.listVaccinations({ q: 'rex' })).toHaveLength(2);
    expect(db.vaccinationStats().total).toBe(4);
  });
});

describe('vaccinations : ajout et facturation', () => {
  it('exige un animal, une date et un vaccin de la liste', () => {
    expect(db.createVaccination(input({ patientId: '' }), 'x', NOW)).toMatchObject({ message: 'Animal et date requis' });
    expect(db.createVaccination(input({ date: '' }), 'x', NOW)).toMatchObject({ message: 'Animal et date requis' });
    expect(db.createVaccination(input({ vaccin: 'Inconnu' }), 'x', NOW)).toHaveProperty('code', 'invalid');
    expect(db.createVaccination(input({ rappel: '2026-10-01' }), 'x', NOW)).toHaveProperty('code', 'invalid');
    expect(db.createVaccination(input({ patientId: '5' }), 'x', NOW)).toHaveProperty('code', 'invalid');
  });
  it('sans rappel : statut non défini, tarif 0 : pas de facture', () => {
    const v = ok(db.createVaccination(input({ rappel: null }), 'Dr Sy', NOW));
    expect(db.rappelStatut(v.rappel, NOW)).toBe('non_defini');
    expect(v.factureId).toBeNull();
  });
  it('un tarif crée une facture impayée VAC-xxxx dans la facturation', () => {
    const nb = INVOICES.length;
    const v = ok(db.createVaccination(input({ tarif: 7500 }), 'Dr Sy', NOW));
    expect(v.numero).toBe('VAC-0001');
    expect(INVOICES).toHaveLength(nb + 1);
    expect(remaining(INVOICES.find((x) => x.id === v.factureId)!)).toBe(7500);
  });
  it('« Facturer » refuse un montant nul et une seconde facture', () => {
    const v = ok(db.createVaccination(input(), 'Dr Sy', NOW));
    expect(db.billVaccination(v.id, 0, 'x', NOW)).toMatchObject({ message: 'Montant invalide' });
    ok(db.billVaccination(v.id, 5000, 'x', NOW));
    expect(db.billVaccination(v.id, 5000, 'x', NOW)).toHaveProperty('code', 'already_invoiced');
  });
});

describe('vaccinations : rappels SMS', () => {
  it('envoie un SMS une seule fois pour un rappel proche ou dépassé', () => {
    db.sendDueReminders();
    const n = SENDS.length;
    expect(n).toBe(2);
    db.sendDueReminders();
    expect(SENDS).toHaveLength(n);
  });
  it('garde l\'échec au journal sans numéro valide', () => {
    OWNERS.find((o) => o.id === '1')!.telephone = '';
    db.sendDueReminders();
    expect(SENDS.filter((s) => s.statut === 'echec')).toHaveLength(2);
  });
  it('liste au plus 4 rappels, les plus urgents d\'abord', () => {
    const r = db.vaccineReminders();
    expect(r.map((v) => v.id)).toEqual(['2', '1']);
  });
});

describe('campagnes de vaccination', () => {
  const camp = (o: Partial<db.CampagneInput> = {}): db.CampagneInput => ({ nom: 'Antirabique', especeId: 'chien', vaccin: 'Rage', zone: 'Thiès', date: '2026-10-23', vises: 10, ...o });
  it('exige un nom et une zone', () => {
    expect(db.createCampagne(camp({ nom: ' ' }))).toMatchObject({ message: 'Nom et zone requis' });
    expect(db.createCampagne(camp({ zone: '' }))).toMatchObject({ message: 'Nom et zone requis' });
  });
  it('suit le cycle Planifiée, En cours, Terminée', () => {
    const c = ok(db.createCampagne(camp()));
    expect(c.statut).toBe('planifiee');
    expect(db.changeCampagneStatus(c.id, 'cloturer')).toHaveProperty('code', 'invalid_state');
    expect(ok(db.changeCampagneStatus(c.id, 'lancer')).statut).toBe('encours');
    expect(db.changeCampagneStatus(c.id, 'lancer')).toHaveProperty('code', 'invalid_state');
    expect(ok(db.changeCampagneStatus(c.id, 'cloturer')).statut).toBe('terminee');
  });
  it('la première saisie terrain passe la campagne en cours et la progression est plafonnée', () => {
    const c = ok(db.createCampagne(camp({ vises: 2 })));
    expect(db.addCampagneAnimal(c.id, { animal: ' ', proprietaire: '', vaccin: '' }, NOW)).toMatchObject({ message: "Nom de l'animal requis" });
    for (const n of ['A', 'B', 'C']) ok(db.addCampagneAnimal(c.id, { animal: n, proprietaire: '', vaccin: '' }, NOW));
    const after = ok(db.getCampagne(c.id));
    expect(after.statut).toBe('encours');
    expect(after.animaux).toHaveLength(3);
    expect(db.progression(after)).toBe(100);
    ok(db.removeCampagneAnimal(c.id, after.animaux[0].id));
    expect(db.progression(ok(db.getCampagne(c.id)))).toBe(100);
    expect(db.progression({ animaux: after.animaux, vises: null })).toBe(0);
  });
});
