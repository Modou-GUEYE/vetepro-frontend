import { z } from 'zod';
import { NewPatientForm, emptyNewPatient, validateNewPatient } from '@/modules/patients/models/newPatient';

export const METHODES = ['ia', 'ia_congelee', 'ia_fraiche', 'naturelle', 'transplant'] as const;
export type Methode = (typeof METHODES)[number];
export const METHODE_LABEL: Record<Methode, string> = {
  ia: 'IA', ia_congelee: 'IA semence congelée', ia_fraiche: 'IA semence fraîche', naturelle: 'Saillie naturelle', transplant: 'Transplantation embryonnaire',
};
export const IA_METHODES: string[] = ['ia', 'ia_congelee', 'ia_fraiche'];
export const DIAG_METHODES = ['echographie', 'palpation', 'test_lait', 'observation'] as const;
export const DIAG_LABEL: Record<(typeof DIAG_METHODES)[number], string> = { echographie: 'Échographie', palpation: 'Palpation rectale', test_lait: 'Test hormonal ou lait', observation: 'Observation comportementale' };
export const RESULTATS = ['attente', 'positif', 'negatif'] as const;
export type Resultat = (typeof RESULTATS)[number];
export const RESULTAT_LABEL: Record<Resultat, string> = { attente: 'En attente', positif: 'Positif, gestante', negatif: 'Négatif, non gestante' };
export const RESULTAT_BADGE: Record<Resultat, string> = { attente: 'En attente', positif: 'Positif', negatif: 'Négatif' };
export const RESULTAT_TONE = { attente: 'amber', positif: 'green', negatif: 'red' } as const;
export const MODES_INDICATIFS = ['Espèces', 'Wave', 'Orange Money', 'PI-SPI', 'Carte', 'Chèque', 'Virement', 'Mobile money'] as const;

export const QUICK_FILTERS = [
  { key: 'all', label: 'Tous' }, { key: 'planifie', label: 'Planifié' }, { key: 'realise', label: 'Réalisé' }, { key: 'positif', label: 'Positif' }, { key: 'negatif', label: 'Négatif' },
] as const;
export type QuickFilter = (typeof QUICK_FILTERS)[number]['key'];

const ref = z.object({ id: z.string(), nom: z.string() });
const acteSchema = z.object({
  id: z.string(), numero: z.string(), date: z.string(), methode: z.enum(METHODES), statut: z.enum(['planifie', 'realise']), observations: z.string(),
  patient: z.object({ id: z.string(), nom: z.string(), type: z.enum(['animal', 'troupeau']), sexe: z.enum(['M', 'F']).nullable(), espece: z.string(), espece_id: z.string(), race: z.string(), provisoire: z.boolean(), effectif: z.number().nullable() }).nullable(),
  proprietaire: ref.extend({ telephone: z.string() }).nullable(), veterinaire: ref.nullable(),
  semence: z.object({ race_geniteur: z.string(), nom_geniteur: z.string(), lot: z.string(), dose: z.string(), origine: z.string(), date_collecte: z.string().nullable() }),
  tarif: z.number(), mode_paiement: z.string(),
  facture: z.object({ id: z.string(), numero: z.string(), total: z.number(), reste: z.number(), statut: z.string() }).nullable(),
  diagnostic: z.object({ date: z.string(), methode: z.enum(DIAG_METHODES).nullable(), resultat: z.enum(RESULTATS) }).nullable(), resultat: z.enum(RESULTATS),
  mise_bas_prevue: z.string().nullable(), mise_bas: z.object({ date: z.string(), vivants: z.number(), morts: z.number(), observations: z.string() }).nullable(),
  historique: z.array(z.object({ at: z.string(), by: z.string(), action: z.string(), detail: z.string() })),
});
export const insemListDtoSchema = z.object({
  items: z.array(acteSchema), total: z.number(),
  stats: z.object({ total: z.number(), planifies: z.number(), realises: z.number(), positifs: z.number(), negatifs: z.number(), taux_reussite: z.number(), gestantes: z.number(), imminentes: z.number(), passees: z.number() }),
});
export const GESTATION_ETATS = ['en_cours', 'imminente', 'passee', 'a_completer'] as const;
export const gestationsDtoSchema = z.object({
  items: z.array(z.object({ acte: acteSchema, jours_restants: z.number().nullable(), progression: z.number(), etat: z.enum(GESTATION_ETATS) })), seuil_imminent: z.number(),
});
export const acteDtoSchema = acteSchema;

