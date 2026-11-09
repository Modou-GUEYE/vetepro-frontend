import { http, HttpResponse } from 'msw';
import { authorize, permissionsOf } from './authorize';
import { can } from '@/core/auth/permissions';
import * as db from './forumDb';
import type { Failure } from './profilesDb';

const fail = (f: Failure) => HttpResponse.json({ code: f.code, message: f.message }, { status: f.status });
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'code' in x && 'status' in x && !('id' in x);

const personDto = (id: string) => { const p = db.personOf(id); return { id: p.id, nom: p.nom, profil: p.profil, cabinet: p.cabinet }; };

function postDto(p: db.DemoPost, userId: string, canDeleteAny: boolean, withOrigin = true): Record<string, unknown> {
  const o = db.originOf(p);
  return {
    id: p.id, auteur: personDto(p.auteurId), titre: p.titre, categorie: p.categorie, contenu: p.contenu, date: p.date, pieces: p.pieces, mentions: p.mentions.map(personDto),
    nb_likes: p.likes.length, nb_dislikes: p.dislikes.length, aime: p.likes.includes(userId), naime_pas: p.dislikes.includes(userId), repartage: p.reposts.some((r) => r.userId === userId) || (!!o && o.reposts.some((r) => r.userId === userId)),
    nb_repartages: p.reposts.length, lu: p.auteurId === userId || p.luPar.includes(userId), supprimable: p.auteurId === userId || canDeleteAny,
    commentaires: p.commentaires.map((c) => ({ id: c.id, auteur: personDto(c.auteurId), texte: c.texte, date: c.date })),
    origine: withOrigin && p.repostDe ? (o ? { ...postDto(o, userId, false, false), commentaires: [] } : null) : undefined, repartage_de: p.repostDe,
  };
}

export const forumHandlers = [
  http.get('*/forum/posts', ({ request }) => {
    const auth = authorize(request, 'reseau', 'read');
    if ('response' in auth) return auth.response;
    const q = new URL(request.url).searchParams;
    const del = can(permissionsOf(auth.user), 'reseau', 'delete');
    const items = db.listPosts(auth.user.id, { filtre: q.get('filtre') ?? '', categorie: q.get('categorie') ?? '', q: q.get('q') ?? '', tri: q.get('tri') ?? '' });
    return HttpResponse.json({ items: items.map((p) => postDto(p, auth.user.id, del)), compteurs: db.counters(auth.user.id) });
  }),

  /** Compteur du menu : posts non lus. */
  http.get('*/forum/non-lus', ({ request }) => {
    const auth = authorize(request, 'reseau', 'read');
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ non_lus: db.unreadCount(auth.user.id) });
  }),

  http.get('*/forum/personnes', ({ request }) => {
    const auth = authorize(request, 'reseau', 'read');
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ items: db.mentionables().map((p) => personDto(p.id)) });
  }),

  http.post('*/forum/posts', async ({ request }) => {
    const auth = authorize(request, 'reseau', 'create');
    if ('response' in auth) return auth.response;
    const form = await request.formData();
    const f = (k: string) => String(form.get(k) ?? '');
    const pieces = form.getAll('fichiers').filter((x): x is File => x instanceof File && x.size + x.name.length > 0)
      .map((file): db.DemoPiece => ({ nom: file.name, taille: file.size, type: file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'doc' }));
    const p = db.createPost({ titre: f('titre'), categorie: f('categorie'), contenu: f('contenu'), pieces }, auth.user.id);
    return isFailure(p) ? fail(p) : HttpResponse.json(postDto(p, auth.user.id, false), { status: 201 });
  }),

  http.post('*/forum/lues', ({ request }) => {
    const auth = authorize(request, 'reseau', 'read');
    if ('response' in auth) return auth.response;
    db.markAllRead(auth.user.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/forum/posts/:id/lu', ({ request, params }) => {
    const auth = authorize(request, 'reseau', 'read');
    if ('response' in auth) return auth.response;
    const p = db.markRead(String(params.id), auth.user.id);
    return isFailure(p) ? fail(p) : new HttpResponse(null, { status: 204 });
  }),

  http.post('*/forum/posts/:id/reaction', async ({ request, params }) => {
    const auth = authorize(request, 'reseau', 'create');
    if ('response' in auth) return auth.response;
    const { type } = (await request.json()) as { type: string };
    const p = db.react(String(params.id), auth.user.id, type);
    return isFailure(p) ? fail(p) : HttpResponse.json(postDto(p, auth.user.id, false));
  }),

  http.post('*/forum/posts/:id/commentaires', async ({ request, params }) => {
    const auth = authorize(request, 'reseau', 'create');
    if ('response' in auth) return auth.response;
    const { texte } = (await request.json()) as { texte: string };
    const p = db.addComment(String(params.id), String(texte ?? ''), auth.user.id);
    return isFailure(p) ? fail(p) : HttpResponse.json(postDto(p, auth.user.id, false), { status: 201 });
  }),

  http.post('*/forum/posts/:id/repartages', async ({ request, params }) => {
    const auth = authorize(request, 'reseau', 'create');
    if ('response' in auth) return auth.response;
    const { commentaire } = (await request.json()) as { commentaire?: string };
    const p = db.repost(String(params.id), String(commentaire ?? ''), auth.user.id);
    return isFailure(p) ? fail(p) : HttpResponse.json(postDto(p, auth.user.id, false), { status: 201 });
  }),

  http.delete('*/forum/posts/:id', ({ request, params }) => {
    const auth = authorize(request, 'reseau', 'read');
    if ('response' in auth) return auth.response;
    const out = db.deletePost(String(params.id), auth.user.id, can(permissionsOf(auth.user), 'reseau', 'delete'));
    return out === true ? new HttpResponse(null, { status: 204 }) : fail(out);
  }),

  /** Fichier joint : le vrai fichier n'existe qu'avec le serveur ; la démonstration renvoie un court texte. */
  http.get('*/forum/posts/:id/pieces/:index', ({ request, params }) => {
    const auth = authorize(request, 'reseau', 'read');
    if ('response' in auth) return auth.response;
    const p = db.getPost(String(params.id));
    if (isFailure(p)) return fail(p);
    const piece = p.pieces[Number(params.index)];
    if (!piece) return HttpResponse.json({ code: 'not_found', message: 'Fichier introuvable' }, { status: 404 });
    return new HttpResponse(`Fichier de démonstration : ${piece.nom}`, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="${piece.nom}"` } });
  }),
];
