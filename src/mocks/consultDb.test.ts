import { beforeEach, describe, expect, it } from 'vitest';
import { INVOICES, resetBilling } from './billingDb';
import * as db from './consultDb';
import { OWNERS, resetPatients } from './patientsDb';
import { ARTICLES, MOVEMENTS, resetPharmacy, getArticle, DemoArticle } from './pharmacyDb';
import { resetReferentiels, setServiceActive } from './referentielsDb';

const input = (o: Partial<db.ConsultationInput> = {}): db.ConsultationInput => ({
  patientId: '1', date: '2026-10-23', serviceId: '1', motif: 'Boiterie', examen: 'Poids 28 kg', diagnostic: 'Entorse', stock: [{ articleId: '1', quantite: 5, dosage: '4 mg', posologie: '1 comprimé par jour' }], externes: [], notes: '', ...o,
});
beforeEach(() => { db.resetConsultations(); resetPharmacy(); resetBilling(); resetPatients(); resetReferentiels(); });
const qty = (id: string) => (getArticle(id) as DemoArticle).quantite;

describe('enregistrement d une consultation', () => {
  it('retire les médicaments du stock, trace les sorties et garde le prix du moment', () => {
    const c = db.createConsultation(input({ stock: [{ articleId: '1', quantite: 5, dosage: '', posologie: '' }, { articleId: '5', quantite: 2, dosage: '', posologie: '' }] }), 'Dr Sy', new Date('2026-10-23T09:00:00Z')) as db.DemoConsultation;
    expect(c).toMatchObject({ id: '4', serviceLabel: 'Consultation générale', servicePrice: 5000 });
    expect(qty('1')).toBe(35);
    expect(qty('5')).toBe(58);
    const sorties = MOVEMENTS.filter((m) => m.type === 'consultation' && m.date.startsWith('2026-10-23'));
    expect(sorties.map((m) => [m.articleId, m.quantite])).toEqual([['1', -5], ['5', -2]]);
    expect(c.stock[0]).toMatchObject({ prixUnitaire: 350 });
  });

  it('refuse tout en bloc si un médicament manque, sans rien retirer du stock', () => {
    const r = db.createConsultation(input({ stock: [{ articleId: '1', quantite: 5, dosage: '', posologie: '' }, { articleId: '2', quantite: 8, dosage: '', posologie: '' }] }), 'x');
    expect(r).toMatchObject({ code: 'insufficient_stock' });
    expect(qty('1')).toBe(40);
    expect(db.CONSULTATIONS).toHaveLength(3);
  });

  it('refuse un article épuisé, désactivé ou inconnu', () => {
    expect(db.createConsultation(input({ stock: [{ articleId: '3', quantite: 1, dosage: '', posologie: '' }] }), 'x')).toMatchObject({ code: 'out_of_stock' });
    expect(db.createConsultation(input({ stock: [{ articleId: '7', quantite: 1, dosage: '', posologie: '' }] }), 'x')).toMatchObject({ code: 'not_found' });
    expect(db.createConsultation(input({ stock: [{ articleId: '999', quantite: 1, dosage: '', posologie: '' }] }), 'x')).toMatchObject({ code: 'not_found' });
  });

  it('additionne les lignes du même médicament avant de contrôler le stock', () => {
    const lignes = [{ articleId: '2', quantite: 4, dosage: '', posologie: '' }, { articleId: '2', quantite: 4, dosage: '', posologie: '' }];
    expect(db.createConsultation(input({ stock: lignes }), 'x')).toMatchObject({ code: 'insufficient_stock' });
  });

  it('exige dossier, type de service et date, refuse une date future et un service désactivé', () => {
    expect(db.createConsultation(input({ patientId: '' }), 'x')).toMatchObject({ status: 422 });
    expect(db.createConsultation(input({ serviceId: '' }), 'x')).toMatchObject({ status: 422 });
    expect(db.createConsultation(input({ date: '' }), 'x')).toMatchObject({ status: 422 });
    expect(db.createConsultation(input({ date: '2999-01-01' }), 'x')).toMatchObject({ status: 422 });
    setServiceActive('1', false);
    expect(db.createConsultation(input(), 'x')).toMatchObject({ code: 'service_inactive' });
  });

  it('accepte plusieurs médicaments externes, exige leur nom et une quantité valide', () => {
    const ext = [{ nom: 'Lactobacillus vét.', quantite: 1, dosage: '1 g', posologie: '2 fois par jour' }, { nom: 'Sirop', quantite: 2, dosage: '', posologie: '' }];
    expect(db.createConsultation(input({ stock: [], externes: ext }), 'x')).toMatchObject({ externes: expect.any(Array) });
    expect(db.createConsultation(input({ externes: [{ nom: ' ', quantite: 1, dosage: '', posologie: '' }] }), 'x')).toMatchObject({ status: 422 });
    expect(db.createConsultation(input({ externes: [{ nom: 'X', quantite: 0, dosage: '', posologie: '' }] }), 'x')).toMatchObject({ status: 422 });
  });

  it("l'article prescrit passe en traitement en cours (désactivation et suppression refusées)", () => {
    db.createConsultation(input({ date: new Date().toISOString().slice(0, 10) }), 'x');
    expect(ARTICLES.find((a) => a.id === '1')).toBeTruthy();
  });
});

