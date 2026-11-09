import { http, HttpResponse } from 'msw';
import { authorize } from './authorize';
import * as db from './hospiDb';
import { vetName } from './rdvDb';
import { newPatientBody } from './rdvHandlers';
import { OWNERS, PATIENTS, ownerName, patientEspece } from './patientsDb';
import { INVOICES } from './billingDb';
import type { Failure } from './profilesDb';

const fail = (f: Failure) => HttpResponse.json({ code: f.code, message: f.message }, { status: f.status });
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'code' in x && 'status' in x && !('id' in x) && !('hospi' in x);

const summary = (h: db.DemoHospi) => {
  const p = PATIENTS.find((x) => x.id === h.patientId);
  const owner = OWNERS.find((o) => o.id === p?.ownerId);
  const fin = db.stayEnd(h);
  const facture = INVOICES.find((i) => i.id === h.sortie?.factureId);
  return {
    id: h.id, numero: h.numero, statut: h.statut, motif: h.motif, box: h.box, date_entree: h.dateEntree, date_sortie_prevue: h.dateSortiePrevue,
    duree: db.daysBetween(h.dateEntree, fin), total: db.stayTotal(h), en_retard: h.statut === 'encours' && !!h.dateSortiePrevue && h.dateSortiePrevue < new Date().toISOString().slice(0, 10),
    veterinaire: h.vetId ? { id: h.vetId, nom: vetName(h.vetId) } : null,
    patient: p ? { id: p.id, nom: p.nom, espece: patientEspece(p).nom, provisoire: !!p.provisoire } : null,
    proprietaire: owner ? { id: owner.id, nom: ownerName(owner), telephone: owner.telephone, email: owner.email } : null,
    sortie: h.sortie ? { date: h.sortie.date, etat: h.sortie.etat, facture: facture ? { id: facture.id, numero: facture.numero } : null } : null,
  };
};
const detail = (h: db.DemoHospi) => ({
  ...summary(h), observations: h.observations, tarif_jour: h.tarifJour, tarif_consultation: h.tarifConsultation, total_soins: db.careTotal(h),
  compte_rendu: h.sortie?.compteRendu ?? '',
  prescriptions: h.prescriptions.map((p) => ({
    id: p.id, date: p.date, heure: p.heure, veterinaire: p.vetNom, observations: p.observations,
    lignes: p.lignes.map((l) => ({ acte: l.acte, type: l.type, article_id: l.articleId, nom: l.nom, quantite: l.quantite, prix_unitaire: l.prixUnitaire })),
  })),
});

const admissionBody = (b: Record<string, unknown>): db.AdmissionInput => ({
  patientId: b.patient_id ? String(b.patient_id) : null, nouveauPatient: newPatientBody(b.nouveau_patient as Record<string, unknown> | undefined), vetId: b.veterinaire_id ? String(b.veterinaire_id) : null,
  box: String(b.box ?? ''), dateEntree: String(b.date_entree ?? ''), dateSortiePrevue: b.date_sortie_prevue ? String(b.date_sortie_prevue) : null,
  tarifJour: Number(b.tarif_jour), tarifConsultation: Number(b.tarif_consultation ?? 0), motif: String(b.motif ?? ''), observations: String(b.observations ?? ''),
});

export const hospiHandlers = [
  http.get('*/hospitalisations', ({ request }) => {
    const auth = authorize(request, 'hospitalisations', 'read');
    if ('response' in auth) return auth.response;
    db.flagOverdue();
    const u = new URL(request.url);
    const items = db.listHospis({ statut: u.searchParams.get('statut') === 'sorti' ? 'sorti' : 'encours', q: u.searchParams.get('q') ?? '' });
    return HttpResponse.json({ items: items.map(summary), total: items.length, stats: db.hospiStats() });
  }),

  http.get('*/hospitalisations/:id', ({ request, params }) => {
    const auth = authorize(request, 'hospitalisations', 'read');
    if ('response' in auth) return auth.response;
    const h = db.getHospi(String(params.id));
    return isFailure(h) ? fail(h) : HttpResponse.json(detail(h));
  }),

  http.post('*/hospitalisations', async ({ request }) => {
    const auth = authorize(request, 'hospitalisations', 'create');
    if ('response' in auth) return auth.response;
    const h = db.admit(admissionBody((await request.json()) as Record<string, unknown>), auth.by);
    return isFailure(h) ? fail(h) : HttpResponse.json(detail(h), { status: 201 });
  }),

  http.put('*/hospitalisations/:id', async ({ request, params }) => {
    const auth = authorize(request, 'hospitalisations', 'update');
    if ('response' in auth) return auth.response;
    const { patientId: _p, nouveauPatient: _n, ...rest } = admissionBody((await request.json()) as Record<string, unknown>);
    void _p; void _n;
    const h = db.updateHospi(String(params.id), rest);
    return isFailure(h) ? fail(h) : HttpResponse.json(detail(h));
  }),

  http.post('*/hospitalisations/:id/prescriptions', async ({ request, params }) => {
    const auth = authorize(request, 'hospitalisations', 'update');
    if ('response' in auth) return auth.response;
    const b = (await request.json()) as Record<string, unknown>;
    const h = db.prescribe(String(params.id), {
      date: String(b.date ?? ''), heure: String(b.heure ?? ''), vetId: b.veterinaire_id ? String(b.veterinaire_id) : null, observations: String(b.observations ?? ''),
      lignes: ((b.lignes as Record<string, unknown>[]) ?? []).map((l) => ({ acte: String(l.acte ?? ''), type: String(l.type ?? 'soin') as db.CareType, articleId: l.article_id ? String(l.article_id) : null, quantite: Number(l.quantite), prixUnitaire: Number(l.prix_unitaire ?? 0) })),
    }, auth.by);
    return isFailure(h) ? fail(h) : HttpResponse.json(detail(h), { status: 201 });
  }),

  /** Lignes que la facture de sortie contiendra pour la date choisie (séjour, soins, médicaments), avant validation. */
  http.get('*/hospitalisations/:id/apercu-sortie', ({ request, params }) => {
    const auth = authorize(request, 'hospitalisations', 'read');
    if ('response' in auth) return auth.response;
    const h = db.getHospi(String(params.id));
    if (isFailure(h)) return fail(h);
    const date = new URL(request.url).searchParams.get('date') || new Date().toISOString().slice(0, 10);
    return HttpResponse.json({ jours: db.daysBetween(h.dateEntree, date), lignes: db.exitInvoiceLines(h, date).map((l) => ({ description: l.description, quantite: l.quantite, prix_unitaire: l.prixUnitaire })) });
  }),

  http.post('*/hospitalisations/:id/sortie', async ({ request, params }) => {
    const auth = authorize(request, 'hospitalisations', 'update');
    if ('response' in auth) return auth.response;
    const b = (await request.json()) as Record<string, unknown>;
    const out = db.discharge(String(params.id), {
      dateSortie: String(b.date_sortie ?? ''), etat: String(b.etat ?? ''), compteRendu: String(b.compte_rendu ?? ''), remisePct: Number(b.remise_pct ?? 0), mode: String(b.mode ?? 'Espèces'), montantRecu: Number(b.montant_recu ?? 0),
      lignes: ((b.lignes as Record<string, unknown>[]) ?? []).map((l) => ({ description: String(l.description ?? ''), quantite: Number(l.quantite), prixUnitaire: Number(l.prix_unitaire) })),
    }, auth.by);
    return isFailure(out) ? fail(out) : HttpResponse.json({ ...detail(out.hospi), facture: { id: out.facture.id, numero: out.facture.numero } });
  }),
];
