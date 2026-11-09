import { z } from 'zod';
import { PAYMENT_MODES } from '@/modules/facturation/models/facture';
import { NewPatientForm, emptyNewPatient, validateNewPatient } from '@/modules/patients/models/newPatient';

export const EXIT_STATES = ['gueri', 'ameliore', 'stable', 'transfere', 'decede'] as const;
export type ExitState = (typeof EXIT_STATES)[number];
export const EXIT_LABEL: Record<ExitState, string> = { gueri: 'Guéri, rétabli', ameliore: 'Amélioré', stable: 'Stable', transfere: 'Transféré', decede: 'Décédé' };
export const CARE_TYPES = ['soin', 'medicament', 'examen'] as const;
export type CareType = (typeof CARE_TYPES)[number];
export const CARE_LABEL: Record<CareType, string> = { soin: 'Soin', medicament: 'Médicament', examen: 'Examen' };

const ref = z.object({ id: z.string(), nom: z.string() });
const summarySchema = z.object({
  id: z.string(), numero: z.string(), statut: z.enum(['encours', 'sorti']), motif: z.string(), box: z.string(), date_entree: z.string(), date_sortie_prevue: z.string().nullable(),
  duree: z.number(), total: z.number(), en_retard: z.boolean(), veterinaire: ref.nullable(),
  patient: z.object({ id: z.string(), nom: z.string(), espece: z.string(), provisoire: z.boolean() }).nullable(),
  proprietaire: ref.extend({ telephone: z.string(), email: z.string() }).nullable(),
  sortie: z.object({ date: z.string(), etat: z.enum(EXIT_STATES), facture: z.object({ id: z.string(), numero: z.string() }).nullable() }).nullable(),
});
const statsSchema = z.object({ en_cours: z.number(), sorties: z.number(), soins_aujourdhui: z.number(), ca_hospitalisation: z.number() });
export const hospiListDtoSchema = z.object({ items: z.array(summarySchema), total: z.number(), stats: statsSchema });
export const hospiDetailDtoSchema = summarySchema.extend({
  observations: z.string(), tarif_jour: z.number(), tarif_consultation: z.number(), total_soins: z.number(), compte_rendu: z.string(),
  prescriptions: z.array(z.object({
    id: z.string(), date: z.string(), heure: z.string(), veterinaire: z.string(), observations: z.string(),
    lignes: z.array(z.object({ acte: z.string(), type: z.enum(CARE_TYPES), article_id: z.string().nullable(), nom: z.string(), quantite: z.number(), prix_unitaire: z.number() })),
  })),
  facture: z.object({ id: z.string(), numero: z.string() }).optional(),
});
export const exitPreviewDtoSchema = z.object({ jours: z.number(), lignes: z.array(z.object({ description: z.string(), quantite: z.number(), prix_unitaire: z.number() })) });

export type HospiRow = z.infer<typeof summarySchema>;
export type HospiDetail = z.infer<typeof hospiDetailDtoSchema>;
export type HospiStats = z.infer<typeof statsSchema>;
export type ExitPreview = z.infer<typeof exitPreviewDtoSchema>;

const int = (label: string) => z.string().trim().regex(/^\d+$/, `${label} : nombre entier`);
const qty = z.string().trim().regex(/^\d+$/, 'Nombre entier').refine((v) => Number(v) >= 1, 'Au moins 1');
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- Admission et modification ---------- */

export const admissionFormSchema = z.object({
  mode: z.enum(['existant', 'nouveau']), patientId: z.string(), np: z.custom<NewPatientForm>(),
  vetId: z.string(), box: z.string().trim().min(1, 'Le box ou la cage est obligatoire'),
  dateEntree: z.string().min(1, "La date d'entrée est obligatoire"), dateSortiePrevue: z.string(),
  tarifJour: int("Le tarif d'hébergement"), tarifConsultation: int('Le tarif de la consultation initiale'),
  motif: z.string().trim().min(1, "Le motif d'hospitalisation est obligatoire"), observations: z.string(),
}).superRefine((v, ctx) => {
  if (v.mode === 'existant' && !v.patientId) ctx.addIssue({ code: 'custom', path: ['patientId'], message: 'Choisissez un patient' });
  if (v.mode === 'nouveau') validateNewPatient(v.np, ctx);
  if (v.dateEntree > today()) ctx.addIssue({ code: 'custom', path: ['dateEntree'], message: "La date d'entrée ne peut pas être dans le futur" });
  if (v.dateSortiePrevue && v.dateEntree && v.dateSortiePrevue < v.dateEntree) ctx.addIssue({ code: 'custom', path: ['dateSortiePrevue'], message: "La sortie prévue ne peut pas précéder l'entrée" });
});
export type AdmissionForm = z.infer<typeof admissionFormSchema>;
export const emptyAdmission = (o: Partial<AdmissionForm> = {}): AdmissionForm => ({
  mode: 'existant', patientId: '', np: emptyNewPatient(), vetId: '', box: '', dateEntree: today(), dateSortiePrevue: '', tarifJour: '5000', tarifConsultation: '0', motif: '', observations: '', ...o,
});
export const admissionFromDetail = (h: HospiDetail): AdmissionForm => emptyAdmission({
  patientId: h.patient?.id ?? '', vetId: h.veterinaire?.id ?? '', box: h.box, dateEntree: h.date_entree, dateSortiePrevue: h.date_sortie_prevue ?? '',
  tarifJour: String(h.tarif_jour), tarifConsultation: String(h.tarif_consultation), motif: h.motif, observations: h.observations,
});

