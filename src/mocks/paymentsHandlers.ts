import { http, HttpResponse } from 'msw';
import { authorize } from './authorize';
import * as db from './paymentsDb';
import { getInvoice, remaining, statusOf, INVOICES } from './billingDb';
import { OWNERS } from './patientsDb';
import type { Failure } from './profilesDb';

const fail = (f: Failure) => HttpResponse.json({ code: f.code, message: f.message }, { status: f.status });
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'code' in x && 'status' in x && !('id' in x);

const txDto = (t: db.DemoTx) => {
  const inv = t.factureId ? getInvoice(t.factureId) : null;
  return {
    id: t.id, reference: t.ref, date: t.date, facture: inv && !('status' in inv) ? { id: inv.id, numero: inv.numero, reste: remaining(inv) } : null, canal: t.canal, methode: t.methode,
    payeur: t.payeur, alias: t.alias, montant: t.montant, libelle: t.libelle, statut: t.statut, motif: t.motif, rembourse: t.rembourse, expire_a: t.expireA,
    historique: t.historique.map((h) => ({ statut: h.statut, date: h.date })),
  };
};
const suspensDto = (s: db.DemoSuspens) => {
  const inv = s.factureId ? getInvoice(s.factureId) : null;
  return { id: s.id, reference: s.ref, date: s.date, canal: s.canal, payeur: s.payeur, alias: s.alias, montant: s.montant, libelle: s.libelle, statut: s.statut, facture: inv && !('status' in inv) ? inv.numero : null };
};
const refundDto = (r: db.DemoRefund) => ({ id: r.id, reference: r.reference, date: r.date, origine: r.origine, beneficiaire: r.beneficiaire, canal: r.canal, montant: r.montant, motif: r.motif, avoir: r.avoir, par: r.by });
const digits = (v: string) => v.replace(/\D/g, '');

