import { beforeEach, describe, expect, it } from 'vitest';
import * as db from './rdvDb';
import { OWNERS, PATIENTS, resetPatients } from './patientsDb';
import { NOTIFS, SENDS, resetNotifications } from './notifDb';

/** Repère fixe : vendredi 23/10/2026 à 8 h. */
const NOW = new Date('2030-10-23T08:00:00');
const input = (o: Partial<db.RdvInput> = {}): db.RdvInput => ({ date: '2030-10-26', heure: '09:00', duree: 30, vetId: '2', patientId: '1', nouveauPatient: null, motif: 'Contrôle', notes: '', canal: 'sms', ...o });
type Fail = { code: string; status: number; message: string };
function ok<T>(r: T): Exclude<T, Fail> {
  if (typeof r === 'object' && r && 'code' in r && 'status' in r) throw new Error((r as unknown as Fail).message);
  return r as Exclude<T, Fail>;
}
beforeEach(() => { db.resetRdvs(); resetPatients(); resetNotifications(); });

describe('rendez-vous : créneaux', () => {
  it('refuse un créneau déjà réservé pour le vétérinaire', () => {
    ok(db.createRdv(input(), 'Omar', '3', NOW));
    const r = db.createRdv(input({ heure: '09:15', patientId: '2' }), 'Omar', '3', NOW);
    expect(r).toMatchObject({ code: 'slot_taken', status: 409 });
  });
  it('accepte le même horaire chez un autre vétérinaire et le créneau suivant', () => {
    ok(db.createRdv(input(), 'Omar', '3', NOW));
    expect(db.createRdv(input({ vetId: '6' }), 'Omar', '3', NOW)).toHaveProperty('rdv');
    expect(db.createRdv(input({ heure: '09:30' }), 'Omar', '3', NOW)).toHaveProperty('rdv');
  });
  it('refuse le passé et les heures hors horaires', () => {
    expect(db.createRdv(input({ date: '2030-10-22' }), 'Omar', '3', NOW)).toMatchObject({ code: 'in_the_past' });
    expect(db.createRdv(input({ heure: '17:45', duree: 30 }), 'Omar', '3', NOW)).toMatchObject({ code: 'outside_hours' });
  });
  it('liste les disponibilités sans les créneaux pris', () => {
    ok(db.createRdv(input({ heure: '09:00', duree: 60 }), 'Omar', '3', NOW));
    const libres = db.availability('2', '2030-10-26', 30, NOW);
    expect(libres).toContain('08:30');
    expect(libres).not.toContain('09:00');
    expect(libres).not.toContain('09:45');
    expect(libres).toContain('10:00');
  });
  it('ne propose pas les heures déjà passées le jour même', () => {
    const libres = db.availability('2', '2030-10-23', 30, new Date('2030-10-23T12:00:00'));
    expect(libres[0]).toBe('12:15');
  });
});

describe('rendez-vous : notifications', () => {
  it('prévient le propriétaire par son canal et le vétérinaire dans l\'application', () => {
    const r = ok(db.createRdv(input({ canal: 'whatsapp' }), 'Omar', '3', NOW));
    expect(r.envoi).toMatchObject({ canal: 'whatsapp', statut: 'envoye' });
    const before = NOTIFS.filter((n) => n.userId === '2').length;
    ok(db.createRdv(input({ heure: '11:00' }), 'Omar', '3', NOW));
    expect(NOTIFS.filter((n) => n.userId === '2' && n.type === 'rdv')).toHaveLength(before + 1);
  });
  it("garde l'échec d'envoi au journal sans annuler le rendez-vous", () => {
    const owner = OWNERS.find((o) => o.id === '1')!;
    const email = owner.email;
    owner.email = '';
    const r = ok(db.createRdv(input({ canal: 'email' }), 'Omar', '3', NOW));
    expect(r.envoi).toMatchObject({ statut: 'echec' });
    expect(db.getRdv(r.rdv.id)).toHaveProperty('statut', 'confirme');
    expect(SENDS).toHaveLength(1);
    owner.email = email;
    expect(ok(db.resend(r.rdv.id, 'Omar', '3', NOW))).toMatchObject({ statut: 'envoye' });
  });
  it('ne notifie pas le vétérinaire de ses propres rendez-vous', () => {
    const before = NOTIFS.filter((n) => n.userId === '2').length;
    ok(db.createRdv(input(), 'Fatou Diallo', '2', NOW));
    expect(NOTIFS.filter((n) => n.userId === '2')).toHaveLength(before);
  });
});

