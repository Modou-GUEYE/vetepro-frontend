import { http, HttpResponse } from 'msw';
import { authorize } from './authorize';
import * as db from './inseminDb';
import { newPatientBody } from './rdvHandlers';
import { OWNERS, PATIENTS, ownerName, patientEspece, patientRace } from './patientsDb';
import type { Failure } from './profilesDb';

const fail = (f: Failure) => HttpResponse.json({ code: f.code, message: f.message }, { status: f.status });
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'code' in x && 'status' in x && !('id' in x);

const patientDto = (id: string) => {
  const p = PATIENTS.find((x) => x.id === id);
  if (!p) return null;
  return { id: p.id, nom: p.nom, type: p.type, sexe: p.sexe, espece: patientEspece(p).nom, espece_id: p.especeId, race: patientRace(p)?.nom ?? '', provisoire: !!p.provisoire, effectif: p.effectif };
};
const ownerDto = (patientId: string) => {
  const o = OWNERS.find((x) => x.id === PATIENTS.find((p) => p.id === patientId)?.ownerId);
  return o ? { id: o.id, nom: ownerName(o), telephone: o.telephone } : null;
};

const dto = (a: db.DemoInsemination) => ({
  id: a.id, numero: a.numero, date: a.date, methode: a.methode, statut: a.statut, observations: a.observations,
  patient: patientDto(a.patientId), proprietaire: ownerDto(a.patientId),
  veterinaire: a.vetId ? { id: a.vetId, nom: db.insemVetName(a.vetId) } : null,
  semence: { race_geniteur: a.semence.raceGeniteur, nom_geniteur: a.semence.nomGeniteur, lot: a.semence.lot, dose: a.semence.dose, origine: a.semence.origine, date_collecte: a.semence.dateCollecte },
  tarif: a.tarif, mode_paiement: a.modePaiement, facture: db.factureOf(a),
  diagnostic: a.diagnostic ? { date: a.diagnostic.date, methode: a.diagnostic.methode, resultat: a.diagnostic.resultat } : null,
  resultat: a.diagnostic?.resultat ?? 'attente',
  mise_bas_prevue: a.miseBasPrevue, mise_bas: a.miseBas ? { date: a.miseBas.date, vivants: a.miseBas.vivants, morts: a.miseBas.morts, observations: a.miseBas.observations } : null,
  historique: a.history,
});

const rappelDto = (r: db.Rappel) => ({
  id: r.id, type: r.type, date: r.date, texte: r.texte, statut: r.statut, envoye: r.envoye, canaux: ['SMS'],
  patient: patientDto(r.acte.patientId), proprietaire: ownerDto(r.acte.patientId), acte: { id: r.acte.id, numero: r.acte.numero },
});

const input = (b: Record<string, unknown>): db.InsemInput => {
  const s = (b.semence ?? {}) as Record<string, unknown>;
  return {
    patientId: b.patient_id ? String(b.patient_id) : null, nouveauPatient: newPatientBody(b.nouveau_patient as Record<string, unknown> | undefined),
    date: String(b.date ?? ''), methode: String(b.methode ?? ''), vetId: b.veterinaire_id ? String(b.veterinaire_id) : null, statut: String(b.statut ?? ''), observations: String(b.observations ?? ''),
    semence: { raceGeniteur: String(s.race_geniteur ?? ''), nomGeniteur: String(s.nom_geniteur ?? ''), lot: String(s.lot ?? ''), dose: String(s.dose ?? ''), origine: String(s.origine ?? ''), dateCollecte: s.date_collecte ? String(s.date_collecte) : null },
    tarif: Number(b.tarif ?? 0), modePaiement: String(b.mode_paiement ?? ''), confirmerDoublon: !!b.confirmer_doublon, confirmerReinitialisation: !!b.confirmer_reinitialisation,
  };
};

