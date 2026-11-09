import { http } from '@/core/http/client';
import { PageParams, toQuery } from '@/core/http/pagination';
import { invoiceDetailDtoSchema, toDetail } from '@/modules/facturation/models/facture';
import {
  Article, ArticleChoice, PharmacyStats, ArticleForm, Movement, SaleForm, articleChoicesDtoSchema, articlePageDtoSchema, movementPageDtoSchema, toArticle,
} from '../models/pharmacie';

const body = (f: ArticleForm) => ({ nom: f.nom, categorie: f.categorie, unite: f.unite, quantite: Number(f.quantite || 0), seuil: Number(f.seuil), peremption: f.peremption || null, prix: Number(f.prix) });

export const pharmacieService = {
  async list(params: PageParams & { categorie?: string; niveau?: string }): Promise<{ items: Article[]; total: number; categories: string[]; stats: PharmacyStats }> {
    const { data } = await http.get('/pharmacie/articles', { params: { ...toQuery(params), ...(params.categorie ? { categorie: params.categorie } : {}), ...(params.niveau ? { niveau: params.niveau } : {}) } });
    const d = articlePageDtoSchema.parse(data);
    return { items: d.items.map(toArticle), total: d.total, categories: d.categories, stats: { references: d.stats.references, ok: d.stats.ok, faible: d.stats.faible, rupture: d.stats.rupture, ventesMois: d.stats.ventes_mois, caPharmacie: d.stats.ca_pharmacie } };
  },
  async choices(): Promise<ArticleChoice[]> { return articleChoicesDtoSchema.parse((await http.get('/pharmacie/articles/choix')).data).items; },
  async create(f: ArticleForm): Promise<void> { await http.post('/pharmacie/articles', body(f)); },
  async update(id: string, f: ArticleForm): Promise<void> { await http.put(`/pharmacie/articles/${id}`, body(f)); },
  async restock(id: string, quantite: number): Promise<void> { await http.post(`/pharmacie/articles/${id}/restock`, { quantite }); },
  async setActive(id: string, active: boolean): Promise<void> { await http.post(`/pharmacie/articles/${id}/${active ? 'activate' : 'deactivate'}`); },
  async remove(id: string): Promise<void> { await http.delete(`/pharmacie/articles/${id}`); },
  async movements(params: PageParams & { article?: string; type?: string; du?: string; au?: string }): Promise<{ items: Movement[]; total: number }> {
    const extra = Object.fromEntries(Object.entries({ article: params.article, type: params.type, du: params.du, au: params.au }).filter(([, v]) => v));
    const d = movementPageDtoSchema.parse((await http.get('/pharmacie/mouvements', { params: { ...toQuery(params), ...extra } })).data);
    return { items: d.items, total: d.total };
  },
  async sell(f: SaleForm) {
    const { data } = await http.post('/pharmacie/ventes', {
      date: f.date, proprietaire_id: f.proprietaireId || null, mode: f.mode, notes: f.notes, lignes: f.lignes.map((l) => ({ article_id: l.articleId, quantite: Number(l.quantite) })),
    });
    return toDetail(invoiceDetailDtoSchema.parse(data));
  },
};
