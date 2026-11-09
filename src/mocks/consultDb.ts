import type { Failure } from './profilesDb';
import { INVOICES, statusOf } from './billingDb';
import { decrement, getArticle, recordTreatmentUse, articleChoices, DemoArticle } from './pharmacyDb';
import { OWNERS, PATIENTS, ownerName } from './patientsDb';
import { SERVICES } from './referentielsDb';
import { CANAL_LABEL, Canal, sendToOwner } from './notifDb';

export interface StockLine { articleId: string; nom: string; unite: string; quantite: number; prixUnitaire: number; dosage: string; posologie: string }
export interface ExternalLine { nom: string; quantite: number; dosage: string; posologie: string }
export interface DemoConsultation {
  id: string; patientId: string; date: string; serviceId: string; serviceLabel: string; servicePrice: number;
  motif: string; examen: string; diagnostic: string; stock: StockLine[]; externes: ExternalLine[]; notes: string; vetNom: string; createdAt: string;
}

const sl = (articleId: string, nom: string, unite: string, quantite: number, prixUnitaire: number, posologie: string, dosage = ''): StockLine => ({ articleId, nom, unite, quantite, prixUnitaire, dosage, posologie });

const seed = (): DemoConsultation[] => [
  { id: '1', patientId: '1', date: '2025-03-01', serviceId: '1', serviceLabel: 'Consultation générale', servicePrice: 5000, motif: 'Grattage excessif', examen: 'Poids 28 kg, température 38,7 °C', diagnostic: 'Allergie cutanée',
    stock: [sl('1', 'Méthylprednisolone 4mg', 'Comprimés', 14, 350, '1 comprimé par jour pendant 14 jours')], externes: [], notes: 'Bain 2 fois par semaine', vetNom: 'Dr Sy', createdAt: '2025-03-01T10:00:00.000Z' },
  { id: '2', patientId: '2', date: '2025-03-05', serviceId: '3', serviceLabel: 'Vaccination (acte)', servicePrice: 2500, motif: 'Rappel annuel', examen: 'Poids 4,2 kg, animal sain', diagnostic: 'Bilan sain',
    stock: [sl('6', 'Vaccin typhus félin', 'Dose', 1, 12500, 'Une dose')], externes: [], notes: 'Rappel dans 1 an', vetNom: 'Dr Sy', createdAt: '2025-03-05T11:00:00.000Z' },
  { id: '3', patientId: '4', date: '2025-03-08', serviceId: '9', serviceLabel: 'Urgence de nuit', servicePrice: 12000, motif: 'Vomissements répétés', examen: 'Température 39,8 °C, déshydraté', diagnostic: 'Gastro-entérite aiguë',
    stock: [sl('2', 'Amoxicilline vét. 250mg', 'Comprimés', 6, 200, '1 comprimé matin et soir'), sl('3', 'Métoclopramide 10mg', 'Comprimés', 10, 150, '1 comprimé par jour pendant 5 jours')],
    externes: [{ nom: 'Lactobacillus vét.', quantite: 1, dosage: '1 g', posologie: '2 fois par jour pendant 7 jours' }], notes: 'Diète 24 h', vetNom: 'Dr Sy', createdAt: '2025-03-08T22:00:00.000Z' },
];

export let CONSULTATIONS: DemoConsultation[] = seed();
export const resetConsultations = () => { CONSULTATIONS = seed(); };

const notFound: Failure = { status: 404, code: 'not_found', message: 'Consultation introuvable' };
export const getConsultation = (id: string): DemoConsultation | Failure => CONSULTATIONS.find((c) => c.id === id) ?? notFound;
export const invoiceOf = (c: DemoConsultation) => INVOICES.find((i) => i.consultationId === c.id && statusOf(i) !== 'annulee');

export interface ConsultationInput {
  patientId: string; date: string; serviceId: string; motif: string; examen: string; diagnostic: string;
  stock: { articleId: string; quantite: number; dosage: string; posologie: string }[];
  externes: ExternalLine[]; notes: string;
}

const dmy = (iso: string) => iso.split('-').reverse().join('/');

/**
 * Enregistrement d'une consultation. Les médicaments en stock sont retirés du stock en tout ou rien :
 * si l'un d'eux manque, aucune sortie n'est faite (cas d'erreur de la spécification : stock insuffisant, médicament non référencé).
 */
