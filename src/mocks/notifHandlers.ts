import { http, HttpResponse } from 'msw';
import { authorize, permissionsOf } from './authorize';
import * as db from './notifDb';
import { can } from '@/core/auth/permissions';

export const notifHandlers = [
  /** Notifications de l'utilisateur connecté : les siennes, et celles des modules qu'il peut consulter. */
  http.get('*/notifications', ({ request }) => {
    const auth = authorize(request, null);
    if ('response' in auth) return auth.response;
    const perms = permissionsOf(auth.user);
    const items = db.notificationsFor(auth.user.id, (m) => can(perms, m, 'read'));
    return HttpResponse.json({
      items: items.slice(0, 30).map((n) => ({ id: n.id, type: n.type, titre: n.titre, message: n.message, lien: n.lien, date: n.date, lu: n.lu })),
      non_lues: items.filter((n) => !n.lu).length,
    });
  }),

  http.post('*/notifications/lues', ({ request }) => {
    const auth = authorize(request, null);
    if ('response' in auth) return auth.response;
    const perms = permissionsOf(auth.user);
    db.markAllRead(auth.user.id, (m) => can(perms, m, 'read'));
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/notifications/:id/lue', ({ request, params }) => {
    const auth = authorize(request, null);
    if ('response' in auth) return auth.response;
    return db.markRead(String(params.id), auth.user.id)
      ? new HttpResponse(null, { status: 204 })
      : HttpResponse.json({ code: 'not_found', message: 'Notification introuvable' }, { status: 404 });
  }),
];
