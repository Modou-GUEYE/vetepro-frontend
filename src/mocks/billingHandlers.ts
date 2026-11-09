import { http, HttpResponse } from 'msw';
import { authorize } from './authorize';
import * as bill from './billingDb';
import * as pharm from './pharmacyDb';
import { OWNERS, PATIENTS, ownerName } from './patientsDb';
import type { Failure } from './profilesDb';
import { CANAL_LABEL, sendToOwner } from './notifDb';

const fail = (f: Failure) => HttpResponse.json({ code: f.code, message: f.message }, { status: f.status });
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'code' in x && 'status' in x && !('id' in x);

export const invoiceSummary = (i: bill.DemoInvoice) => {
  const patient = PATIENTS.find((p) => p.id === i.patientId);
  return {
    id: i.id, numero: i.numero, date: i.date, source: i.source, client: { id: i.ownerId, nom: i.clientLabel }, patient: patient ? { id: patient.id, nom: patient.nom } : null,
    total: bill.total(i), paye: bill.paid(i), reste: bill.remaining(i), statut: bill.statusOf(i),
  };
};
export const invoiceDetail = (i: bill.DemoInvoice) => {
  const owner = OWNERS.find((o) => o.id === i.ownerId);
  return {
    ...invoiceSummary(i), consultation_id: i.consultationId, notes: i.notes, remise_pct: i.remisePct,
    sous_total: bill.subtotal(i), remise: bill.subtotal(i) - bill.total(i),
    client: { id: i.ownerId, nom: owner ? ownerName(owner) : i.clientLabel, telephone: owner?.telephone ?? '', email: owner?.email ?? '' },
    lignes: i.lines.map((l) => ({ description: l.description, quantite: l.quantite, prix_unitaire: l.prixUnitaire, total: l.quantite * l.prixUnitaire })),
    paiements: i.payments.map((p) => ({ id: p.id, date: p.date, montant: p.montant, mode: p.mode, par: p.by })),
    avoirs: i.credits.map((c) => ({ id: c.id, numero: c.numero, date: c.date, montant: c.montant, motif: c.motif, par: c.by })),
  };
};

const body = (b: Record<string, unknown>): bill.InvoiceInput => {
  const owner = OWNERS.find((o) => o.id === String(b.proprietaire_id ?? ''));
  const paiement = b.montant_recu && Number(b.montant_recu) > 0 ? { montant: Number(b.montant_recu), mode: String(b.mode ?? 'Espèces') } : undefined;
  return {
    date: String(b.date ?? new Date().toISOString().slice(0, 10)), source: b.consultation_id ? 'consultation' : 'manuel', ownerId: owner?.id ?? null,
    clientLabel: owner ? ownerName(owner) : 'Client anonyme', patientId: b.patient_id ? String(b.patient_id) : null, consultationId: b.consultation_id ? String(b.consultation_id) : null,
    lines: ((b.lignes as Record<string, unknown>[]) ?? []).map((l) => ({ description: String(l.description ?? ''), quantite: Number(l.quantite), prixUnitaire: Number(l.prix_unitaire) })),
    remisePct: Number(b.remise_pct ?? 0), notes: String(b.notes ?? ''), paiement,
  };
};

