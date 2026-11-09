import { http, HttpResponse } from 'msw';
import { authorize } from './authorize';
import * as db from './consultDb';
import { OWNERS, PATIENTS, ownerName, patientEspece } from './patientsDb';
import type { Failure } from './profilesDb';

const fail = (f: Failure) => HttpResponse.json({ code: f.code, message: f.message }, { status: f.status });
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'code' in x && 'status' in x && !('id' in x);

const summary = (c: db.DemoConsultation) => {
  const p = PATIENTS.find((x) => x.id === c.patientId);
  const owner = OWNERS.find((o) => o.id === p?.ownerId);
  const inv = db.invoiceOf(c);
  return {
    id: c.id, date: c.date, patient: p ? { id: p.id, nom: p.nom, espece: patientEspece(p).nom, matricule: p.matricule } : null, proprietaire: owner ? { id: owner.id, nom: ownerName(owner) } : null,
    motif: c.motif, diagnostic: c.diagnostic, service: c.serviceLabel, veterinaire: c.vetNom, nb_medicaments: c.stock.length + c.externes.length,
    ordonnance_numero: db.ordonnanceNumber(c), facture: inv ? { id: inv.id, numero: inv.numero } : null,
  };
};
const detail = (c: db.DemoConsultation) => {
  const p = PATIENTS.find((x) => x.id === c.patientId);
  const owner = OWNERS.find((o) => o.id === p?.ownerId);
  const base = summary(c);
  return {
    ...base, examen: c.examen, notes: c.notes, service_id: c.serviceId, service_prix: c.servicePrice,
    proprietaire: owner ? { id: owner.id, nom: ownerName(owner), telephone: owner.telephone, email: owner.email } : null,
    stock: c.stock.map((l) => ({ article_id: l.articleId, nom: l.nom, unite: l.unite, quantite: l.quantite, prix_unitaire: l.prixUnitaire, dosage: l.dosage, posologie: l.posologie })),
    externes: c.externes,
    facture_proposee: base.facture ? [] : db.proposedInvoiceLines(c).map((l) => ({ description: l.description, quantite: l.quantite, prix_unitaire: l.prixUnitaire })),
  };
};
const body = (b: Record<string, unknown>): db.ConsultationInput => ({
  patientId: String(b.patient_id ?? ''), date: String(b.date ?? ''), serviceId: String(b.service_id ?? ''), motif: String(b.motif ?? ''), examen: String(b.examen ?? ''), diagnostic: String(b.diagnostic ?? ''),
  stock: ((b.stock as Record<string, unknown>[]) ?? []).map((l) => ({ articleId: String(l.article_id ?? ''), quantite: Number(l.quantite), dosage: String(l.dosage ?? ''), posologie: String(l.posologie ?? '') })),
  externes: ((b.externes as Record<string, unknown>[]) ?? []).map((e) => ({ nom: String(e.nom ?? ''), quantite: Number(e.quantite), dosage: String(e.dosage ?? ''), posologie: String(e.posologie ?? '') })),
  notes: String(b.notes ?? ''),
});

const page = (u: URL) => ({ page: Number(u.searchParams.get('page') ?? 1), pageSize: Number(u.searchParams.get('page_size') ?? 10) });

export const consultHandlers = [
  /** Services actifs proposés au choix du type de consultation, sans droit sur le catalogue. */
  http.get('*/services/actifs', ({ request }) => {
    const auth = authorize(request, null);
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ items: db.serviceChoices().map((s) => ({ id: s.id, libelle: s.libelle, categorie: s.categorie, prix: s.prix })) });
  }),

  http.get('*/consultations', ({ request }) => {
    const auth = authorize(request, 'consultations', 'read');
    if ('response' in auth) return auth.response;
    const u = new URL(request.url);
    const { items, total } = db.listConsultations({ q: u.searchParams.get('q') ?? '', patientId: u.searchParams.get('patient') ?? '', date: u.searchParams.get('date') ?? '', ...page(u) });
    return HttpResponse.json({ items: items.map(summary), total, ...page(u), page_size: page(u).pageSize });
  }),

  http.get('*/consultations/:id', ({ request, params }) => {
    const auth = authorize(request, 'consultations', 'read');
    if ('response' in auth) return auth.response;
    const c = db.getConsultation(String(params.id));
    return isFailure(c) ? fail(c) : HttpResponse.json(detail(c));
  }),

  http.post('*/consultations', async ({ request }) => {
    const auth = authorize(request, 'consultations', 'create');
    if ('response' in auth) return auth.response;
    const c = db.createConsultation(body((await request.json()) as Record<string, unknown>), auth.by);
    return isFailure(c) ? fail(c) : HttpResponse.json(detail(c), { status: 201 });
  }),

  http.post('*/consultations/:id/ordonnance/envoi', async ({ request, params }) => {
    const auth = authorize(request, 'ordonnances', 'update');
    if ('response' in auth) return auth.response;
    const c = db.getConsultation(String(params.id));
    if (isFailure(c)) return fail(c);
    const canal = ((await request.json().catch(() => ({}))) as { canal?: string }).canal;
    const r = db.sendPrescription(c, canal === 'sms' || canal === 'whatsapp' ? canal : 'email');
    return 'to' in r ? HttpResponse.json({ envoye_a: r.to, canal: r.canal }) : fail(r);
  }),

  http.get('*/ordonnances', ({ request }) => {
    const auth = authorize(request, 'ordonnances', 'read');
    if ('response' in auth) return auth.response;
    const u = new URL(request.url);
    const { items, total } = db.listConsultations({ q: u.searchParams.get('q') ?? '', withPrescription: true, ...page(u) });
    return HttpResponse.json({ items: items.map(summary), total, ...page(u), page_size: page(u).pageSize });
  }),
];
