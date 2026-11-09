import { http, HttpResponse } from 'msw';
import { authorize } from './authorize';
import * as db from './vaccDb';
import { OWNERS, PATIENTS, ownerName, patientEspece, patientRace } from './patientsDb';
import { ESPECES } from './referentielsDb';
import type { Failure } from './profilesDb';

const fail = (f: Failure) => HttpResponse.json({ code: f.code, message: f.message }, { status: f.status });
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'code' in x && 'status' in x && !('id' in x);

const dto = (v: db.DemoVaccination) => {
  const p = PATIENTS.find((x) => x.id === v.patientId);
  const o = OWNERS.find((x) => x.id === p?.ownerId);
  return {
    id: v.id, vaccin: v.vaccin, date: v.date, rappel: v.rappel, statut: db.rappelStatut(v.rappel), lot: v.lot, notes: v.notes,
    tarif: v.tarif, numero: v.numero, facture_id: v.factureId,
    patient: p ? { id: p.id, nom: p.nom, espece: patientEspece(p).nom } : null,
    proprietaire: o ? { id: o.id, nom: ownerName(o), telephone: o.telephone, adresse: o.adresse } : null,
  };
};
/** Facture imprimable VAC-xxxx : propriétaire, animal complet, vaccin, lot, notes, prochain rappel et montant. */
const document = (v: db.DemoVaccination) => {
  const p = PATIENTS.find((x) => x.id === v.patientId);
  return { ...dto(v), animal: p ? { nom: p.nom, espece: patientEspece(p).nom, race: patientRace(p)?.nom ?? '', sexe: p.sexe, puce: '' } : null };
};

const campagne = (c: db.DemoCampagne) => ({
  id: c.id, nom: c.nom, espece: { id: c.especeId, nom: ESPECES.find((e) => e.id === c.especeId)?.nom ?? '' }, vaccin: c.vaccin, zone: c.zone, date: c.date,
  vises: c.vises, vaccines: c.animaux.length, progression: db.progression(c), statut: c.statut,
  animaux: c.animaux.map((a) => ({ id: a.id, animal: a.animal, proprietaire: a.proprietaire, vaccin: a.vaccin, date: a.date })),
});

export const vaccHandlers = [
  http.get('*/vaccinations', ({ request }) => {
    const auth = authorize(request, 'vaccinations', 'read');
    if ('response' in auth) return auth.response;
    db.sendDueReminders();
    const items = db.listVaccinations({ q: new URL(request.url).searchParams.get('q') ?? '' });
    return HttpResponse.json({ items: items.map(dto), total: items.length, stats: db.vaccinationStats() });
  }),

  http.post('*/vaccinations', async ({ request }) => {
    const auth = authorize(request, 'vaccinations', 'create');
    if ('response' in auth) return auth.response;
    const b = (await request.json()) as Record<string, unknown>;
    const v = db.createVaccination({
      patientId: String(b.patient_id ?? ''), vaccin: String(b.vaccin ?? ''), date: String(b.date ?? ''), rappel: b.rappel ? String(b.rappel) : null,
      lot: String(b.lot ?? ''), notes: String(b.notes ?? ''), tarif: Number(b.tarif ?? 0),
    }, auth.by);
    return isFailure(v) ? fail(v) : HttpResponse.json(dto(v), { status: 201 });
  }),

  http.get('*/vaccinations/:id', ({ request, params }) => {
    const auth = authorize(request, 'vaccinations', 'read');
    if ('response' in auth) return auth.response;
    const v = db.getVaccination(String(params.id));
    return isFailure(v) ? fail(v) : HttpResponse.json(document(v));
  }),

  http.post('*/vaccinations/:id/facturer', async ({ request, params }) => {
    const auth = authorize(request, 'vaccinations', 'update');
    if ('response' in auth) return auth.response;
    const { tarif } = (await request.json()) as { tarif: number };
    const v = db.billVaccination(String(params.id), Number(tarif), auth.by);
    return isFailure(v) ? fail(v) : HttpResponse.json(dto(v));
  }),

  /** Carnet vaccinal d'un patient (onglet « Vaccins » de la fiche). */
  http.get('*/patients/:id/vaccinations', ({ request, params }) => {
    const auth = authorize(request, 'vaccinations', 'read');
    if ('response' in auth) return auth.response;
    const items = db.vaccinationsOfPatient(String(params.id));
    return HttpResponse.json({ items: items.map(dto), total: items.length });
  }),

  http.get('*/campagnes-vaccination', ({ request }) => {
    const auth = authorize(request, 'vaccinations', 'read');
    if ('response' in auth) return auth.response;
    const items = db.listCampagnes();
    return HttpResponse.json({ items: items.map(campagne), total: items.length });
  }),

  http.post('*/campagnes-vaccination', async ({ request }) => {
    const auth = authorize(request, 'vaccinations', 'create');
    if ('response' in auth) return auth.response;
    const b = (await request.json()) as Record<string, unknown>;
    const c = db.createCampagne({
      nom: String(b.nom ?? ''), especeId: String(b.espece_id ?? ''), vaccin: String(b.vaccin ?? ''), zone: String(b.zone ?? ''), date: String(b.date ?? ''),
      vises: b.vises === null || b.vises === undefined || b.vises === '' ? null : Number(b.vises),
    });
    return isFailure(c) ? fail(c) : HttpResponse.json(campagne(c), { status: 201 });
  }),

  http.post('*/campagnes-vaccination/:id/animaux', async ({ request, params }) => {
    const auth = authorize(request, 'vaccinations', 'update');
    if ('response' in auth) return auth.response;
    const b = (await request.json()) as Record<string, unknown>;
    const c = db.addCampagneAnimal(String(params.id), { animal: String(b.animal ?? ''), proprietaire: String(b.proprietaire ?? ''), vaccin: String(b.vaccin ?? '') });
    return isFailure(c) ? fail(c) : HttpResponse.json(campagne(c), { status: 201 });
  }),

  http.delete('*/campagnes-vaccination/:id/animaux/:animalId', ({ request, params }) => {
    const auth = authorize(request, 'vaccinations', 'update');
    if ('response' in auth) return auth.response;
    const c = db.removeCampagneAnimal(String(params.id), String(params.animalId));
    return isFailure(c) ? fail(c) : HttpResponse.json(campagne(c));
  }),

  http.post('*/campagnes-vaccination/:id/:action', ({ request, params }) => {
    const auth = authorize(request, 'vaccinations', 'update');
    if ('response' in auth) return auth.response;
    const action = String(params.action);
    if (action !== 'lancer' && action !== 'cloturer') return HttpResponse.json({ code: 'not_found', message: 'Action inconnue' }, { status: 404 });
    const c = db.changeCampagneStatus(String(params.id), action);
    return isFailure(c) ? fail(c) : HttpResponse.json(campagne(c));
  }),
];