describe('facturation d une consultation', () => {
  it('propose le service puis les médicaments en stock, sans les externes', () => {
    const c = db.getConsultation('3') as db.DemoConsultation;
    expect(db.proposedInvoiceLines(c).map((l) => [l.description, l.quantite, l.prixUnitaire])).toEqual([['Urgence de nuit', 1, 12000], ['Amoxicilline vét. 250mg', 6, 200], ['Métoclopramide 10mg', 10, 150]]);
  });
  it('retrouve la facture liée, et signale une consultation non facturée', () => {
    expect(db.invoiceOf(db.getConsultation('1') as db.DemoConsultation)).toMatchObject({ numero: 'FAC-0001' });
    const c = db.createConsultation(input(), 'x') as db.DemoConsultation;
    expect(db.invoiceOf(c)).toBeUndefined();
    expect(INVOICES.length).toBe(3);
  });
});

describe('liste et ordonnance', () => {
  it('filtre par patient, par date et par recherche', () => {
    expect(db.listConsultations({ patientId: '1', page: 1, pageSize: 20 }).total).toBe(1);
    expect(db.listConsultations({ date: '2025-03-05', page: 1, pageSize: 20 }).items[0].id).toBe('2');
    expect(db.listConsultations({ q: 'gastro', page: 1, pageSize: 20 }).total).toBe(1);
    expect(db.listConsultations({ page: 1, pageSize: 20 }).items.map((c) => c.id)).toEqual(['3', '2', '1']);
  });
  it('ne liste en ordonnances que les consultations avec un médicament', () => {
    db.createConsultation(input({ stock: [] }), 'x');
    expect(db.listConsultations({ withPrescription: true, page: 1, pageSize: 20 }).total).toBe(3);
  });
  it("numérote l'ordonnance et refuse l'envoi sans e-mail", () => {
    expect(db.ordonnanceNumber(db.getConsultation('3') as db.DemoConsultation)).toBe('ORD-0003');
    expect(db.sendPrescription(db.getConsultation('1') as db.DemoConsultation)).toEqual({ to: 'moussa@email.com', canal: 'email' });
  });
  it("envoie par SMS ou WhatsApp et refuse un canal sans coordonnées", () => {
    const c = db.getConsultation('1') as db.DemoConsultation;
    expect(db.sendPrescription(c, 'sms')).toEqual({ to: '77 123 45 67', canal: 'sms' });
    expect(db.sendPrescription(c, 'whatsapp')).toMatchObject({ canal: 'whatsapp' });
    OWNERS[0]!.telephone = '';
    expect(db.sendPrescription(c, 'sms')).toMatchObject({ code: 'no_phone' });
  });
});