export const insemHandlers = [
  http.get('*/inseminations', ({ request }) => {
    const auth = authorize(request, 'insemination', 'read');
    if ('response' in auth) return auth.response;
    db.flagReminders();
    const u = new URL(request.url).searchParams;
    const items = db.listInseminations({ filtre: u.get('filtre') ?? '', q: u.get('q') ?? '', du: u.get('du') ?? '', au: u.get('au') ?? '', especeId: u.get('espece') ?? '', methode: u.get('methode') ?? '', vetId: u.get('veterinaire') ?? '' });
    return HttpResponse.json({ items: items.map(dto), total: items.length, stats: db.insemStats() });
  }),

  http.get('*/inseminations/gestations', ({ request }) => {
    const auth = authorize(request, 'insemination', 'read');
    if ('response' in auth) return auth.response;
    db.flagReminders();
    return HttpResponse.json({
      items: db.gestations().map((g) => ({ acte: dto(g.acte), jours_restants: g.joursRestants, progression: g.progression, etat: g.etat })),
      seuil_imminent: db.SETTINGS.imminentJours,
    });
  }),

  http.get('*/inseminations/rappels', ({ request }) => {
    const auth = authorize(request, 'insemination', 'read');
    if ('response' in auth) return auth.response;
    db.flagReminders();
    return HttpResponse.json({ items: db.rappels().map(rappelDto), delai_diagnostic: db.SETTINGS.diagnosticDelaiJours, delai_mise_bas: db.SETTINGS.rappelMiseBasJours });
  }),

  http.post('*/inseminations/rappels/:id/envoyer', ({ request, params }) => {
    const auth = authorize(request, 'insemination', 'update');
    if ('response' in auth) return auth.response;
    const out = db.sendRappel(String(params.id));
    return isFailure(out) ? fail(out) : HttpResponse.json({ rappel: rappelDto(out.rappel), ok: out.ok, message: out.message });
  }),

  http.get('*/inseminations/:id', ({ request, params }) => {
    const auth = authorize(request, 'insemination', 'read');
    if ('response' in auth) return auth.response;
    const a = db.getInsemination(String(params.id));
    return isFailure(a) ? fail(a) : HttpResponse.json(dto(a));
  }),

  http.post('*/inseminations', async ({ request }) => {
    const auth = authorize(request, 'insemination', 'create');
    if ('response' in auth) return auth.response;
    const a = db.createInsemination(input((await request.json()) as Record<string, unknown>), auth.by);
    return isFailure(a) ? fail(a) : HttpResponse.json(dto(a), { status: 201 });
  }),

  http.put('*/inseminations/:id', async ({ request, params }) => {
    const auth = authorize(request, 'insemination', 'update');
    if ('response' in auth) return auth.response;
    const a = db.updateInsemination(String(params.id), input((await request.json()) as Record<string, unknown>), auth.by);
    return isFailure(a) ? fail(a) : HttpResponse.json(dto(a));
  }),

  http.post('*/inseminations/:id/diagnostic', async ({ request, params }) => {
    const auth = authorize(request, 'insemination', 'update');
    if ('response' in auth) return auth.response;
    const b = (await request.json()) as Record<string, unknown>;
    const a = db.diagnose(String(params.id), { date: String(b.date ?? ''), methode: String(b.methode ?? ''), resultat: String(b.resultat ?? ''), miseBasPrevue: b.mise_bas_prevue ? String(b.mise_bas_prevue) : null }, auth.by);
    return isFailure(a) ? fail(a) : HttpResponse.json(dto(a));
  }),

  http.post('*/inseminations/:id/mise-bas', async ({ request, params }) => {
    const auth = authorize(request, 'insemination', 'update');
    if ('response' in auth) return auth.response;
    const b = (await request.json()) as Record<string, unknown>;
    const a = db.recordMiseBas(String(params.id), { date: String(b.date ?? ''), vivants: Number(b.vivants ?? 0), morts: Number(b.morts ?? 0), observations: String(b.observations ?? '') }, auth.by);
    return isFailure(a) ? fail(a) : HttpResponse.json(dto(a));
  }),

  http.delete('*/inseminations/:id', async ({ request, params }) => {
    const auth = authorize(request, 'insemination', 'delete');
    if ('response' in auth) return auth.response;
    const motif = ((await request.json().catch(() => ({}))) as { motif?: string }).motif ?? '';
    const out = db.deleteInsemination(String(params.id), motif, auth.by);
    return out ? fail(out) : new HttpResponse(null, { status: 204 });
  }),
];
