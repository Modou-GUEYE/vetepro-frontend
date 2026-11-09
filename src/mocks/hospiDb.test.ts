import { beforeEach, describe, expect, it } from 'vitest';
import * as db from './hospiDb';
import { ARTICLES, MOVEMENTS, resetPharmacy } from './pharmacyDb';
import { INVOICES, remaining, resetBilling, total } from './billingDb';
import { PATIENTS, resetPatients } from './patientsDb';
import { resetNotifications } from './notifDb';

const NOW = new Date('2026-10-23T10:00:00');
const admission = (o: Partial<db.AdmissionInput> = {}): db.AdmissionInput => ({
  patientId: '1', nouveauPatient: null, vetId: '2', box: 'Box 2', dateEntree: '2026-10-20', dateSortiePrevue: '2026-10-24', tarifJour: 5000, tarifConsultation: 3000, motif: 'Post-opératoire', observations: '', ...o,
});
type Fail = { code: string; status: number; message: string };
function ok<T>(r: T): Exclude<T, Fail> {
  if (typeof r === 'object' && r && 'code' in r && 'status' in r) throw new Error((r as unknown as Fail).message);
  return r as Exclude<T, Fail>;
}
beforeEach(() => { db.resetHospis(); resetPharmacy(); resetBilling(); resetPatients(); resetNotifications(); });

describe('hospitalisation : admission', () => {
  it('numérote et refuse un patient déjà hospitalisé', () => {
    const h = ok(db.admit(admission(), 'Dr Sy', NOW));
    expect(h.numero).toBe('HOS-0002');
    expect(db.admit(admission(), 'Dr Sy', NOW)).toMatchObject({ code: 'already_hospitalized', status: 409 });
  });
  it('exige box, motif, tarif et une sortie prévue cohérente', () => {
    expect(db.admit(admission({ box: ' ' }), 'x', NOW)).toHaveProperty('code', 'invalid');
    expect(db.admit(admission({ motif: '' }), 'x', NOW)).toHaveProperty('code', 'invalid');
    expect(db.admit(admission({ tarifJour: Number.NaN }), 'x', NOW)).toHaveProperty('code', 'invalid');
    expect(db.admit(admission({ dateSortiePrevue: '2026-10-19' }), 'x', NOW)).toHaveProperty('code', 'invalid');
  });
  it('admet un animal inconnu avec une fiche provisoire', () => {
    const nb = PATIENTS.length;
    const h = ok(db.admit(admission({ patientId: null, nouveauPatient: { nom: 'Rocky', especeId: 'chien', raceId: null, naissance: null, sexe: 'M', ownerId: null, owner: { prenom: 'Awa', nom: 'Sow', telephone: '77 555 66 77', email: '' } } }), 'x', NOW));
    expect(PATIENTS).toHaveLength(nb + 1);
    expect(PATIENTS.find((p) => p.id === h.patientId)?.provisoire).toBe(true);
  });
});

describe('hospitalisation : durée et total', () => {
  it('calcule 3 jours, le tarif, la consultation initiale et les soins', () => {
    const h = ok(db.admit(admission({ dateEntree: '2026-10-20' }), 'x', NOW));
    expect(db.daysBetween(h.dateEntree, '2026-10-23')).toBe(3);
    expect(db.stayTotal(h, NOW)).toBe(3 * 5000 + 3000);
    ok(db.prescribe(h.id, { date: '2026-10-21', heure: '08:00', vetId: '2', observations: '', lignes: [{ acte: 'Perfusion', type: 'soin', articleId: null, quantite: 1, prixUnitaire: 4000 }, { acte: 'Antibiotique', type: 'medicament', articleId: '2', quantite: 4, prixUnitaire: 0 }] }, 'x', NOW));
    expect(db.stayTotal(h, NOW)).toBe(18000 + 4000 + 4 * 200);
  });
  it('compte au moins un jour', () => {
    expect(db.daysBetween('2026-10-23', '2026-10-23')).toBe(1);
  });
});