/** Paiements électroniques : l'opérateur (Wave, Orange Money) est simulé ; la facture n'est mise à jour qu'à la confirmation. */
export const paymentsHandlers = [
  http.get('*/paiements/transactions', ({ request }) => {
    const auth = authorize(request, 'paiements', 'read');
    if ('response' in auth) return auth.response;
    const q = new URL(request.url).searchParams;
    const items = db.listTx({ statut: q.get('statut') ?? '', canal: q.get('canal') ?? '', q: q.get('q') ?? '', du: q.get('du') ?? '', au: q.get('au') ?? '' });
    return HttpResponse.json({ items: items.map(txDto), stats: db.paymentStats(), expiration_min: db.getExpirationMin() });
  }),

  /** Suivi d'une transaction : lisible avec le droit d'encaisser une facture ou de lire les paiements. */
  http.get('*/paiements/transactions/:id', ({ request, params }) => {
    const auth = authorize(request, 'facturation', 'read');
    if ('response' in auth) return auth.response;
    const t = db.getTx(String(params.id));
    return isFailure(t) ? fail(t) : HttpResponse.json(txDto(t));
  }),

  /** Lancement depuis une facture (QR code ou demande de paiement) : suit le droit d'encaisser. */
  http.post('*/factures/:id/paiements-electroniques', async ({ request, params }) => {
    const auth = authorize(request, 'facturation', 'update');
    if ('response' in auth) return auth.response;
    const b = (await request.json()) as { canal: string; methode: string; alias?: string; montant: number };
    const t = db.createTx({ factureId: String(params.id), canal: b.canal, methode: b.methode, alias: String(b.alias ?? ''), montant: Number(b.montant) });
    return isFailure(t) ? fail(t) : HttpResponse.json(txDto(t), { status: 201 });
  }),

  /** Nouveau paiement depuis l'écran Paiements : sur une facture ouverte, ou paiement libre sans facture. */
  http.post('*/paiements/transactions', async ({ request }) => {
    const auth = authorize(request, 'paiements', 'create');
    if ('response' in auth) return auth.response;
    const b = (await request.json()) as { facture_id?: string | null; canal: string; methode: string; alias?: string; montant: number; libelle?: string };
    const t = db.createTx({ factureId: b.facture_id ? String(b.facture_id) : null, canal: b.canal, methode: b.methode, alias: String(b.alias ?? ''), montant: Number(b.montant), libelle: b.libelle });
    return isFailure(t) ? fail(t) : HttpResponse.json(txDto(t), { status: 201 });
  }),

  http.post('*/paiements/transactions/:id/annulation', ({ request, params }) => {
    const auth = authorize(request, 'facturation', 'update');
    if ('response' in auth) return auth.response;
    const t = db.cancelTx(String(params.id));
    return isFailure(t) ? fail(t) : HttpResponse.json(txDto(t));
  }),

  http.post('*/paiements/transactions/:id/relance', ({ request, params }) => {
    const auth = authorize(request, 'facturation', 'update');
    if ('response' in auth) return auth.response;
    const t = db.relaunchTx(String(params.id));
    return isFailure(t) ? fail(t) : HttpResponse.json(txDto(t), { status: 201 });
  }),

  /** Démonstration seulement : remplace l'appel de retour de l'opérateur, qui n'existe qu'avec le serveur. */
  http.post('*/paiements/transactions/:id/simulation', async ({ request, params }) => {
    const auth = authorize(request, 'facturation', 'update');
    if ('response' in auth) return auth.response;
    const { resultat } = (await request.json()) as { resultat: 'succes' | 'refus' };
    const t = db.settleTx(String(params.id), resultat === 'refus' ? 'refus' : 'succes', new Date(), 'Solde insuffisant');
    return isFailure(t) ? fail(t) : HttpResponse.json(txDto(t));
  }),

  http.put('*/paiements/parametres', async ({ request }) => {
    const auth = authorize(request, 'paiements', 'update');
    if ('response' in auth) return auth.response;
    const { expiration_min } = (await request.json()) as { expiration_min: number };
    const r = db.setExpiration(Number(expiration_min));
    return isFailure(r) ? fail(r) : HttpResponse.json({ expiration_min: r.expirationMin });
  }),

  http.get('*/paiements/remboursements', ({ request }) => {
    const auth = authorize(request, 'paiements', 'read');
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ items: db.listRefunds().map(refundDto) });
  }),

  /** Remboursement : réservé à l'Administrateur (droit de suppression). */
  http.post('*/paiements/transactions/:id/remboursements', async ({ request, params }) => {
    const auth = authorize(request, 'paiements', 'delete');
    if ('response' in auth) return auth.response;
    const { montant, motif, canal, avoir } = (await request.json()) as { montant: number; motif: string; canal?: string; avoir?: boolean };
    const r = db.refundTx(String(params.id), Number(montant), String(motif ?? ''), auth.by, new Date(), { canal, avoir });
    return isFailure(r) ? fail(r) : HttpResponse.json(refundDto(r), { status: 201 });
  }),

  http.get('*/paiements/non-identifies', ({ request }) => {
    const auth = authorize(request, 'paiements', 'read');
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ items: db.allSuspens().map(suspensDto) });
  }),

  /** Factures encore à régler, pour y rattacher un paiement non identifié. */
  http.get('*/paiements/factures-ouvertes', ({ request }) => {
    const auth = authorize(request, 'paiements', 'update');
    if ('response' in auth) return auth.response;
    const alias = digits(new URL(request.url).searchParams.get('alias') ?? '');
    const phoneOf = (ownerId: string | null) => digits(OWNERS.find((o) => o.id === ownerId)?.telephone ?? '');
    const items = INVOICES.filter((i) => statusOf(i) !== 'annulee' && remaining(i) > 0)
      .map((i) => ({ id: i.id, numero: i.numero, client: i.clientLabel, reste: remaining(i), suggere: !!alias && phoneOf(i.ownerId).length >= 9 && alias.includes(phoneOf(i.ownerId).slice(-9)) }))
      .sort((a, b) => Number(b.suggere) - Number(a.suggere));
    return HttpResponse.json({ items });
  }),

  http.post('*/paiements/non-identifies/:id/rattachement', async ({ request, params }) => {
    const auth = authorize(request, 'paiements', 'update');
    if ('response' in auth) return auth.response;
    const { facture_id } = (await request.json()) as { facture_id: string };
    const s = db.attachSuspens(String(params.id), String(facture_id ?? ''));
    return isFailure(s) ? fail(s) : HttpResponse.json(suspensDto(s));
  }),

  /** Remboursement d'un paiement sans facture identifiable : réservé à l'Administrateur. */
  http.post('*/paiements/non-identifies/:id/remboursement', async ({ request, params }) => {
    const auth = authorize(request, 'paiements', 'delete');
    if ('response' in auth) return auth.response;
    const { motif } = (await request.json()) as { motif: string };
    const r = db.refundSuspens(String(params.id), String(motif ?? ''), auth.by);
    return isFailure(r) ? fail(r) : HttpResponse.json(refundDto(r), { status: 201 });
  }),
];
