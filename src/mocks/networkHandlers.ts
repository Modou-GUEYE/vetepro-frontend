import { http, HttpResponse } from 'msw';
import { authorize, permissionsOf } from './authorize';
import { can } from '@/core/auth/permissions';
import { personOf } from './forumDb';
import * as db from './networkDb';
import { activeEspeces } from './referentielsDb';
import type { Failure } from './profilesDb';

const fail = (f: Failure) => HttpResponse.json({ code: f.code, message: f.message }, { status: f.status });
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'code' in x && 'status' in x && !('id' in x);
const person = (id: string) => { const p = personOf(id); return { id: p.id, nom: p.nom, profil: p.profil }; };
const body = async (r: Request) => (await r.json()) as Record<string, unknown>;
const str = (v: unknown) => String(v ?? '');
const moderates = (user: Parameters<typeof permissionsOf>[0]) => can(permissionsOf(user), 'reseau', 'delete');

const casDto = (c: db.DemoCas, userId: string, canModerate: boolean) => ({
  id: c.id, auteur: person(c.auteurId), clinique: c.clinique, ville: c.ville, espece: c.espece, categorie: c.categorie, titre: c.titre, description: c.description, date: c.date, resolu: c.resolu,
  nb_votes: c.votes.length, a_vote: c.votes.includes(userId), peut_cloturer: !c.resolu && (c.auteurId === userId || canModerate),
  avis: c.avis.map((a) => ({ id: a.id, auteur: person(a.auteurId), ville: a.ville, texte: a.texte, date: a.date })),
});
const epiDto = (e: db.DemoEpi, userId: string, canModerate: boolean) => ({
  id: e.id, maladie: e.maladie, espece: e.espece, ville: e.ville, cas: e.cas, gravite: e.gravite, statut: e.statut, declarant: person(e.declarantId), clinique: e.clinique, date: e.date, notes: e.notes,
  peut_resoudre: e.statut !== 'resolu' && (e.declarantId === userId || canModerate),
});

export const networkHandlers = [
  /** Espèces proposées dans les formulaires du réseau (liste du cabinet, lisible sans droit sur les référentiels). */
  http.get('*/reseau/especes-actives', ({ request }) => {
    const auth = authorize(request, 'reseau', 'read');
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ items: activeEspeces().map((e) => e.nom) });
  }),

  http.get('*/reseau/cas', ({ request }) => {
    const auth = authorize(request, 'reseau', 'read');
    if ('response' in auth) return auth.response;
    const q = new URL(request.url).searchParams;
    const mod = moderates(auth.user);
    const items = db.listCas({ q: q.get('q') ?? '', espece: q.get('espece') ?? '', statut: q.get('statut') ?? '' });
    return HttpResponse.json({ items: items.map((c) => casDto(c, auth.user.id, mod)), especes: db.casEspeces() });
  }),

  http.post('*/reseau/cas', async ({ request }) => {
    const auth = authorize(request, 'reseau', 'create');
    if ('response' in auth) return auth.response;
    const b = await body(request);
    const c = db.createCas({ titre: str(b.titre), espece: str(b.espece), categorie: str(b.categorie), description: str(b.description) }, auth.user.id);
    return isFailure(c) ? fail(c) : HttpResponse.json(casDto(c, auth.user.id, moderates(auth.user)), { status: 201 });
  }),

  http.post('*/reseau/cas/:id/avis', async ({ request, params }) => {
    const auth = authorize(request, 'reseau', 'create');
    if ('response' in auth) return auth.response;
    const c = db.addAvis(String(params.id), str((await body(request)).texte), auth.user.id);
    return isFailure(c) ? fail(c) : HttpResponse.json(casDto(c, auth.user.id, moderates(auth.user)), { status: 201 });
  }),

  http.post('*/reseau/cas/:id/utile', ({ request, params }) => {
    const auth = authorize(request, 'reseau', 'create');
    if ('response' in auth) return auth.response;
    const c = db.toggleUtile(String(params.id), auth.user.id);
    return isFailure(c) ? fail(c) : HttpResponse.json(casDto(c, auth.user.id, moderates(auth.user)));
  }),

  http.post('*/reseau/cas/:id/cloture', ({ request, params }) => {
    const auth = authorize(request, 'reseau', 'create');
    if ('response' in auth) return auth.response;
    const mod = moderates(auth.user);
    const c = db.resolveCas(String(params.id), auth.user.id, mod);
    return isFailure(c) ? fail(c) : HttpResponse.json(casDto(c, auth.user.id, mod));
  }),

  http.get('*/reseau/epidemies', ({ request }) => {
    const auth = authorize(request, 'reseau', 'read');
    if ('response' in auth) return auth.response;
    const q = new URL(request.url).searchParams;
    const mod = moderates(auth.user);
    return HttpResponse.json({ items: db.listEpidemies({ q: q.get('q') ?? '', gravite: q.get('gravite') ?? '' }).map((e) => epiDto(e, auth.user.id, mod)), stats: db.epiStats(), alertes: db.alertes() });
  }),

  /** Compteur du menu : foyers actifs. */
  http.get('*/reseau/epidemies/actifs', ({ request }) => {
    const auth = authorize(request, 'reseau', 'read');
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ actifs: db.activeCount() });
  }),

  http.post('*/reseau/epidemies', async ({ request }) => {
    const auth = authorize(request, 'reseau', 'create');
    if ('response' in auth) return auth.response;
    const b = await body(request);
    const out = db.createEpidemie({ maladie: str(b.maladie), espece: str(b.espece), ville: str(b.ville), cas: Number(b.cas), gravite: str(b.gravite), notes: str(b.notes) }, auth.user.id);
    return isFailure(out) ? fail(out) : HttpResponse.json({ ...epiDto(out.foyer, auth.user.id, moderates(auth.user)), alerte_declenchee: out.alerteDeclenchee }, { status: 201 });
  }),

  http.post('*/reseau/epidemies/:id/resolution', ({ request, params }) => {
    const auth = authorize(request, 'reseau', 'create');
    if ('response' in auth) return auth.response;
    const mod = moderates(auth.user);
    const e = db.resolveEpidemie(String(params.id), auth.user.id, mod);
    return isFailure(e) ? fail(e) : HttpResponse.json(epiDto(e, auth.user.id, mod));
  }),

  http.get('*/reseau/annuaire', ({ request }) => {
    const auth = authorize(request, 'reseau', 'read');
    if ('response' in auth) return auth.response;
    const q = new URL(request.url).searchParams.get('q') ?? '';
    return HttpResponse.json({ items: db.listAnnuaire(q).map((a) => ({ id: a.id, nom: a.nom, clinique: a.clinique, ville: a.ville, telephone: a.telephone, email: a.email, specialites: a.specialites, equipements: a.equipements })) });
  }),

  http.post('*/reseau/annuaire/:id/orientations', async ({ request, params }) => {
    const auth = authorize(request, 'reseau', 'create');
    if ('response' in auth) return auth.response;
    const b = await body(request);
    const o = db.orienter(String(params.id), { patientId: str(b.patient_id), motif: str(b.motif) }, auth.by);
    return isFailure(o) ? fail(o) : HttpResponse.json({ id: o.id, patient: o.patient, confrere: db.ANNUAIRE.find((a) => a.id === o.confrereId)?.nom ?? '' }, { status: 201 });
  }),
];
