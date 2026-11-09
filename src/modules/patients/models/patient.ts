import { z } from 'zod';

export type PatientType = 'animal' | 'troupeau';

const refSchema = z.object({ id: z.string(), nom: z.string() });
const summaryDtoSchema = z.object({
  id: z.string(), matricule: z.string(), type: z.enum(['animal', 'troupeau']), nom: z.string(), espece: refSchema, race: refSchema.nullable(),
  sexe: z.enum(['M', 'F']).nullable(), naissance: z.string().nullable(), effectif: z.number().nullable(), proprietaire: refSchema.nullable(), provisoire: z.boolean().default(false),
});
export const patientPageDtoSchema = z.object({ items: z.array(summaryDtoSchema), total: z.number(), page: z.number(), page_size: z.number() });

const historyDtoSchema = z.object({
  at: z.string(), by: z.string(), action: z.enum(['creation', 'modification']),
  changes: z.array(z.object({ champ: z.string(), avant: z.string(), apres: z.string() })),
});
export const patientDetailDtoSchema = summaryDtoSchema.extend({
  antecedents: z.string(), statut_repro: z.enum(['entier', 'sterilise', 'inconnu']).nullable(), femelles: z.number().nullable(), males: z.number().nullable(), jeunes: z.number().nullable(),
  localisation: z.string(), recensement: z.string().nullable(), note: z.string(),
  proprietaire: refSchema.extend({ telephone: z.string(), email: z.string() }).nullable(),
  historique: z.array(historyDtoSchema),
});

export interface PatientRow {
  id: string; matricule: string; type: PatientType; nom: string; espece: { id: string; nom: string }; race: { id: string; nom: string } | null;
  sexe: 'M' | 'F' | null; naissance: string | null; effectif: number | null; proprietaire: { id: string; nom: string } | null; provisoire: boolean;
}
export interface HistoryEntry { at: string; by: string; action: 'creation' | 'modification'; changes: { champ: string; avant: string; apres: string }[] }
export interface PatientDetail extends Omit<PatientRow, 'proprietaire'> {
  antecedents: string; statutRepro: 'entier' | 'sterilise' | 'inconnu' | null; femelles: number | null; males: number | null; jeunes: number | null;
  localisation: string; recensement: string | null; note: string;
  proprietaire: { id: string; nom: string; telephone: string; email: string } | null; historique: HistoryEntry[];
}

export const toRow = (d: z.infer<typeof summaryDtoSchema>): PatientRow => ({ ...d });
export const toDetail = (d: z.infer<typeof patientDetailDtoSchema>): PatientDetail => ({
  id: d.id, matricule: d.matricule, type: d.type, nom: d.nom, espece: d.espece, race: d.race, sexe: d.sexe, naissance: d.naissance, effectif: d.effectif, provisoire: d.provisoire,
  antecedents: d.antecedents, statutRepro: d.statut_repro, femelles: d.femelles, males: d.males, jeunes: d.jeunes, localisation: d.localisation, recensement: d.recensement, note: d.note,
  proprietaire: d.proprietaire, historique: d.historique,
});

export const SEXE_LABEL = { M: 'Mâle', F: 'Femelle' } as const;
export const REPRO_LABEL = { entier: 'Entier(e)', sterilise: 'Stérilisé(e)', inconnu: 'Inconnu' } as const;

const optInt = (label: string) => z.string().trim().refine((v) => v === '' || (/^\d+$/.test(v)), `${label} : nombre entier`);

/** Formulaire unique Animal / Troupeau : les règles dépendent du type choisi. */
export const patientFormSchema = z.object({
  type: z.enum(['animal', 'troupeau']),
  proprietaireId: z.string().min(1, 'Choisissez un propriétaire'),
  nom: z.string().trim().min(1, 'Le nom est obligatoire'),
  especeId: z.string().min(1, "Choisissez l'espèce"),
  raceId: z.string(),
  sexe: z.string(), naissance: z.string(), antecedents: z.string(), statutRepro: z.string(),
  effectif: optInt('Effectif'), femelles: optInt('Femelles'), males: optInt('Mâles'), jeunes: optInt('Jeunes'),
  localisation: z.string(), recensement: z.string(), note: z.string(),
}).superRefine((v, ctx) => {
  if (v.type === 'animal') {
    if (v.naissance && v.naissance > new Date().toISOString().slice(0, 10)) ctx.addIssue({ code: 'custom', path: ['naissance'], message: 'La date ne peut pas être dans le futur' });
    return;
  }
  const effectif = Number(v.effectif);
  if (!v.effectif || effectif < 1) { ctx.addIssue({ code: 'custom', path: ['effectif'], message: "L'effectif total est obligatoire" }); return; }
  const parts = Number(v.femelles || 0) + Number(v.males || 0) + Number(v.jeunes || 0);
  if (parts > effectif) ctx.addIssue({ code: 'custom', path: ['femelles'], message: `Femelles + mâles + jeunes (${parts}) dépassent l'effectif (${effectif})` });
});
export type PatientForm = z.infer<typeof patientFormSchema>;

export const emptyPatientForm = (type: PatientType = 'animal'): PatientForm => ({
  type, proprietaireId: '', nom: '', especeId: '', raceId: '', sexe: '', naissance: '', antecedents: '', statutRepro: '',
  effectif: '', femelles: '', males: '', jeunes: '', localisation: '', recensement: '', note: '',
});

export const formFromDetail = (p: PatientDetail): PatientForm => ({
  type: p.type, proprietaireId: p.proprietaire?.id ?? '', nom: p.nom, especeId: p.espece.id, raceId: p.race?.id ?? '', sexe: p.sexe ?? '', naissance: p.naissance ?? '',
  antecedents: p.antecedents, statutRepro: p.statutRepro ?? '', effectif: p.effectif?.toString() ?? '', femelles: p.femelles?.toString() ?? '', males: p.males?.toString() ?? '',
  jeunes: p.jeunes?.toString() ?? '', localisation: p.localisation, recensement: p.recensement ?? '', note: p.note,
});

const num = (v: string) => (v.trim() === '' ? null : Number(v));
export const toRequestBody = (f: PatientForm) => ({
  type: f.type, proprietaire_id: f.proprietaireId, nom: f.nom, espece_id: f.especeId, race_id: f.raceId || null,
  sexe: f.sexe || null, naissance: f.naissance || null, antecedents: f.antecedents, statut_repro: f.statutRepro || null,
  effectif: num(f.effectif), femelles: num(f.femelles), males: num(f.males), jeunes: num(f.jeunes),
  localisation: f.localisation, recensement: f.recensement || null, note: f.note,
});