describe('hospitalisation : prescriptions et stock', () => {
  it('prend le prix de l\'article et diminue le stock', () => {
    const before = ARTICLES.find((a) => a.id === '2')!.quantite;
    const h = ok(db.admit(admission(), 'x', NOW));
    ok(db.prescribe(h.id, { date: '2026-10-22', heure: '08:00', vetId: null, observations: '', lignes: [{ acte: '', type: 'medicament', articleId: '2', quantite: 3, prixUnitaire: 1 }] }, 'Dr Sy', NOW));
    expect(h.prescriptions[0]!.lignes[0]!.prixUnitaire).toBe(200);
    expect(ARTICLES.find((a) => a.id === '2')!.quantite).toBe(before - 3);
    expect(MOVEMENTS[MOVEMENTS.length - 1]).toMatchObject({ type: 'hospitalisation', reference: h.numero });
  });
  it('refuse tout en cas de stock insuffisant (tout ou rien)', () => {
    const h = ok(db.admit(admission(), 'x', NOW));
    const q = ARTICLES.find((a) => a.id === '2')!.quantite;
    const r = db.prescribe(h.id, { date: '2026-10-22', heure: '08:00', vetId: null, observations: '', lignes: [{ acte: 'Soin', type: 'soin', articleId: null, quantite: 1, prixUnitaire: 1000 }, { acte: '', type: 'medicament', articleId: '2', quantite: q + 1, prixUnitaire: 0 }] }, 'x', NOW);
    expect(r).toHaveProperty('code', 'insufficient_stock');
    expect(h.prescriptions).toHaveLength(0);
    expect(ARTICLES.find((a) => a.id === '2')!.quantite).toBe(q);
  });
  it('refuse une date avant l\'entrée et une ligne sans prix', () => {
    const h = ok(db.admit(admission(), 'x', NOW));
    expect(db.prescribe(h.id, { date: '2026-10-19', heure: '08:00', vetId: null, observations: '', lignes: [{ acte: 'Soin', type: 'soin', articleId: null, quantite: 1, prixUnitaire: 10 }] }, 'x', NOW)).toHaveProperty('code', 'invalid');
    expect(db.prescribe(h.id, { date: '2026-10-22', heure: '08:00', vetId: null, observations: '', lignes: [{ acte: 'Soin', type: 'soin', articleId: null, quantite: 1, prixUnitaire: Number.NaN }] }, 'x', NOW)).toHaveProperty('code', 'unpriced');
  });
});

describe('hospitalisation : sortie', () => {
  it('génère la facture complète, enregistre le paiement et archive', () => {
    const h = ok(db.admit(admission({ dateEntree: '2026-10-20' }), 'x', NOW));
    ok(db.prescribe(h.id, { date: '2026-10-21', heure: '08:00', vetId: '2', observations: '', lignes: [{ acte: 'Perfusion', type: 'soin', articleId: null, quantite: 1, prixUnitaire: 4000 }, { acte: '', type: 'medicament', articleId: '2', quantite: 5, prixUnitaire: 0 }] }, 'x', NOW));
    const r = ok(db.discharge(h.id, { dateSortie: '2026-10-23', etat: 'gueri', compteRendu: 'RAS', lignes: [{ description: 'Collerette', quantite: 1, prixUnitaire: 2000 }], remisePct: 10, mode: 'Espèces', montantRecu: 10000 }, 'x', NOW));
    const brut = 3000 + 3 * 5000 + 4000 + 5 * 200 + 2000;
    expect(total(r.facture)).toBe(Math.round(brut * 0.9));
    expect(remaining(r.facture)).toBe(Math.round(brut * 0.9) - 10000);
    expect(r.facture.source).toBe('hospitalisation');
    expect(r.hospi).toMatchObject({ statut: 'sorti', sortie: { etat: 'gueri', factureId: r.facture.id } });
    expect(db.listHospis({ statut: 'encours' }).some((x) => x.id === h.id)).toBe(false);
    expect(db.listHospis({ statut: 'sorti' }).some((x) => x.id === h.id)).toBe(true);
    expect(INVOICES.some((i) => i.id === r.facture.id)).toBe(true);
  });
  it('refuse une date de sortie avant l\'entrée, un état manquant et une seconde sortie', () => {
    const h = ok(db.admit(admission(), 'x', NOW));
    const base = { dateSortie: '2026-10-23', etat: 'stable', compteRendu: '', lignes: [], remisePct: 0, mode: 'Espèces', montantRecu: 0 };
    expect(db.discharge(h.id, { ...base, dateSortie: '2026-10-10' }, 'x', NOW)).toHaveProperty('code', 'invalid');
    expect(db.discharge(h.id, { ...base, etat: '' }, 'x', NOW)).toHaveProperty('code', 'invalid');
    ok(db.discharge(h.id, base, 'x', NOW));
    expect(db.discharge(h.id, base, 'x', NOW)).toHaveProperty('code', 'not_editable');
  });
  it('libère le patient pour une nouvelle admission', () => {
    const h = ok(db.admit(admission(), 'x', NOW));
    ok(db.discharge(h.id, { dateSortie: '2026-10-23', etat: 'stable', compteRendu: '', lignes: [], remisePct: 0, mode: 'Espèces', montantRecu: 0 }, 'x', NOW));
    expect(db.admit(admission({ dateEntree: '2026-10-23' }), 'x', NOW)).toHaveProperty('numero');
  });
});
