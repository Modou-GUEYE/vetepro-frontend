import type { Failure } from './profilesDb';
import { PATIENTS } from './patientsDb';

export const PAYMENT_MODES = ['Espèces', 'Wave', 'Orange Money', 'PI-SPI', 'Carte', 'Chèque', 'Virement', 'Mobile money'] as const;
export type InvoiceSource = 'consultation' | 'vente' | 'hospitalisation' | 'vaccination' | 'insemination' | 'manuel';
export type InvoiceStatus = 'impayee' | 'partielle' | 'payee' | 'annulee';

export interface InvoiceLine { description: string; quantite: number; prixUnitaire: number }
export interface Payment { id: string; date: string; montant: number; mode: string; by: string }
export interface CreditNote { id: string; numero: string; date: string; montant: number; motif: string; by: string }
export interface DemoInvoice {
  id: string; numero: string; date: string; source: InvoiceSource;
  ownerId: string | null; clientLabel: string; patientId: string | null; consultationId: string | null;
  lines: InvoiceLine[]; remisePct: number; notes: string; payments: Payment[]; credits: CreditNote[];
}

const line = (description: string, quantite: number, prixUnitaire: number): InvoiceLine => ({ description, quantite, prixUnitaire });
const seedInvoices = (): DemoInvoice[] => [
  { id: '1', numero: 'FAC-0001', date: '2025-03-01', source: 'consultation', ownerId: '1', clientLabel: 'Moussa Diallo', patientId: '1', consultationId: '1',
    lines: [line('Consultation générale', 1, 5000), line('Méthylprednisolone 4mg', 14, 350), line('Soins complémentaires', 1, 3000)], remisePct: 0, notes: '',
    payments: [{ id: 'p1', date: '2025-03-01T10:00:00.000Z', montant: 12900, mode: 'Espèces', by: 'Dr Amadou Sy' }], credits: [] },
  { id: '2', numero: 'FAC-0002', date: '2025-03-05', source: 'consultation', ownerId: '2', clientLabel: 'Fatou Sané', patientId: '2', consultationId: '2',
    lines: [line('Vaccination (acte)', 1, 2500), line('Vaccin typhus félin', 1, 12500)], remisePct: 0, notes: 'Rappel annuel',
    payments: [{ id: 'p2', date: '2025-03-05T11:00:00.000Z', montant: 8000, mode: 'Mobile money', by: 'Dr Amadou Sy' }], credits: [] },
  { id: '3', numero: 'FAC-0003', date: '2025-03-08', source: 'consultation', ownerId: '1', clientLabel: 'Moussa Diallo', patientId: '4', consultationId: '3',
    lines: [line('Consultation urgence', 1, 12000), line('Amoxicilline vét. 250mg', 6, 200), line('Métoclopramide 10mg', 10, 150)], remisePct: 0, notes: '', payments: [], credits: [] },
];

export let INVOICES: DemoInvoice[] = seedInvoices();
export const resetBilling = () => { INVOICES = seedInvoices(); };

export const subtotal = (i: Pick<DemoInvoice, 'lines'>) => i.lines.reduce((n, l) => n + l.quantite * l.prixUnitaire, 0);
export const total = (i: Pick<DemoInvoice, 'lines' | 'remisePct'>) => Math.round(subtotal(i) * (1 - i.remisePct / 100));
export const paid = (i: Pick<DemoInvoice, 'payments'>) => i.payments.reduce((n, p) => n + p.montant, 0);
export const credited = (i: Pick<DemoInvoice, 'credits'>) => i.credits.reduce((n, c) => n + c.montant, 0);
/** Montant encore dû : total, moins les avoirs, moins les paiements (jamais négatif). */
export const remaining = (i: DemoInvoice) => Math.max(0, total(i) - credited(i) - paid(i));

export function statusOf(i: DemoInvoice): InvoiceStatus {
  if (total(i) > 0 && credited(i) >= total(i)) return 'annulee';
  if (remaining(i) === 0) return 'payee';
  return paid(i) > 0 ? 'partielle' : 'impayee';
}

const notFound: Failure = { status: 404, code: 'not_found', message: 'Facture introuvable' };
export const getInvoice = (id: string): DemoInvoice | Failure => INVOICES.find((x) => x.id === id) ?? notFound;
const nextNumber = () => `FAC-${String(Math.max(0, ...INVOICES.map((x) => Number(x.numero.slice(4)))) + 1).padStart(4, '0')}`;
const iso = (d: Date) => d.toISOString();

export interface InvoiceInput {
  date: string; source: InvoiceSource; ownerId: string | null; clientLabel: string; patientId: string | null; consultationId: string | null;
  lines: InvoiceLine[]; remisePct: number; notes: string; paiement?: { montant: number; mode: string };
}