/* ---------- Prescription ---------- */

export const prescriptionFormSchema = z.object({
  date: z.string().min(1, 'La date est obligatoire'), heure: z.string().min(1, "L'heure est obligatoire"), vetId: z.string(), observations: z.string(),
  lignes: z.array(z.object({
    acte: z.string(), type: z.enum(CARE_TYPES), articleId: z.string(), quantite: qty, prixUnitaire: z.string().trim().regex(/^\d*$/, 'Nombre entier'),
  })).min(1, 'Ajoutez au moins une ligne'),
}).superRefine((v, ctx) => {
  if (v.date > today()) ctx.addIssue({ code: 'custom', path: ['date'], message: 'La date ne peut pas être dans le futur' });
  v.lignes.forEach((l, i) => {
    if (l.type === 'medicament' && !l.articleId) ctx.addIssue({ code: 'custom', path: ['lignes', i, 'articleId'], message: 'Choisissez un médicament' });
    if (l.type !== 'medicament' && !l.acte.trim()) ctx.addIssue({ code: 'custom', path: ['lignes', i, 'acte'], message: "L'acte est obligatoire" });
    if (l.type !== 'medicament' && l.prixUnitaire === '') ctx.addIssue({ code: 'custom', path: ['lignes', i, 'prixUnitaire'], message: 'Prix obligatoire' });
  });
});
export type PrescriptionForm = z.infer<typeof prescriptionFormSchema>;
export const emptyLine = (): PrescriptionForm['lignes'][number] => ({ acte: '', type: 'soin', articleId: '', quantite: '1', prixUnitaire: '' });
export const emptyPrescription = (): PrescriptionForm => ({ date: today(), heure: new Date().toTimeString().slice(0, 5), vetId: '', observations: '', lignes: [emptyLine()] });

/** Total d'une prescription : le prix d'un médicament vient de l'article choisi, pas de la saisie. */
export const prescriptionTotal = (lignes: PrescriptionForm['lignes'], priceOf: (articleId: string) => number) =>
  lignes.reduce((n, l) => n + (Number(l.quantite) || 0) * (l.type === 'medicament' ? priceOf(l.articleId) : Number(l.prixUnitaire) || 0), 0);

/* ---------- Sortie ---------- */

export const exitFormSchema = z.object({
  dateSortie: z.string().min(1, 'La date de sortie est obligatoire'), etat: z.enum(EXIT_STATES, { errorMap: () => ({ message: "L'état à la sortie est obligatoire" }) }),
  compteRendu: z.string(),
  lignes: z.array(z.object({ description: z.string().trim().min(1, 'Description obligatoire'), quantite: qty, prixUnitaire: int('Prix') })),
  remisePct: z.string().trim().refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) <= 100), 'Remise entre 0 et 100'),
  mode: z.enum(PAYMENT_MODES), montantRecu: z.string().trim().refine((v) => v === '' || /^\d+$/.test(v), 'Montant : nombre entier'),
});
export type ExitForm = z.infer<typeof exitFormSchema>;
export const emptyExit = (h?: Pick<HospiDetail, 'date_entree'>): ExitForm => ({
  dateSortie: today() < (h?.date_entree ?? '') ? (h?.date_entree ?? today()) : today(), etat: 'gueri', compteRendu: '', lignes: [], remisePct: '0', mode: 'Espèces', montantRecu: '',
});

export function exitTotals(auto: { quantite: number; prix_unitaire: number }[], extra: { quantite: string; prixUnitaire: string }[], remisePct: number, montantRecu: number) {
  const sous = auto.reduce((n, l) => n + l.quantite * l.prix_unitaire, 0) + extra.reduce((n, l) => n + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0), 0);
  const total = Math.round(sous * (1 - Math.min(100, Math.max(0, remisePct)) / 100));
  const recu = Math.min(Math.max(0, montantRecu), total);
  return { sous, total, recu, reste: total - recu };
}
