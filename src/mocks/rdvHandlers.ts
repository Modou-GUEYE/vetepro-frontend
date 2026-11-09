import { http, HttpResponse } from 'msw';
import { authorize } from './authorize';
import * as db from './rdvDb';
import { OWNERS, PATIENTS, ownerName, patientEspece } from './patientsDb';
import type { NewPatientInput } from './patientsDb';
import type { SendLog } from './notifDb';
import type { Failure } from './profilesDb';

const fail = (f: Failure) => HttpResponse.json({ code: f.code, message: f.message }, { status: f.status });
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'code' in x && 'status' in x && !('id' in x) && !('rdv' in x);

export const sendDto = (s: SendLog) => ({ id: s.id, date: s.date, canal: s.canal, destinataire: s.destinataire, sujet: s.sujet, statut: s.statut, erreur: s.erreur });

const summary = (r: db.DemoRdv) => {
  const p = PATIENTS.find((x) => x.id === r.patientId);
  const owner = OWNERS.find((o) => o.id === p?.ownerId);
  return {
    id: r.id, date: r.date, heure: r.heure, duree: r.duree, statut: r.statut, motif: r.motif, notes: r.notes, canal: r.canal, consultation_id: r.consultationId,
    veterinaire: { id: r.vetId, nom: db.vetName(r.vetId) },
    patient: p ? { id: p.id, nom: p.nom, espece: patientEspece(p).nom, provisoire: !!p.provisoire } : null,
    proprietaire: owner ? { id: owner.id, nom: ownerName(owner), telephone: owner.telephone, email: owner.email } : null,
    passe: db.startsAt(r) <= new Date(),
  };
};
const detail = (r: db.DemoRdv) => ({ ...summary(r), historique: r.history, envois: db.rdvSends(r.id).map(sendDto) });

export const newPatientBody = (b: Record<string, unknown> | null | undefined): NewPatientInput | null => {
  if (!b) return null;
  const o = b.proprietaire as Record<string, string> | null | undefined;
  return {
    nom: String(b.nom ?? ''), especeId: String(b.espece_id ?? ''), raceId: b.race_id ? String(b.race_id) : null, naissance: b.naissance ? String(b.naissance) : null,
    sexe: b.sexe === 'M' || b.sexe === 'F' ? b.sexe : null, ownerId: b.proprietaire_id ? String(b.proprietaire_id) : null,
    owner: o ? { prenom: o.prenom ?? '', nom: o.nom ?? '', telephone: o.telephone ?? '', email: o.email ?? '' } : null,
  };
};

const body = (b: Record<string, unknown>): db.RdvInput => ({
  date: String(b.date ?? ''), heure: String(b.heure ?? ''), duree: Number(b.duree ?? 30), vetId: String(b.veterinaire_id ?? ''), patientId: b.patient_id ? String(b.patient_id) : null,
  nouveauPatient: newPatientBody(b.nouveau_patient as Record<string, unknown> | undefined), motif: String(b.motif ?? ''), notes: String(b.notes ?? ''), canal: String(b.canal ?? 'sms') as db.RdvInput['canal'],
});

export const rdvHandlers = [
  /** Vétérinaires actifs, proposés au choix sans droit sur les utilisateurs. */
  http.get('*/veterinaires', ({ request }) => {
    const auth = authorize(request, null);
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ items: db.veterinarians().map((u) => ({ id: u.id, nom: db.vetName(u.id), specialite: u.specialite })) });
  }),

  http.get('*/rendez-vous/disponibilites', ({ request }) => {
    const auth = authorize(request, 'rdv', 'read');
    if ('response' in auth) return auth.response;
    const u = new URL(request.url);
    const creneaux = db.availability(u.searchParams.get('veterinaire') ?? '', u.searchParams.get('date') ?? '', Number(u.searchParams.get('duree') ?? 30), new Date(), u.searchParams.get('ignorer') ?? undefined);
    return HttpResponse.json({ creneaux });
  }),

  http.get('*/rendez-vous', ({ request }) => {
    const auth = authorize(request, 'rdv', 'read');
    if ('response' in auth) return auth.response;
    const u = new URL(request.url);
    const items = db.listRdvs({ du: u.searchParams.get('du') ?? '', au: u.searchParams.get('au') ?? '', vetId: u.searchParams.get('veterinaire') ?? '', statut: u.searchParams.get('statut') ?? '', patientId: u.searchParams.get('patient') ?? '', q: u.searchParams.get('q') ?? '' });
    return HttpResponse.json({ items: items.map(summary), total: items.length });
  }),

  http.get('*/rendez-vous/:id', ({ request, params }) => {
    const auth = authorize(request, 'rdv', 'read');
    if ('response' in auth) return auth.response;
    const r = db.getRdv(String(params.id));
    return isFailure(r) ? fail(r) : HttpResponse.json(detail(r));
  }),

  http.post('*/rendez-vous', async ({ request }) => {
    const auth = authorize(request, 'rdv', 'create');
    if ('response' in auth) return auth.response;
    const out = db.createRdv(body((await request.json()) as Record<string, unknown>), auth.by, auth.user.id);
    return isFailure(out) ? fail(out) : HttpResponse.json({ ...detail(out.rdv), envoi: out.envoi && sendDto(out.envoi) }, { status: 201 });
  }),

  http.put('*/rendez-vous/:id', async ({ request, params }) => {
    const auth = authorize(request, 'rdv', 'update');
    if ('response' in auth) return auth.response;
    const out = db.updateRdv(String(params.id), body((await request.json()) as Record<string, unknown>), auth.by, auth.user.id);
    return isFailure(out) ? fail(out) : HttpResponse.json({ ...detail(out.rdv), envoi: out.envoi && sendDto(out.envoi) });
  }),

  http.delete('*/rendez-vous/:id', ({ request, params }) => {
    const auth = authorize(request, 'rdv', 'delete');
    if ('response' in auth) return auth.response;
    const out = db.cancelRdv(String(params.id), auth.by, auth.user.id);
    return isFailure(out) ? fail(out) : HttpResponse.json({ ...detail(out.rdv), envoi: out.envoi && sendDto(out.envoi) });
  }),

  http.post('*/rendez-vous/:id/notifications/renvoyer', ({ request, params }) => {
    const auth = authorize(request, 'rdv', 'update');
    if ('response' in auth) return auth.response;
    const out = db.resend(String(params.id), auth.by, auth.user.id);
    return 'status' in out && 'code' in out ? fail(out as Failure) : HttpResponse.json({ envoi: sendDto(out as SendLog) });
  }),

  http.post('*/rendez-vous/:id/terminer', async ({ request, params }) => {
    const auth = authorize(request, 'rdv', 'update');
    if ('response' in auth) return auth.response;
    const { consultation_id } = (await request.json()) as { consultation_id: string };
    const r = db.completeRdv(String(params.id), String(consultation_id), auth.by);
    return isFailure(r) ? fail(r) : HttpResponse.json(detail(r));
  }),
];
