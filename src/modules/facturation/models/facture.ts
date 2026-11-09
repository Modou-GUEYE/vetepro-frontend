import { z } from 'zod';

export const PAYMENT_MODES = ['Espèces', 'Wave', 'Orange Money', 'PI-SPI', 'Carte', 'Chèque', 'Virement', 'Mobile money'] as const;
/** Libellés affichés : « Carte » et « Mobile money » gardent leur valeur enregistrée. */
export const modeLabel = (m: string) => (m === 'Carte' ? 'Carte bancaire' : m === 'Mobile money' ? 'Mobile money (autre)' : m);
export type InvoiceStatus = 'impayee' | 'partielle' | 'payee' | 'annulee';

const refSchema = z.object({ id: z.string().nullable(), nom: z.string() });
const summarySchema = z.object({
  id: z.string(), numero: z.string(), date: z.string(), source: z.enum(['consultation', 'vente', 'hospitalisation', 'vaccination', 'insemination', 'manuel']),
  client: refSchema, patient: z.object({ id: z.string(), nom: z.string() }).nullable(),
  total: z.number(), paye: z.number(), reste: z.number(), statut: z.enum(['impayee', 'partielle', 'payee', 'annulee']),
});
const statsSchema = z.object({ chiffre_affaires: z.number(), encaisse: z.number(), creances: z.number(), non_soldees: z.number(), ventes_pharmacie: z.number() });
export const invoicePageDtoSchema = z.object({ items: z.array(summarySchema), total: z.number(), page: z.number(), page_size: z.number(), stats: statsSchema });
export const invoiceDetailDtoSchema = summarySchema.extend({
  consultation_id: z.string().nullable(), notes: z.string(), remise_pct: z.number(), sous_total: z.number(), remise: z.number(),
  client: refSchema.extend({ telephone: z.string(), email: z.string() }),
  lignes: z.array(z.object({ description: z.string(), quantite: z.number(), prix_unitaire: z.number(), total: z.number() })),
  paiements: z.array(z.object({ id: z.string(), date: z.string(), montant: z.number(), mode: z.string(), par: z.string() })),
  avoirs: z.array(z.object({ id: z.string(), numero: z.string(), date: z.string(), montant: z.number(), motif: z.string(), par: z.string() })),
});
export const saleListDtoSchema = z.object({ items: z.array(summarySchema.extend({ articles: z.array(z.string()) })), total: z.number(), page: z.number(), page_size: z.number() });

export interface InvoiceRow { id: string; numero: string; date: string; source: 'consultation' | 'vente' | 'hospitalisation' | 'vaccination' | 'insemination' | 'manuel'; client: { id: string | null; nom: string }; patient: { id: string; nom: string } | null; total: number; paye: number; reste: number; statut: InvoiceStatus }
export interface InvoiceStats { chiffreAffaires: number; encaisse: number; creances: number; nonSoldees: number; ventesPharmacie: number }
export interface InvoiceLine { description: string; quantite: number; prixUnitaire: number; total: number }
export interface InvoiceDetail extends InvoiceRow {
  consultationId: string | null; notes: string; remisePct: number; sousTotal: number; remise: number;
  client: { id: string | null; nom: string; telephone: string; email: string };
  lignes: InvoiceLine[]; paiements: { id: string; date: string; montant: number; mode: string; par: string }[];
  avoirs: { id: string; numero: string; date: string; montant: number; motif: string; par: string }[];
}
export interface SaleRow extends InvoiceRow { articles: string[] }

export const toStats = (d: z.infer<typeof statsSchema>): InvoiceStats => ({ chiffreAffaires: d.chiffre_affaires, encaisse: d.encaisse, creances: d.creances, nonSoldees: d.non_soldees, ventesPharmacie: d.ventes_pharmacie });
export const toDetail = (d: z.infer<typeof invoiceDetailDtoSchema>): InvoiceDetail => ({
  id: d.id, numero: d.numero, date: d.date, source: d.source, client: d.client, patient: d.patient, total: d.total, paye: d.paye, reste: d.reste, statut: d.statut,
  consultationId: d.consultation_id, notes: d.notes, remisePct: d.remise_pct, sousTotal: d.sous_total, remise: d.remise,
  lignes: d.lignes.map((l) => ({ description: l.description, quantite: l.quantite, prixUnitaire: l.prix_unitaire, total: l.total })), paiements: d.paiements, avoirs: d.avoirs,
});

export const STATUS_LABEL: Record<InvoiceStatus, string> = { impayee: 'Impayée', partielle: 'Partielle', payee: 'Payée', annulee: 'Annulée' };
export const STATUS_TONE = { impayee: 'red', partielle: 'amber', payee: 'green', annulee: 'slate' } as const;

/** Calcul d'affichage identique à celui du serveur : sous-total, remise, total et reste à payer. */
export function computeTotals(lines: { quantite: number; prixUnitaire: number }[], remisePct: number, montantRecu: number) {
  const sousTotal = lines.reduce((n, l) => n + (l.quantite || 0) * (l.prixUnitaire || 0), 0);
  const pct = Math.min(100, Math.max(0, remisePct || 0));
  const total = Math.round(sousTotal * (1 - pct / 100));
  return { sousTotal, remise: sousTotal - total, total, reste: Math.max(0, total - (montantRecu || 0)) };
}

const int = (label: string) => z.string().trim().regex(/^\d+$/, `${label} : nombre entier`);
export const invoiceFormSchema = z.object({
  patientId: z.string(), date: z.string().min(1, 'La date est obligatoire'),
  lignes: z.array(z.object({ description: z.string().trim().min(1, 'Description obligatoire'), quantite: int('Quantité').refine((v) => Number(v) >= 1, 'Quantité minimale : 1'), prixUnitaire: int('Prix') })).min(1, 'Ajoutez au moins une ligne'),
  mode: z.enum(PAYMENT_MODES), montantRecu: z.string().trim().refine((v) => v === '' || /^\d+$/.test(v), 'Montant : nombre entier'),
  remisePct: z.string().trim().refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) <= 100), 'Remise entre 0 et 100'), notes: z.string(),
}).superRefine((v, ctx) => {
  if (!v.patientId) ctx.addIssue({ code: 'custom', path: ['patientId'], message: 'Choisissez un dossier patient' });
  const t = computeTotals(v.lignes.map((l) => ({ quantite: Number(l.quantite), prixUnitaire: Number(l.prixUnitaire) })), Number(v.remisePct || 0), 0);
  if (Number(v.montantRecu || 0) > t.total) ctx.addIssue({ code: 'custom', path: ['montantRecu'], message: 'Le montant reçu dépasse le total' });
});
export type InvoiceForm = z.infer<typeof invoiceFormSchema>;
export const emptyInvoiceForm = (): InvoiceForm => ({
  patientId: '', date: new Date().toISOString().slice(0, 10), lignes: [{ description: '', quantite: '1', prixUnitaire: '' }], mode: 'Espèces', montantRecu: '', remisePct: '', notes: '',
});