export const RAPPEL_STATUTS = ['programme', 'envoye', 'en_retard'] as const;
export const RAPPEL_STATUT_LABEL = { programme: 'Programmé', envoye: 'Envoyé', en_retard: 'En retard' } as const;
export const RAPPEL_STATUT_TONE = { programme: 'blue', envoye: 'green', en_retard: 'red' } as const;
export const RAPPEL_TYPE_LABEL = { diag: 'Diagnostic de gestation', mb: 'Mise-bas imminente' } as const;
const rappelSchema = z.object({
  id: z.string(), type: z.enum(['diag', 'mb']), date: z.string(), texte: z.string(), statut: z.enum(RAPPEL_STATUTS), envoye: z.string().nullable(), canaux: z.array(z.string()),
  patient: z.object({ id: z.string(), nom: z.string(), espece: z.string() }).nullable(), proprietaire: ref.extend({ telephone: z.string() }).nullable(), acte: z.object({ id: z.string(), numero: z.string() }),
});
export const rappelsDtoSchema = z.object({ items: z.array(rappelSchema), delai_diagnostic: z.number(), delai_mise_bas: z.number() });
export const rappelEnvoiDtoSchema = z.object({ rappel: rappelSchema, ok: z.boolean(), message: z.string() });
export type Rappel = z.infer<typeof rappelSchema>;

export type Acte = z.infer<typeof acteSchema>;
export type InsemStats = z.infer<typeof insemListDtoSchema>['stats'];
export type Gestation = z.infer<typeof gestationsDtoSchema>['items'][number];

const today = () => new Date().toISOString().slice(0, 10);
const int = (label: string) => z.string().trim().regex(/^\d*$/, `${label} : nombre entier`);

/* ---------- Acte ---------- */

export const insemFormSchema = z.object({
  mode: z.enum(['existant', 'nouveau']), patientId: z.string(), np: z.custom<NewPatientForm>(),
  date: z.string().min(1, "La date de l'acte est obligatoire"), methode: z.enum(METHODES), vetId: z.string(), statut: z.enum(['planifie', 'realise']), observations: z.string(),
  raceGeniteur: z.string(), nomGeniteur: z.string(), lot: z.string(), dose: z.string(), origine: z.string(), dateCollecte: z.string(),
  tarif: int("Le tarif de l'acte"), modePaiement: z.string(),
}).superRefine((v, ctx) => {
  if (v.mode === 'existant' && !v.patientId) ctx.addIssue({ code: 'custom', path: ['patientId'], message: 'Choisissez un patient' });
  if (v.mode === 'nouveau') validateNewPatient(v.np, ctx);
  if (v.statut === 'realise' && v.date > today()) ctx.addIssue({ code: 'custom', path: ['date'], message: "La date de l'acte ne peut être dans le futur que pour un acte planifié" });
  if (v.statut === 'realise' && IA_METHODES.includes(v.methode) && !v.lot.trim() && !v.nomGeniteur.trim()) {
    ctx.addIssue({ code: 'custom', path: ['nomGeniteur'], message: 'Une IA réalisée exige au moins le n° de lot ou le nom du géniteur' });
  }
});
export type InsemForm = z.infer<typeof insemFormSchema>;
export const emptyInsem = (o: Partial<InsemForm> = {}): InsemForm => ({
  mode: 'existant', patientId: '', np: emptyNewPatient(), date: today(), methode: 'ia', vetId: '', statut: 'planifie', observations: '',
  raceGeniteur: '', nomGeniteur: '', lot: '', dose: '', origine: '', dateCollecte: '', tarif: '0', modePaiement: '', ...o,
});
export const insemFromActe = (a: Acte): InsemForm => emptyInsem({
  patientId: a.patient?.id ?? '', date: a.date, methode: a.methode, vetId: a.veterinaire?.id ?? '', statut: a.statut, observations: a.observations,
  raceGeniteur: a.semence.race_geniteur, nomGeniteur: a.semence.nom_geniteur, lot: a.semence.lot, dose: a.semence.dose, origine: a.semence.origine, dateCollecte: a.semence.date_collecte ?? '',
  tarif: String(a.tarif), modePaiement: a.mode_paiement,
});

/** Le tarif d'un acte dont la facture a déjà reçu un paiement ne peut plus changer. */
export const tarifLocked = (a: Acte | undefined) => !!a?.facture && a.facture.reste < a.tarif;

/* ---------- Diagnostic et mise-bas ---------- */

