import { z } from 'zod';

const patientRef = z.object({ id: z.string(), nom: z.string(), espece: z.string(), matricule: z.string() });
const summarySchema = z.object({
  id: z.string(), date: z.string(), patient: patientRef.nullable(), proprietaire: z.object({ id: z.string(), nom: z.string() }).nullable(), motif: z.string(), diagnostic: z.string(),
  service: z.string(), veterinaire: z.string(), nb_medicaments: z.number(), ordonnance_numero: z.string(), facture: z.object({ id: z.string(), numero: z.string() }).nullable(),
});
export const consultationPageDtoSchema = z.object({ items: z.array(summarySchema), total: z.number(), page: z.number(), page_size: z.number() });
export const consultationDetailDtoSchema = summarySchema.extend({
  examen: z.string(), notes: z.string(), service_id: z.string(), service_prix: z.number(),
  proprietaire: z.object({ id: z.string(), nom: z.string(), telephone: z.string(), email: z.string() }).nullable(),
  stock: z.array(z.object({ article_id: z.string(), nom: z.string(), unite: z.string(), quantite: z.number(), prix_unitaire: z.number(), dosage: z.string(), posologie: z.string() })),
  externes: z.array(z.object({ nom: z.string(), quantite: z.number(), dosage: z.string(), posologie: z.string() })),
  facture_proposee: z.array(z.object({ description: z.string(), quantite: z.number(), prix_unitaire: z.number() })),
});
export const serviceChoicesDtoSchema = z.object({ items: z.array(z.object({ id: z.string(), libelle: z.string(), categorie: z.string(), prix: z.number() })) });

export interface ConsultationRow {
  id: string; date: string; patient: { id: string; nom: string; espece: string; matricule: string } | null; proprietaire: { id: string; nom: string } | null; motif: string; diagnostic: string;
  service: string; veterinaire: string; nbMedicaments: number; ordonnanceNumero: string; facture: { id: string; numero: string } | null;
}
export interface ConsultationDetail extends Omit<ConsultationRow, 'proprietaire'> {
  examen: string; notes: string; serviceId: string; servicePrix: number; proprietaire: { id: string; nom: string; telephone: string; email: string } | null;
  stock: { articleId: string; nom: string; unite: string; quantite: number; prixUnitaire: number; dosage: string; posologie: string }[];
  externes: { nom: string; quantite: number; dosage: string; posologie: string }[];
  facturePropose: { description: string; quantite: number; prixUnitaire: number }[];
}
export const toRow = (d: z.infer<typeof summarySchema>): ConsultationRow => ({
  id: d.id, date: d.date, patient: d.patient, proprietaire: d.proprietaire, motif: d.motif, diagnostic: d.diagnostic, service: d.service, veterinaire: d.veterinaire,
  nbMedicaments: d.nb_medicaments, ordonnanceNumero: d.ordonnance_numero, facture: d.facture,
});
export const toDetail = (d: z.infer<typeof consultationDetailDtoSchema>): ConsultationDetail => ({
  ...toRow(d), proprietaire: d.proprietaire, examen: d.examen, notes: d.notes, serviceId: d.service_id, servicePrix: d.service_prix,
  stock: d.stock.map((l) => ({ articleId: l.article_id, nom: l.nom, unite: l.unite, quantite: l.quantite, prixUnitaire: l.prix_unitaire, dosage: l.dosage, posologie: l.posologie })),
  externes: d.externes, facturePropose: d.facture_proposee.map((l) => ({ description: l.description, quantite: l.quantite, prixUnitaire: l.prix_unitaire })),
});

const qty = z.string().trim().regex(/^\d+$/, 'Nombre entier').refine((v) => Number(v) >= 1, 'Au moins 1');
export const consultationFormSchema = z.object({
  patientId: z.string().min(1, 'Choisissez un dossier patient'), date: z.string().min(1, 'La date est obligatoire'), serviceId: z.string().min(1, 'Choisissez le type de service'),
  motif: z.string(), examen: z.string(), diagnostic: z.string(),
  stock: z.array(z.object({ articleId: z.string().min(1, 'Choisissez un médicament'), quantite: qty, dosage: z.string(), posologie: z.string() })),
  externes: z.array(z.object({ nom: z.string().trim().min(1, 'Nom obligatoire'), quantite: qty, dosage: z.string(), posologie: z.string() })),
  notes: z.string(),
}).superRefine((v, ctx) => {
  if (v.date > new Date().toISOString().slice(0, 10)) ctx.addIssue({ code: 'custom', path: ['date'], message: 'La date ne peut pas être dans le futur' });
});
export type ConsultationForm = z.infer<typeof consultationFormSchema>;
export const emptyConsultationForm = (patientId = ''): ConsultationForm => ({
  patientId, date: new Date().toISOString().slice(0, 10), serviceId: '', motif: '', examen: '', diagnostic: '', stock: [], externes: [], notes: '',
});

/** Médicaments en stock demandés plusieurs fois : on additionne avant de comparer au stock disponible. */
export function stockOverruns(lignes: { articleId: string; quantite: string }[], choices: { id: string; quantite: number }[]): string[] {
  const asked = new Map<string, number>();
  for (const l of lignes) if (l.articleId) asked.set(l.articleId, (asked.get(l.articleId) ?? 0) + (Number(l.quantite) || 0));
  return [...asked].filter(([id, q]) => q > (choices.find((c) => c.id === id)?.quantite ?? 0)).map(([id]) => id);
}
