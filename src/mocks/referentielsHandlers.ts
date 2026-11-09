import { http, HttpResponse } from 'msw';
import { Action, ModuleKey, can, effectivePermissions } from '@/core/auth/permissions';
import { DEMO_USERS, DemoUser } from './authDb';
import { getProfile, Failure } from './profilesDb';
import * as db from './referentielsDb';

const fail = (f: Failure) => HttpResponse.json({ code: f.code, message: f.message }, { status: f.status });
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'code' in x && 'status' in x;

function authorize(request: Request, module: ModuleKey, action: Action): { user: DemoUser } | { response: Response } {
  const id = request.headers.get('Authorization')?.match(/^Bearer mock-access-(\d+)$/)?.[1];
  const user = DEMO_USERS.find((u) => u.id === id && !u.deleted && u.actif);
  if (!user) return { response: HttpResponse.json({ code: 'unauthenticated', message: 'Non connecté' }, { status: 401 }) };
  if (!can(effectivePermissions(getProfile(user.profilId)?.permissions ?? {}, user.overrides), module, action)) {
    return { response: HttpResponse.json({ code: 'permission_denied', message: "Vous n'avez pas les droits pour effectuer cette action." }, { status: 403 }) };
  }
  return { user };
}

const serviceDto = (s: db.DemoService) => ({ id: s.id, libelle: s.libelle, categorie: s.categorie, description: s.description, prix: s.prix, actif: s.actif });
const especeDto = (e: db.DemoEspece) => ({ id: e.id, nom: e.nom, description: e.description, vaccins: e.vaccins, actif: e.actif, gestation_jours: e.gestationJours, races: e.races });
const serviceInput = (b: Record<string, unknown>): db.ServiceInput => ({ libelle: String(b.libelle ?? ''), categorie: String(b.categorie ?? ''), description: String(b.description ?? ''), prix: Number(b.prix) });

export const referentielsHandlers = [
  http.get('*/services', ({ request }) => {
    const auth = authorize(request, 'services', 'read');
    if ('response' in auth) return auth.response;
    const u = new URL(request.url);
    const page = Number(u.searchParams.get('page') ?? 1), pageSize = Number(u.searchParams.get('page_size') ?? 10);
    const { items, total } = db.listServices({ q: u.searchParams.get('q') ?? '', categorie: u.searchParams.get('categorie') ?? '', statut: u.searchParams.get('statut') ?? '', page, pageSize });
    return HttpResponse.json({ items: items.map(serviceDto), total, page, page_size: pageSize, categories: db.SERVICE_CATEGORIES, stats: db.serviceStats() });
  }),

  http.post('*/services', async ({ request }) => {
    const auth = authorize(request, 'services', 'create');
    if ('response' in auth) return auth.response;
    const s = db.createService(serviceInput((await request.json()) as Record<string, unknown>));
    return isFailure(s) ? fail(s) : HttpResponse.json(serviceDto(s), { status: 201 });
  }),

  http.put('*/services/:id', async ({ request, params }) => {
    const auth = authorize(request, 'services', 'update');
    if ('response' in auth) return auth.response;
    const s = db.updateService(String(params.id), serviceInput((await request.json()) as Record<string, unknown>));
    return isFailure(s) ? fail(s) : HttpResponse.json(serviceDto(s));
  }),

  http.post('*/services/:id/activate', ({ request, params }) => {
    const auth = authorize(request, 'services', 'update');
    if ('response' in auth) return auth.response;
    const s = db.setServiceActive(String(params.id), true);
    return isFailure(s) ? fail(s) : HttpResponse.json(serviceDto(s));
  }),

  http.post('*/services/:id/deactivate', ({ request, params }) => {
    const auth = authorize(request, 'services', 'update');
    if ('response' in auth) return auth.response;
    const s = db.setServiceActive(String(params.id), false);
    return isFailure(s) ? fail(s) : HttpResponse.json(serviceDto(s));
  }),

  http.delete('*/services/:id', ({ request, params }) => {
    const auth = authorize(request, 'services', 'delete');
    if ('response' in auth) return auth.response;
    const r = db.deleteService(String(params.id));
    return r ? fail(r) : new HttpResponse(null, { status: 204 });
  }),

  /** Liste de choix (ajout d'un patient, rendez-vous) : espèces et races actives, sans droit sur les référentiels. */
  http.get('*/especes/actives', ({ request }) => {
    const id = request.headers.get('Authorization')?.match(/^Bearer mock-access-(\d+)$/)?.[1];
    if (!DEMO_USERS.some((u) => u.id === id && !u.deleted && u.actif)) return HttpResponse.json({ code: 'unauthenticated', message: 'Non connecté' }, { status: 401 });
    return HttpResponse.json({ items: db.activeEspeces().map((e) => ({ id: e.id, nom: e.nom, races: e.races.map((r) => ({ id: r.id, nom: r.nom })) })) });
  }),

  http.get('*/especes', ({ request }) => {
    const auth = authorize(request, 'referentiels', 'read');
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ items: db.ESPECES.map(especeDto) });
  }),

  http.post('*/especes/:id/:action', ({ request, params }) => {
    const auth = authorize(request, 'referentiels', 'update');
    if ('response' in auth) return auth.response;
    const e = db.setEspeceActive(String(params.id), params.action === 'activate');
    return isFailure(e) ? fail(e) : HttpResponse.json(especeDto(e));
  }),

  http.put('*/especes/:id/gestation', async ({ request, params }) => {
    const auth = authorize(request, 'referentiels', 'update');
    if ('response' in auth) return auth.response;
    const { jours } = (await request.json()) as { jours: number | null };
    const e = db.setGestation(String(params.id), jours);
    return isFailure(e) ? fail(e) : HttpResponse.json(especeDto(e));
  }),

  http.post('*/races/:id/:action', ({ request, params }) => {
    const auth = authorize(request, 'referentiels', 'update');
    if ('response' in auth) return auth.response;
    const e = db.setRaceActive(String(params.id), params.action === 'activate');
    return isFailure(e) ? fail(e) : HttpResponse.json(especeDto(e));
  }),
];
