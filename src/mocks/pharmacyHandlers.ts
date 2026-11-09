import { http, HttpResponse } from 'msw';
import { authorize } from './authorize';
import * as bill from './billingDb';
import * as db from './pharmacyDb';
import type { Failure } from './profilesDb';

const fail = (f: Failure) => HttpResponse.json({ code: f.code, message: f.message }, { status: f.status });
const isFailure = (x: unknown): x is Failure => typeof x === 'object' && x !== null && 'code' in x && 'status' in x && !('id' in x);

export const articleDto = (a: db.DemoArticle) => ({
  id: a.id, code: a.code, nom: a.nom, categorie: a.categorie, unite: a.unite, quantite: a.quantite, seuil: a.seuil, peremption: a.peremption, prix: a.prix, actif: a.actif,
  niveau: db.levelOf(a), jours_avant_peremption: db.daysToExpiry(a),
});
const articleBody = (b: Record<string, unknown>): db.ArticleInput => ({
  nom: String(b.nom ?? ''), categorie: String(b.categorie ?? ''), unite: String(b.unite ?? ''), quantite: Number(b.quantite ?? 0), seuil: Number(b.seuil ?? 0),
  peremption: b.peremption ? String(b.peremption) : null, prix: Number(b.prix ?? 0),
});

export const pharmacyHandlers = [
  /** Liste de choix : articles actifs avec stock et prix (consultation, vente), pour tout utilisateur connecté. */
  http.get('*/pharmacie/articles/choix', ({ request }) => {
    const auth = authorize(request, null);
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ items: db.articleChoices().map((a) => ({ id: a.id, code: a.code, nom: a.nom, unite: a.unite, quantite: a.quantite, prix: a.prix })) });
  }),

  http.get('*/pharmacie/articles', ({ request }) => {
    const auth = authorize(request, 'pharmacie', 'read');
    if ('response' in auth) return auth.response;
    const u = new URL(request.url);
    const page = Number(u.searchParams.get('page') ?? 1), pageSize = Number(u.searchParams.get('page_size') ?? 10);
    const { items, total } = db.listArticles({ q: u.searchParams.get('q') ?? '', categorie: u.searchParams.get('categorie') ?? '', niveau: u.searchParams.get('niveau') ?? '', statut: u.searchParams.get('statut') ?? '', page, pageSize });
    const b = bill.billingStats();
    return HttpResponse.json({
      items: items.map(articleDto), total, page, page_size: pageSize, categories: db.ARTICLE_CATEGORIES,
      stats: { ...db.pharmacyStats(), ventes_mois: b.ventes_mois, ca_pharmacie: b.ca_pharmacie },
    });
  }),

  http.post('*/pharmacie/articles', async ({ request }) => {
    const auth = authorize(request, 'pharmacie', 'create');
    if ('response' in auth) return auth.response;
    const a = db.createArticle(articleBody((await request.json()) as Record<string, unknown>), auth.by);
    return isFailure(a) ? fail(a) : HttpResponse.json(articleDto(a), { status: 201 });
  }),

  http.put('*/pharmacie/articles/:id', async ({ request, params }) => {
    const auth = authorize(request, 'pharmacie', 'update');
    if ('response' in auth) return auth.response;
    const a = db.updateArticle(String(params.id), articleBody((await request.json()) as Record<string, unknown>));
    return isFailure(a) ? fail(a) : HttpResponse.json(articleDto(a));
  }),

  http.post('*/pharmacie/articles/:id/restock', async ({ request, params }) => {
    const auth = authorize(request, 'stock', 'create');
    if ('response' in auth) return auth.response;
    const { quantite } = (await request.json()) as { quantite: number };
    const a = db.restock(String(params.id), Number(quantite), auth.by);
    return isFailure(a) ? fail(a) : HttpResponse.json(articleDto(a));
  }),

  http.post('*/pharmacie/articles/:id/:action', ({ request, params }) => {
    const auth = authorize(request, 'pharmacie', 'update');
    if ('response' in auth) return auth.response;
    const a = db.setArticleActive(String(params.id), params.action === 'activate');
    return isFailure(a) ? fail(a) : HttpResponse.json(articleDto(a));
  }),

  http.delete('*/pharmacie/articles/:id', ({ request, params }) => {
    const auth = authorize(request, 'pharmacie', 'delete');
    if ('response' in auth) return auth.response;
    const r = db.deleteArticle(String(params.id));
    return r ? fail(r) : new HttpResponse(null, { status: 204 });
  }),

  http.get('*/pharmacie/mouvements', ({ request }) => {
    const auth = authorize(request, 'stock', 'read');
    if ('response' in auth) return auth.response;
    const u = new URL(request.url);
    const page = Number(u.searchParams.get('page') ?? 1), pageSize = Number(u.searchParams.get('page_size') ?? 10);
    const { items, total } = db.listMovements({ articleId: u.searchParams.get('article') ?? '', type: u.searchParams.get('type') ?? '', du: u.searchParams.get('du') ?? '', au: u.searchParams.get('au') ?? '', page, pageSize });
    return HttpResponse.json({
      items: items.map((m) => ({ id: m.id, article: { id: m.articleId, nom: (db.ARTICLES.find((a) => a.id === m.articleId)?.nom ?? '') }, type: m.type, quantite: m.quantite, date: m.date, par: m.by, reference: m.reference })),
      total, page, page_size: pageSize,
    });
  }),
];
