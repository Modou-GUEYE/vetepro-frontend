import { http, HttpResponse } from 'msw';
import { authorize } from './authorize';
import * as db from './accountsDb';
import { OWNERS, ownerName } from './patientsDb';
import type { Failure } from './profilesDb';

const fail = (f: Failure) => HttpResponse.json({ code: f.code, message: f.message }, { status: f.status });
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'code' in x && 'status' in x && !('id' in x);

const accountDto = (c: db.DemoAccount) => ({ id: c.id, type: c.type, nom: c.nom, institution: c.institution, numero: c.numero, solde: c.solde, principal: c.principal, canal: c.canal });
const aliasDto = (a: db.DemoAlias) => ({ id: a.id, compte: db.getAccount(a.compteId)?.nom ?? '', compte_id: a.compteId, type: a.type, valeur: a.valeur, defaut: a.defaut, actif: a.actif, date: a.date });
const transferDto = (t: db.DemoTransfer) => ({ id: t.id, reference: t.ref, date: t.date, type: t.type, depuis: db.getAccount(t.deId)?.nom ?? '', beneficiaires: t.benefs, montant: t.montant, motif: t.motif, statut: t.statut });
const requestDto = (d: db.DemoRequest) => ({ id: d.id, reference: d.ref, date: d.date, type: d.type, canal: d.canal, motif: d.motif, echeance: d.echeance, destinataires: d.destinataires, montant: d.destinataires.reduce((n, r) => n + r.montant, 0), avancement: db.requestStatus(d) });

export const accountsHandlers = [
  http.get('*/comptes', ({ request }) => {
    const auth = authorize(request, 'comptes', 'read');
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ items: db.listAccounts().map(accountDto), solde_total: db.totalBalance(), operations: db.operations().slice(0, 10) });
  }),

  http.get('*/comptes/alias', ({ request }) => {
    const auth = authorize(request, 'comptes', 'read');
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ items: db.listAlias().map(aliasDto) });
  }),
  http.post('*/comptes/alias', async ({ request }) => {
    const auth = authorize(request, 'comptes', 'create');
    if ('response' in auth) return auth.response;
    const b = (await request.json()) as { compte_id: string; type: string; valeur: string; defaut?: boolean };
    const a = db.addAlias({ compteId: String(b.compte_id), type: String(b.type), valeur: String(b.valeur ?? ''), defaut: !!b.defaut });
    return isFailure(a) ? fail(a) : HttpResponse.json(aliasDto(a), { status: 201 });
  }),
  http.post('*/comptes/alias/:id/defaut', ({ request, params }) => {
    const auth = authorize(request, 'comptes', 'update');
    if ('response' in auth) return auth.response;
    const a = db.setDefaultAlias(String(params.id));
    return isFailure(a) ? fail(a) : HttpResponse.json(aliasDto(a));
  }),
  http.post('*/comptes/alias/:id/bascule', ({ request, params }) => {
    const auth = authorize(request, 'comptes', 'update');
    if ('response' in auth) return auth.response;
    const a = db.toggleAlias(String(params.id));
    return isFailure(a) ? fail(a) : HttpResponse.json(aliasDto(a));
  }),
  http.delete('*/comptes/alias/:id', ({ request, params }) => {
    const auth = authorize(request, 'comptes', 'delete');
    if ('response' in auth) return auth.response;
    const r = db.deleteAlias(String(params.id));
    return r === true ? new HttpResponse(null, { status: 204 }) : fail(r);
  }),

  http.get('*/comptes/transferts', ({ request }) => {
    const auth = authorize(request, 'comptes', 'read');
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ items: db.listTransfers().map(transferDto) });
  }),
  /** Code de validation envoyé par SMS ; la démonstration le renvoie pour pouvoir le saisir. */
  http.post('*/comptes/transferts/code', ({ request }) => {
    const auth = authorize(request, 'comptes', 'create');
    if ('response' in auth) return auth.response;
    const { code, expireA } = db.requestCode(auth.user.id);
    return HttpResponse.json({ code_demo: code, expire_a: expireA });
  }),
  http.post('*/comptes/transferts', async ({ request }) => {
    const auth = authorize(request, 'comptes', 'create');
    if ('response' in auth) return auth.response;
    const b = (await request.json()) as { type: string; compte_debite: string; compte_credite?: string; montant?: number; beneficiaires?: db.Beneficiary[]; motif: string; code: string };
    const t = db.createTransfer({ type: String(b.type), deId: String(b.compte_debite), versId: b.compte_credite, montant: b.montant === undefined ? undefined : Number(b.montant), benefs: (b.beneficiaires ?? []).map((x) => ({ nom: String(x.nom ?? ''), alias: String(x.alias ?? ''), montant: Number(x.montant) })), motif: String(b.motif ?? ''), code: String(b.code ?? '') }, auth.user.id);
    return isFailure(t) ? fail(t) : HttpResponse.json(transferDto(t), { status: 201 });
  }),

  http.get('*/comptes/demandes', ({ request }) => {
    const auth = authorize(request, 'comptes', 'read');
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ items: db.listRequests().map(requestDto) });
  }),
  http.post('*/comptes/demandes', async ({ request }) => {
    const auth = authorize(request, 'comptes', 'create');
    if ('response' in auth) return auth.response;
    const b = (await request.json()) as { multiple: boolean; canal: string; echeance: string; motif: string; destinataires: db.Beneficiary[] };
    const d = db.createRequest({ multi: !!b.multiple, canal: String(b.canal), echeance: String(b.echeance ?? ''), motif: String(b.motif ?? ''), destinataires: (b.destinataires ?? []).map((x) => ({ nom: String(x.nom ?? ''), alias: String(x.alias ?? ''), montant: Number(x.montant) })) });
    return isFailure(d) ? fail(d) : HttpResponse.json(requestDto(d), { status: 201 });
  }),
  /** Relance ou annulation ; « paye » et « refuse » simulent la réponse du destinataire (démonstration). */
  http.post('*/comptes/demandes/:id/destinataires/:index/:action', ({ request, params }) => {
    const auth = authorize(request, 'comptes', 'update');
    if ('response' in auth) return auth.response;
    const action = String(params.action);
    if (!['relance', 'paye', 'refuse', 'annule'].includes(action)) return fail({ status: 404, code: 'not_found', message: 'Action inconnue' });
    const d = db.actOnRequest(String(params.id), Number(params.index), action as 'relance' | 'paye' | 'refuse' | 'annule');
    return isFailure(d) ? fail(d) : HttpResponse.json(requestDto(d));
  }),

  /** Propriétaires proposés comme destinataires d'une demande de paiement. */
  http.get('*/comptes/clients', ({ request }) => {
    const auth = authorize(request, 'comptes', 'create');
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ items: OWNERS.filter((o) => o.telephone).map((o) => ({ id: o.id, nom: ownerName(o), telephone: o.telephone })) });
  }),
];