describe('rendez-vous : nouveau patient', () => {
  const nouveau = (telephone: string) => ({ nom: 'Bella', especeId: 'chien', raceId: null, naissance: null, sexe: 'F' as const, ownerId: null, owner: { prenom: 'Aïda', nom: 'Fall', telephone, email: '' } });
  it('crée une fiche provisoire (animal et propriétaire) à compléter', () => {
    const nb = PATIENTS.length, nbO = OWNERS.length;
    const r = ok(db.createRdv(input({ patientId: null, nouveauPatient: nouveau('77 111 22 33') }), 'Omar', '3', NOW));
    expect(PATIENTS).toHaveLength(nb + 1);
    expect(OWNERS).toHaveLength(nbO + 1);
    expect(PATIENTS.find((p) => p.id === r.rdv.patientId)).toMatchObject({ nom: 'Bella', provisoire: true });
  });
  it("n'enregistre rien si le téléphone du propriétaire manque", () => {
    const nb = PATIENTS.length, nbR = db.RDVS.length;
    expect(db.createRdv(input({ patientId: null, nouveauPatient: nouveau('') }), 'Omar', '3', NOW)).toHaveProperty('code', 'invalid');
    expect(PATIENTS).toHaveLength(nb);
    expect(db.RDVS).toHaveLength(nbR);
  });
});

describe('rendez-vous : modification et annulation', () => {
  it('modifie un rendez-vous à venir et garde la trace', () => {
    const { rdv } = ok(db.createRdv(input(), 'Omar', '3', NOW));
    const r = ok(db.updateRdv(rdv.id, input({ heure: '10:00' }), 'Omar', '3', NOW));
    expect(r.rdv.heure).toBe('10:00');
    expect(r.rdv.history[0]).toMatchObject({ action: 'modification' });
  });
  it('refuse la modification d\'un rendez-vous passé', () => {
    const { rdv } = ok(db.createRdv(input(), 'Omar', '3', NOW));
    const later = new Date('2030-10-26T09:10:00');
    expect(db.updateRdv(rdv.id, input({ date: '2030-10-27' }), 'Omar', '3', later)).toMatchObject({ code: 'in_the_past' });
  });
  it('refuse un nouveau créneau déjà pris', () => {
    ok(db.createRdv(input({ heure: '10:00' }), 'Omar', '3', NOW));
    const { rdv } = ok(db.createRdv(input({ heure: '09:00' }), 'Omar', '3', NOW));
    expect(db.updateRdv(rdv.id, input({ heure: '10:00' }), 'Omar', '3', NOW)).toMatchObject({ code: 'slot_taken' });
  });
  it('annule en gardant l\'historique et libère le créneau', () => {
    const { rdv } = ok(db.createRdv(input(), 'Omar', '3', NOW));
    const r = ok(db.cancelRdv(rdv.id, 'Omar', '3', NOW));
    expect(r.rdv.statut).toBe('annule');
    expect(r.rdv.history.map((h) => h.action)).toEqual(['annulation', 'creation']);
    expect(db.availability('2', '2030-10-26', 30, NOW)).toContain('09:00');
  });
  it('termine un rendez-vous avec la consultation', () => {
    const { rdv } = ok(db.createRdv(input(), 'Omar', '3', NOW));
    expect(ok(db.completeRdv(rdv.id, '9', 'Dr Sy', NOW))).toMatchObject({ statut: 'termine', consultationId: '9' });
    expect(db.cancelRdv(rdv.id, 'Omar', '3', NOW)).toMatchObject({ code: 'not_editable' });
  });
});
