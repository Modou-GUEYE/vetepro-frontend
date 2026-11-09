import { z } from 'zod';

export const VACCINS = ['Rage', 'Parvovirose', 'Maladie de Carré', 'Hépatite de Rubarth', 'Leptospirose', 'Toux du chenil', 'Leucose féline', 'Typhus félin', 'Autre'] as const;

export const RAPPEL_STATUTS = ['a_jour', 'bientot', 'en_retard', 'non_defini'] as const;
export type RappelStatut = (typeof RAPPEL_STATUTS)[number];
export const RAPPEL_LABEL: Record<RappelStatut, string> = { a_jour: 'À jour', bientot: 'Bientôt', en_retard: 'En retard', non_defini: '—' };
export const RAPPEL_TONE = { a_jour: 'green', bientot: 'amber', en_retard: 'red', non_defini: 'slate' } as const;

const ref = z.object({ id: z.string(), nom: z.string() });
export const vaccinationDtoSchema = z.object({
  id: z.string(), vaccin: z.string(), date: z.string(), rappel: z.string().nullable(), statut: z.enum(RAPPEL_STATUTS), lot: z.string(), notes: z.string(),
  tarif: z.number(), numero: z.string().nullable(), facture_id: z.string().nullable(),
  patient: ref.extend({ espece: z.string() }).nullable(), proprietaire: ref.extend({ telephone: z.string(), adresse: z.string() }).nullable(),
});
export const vaccinationDocumentDtoSchema = vaccinationDtoSchema.extend({
  animal: z.object({ nom: z.string(), espece: z.string(), race: z.string(), sexe: z.enum(['M', 'F']).nullable(), puce: z.string() }).nullable(),
});
export const vaccinationListDtoSchema = z.object({
  items: z.array(vaccinationDtoSchema), total: z.number(),
  stats: z.object({ total: z.number(), a_jour: z.number(), bientot: z.number(), en_retard: z.number() }),
});
export const carnetDtoSchema = z.object({ items: z.array(vaccinationDtoSchema), total: z.number() });

export const CAMPAGNE_STATUTS = ['planifiee', 'encours', 'terminee'] as const;
export type CampagneStatut = (typeof CAMPAGNE_STATUTS)[number];
export const CAMPAGNE_LABEL: Record<CampagneStatut, string> = { planifiee: 'Planifiée', encours: 'En cours', terminee: 'Terminée' };
export const CAMPAGNE_TONE = { planifiee: 'amber', encours: 'green', terminee: 'slate' } as const;

export const campagneDtoSchema = z.object({
  id: z.string(), nom: z.string(), espece: ref, vaccin: z.string(), zone: z.string(), date: z.string(), vises: z.number().nullable(), vaccines: z.number(), progression: z.number(),
  statut: z.enum(CAMPAGNE_STATUTS), animaux: z.array(z.object({ id: z.string(), animal: z.string(), proprietaire: z.string(), vaccin: z.string(), date: z.string() })),
});
export const campagnesDtoSchema = z.object({ items: z.array(campagneDtoSchema), total: z.number() });

export type VaccinationRow = z.infer<typeof vaccinationDtoSchema>;
export type VaccinationDocument = z.infer<typeof vaccinationDocumentDtoSchema>;
export type VaccinationStats = z.infer<typeof vaccinationListDtoSchema>['stats'];
export type Campagne = z.infer<typeof campagneDtoSchema>;

const today = () => new Date().toISOString().slice(0, 10);

/* ---------- Vaccination ---------- */

export const vaccinationFormSchema = z.object({
  patientId: z.string().min(1, 'Animal et date requis'),
  vaccin: z.enum(VACCINS, { errorMap: () => ({ message: 'Choisissez un vaccin' }) }),
  date: z.string().min(1, 'Animal et date requis'),
  rappel: z.string(), lot: z.string(), notes: z.string(),
  tarif: z.string().trim().regex(/^\d*$/, 'Tarif : nombre entier'),
}).superRefine((v, ctx) => {
  if (v.date > today()) ctx.addIssue({ code: 'custom', path: ['date'], message: 'La date ne peut pas être dans le futur' });
  if (v.rappel && v.date && v.rappel < v.date) ctx.addIssue({ code: 'custom', path: ['rappel'], message: 'Le rappel ne peut pas précéder la vaccination' });
});
export type VaccinationForm = z.infer<typeof vaccinationFormSchema>;
export const emptyVaccination = (o: Partial<VaccinationForm> = {}): VaccinationForm => ({ patientId: '', vaccin: 'Rage', date: today(), rappel: '', lot: '', notes: '', tarif: '0', ...o });

/** « Facturer » : le montant doit être strictement supérieur à 0. */
export const billFormSchema = z.object({ tarif: z.string().trim().regex(/^\d+$/, 'Montant invalide').refine((v) => Number(v) > 0, 'Montant invalide') });
export type BillForm = z.infer<typeof billFormSchema>;

/* ---------- Campagne ---------- */

export const campagneFormSchema = z.object({
  nom: z.string().trim().min(1, 'Nom et zone requis'), zone: z.string().trim().min(1, 'Nom et zone requis'),
  especeId: z.string().min(1, "Choisissez l'espèce cible"), vaccin: z.string(), date: z.string(),
  vises: z.string().trim().regex(/^\d*$/, "Nombre d'animaux visés : nombre entier"),
});
export type CampagneForm = z.infer<typeof campagneFormSchema>;
export const emptyCampagne = (): CampagneForm => ({ nom: '', zone: '', especeId: '', vaccin: '', date: today(), vises: '' });

export const terrainFormSchema = z.object({ animal: z.string().trim().min(1, "Nom de l'animal requis"), proprietaire: z.string(), vaccin: z.string() });
export type TerrainForm = z.infer<typeof terrainFormSchema>;
