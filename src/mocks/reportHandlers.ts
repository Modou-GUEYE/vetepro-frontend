import { http, HttpResponse } from 'msw';
import { authorize, permissionsOf } from './authorize';
import { can } from '@/core/auth/permissions';
import * as db from './reportDb';
import * as support from './supportDb';
import type { Failure } from './profilesDb';

const fail = (f: Failure) => HttpResponse.json({ code: f.code, message: f.message }, { status: f.status });
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'code' in x && 'status' in x && !('id' in x);
const ticketDto = (t: support.DemoTicket) => ({ id: t.id, numero: t.numero, date: t.date, objet: t.objet, message: t.message, statut: t.statut, auteur: t.auteur, mis_a_jour: t.misAJour, notifie_a: t.notifieA });

export const reportHandlers = [
  http.get('*/tableau-de-bord', ({ request }) => {
    const auth = authorize(request, null);
    if ('response' in auth) return auth.response;
    const perms = permissionsOf(auth.user);
    return HttpResponse.json(db.dashboard((m) => can(perms, m, 'read')));
  }),

  http.get('*/rapports', ({ request }) => {
    const auth = authorize(request, 'reporting', 'read');
    if ('response' in auth) return auth.response;
    const q = new URL(request.url).searchParams;
    const type = (q.get('type') ?? '') as db.ReportType;
    if (!db.REPORT_TYPES.includes(type)) return HttpResponse.json({ code: 'not_found', message: 'Rapport inconnu' }, { status: 404 });
    const u = new URL(request.url).searchParams;
    const g = (k: string) => u.get(k) ?? '';
    return HttpResponse.json(db.buildReport(type, {
      du: g('du'), au: g('au'), medicament: g('medicament'), statut: g('statut'), mode: g('mode'), prestation: g('prestation'), groupe: g('groupe'), patientId: g('patient'),
      service: g('service'), vaccin: g('vaccin'), statutRappel: g('statut_rappel'), especeId: g('espece'), statutClient: g('statut_client'),
    }));
  }),

  http.get('*/rapport-reglementaire', ({ request }) => {
    const auth = authorize(request, 'reporting', 'read');
    if ('response' in auth) return auth.response;
    const u = new URL(request.url).searchParams;
    const activites = (u.get('activites') ?? '').split(',').filter(Boolean);
    if (activites.length === 0) return HttpResponse.json({ code: 'invalid', message: 'Choisissez au moins une activité' }, { status: 422 });
    const du = u.get('du') ?? '', au = u.get('au') ?? '';
    if (!du || !au) return HttpResponse.json({ code: 'invalid', message: 'La période est obligatoire' }, { status: 422 });
    if (au < du) return HttpResponse.json({ code: 'invalid', message: 'La fin de la période précède son début' }, { status: 422 });
    return HttpResponse.json(db.regulatoryReport({ du, au, activites }, auth.by));
  }),

  http.get('*/support/reclamations', ({ request }) => {
    const auth = authorize(request, 'support', 'read');
    if ('response' in auth) return auth.response;
    const items = support.listTickets();
    return HttpResponse.json({ items: items.map(ticketDto), total: items.length, adresse_support: support.SUPPORT_ADDRESS });
  }),

  http.post('*/support/reclamations', async ({ request }) => {
    const auth = authorize(request, 'support', 'create');
    if ('response' in auth) return auth.response;
    const b = (await request.json()) as Record<string, unknown>;
    const t = support.createTicket({ objet: String(b.objet ?? ''), message: String(b.message ?? '') }, auth.by);
    return isFailure(t) ? fail(t) : HttpResponse.json(ticketDto(t), { status: 201 });
  }),
];