export function createConsultation(input: ConsultationInput, by: string, now = new Date()): DemoConsultation | Failure {
  const patient = PATIENTS.find((p) => p.id === input.patientId);
  if (!patient) return { status: 422, code: 'invalid', message: 'Choisissez un dossier patient' };
  const service = SERVICES.find((s) => s.id === input.serviceId && !s.deleted);
  if (!service) return { status: 422, code: 'invalid', message: 'Choisissez le type de service' };
  if (!service.actif) return { status: 422, code: 'service_inactive', message: "Ce service n'est plus disponible" };
  if (!input.date) return { status: 422, code: 'invalid', message: 'La date est obligatoire' };
  if (input.date > now.toISOString().slice(0, 10)) return { status: 422, code: 'invalid', message: 'La date ne peut pas être dans le futur' };

  const wanted = new Map<string, number>();
  for (const l of input.stock) {
    if (!Number.isInteger(l.quantite) || l.quantite < 1) return { status: 422, code: 'invalid', message: 'La quantité doit être un nombre entier positif' };
    wanted.set(l.articleId, (wanted.get(l.articleId) ?? 0) + l.quantite);
  }
  for (const [id, q] of wanted) {
    const a = getArticle(id);
    if ('status' in a || !a.actif) return { status: 404, code: 'not_found', message: 'Médicament non référencé ou désactivé' };
    if (a.quantite <= 0) return { status: 409, code: 'out_of_stock', message: `Article épuisé : ${a.nom}` };
    if (q > a.quantite) return { status: 409, code: 'insufficient_stock', message: `Stock insuffisant pour ${a.nom} : ${a.quantite} disponible(s)` };
  }
  for (const e of input.externes) {
    if (!e.nom.trim()) return { status: 422, code: 'invalid', message: 'Le nom du médicament externe est obligatoire' };
    if (!Number.isInteger(e.quantite) || e.quantite < 1) return { status: 422, code: 'invalid', message: 'La quantité doit être un nombre entier positif' };
  }

  const id = String(Math.max(0, ...CONSULTATIONS.map((c) => Number(c.id))) + 1);
  const stock: StockLine[] = input.stock.map((l) => {
    const a = getArticle(l.articleId) as DemoArticle;
    return { articleId: a.id, nom: a.nom, unite: a.unite, quantite: l.quantite, prixUnitaire: a.prix, dosage: l.dosage.trim(), posologie: l.posologie.trim() };
  });
  for (const [aid, q] of wanted) { decrement(aid, q, 'consultation', by, `Consultation du ${dmy(input.date)}`, now); recordTreatmentUse(aid, input.date); }

  const c: DemoConsultation = {
    id, patientId: input.patientId, date: input.date, serviceId: service.id, serviceLabel: service.libelle, servicePrice: service.prix,
    motif: input.motif.trim(), examen: input.examen.trim(), diagnostic: input.diagnostic.trim(), stock,
    externes: input.externes.map((e) => ({ ...e, nom: e.nom.trim(), dosage: e.dosage.trim(), posologie: e.posologie.trim() })), notes: input.notes.trim(), vetNom: by, createdAt: now.toISOString(),
  };
  CONSULTATIONS.push(c);
  return c;
}

export function listConsultations(p: { q?: string; patientId?: string; date?: string; withPrescription?: boolean; page: number; pageSize: number }) {
  const q = (p.q ?? '').trim().toLowerCase();
  const rows = CONSULTATIONS
    .filter((c) => !p.patientId || c.patientId === p.patientId)
    .filter((c) => !p.date || c.date === p.date)
    .filter((c) => !p.withPrescription || c.stock.length + c.externes.length > 0)
    .filter((c) => {
      if (!q) return true;
      const pat = PATIENTS.find((x) => x.id === c.patientId);
      const owner = OWNERS.find((o) => o.id === pat?.ownerId);
      return `${pat?.nom ?? ''} ${owner ? ownerName(owner) : ''} ${c.motif} ${c.diagnostic} ${c.serviceLabel}`.toLowerCase().includes(q);
    })
    .sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));
  const start = (p.page - 1) * p.pageSize;
  return { items: rows.slice(start, start + p.pageSize), total: rows.length };
}

/** Lignes proposées à la facturation : le service, puis les médicaments en stock ; prix modifiables à l'écran. Les médicaments externes ne sont pas facturés. */
export const proposedInvoiceLines = (c: DemoConsultation) => [
  { description: c.serviceLabel, quantite: 1, prixUnitaire: c.servicePrice },
  ...c.stock.map((l) => ({ description: l.nom, quantite: l.quantite, prixUnitaire: l.prixUnitaire })),
];

export const ordonnanceNumber = (c: DemoConsultation) => `ORD-${String(c.id).padStart(4, '0')}`;

/** Envoi de l'ordonnance au propriétaire par e-mail, SMS ou WhatsApp. L'envoi est gardé au journal, réussi ou non. */
export function sendPrescription(c: DemoConsultation, canal: Canal = 'email'): { to: string; canal: Canal } | Failure {
  const pat = PATIENTS.find((x) => x.id === c.patientId);
  const owner = OWNERS.find((o) => o.id === pat?.ownerId);
  if (!owner) return { status: 422, code: 'no_owner', message: 'Ce dossier patient n\'a pas de propriétaire' };
  const log = sendToOwner(owner, canal, `Ordonnance ${ordonnanceNumber(c)} pour ${pat?.nom ?? ''}`, `ordonnance:${c.id}`);
  return log.statut === 'envoye' ? { to: log.destinataire, canal } : { status: 422, code: canal === 'email' ? 'no_email' : 'no_phone', message: `Envoi par ${CANAL_LABEL[canal]} impossible : ${log.erreur}` };
}

export const serviceChoices = () => SERVICES.filter((s) => !s.deleted && s.actif).sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));
export { articleChoices };
