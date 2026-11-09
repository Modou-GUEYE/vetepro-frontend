import { beforeEach, describe, expect, it } from 'vitest';
import * as db from './reportDb';
import { createSale } from './pharmacyDb';
import { addPayment, resetBilling } from './billingDb';
import { resetPharmacy } from './pharmacyDb';
import { resetConsultations } from './consultDb';
import { resetPatients } from './patientsDb';
import { resetVaccinations } from './vaccDb';
import { resetInseminations } from './inseminDb';
import { resetHospis } from './hospiDb';
import { resetRdvs } from './rdvDb';
import { resetNotifications } from './notifDb';
import { resetCabinet } from './cabinetDb';

const all = () => true;
beforeEach(() => { resetBilling(); resetPharmacy(); resetConsultations(); resetPatients(); resetVaccinations(); resetInseminations(); resetHospis(); resetRdvs(); resetNotifications(); resetCabinet(); });

describe('rapport des factures', () => {
  it('calcule facturé, encaissé et impayés sur les données de facturation', () => {
    const r = db.buildReport('factures', {});
    const k = Object.fromEntries(r.kpis.map((x) => [x.label, x.valeur]));
    expect(k['Factures']).toBe(3);
    expect(k['Facturé net']).toBe(12900 + 15000 + 14700); // 3 factures de démonstration
    expect(k['Encaissé']).toBe(12900 + 8000);
    expect(k['Soldes impayés']).toBe(k['Facturé net'] - k['Encaissé']);
    expect(r.lignes).toHaveLength(3);
  });
  it('filtre par statut, mode de paiement et période', () => {
    expect(db.buildReport('factures', { statut: 'impayee' }).lignes).toHaveLength(1);
    expect(db.buildReport('factures', { mode: 'Mobile money' }).lignes).toHaveLength(1);
    expect(db.buildReport('factures', { du: '2025-03-04', au: '2025-03-06' }).lignes).toHaveLength(1);
  });
  it('regroupe par prestation ou par patient', () => {
    expect(db.buildReport('factures', { groupe: 'prestation' }).synthese!.lignes[0].cells[0]).toBe('Consultation');
    expect(db.buildReport('factures', { groupe: 'patient' }).synthese!.colonnes[0].libelle).toBe('Patient ou client');
  });
});

describe('autres rapports', () => {
  it('ventes : chiffre d\'affaires et quantités par médicament', () => {
    expect(db.buildReport('ventes', {}).lignes).toHaveLength(0);
    const sale = createSale({ date: '2026-10-20', ownerId: null, mode: 'Espèces', notes: '', lignes: [{ articleId: '1', quantite: 2 }] }, 'x');
    expect('numero' in sale).toBe(true);
    const r = db.buildReport('ventes', { du: '2026-10-01' });
    expect(r.kpis.find((k) => k.label === 'Unités vendues')!.valeur).toBe(2);
    expect(r.synthese!.lignes).toHaveLength(1);
    expect(db.buildReport('ventes', { medicament: 'zzz' }).lignes).toHaveLength(0);
  });
  it('consultations : filtre par patient et par période', () => {
    expect(db.buildReport('consultations', {}).lignes).toHaveLength(3);
    expect(db.buildReport('consultations', { patientId: '1' }).lignes).toHaveLength(1);
    expect(db.buildReport('consultations', { du: '2025-03-06' }).lignes).toHaveLength(1);
    expect(db.buildReport('consultations', {}).kpis.find((k) => k.label === 'Urgences')!.valeur).toBe(1);
  });
  it('vaccins : compteurs par statut de rappel', () => {
    const r = db.buildReport('vaccins', {});
    expect(r.lignes).toHaveLength(4);
    expect(r.kpis.map((k) => k.valeur)).toEqual([4, 1, 1, 1]);
    expect(db.buildReport('vaccins', { statutRappel: 'en_retard' }).lignes).toHaveLength(1);
    expect(db.buildReport('vaccins', { vaccin: 'Rage' }).lignes).toHaveLength(1);
  });
  it('clients : nouveaux, actifs et panier moyen', () => {
    const r = db.buildReport('clients', { du: '2025-03-01', au: '2025-03-31' });
    expect(r.kpis.find((k) => k.label === 'Clients')!.valeur).toBe(4);
    expect(r.kpis.find((k) => k.label === 'Clients actifs (visite ou facture)')!.valeur).toBe(2);
    expect(db.buildReport('clients', { statutClient: 'inactif' }).lignes).toHaveLength(1);
  });
});

describe('rapport réglementaire', () => {
  it('ne contient que les activités choisies, avec l\'en-tête du cabinet', () => {
    const r = db.regulatoryReport({ du: '2020-01-01', au: '2035-12-31', activites: ['vaccinations', 'consultations', 'inconnue'] }, 'Dr Sy');
    expect(r.sections.map((s) => s.cle)).toEqual(['consultations', 'vaccinations']);
    expect(r.cabinet).toMatchObject({ nom: 'Clinique Vétérinaire de Dakar', ordre: 'ODVS-1142' });
    expect(r.sections[1].synthese.colonnes.map((c) => c.libelle)).toEqual(['Espèce', 'Vaccin', 'Vaccinations']);
  });
  it('synthèse par espèce des inséminations et des hospitalisations', () => {
    const r = db.regulatoryReport({ du: '2020-01-01', au: '2035-12-31', activites: ['inseminations', 'hospitalisations', 'campagnes'] }, 'x');
    const ins = r.sections.find((s) => s.cle === 'inseminations')!;
    expect(ins.synthese.lignes.map((l) => l.cells[0])).toEqual(['Bovin', 'Caprin', 'Ovin']);
    expect(r.sections.find((s) => s.cle === 'hospitalisations')!.detail.lignes).toHaveLength(1);
    expect(r.sections.find((s) => s.cle === 'campagnes')!.detail.lignes).toHaveLength(3);
  });
});

describe('tableau de bord', () => {
  it('calcule les indicateurs en temps réel', () => {
    const d = db.dashboard(all);
    expect(d.indicateurs.animaux).toBe(7);
    expect(d.indicateurs.rdv_jour).toBe(2);
    expect(d.indicateurs.creances).toBe(db.buildReport('factures', {}).kpis.find((k) => k.label === 'Soldes impayés')!.valeur);
    expect(d.rdv_jour!.map((r) => r.heure)).toEqual(['09:00', '10:30']);
    expect(d.rappels_vaccins!.length).toBe(2);
    expect(d.creances_en_cours!.length).toBeLessThanOrEqual(5);
    expect(d.activite_recente.length).toBe(5);
  });
  it('réagit à un paiement', () => {
    const avant = db.dashboard(all).indicateurs.creances!;
    addPayment('3', 1000, 'Espèces', 'x');
    expect(db.dashboard(all).indicateurs.creances).toBe(avant - 1000);
  });
  it('n\'expose que les blocs autorisés', () => {
    const d = db.dashboard((m) => m === 'rdv' || m === 'patients');
    expect(d.rdv_jour).not.toBeNull();
    expect(d.creances_en_cours).toBeNull();
    expect(d.indicateurs.creances).toBeNull();
    expect(d.alertes_pharmacie).toBeNull();
    expect(d.rappels_vaccins).toBeNull();
    expect(d.mises_bas_depassees).toBeNull();
  });
});