export const billingHandlers = [
  http.get('*/factures', ({ request }) => {
    const auth = authorize(request, 'facturation', 'read');
    if ('response' in auth) return auth.response;
    const u = new URL(request.url);
    const page = Number(u.searchParams.get('page') ?? 1), pageSize = Number(u.searchParams.get('page_size') ?? 10);
    const { items, total } = bill.listInvoices({ q: u.searchParams.get('q') ?? '', statut: u.searchParams.get('statut') ?? '', ownerId: u.searchParams.get('proprietaire') ?? '', du: u.searchParams.get('du') ?? '', au: u.searchParams.get('au') ?? '', page, pageSize });
    return HttpResponse.json({ items: items.map(invoiceSummary), total, page, page_size: pageSize, stats: bill.billingStats() });
  }),

  /** Le reçu d'une vente reste lisible avec le seul droit sur les ventes (l'Assistant n'a pas accès à la facturation). */
  http.get('*/factures/:id', ({ request, params }) => {
    const inv = bill.getInvoice(String(params.id));
    if (isFailure(inv)) return fail(inv);
    const auth = authorize(request, inv.source === 'vente' ? 'ventes' : 'facturation', 'read');
    if ('response' in auth) return auth.response;
    return HttpResponse.json(invoiceDetail(inv));
  }),

  http.post('*/factures', async ({ request }) => {
    const auth = authorize(request, 'facturation', 'create');
    if ('response' in auth) return auth.response;
    const inv = bill.createInvoice(body((await request.json()) as Record<string, unknown>), auth.by);
    return isFailure(inv) ? fail(inv) : HttpResponse.json(invoiceDetail(inv), { status: 201 });
  }),

  http.post('*/factures/:id/paiements', async ({ request, params }) => {
    const auth = authorize(request, 'facturation', 'update');
    if ('response' in auth) return auth.response;
    const { montant, mode } = (await request.json()) as { montant: number; mode: string };
    const inv = bill.addPayment(String(params.id), Number(montant), String(mode), auth.by);
    return isFailure(inv) ? fail(inv) : HttpResponse.json(invoiceDetail(inv));
  }),

  /** Envoi du reçu au propriétaire par e-mail, SMS ou WhatsApp ; l'envoi est gardé au journal, réussi ou non. */
  http.post('*/factures/:id/recu/envoi', async ({ request, params }) => {
    const inv = bill.getInvoice(String(params.id));
    if (isFailure(inv)) return fail(inv);
    const auth = authorize(request, inv.source === 'vente' ? 'ventes' : 'facturation', 'read');
    if ('response' in auth) return auth.response;
    const asked = ((await request.json().catch(() => ({}))) as { canal?: string }).canal;
    const canal = asked === 'sms' || asked === 'whatsapp' ? asked : 'email';
    const owner = OWNERS.find((o) => o.id === inv.ownerId);
    if (!owner) return fail({ status: 422, code: 'no_owner', message: 'Cette facture n\'est pas rattachée à un propriétaire' });
    const log = sendToOwner(owner, canal, `Reçu ${inv.numero}`, `facture:${inv.id}`);
    return log.statut === 'envoye' ? HttpResponse.json({ envoye_a: log.destinataire, canal }) : fail({ status: 422, code: canal === 'email' ? 'no_email' : 'no_phone', message: `Envoi par ${CANAL_LABEL[canal]} impossible : ${log.erreur}` });
  }),

  http.post('*/factures/:id/avoirs', async ({ request, params }) => {
    const auth = authorize(request, 'facturation', 'delete');
    if ('response' in auth) return auth.response;
    const { montant, motif } = (await request.json()) as { montant: number; motif: string };
    const inv = bill.addCredit(String(params.id), Number(montant), String(motif ?? ''), auth.by);
    return isFailure(inv) ? fail(inv) : HttpResponse.json(invoiceDetail(inv));
  }),

  http.get('*/pharmacie/ventes', ({ request }) => {
    const auth = authorize(request, 'ventes', 'read');
    if ('response' in auth) return auth.response;
    const u = new URL(request.url);
    const page = Number(u.searchParams.get('page') ?? 1), pageSize = Number(u.searchParams.get('page_size') ?? 10);
    const { items, total } = bill.listInvoices({ source: 'vente', page, pageSize });
    return HttpResponse.json({ items: items.map((i) => ({ ...invoiceSummary(i), articles: i.lines.map((l) => `${l.description} ×${l.quantite}`) })), total, page, page_size: pageSize });
  }),

  http.post('*/pharmacie/ventes', async ({ request }) => {
    const auth = authorize(request, 'ventes', 'create');
    if ('response' in auth) return auth.response;
    const b = (await request.json()) as Record<string, unknown>;
    const inv = pharm.createSale({
      date: String(b.date ?? new Date().toISOString().slice(0, 10)), ownerId: b.proprietaire_id ? String(b.proprietaire_id) : null, mode: String(b.mode ?? ''), notes: String(b.notes ?? ''),
      lignes: ((b.lignes as Record<string, unknown>[]) ?? []).map((l) => ({ articleId: String(l.article_id), quantite: Number(l.quantite) })),
    }, auth.by);
    return isFailure(inv) ? fail(inv) : HttpResponse.json(invoiceDetail(inv), { status: 201 });
  }),
];