export const diagnosticFormSchema = z.object({
  date: z.string().min(1, 'La date du diagnostic est obligatoire'), methode: z.string(), resultat: z.enum(RESULTATS, { errorMap: () => ({ message: 'Le résultat est obligatoire' }) }), miseBasPrevue: z.string(),
});
export type DiagnosticForm = z.infer<typeof diagnosticFormSchema>;
/** Le diagnostic ne peut précéder la date de l'acte ni être dans le futur. */
export const diagnosticSchemaFor = (acteDate: string) => diagnosticFormSchema.superRefine((v, ctx) => {
  if (v.date && v.date < acteDate) ctx.addIssue({ code: 'custom', path: ['date'], message: "La date du diagnostic ne peut précéder la date de l'acte" });
  if (v.date > today()) ctx.addIssue({ code: 'custom', path: ['date'], message: 'La date du diagnostic ne peut pas être dans le futur' });
  if (v.miseBasPrevue && v.miseBasPrevue < acteDate) ctx.addIssue({ code: 'custom', path: ['miseBasPrevue'], message: "La mise-bas prévue ne peut précéder l'acte" });
});
export const emptyDiagnostic = (a: Acte): DiagnosticForm => ({
  date: a.diagnostic?.date ?? today(), methode: a.diagnostic?.methode ?? '', resultat: a.diagnostic?.resultat ?? 'attente', miseBasPrevue: a.mise_bas_prevue ?? '',
});

export const miseBasFormSchema = z.object({
  date: z.string().min(1, 'La date de mise-bas réelle est obligatoire'), vivants: int('Naissances vivantes'), morts: int('Naissances mortes'), observations: z.string(),
}).superRefine((v, ctx) => { if (v.date > today()) ctx.addIssue({ code: 'custom', path: ['date'], message: 'La date de mise-bas ne peut pas être dans le futur' }); });
export type MiseBasForm = z.infer<typeof miseBasFormSchema>;
export const miseBasSchemaFor = (acteDate: string) => miseBasFormSchema.superRefine((v, ctx) => {
  if (v.date && v.date < acteDate) ctx.addIssue({ code: 'custom', path: ['date'], message: "La date réelle ne peut précéder la date de l'acte" });
});
export const emptyMiseBas = (): MiseBasForm => ({ date: today(), vivants: '0', morts: '0', observations: '' });

export const deleteFormSchema = z.object({ motif: z.string().trim().min(1, 'Le motif de suppression est obligatoire') });
export type DeleteForm = z.infer<typeof deleteFormSchema>;

/* ---------- Divers ---------- */

export interface ActeFilters { filtre: QuickFilter; q: string; du: string; au: string; espece: string; methode: string; veterinaire: string }
export const emptyFilters = (): ActeFilters => ({ filtre: 'all', q: '', du: '', au: '', espece: '', methode: '', veterinaire: '' });

export const GESTATION_ETAT_LABEL = { en_cours: 'En cours', imminente: 'Mise-bas imminente', passee: 'Passée', a_completer: 'À compléter' } as const;

/** Lignes du tableau exporté (liste filtrée) : mêmes colonnes que l'écran. */
export function exportRows(actes: Acte[]) {
  const d = (s: string | null) => (s ? s.split('-').reverse().join('/') : '');
  return actes.map((a) => [
    a.numero, a.patient?.nom ?? '', a.patient?.espece ?? '', a.proprietaire?.nom ?? '', METHODE_LABEL[a.methode], a.statut === 'planifie' ? 'Planifié' : 'Réalisé',
    [a.semence.race_geniteur, a.semence.nom_geniteur].filter(Boolean).join(' '), a.semence.lot, d(a.date), a.veterinaire?.nom ?? '',
    a.diagnostic ? `${d(a.diagnostic.date)}${a.diagnostic.methode ? ` (${DIAG_LABEL[a.diagnostic.methode]})` : ''}` : '', RESULTAT_BADGE[a.resultat], d(a.mise_bas_prevue), d(a.mise_bas?.date ?? null),
  ]);
}
export const EXPORT_HEADERS = ['N°', 'Patient', 'Espèce', 'Propriétaire', 'Méthode', 'Statut', 'Géniteur', 'Lot', 'Date de l\'acte', 'Technicien', 'Diagnostic', 'Résultat', 'Mise-bas prévue', 'Mise-bas réelle'];

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;
/** CSV lisible par Excel (séparateur point-virgule, BOM UTF-8). */
export const toCsv = (actes: Acte[]) => `\uFEFF${[EXPORT_HEADERS, ...exportRows(actes)].map((r) => r.map(csvCell).join(';')).join('\r\n')}`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const toPrintHtml = (actes: Acte[]) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Actes d'insémination</title><style>
body{font-family:Inter,system-ui,sans-serif;color:#0f1f2b;padding:24px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#f3f6f8;text-align:left;padding:6px;text-transform:uppercase;font-size:10px}td{padding:6px;border-bottom:1px solid #e1e8ed}
</style></head><body><h2>Actes d'insémination</h2><table><thead><tr>${EXPORT_HEADERS.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${exportRows(actes).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