/** Création : la facture est numérotée dans l'ordre et n'est plus modifiable ensuite (spécification) ; seuls les paiements et les avoirs s'ajoutent. */
export function createInvoice(input: InvoiceInput, by: string, now = new Date()): DemoInvoice | Failure {
  const lines = input.lines.filter((l) => l.description.trim() || l.quantite || l.prixUnitaire);
  if (lines.length === 0) return { status: 422, code: 'invalid', message: 'Ajoutez au moins une ligne' };
  for (const l of lines) {
    if (!l.description.trim()) return { status: 422, code: 'invalid', message: 'Chaque ligne doit avoir une description' };
    if (!Number.isInteger(l.quantite) || l.quantite < 1) return { status: 422, code: 'invalid', message: 'La quantité doit être un nombre entier positif' };
    if (!Number.isInteger(l.prixUnitaire) || l.prixUnitaire < 0) return { status: 422, code: 'unpriced', message: `Acte ou produit non tarifé : ${l.description}` };
  }
  if (input.remisePct < 0 || input.remisePct > 100) return { status: 422, code: 'invalid', message: 'La remise doit être comprise entre 0 et 100 %' };
  if (input.consultationId && INVOICES.some((x) => x.consultationId === input.consultationId && statusOf(x) !== 'annulee')) {
    return { status: 409, code: 'already_invoiced', message: 'Cette consultation est déjà facturée' };
  }
  const inv: DemoInvoice = {
    id: String(Math.max(0, ...INVOICES.map((x) => Number(x.id))) + 1), numero: nextNumber(), date: input.date, source: input.source,
    ownerId: input.ownerId, clientLabel: input.clientLabel, patientId: input.patientId, consultationId: input.consultationId,
    lines, remisePct: input.remisePct, notes: input.notes.trim(), payments: [], credits: [],
  };
  INVOICES.push(inv);
  if (input.paiement && input.paiement.montant > 0) {
    const r = addPayment(inv.id, input.paiement.montant, input.paiement.mode, by, now);
    if ('status' in r) { INVOICES = INVOICES.filter((x) => x.id !== inv.id); return r; }
  }
  return inv;
}

export function billingStats(month = new Date().toISOString().slice(0, 7)) {
  const live = INVOICES.filter((x) => statusOf(x) !== 'annulee');
  const ventes = INVOICES.filter((x) => x.source === 'vente' && statusOf(x) !== 'annulee');
  return {
    chiffre_affaires: live.reduce((n, x) => n + total(x) - credited(x), 0),
    encaisse: INVOICES.reduce((n, x) => n + paid(x), 0),
    creances: live.reduce((n, x) => n + remaining(x), 0),
    non_soldees: live.filter((x) => remaining(x) > 0).length,
    ventes_pharmacie: ventes.length,
    ventes_mois: ventes.filter((x) => x.date.startsWith(month)).length,
    ca_pharmacie: ventes.reduce((n, x) => n + total(x) - credited(x), 0),
  };
}

/** Paiement (partiel ou solde), tracé ; refusé s'il dépasse le reste dû. */
export function addPayment(id: string, montant: number, mode: string, by: string, now = new Date()): DemoInvoice | Failure {
  const inv = INVOICES.find((x) => x.id === id);
  if (!inv) return notFound;
  if (!PAYMENT_MODES.includes(mode as never)) return { status: 422, code: 'invalid', message: 'Mode de paiement inconnu' };
  if (!Number.isInteger(montant) || montant < 1) return { status: 422, code: 'invalid', message: 'Le montant doit être un nombre entier positif' };
  if (statusOf(inv) === 'annulee') return { status: 409, code: 'cancelled', message: 'Cette facture est annulée' };
  if (montant > remaining(inv)) return { status: 422, code: 'overpayment', message: `Le montant dépasse le reste dû (${remaining(inv)} FCFA)` };
  inv.payments.push({ id: `p${Date.now()}-${inv.payments.length}`, date: iso(now), montant, mode, by });
  return inv;
}

/** Spécification (insémination) : le tarif d'un acte peut changer tant que sa facture n'a reçu aucun paiement. */
export function reprice(id: string, lines: InvoiceLine[]): DemoInvoice | Failure {
  const inv = INVOICES.find((x) => x.id === id);
  if (!inv) return notFound;
  if (inv.payments.length > 0) return { status: 409, code: 'already_paid', message: 'Le tarif ne peut plus changer : la facture a déjà reçu un paiement' };
  inv.lines = lines;
  return inv;
}

/** Avoir (note de crédit) : la seule façon de corriger une facture émise. */
export function addCredit(id: string, montant: number, motif: string, by: string, now = new Date()): DemoInvoice | Failure {
  const inv = INVOICES.find((x) => x.id === id);
  if (!inv) return notFound;
  if (!motif.trim()) return { status: 422, code: 'invalid', message: "Le motif de l'avoir est obligatoire" };
  const available = total(inv) - credited(inv);
  if (!Number.isInteger(montant) || montant < 1 || montant > available) return { status: 422, code: 'invalid', message: `Le montant de l'avoir doit être compris entre 1 et ${available} FCFA` };
  const n = INVOICES.reduce((c, x) => c + x.credits.length, 0) + 1;
  inv.credits.push({ id: `c${n}`, numero: `AV-${String(n).padStart(4, '0')}`, date: iso(now), montant, motif: motif.trim(), by });
  return inv;
}

export function listInvoices(p: { q?: string; statut?: string; ownerId?: string; source?: string; du?: string; au?: string; page: number; pageSize: number }) {
  const q = (p.q ?? '').trim().toLowerCase();
  const rows = INVOICES
    .filter((x) => !q || `${x.numero} ${x.clientLabel} ${PATIENTS.find((pt) => pt.id === x.patientId)?.nom ?? ''}`.toLowerCase().includes(q))
    .filter((x) => !p.du || x.date >= p.du)
    .filter((x) => !p.au || x.date <= p.au)
    .filter((x) => !p.statut || statusOf(x) === p.statut)
    .filter((x) => !p.ownerId || x.ownerId === p.ownerId)
    .filter((x) => !p.source || x.source === p.source)
    .sort((a, b) => Number(b.id) - Number(a.id));
  const start = (p.page - 1) * p.pageSize;
  return { items: rows.slice(start, start + p.pageSize), total: rows.length };
}
