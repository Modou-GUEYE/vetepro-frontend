import { http, HttpResponse } from 'msw';
import { authorize } from './authorize';
import * as db from './patientsDb';
import type { Failure } from './profilesDb';

const fail = (f: Failure) => HttpResponse.json({ code: f.code, message: f.message }, { status: f.status });
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'code' in x && 'status' in x && !('id' in x);

const ownerDto = (x: db.DemoOwner) => ({ id: x.id, prenom: x.prenom, nom: x.nom, telephone: x.telephone, email: x.email, adresse: x.adresse, actif: x.actif, nb_patients: db.patientCount(x.id) });
const ownerBody = (b: Record<string, string>): db.OwnerInput => ({ prenom: b.prenom ?? '', nom: b.nom ?? '', telephone: b.telephone ?? '', email: b.email ?? '', adresse: b.adresse ?? '' });

const summary = (p: db.DemoPatient) => {
  const owner = db.OWNERS.find((x) => x.id === p.ownerId);
  return {
    id: p.id, matricule: p.matricule, type: p.type, nom: p.nom, espece: db.patientEspece(p), race: db.patientRace(p),
    sexe: p.sexe, naissance: p.naissance, effectif: p.effectif, provisoire: !!p.provisoire,
    proprietaire: owner ? { id: owner.id, nom: db.ownerName(owner) } : null,
  };
};
const detail = (p: db.DemoPatient) => {
  const owner = db.OWNERS.find((x) => x.id === p.ownerId);
  return {
    ...summary(p), antecedents: p.antecedents, statut_repro: p.statutRepro, femelles: p.femelles, males: p.males, jeunes: p.jeunes,
    localisation: p.localisation, recensement: p.recensement, note: p.note,
    proprietaire: owner ? { id: owner.id, nom: db.ownerName(owner), telephone: owner.telephone, email: owner.email } : null,
    historique: p.history,
  };
};
const patientBody = (b: Record<string, unknown>): db.PatientInput => {
  const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));
  return {
    type: b.type === 'troupeau' ? 'troupeau' : 'animal', ownerId: String(b.proprietaire_id ?? ''), nom: String(b.nom ?? ''), especeId: String(b.espece_id ?? ''),
    raceId: b.race_id ? String(b.race_id) : null, sexe: b.sexe === 'M' || b.sexe === 'F' ? b.sexe : null, naissance: b.naissance ? String(b.naissance) : null,
    antecedents: String(b.antecedents ?? ''), statutRepro: (b.statut_repro as db.StatutRepro) ?? null,
    effectif: num(b.effectif), femelles: num(b.femelles), males: num(b.males), jeunes: num(b.jeunes),
    localisation: String(b.localisation ?? ''), recensement: b.recensement ? String(b.recensement) : null, note: String(b.note ?? ''),
  };
};

export const patientsHandlers = [
  http.get('*/proprietaires/choix', ({ request }) => {
    const auth = authorize(request, 'proprietaires', 'read');
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ items: db.ownerChoices().map((x) => ({ id: x.id, nom: db.ownerName(x), telephone: x.telephone })) });
  }),

  http.get('*/proprietaires', ({ request }) => {
    const auth = authorize(request, 'proprietaires', 'read');
    if ('response' in auth) return auth.response;
    const u = new URL(request.url);
    const page = Number(u.searchParams.get('page') ?? 1), pageSize = Number(u.searchParams.get('page_size') ?? 10);
    const { items, total } = db.listOwners({ q: u.searchParams.get('q') ?? '', statut: u.searchParams.get('statut') ?? '', page, pageSize });
    return HttpResponse.json({ items: items.map(ownerDto), total, page, page_size: pageSize });
  }),

  http.get('*/proprietaires/:id', ({ request, params }) => {
    const auth = authorize(request, 'proprietaires', 'read');
    if ('response' in auth) return auth.response;
    const x = db.getOwner(String(params.id));
    return isFailure(x) ? fail(x) : HttpResponse.json(ownerDto(x));
  }),

  http.post('*/proprietaires', async ({ request }) => {
    const auth = authorize(request, 'proprietaires', 'create');
    if ('response' in auth) return auth.response;
    const x = db.createOwner(ownerBody((await request.json()) as Record<string, string>));
    return isFailure(x) ? fail(x) : HttpResponse.json(ownerDto(x), { status: 201 });
  }),

  http.put('*/proprietaires/:id', async ({ request, params }) => {
    const auth = authorize(request, 'proprietaires', 'update');
    if ('response' in auth) return auth.response;
    const x = db.updateOwner(String(params.id), ownerBody((await request.json()) as Record<string, string>));
    return isFailure(x) ? fail(x) : HttpResponse.json(ownerDto(x));
  }),

  http.post('*/proprietaires/:id/:action', ({ request, params }) => {
    const auth = authorize(request, 'proprietaires', 'update');
    if ('response' in auth) return auth.response;
    const x = db.setOwnerActive(String(params.id), params.action === 'activate');
    return isFailure(x) ? fail(x) : HttpResponse.json(ownerDto(x));
  }),

  http.delete('*/proprietaires/:id', ({ request, params }) => {
    const auth = authorize(request, 'proprietaires', 'delete');
    if ('response' in auth) return auth.response;
    const r = db.deleteOwner(String(params.id));
    return r ? fail(r) : new HttpResponse(null, { status: 204 });
  }),

  http.get('*/patients', ({ request }) => {
    const auth = authorize(request, 'patients', 'read');
    if ('response' in auth) return auth.response;
    const u = new URL(request.url);
    const page = Number(u.searchParams.get('page') ?? 1), pageSize = Number(u.searchParams.get('page_size') ?? 20);
    const { items, total } = db.listPatients({ q: u.searchParams.get('q') ?? '', type: u.searchParams.get('type') ?? '', ownerId: u.searchParams.get('proprietaire') ?? '', page, pageSize });
    return HttpResponse.json({ items: items.map(summary), total, page, page_size: pageSize });
  }),

  http.get('*/patients/:id', ({ request, params }) => {
    const auth = authorize(request, 'patients', 'read');
    if ('response' in auth) return auth.response;
    const p = db.getPatient(String(params.id));
    return isFailure(p) ? fail(p) : HttpResponse.json(detail(p));
  }),

  http.post('*/patients', async ({ request }) => {
    const auth = authorize(request, 'patients', 'create');
    if ('response' in auth) return auth.response;
    const p = db.createPatient(patientBody((await request.json()) as Record<string, unknown>), auth.by);
    return isFailure(p) ? fail(p) : HttpResponse.json(detail(p), { status: 201 });
  }),

  http.put('*/patients/:id', async ({ request, params }) => {
    const auth = authorize(request, 'patients', 'update');
    if ('response' in auth) return auth.response;
    const p = db.updatePatient(String(params.id), patientBody((await request.json()) as Record<string, unknown>), auth.by);
    return isFailure(p) ? fail(p) : HttpResponse.json(detail(p));
  }),
];
