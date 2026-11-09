import { http } from '@/core/http/client';
import { PageParams, toQuery } from '@/core/http/pagination';
import {
  Espece, ServiceForm, ServicePage, especeListDtoSchema, servicePageDtoSchema, toEspece,
} from '../models/referentiels';

const body = (f: ServiceForm) => ({ libelle: f.libelle, categorie: f.categorie, description: f.description, prix: Number(f.prix) });

export const referentielsService = {
  async listServices(params: PageParams & { categorie?: string; statut?: string }): Promise<ServicePage> {
    const { data } = await http.get('/services', {
      params: { ...toQuery(params), ...(params.categorie ? { categorie: params.categorie } : {}), ...(params.statut ? { statut: params.statut } : {}) },
    });
    const d = servicePageDtoSchema.parse(data);
    return { items: d.items, total: d.total, categories: d.categories, stats: { total: d.stats.total, actifs: d.stats.actifs, categories: d.stats.categories, tarifMoyen: d.stats.tarif_moyen } };
  },
  async createService(f: ServiceForm): Promise<void> { await http.post('/services', body(f)); },
  async updateService(id: string, f: ServiceForm): Promise<void> { await http.put(`/services/${id}`, body(f)); },
  async setServiceActive(id: string, active: boolean): Promise<void> { await http.post(`/services/${id}/${active ? 'activate' : 'deactivate'}`); },
  async deleteService(id: string): Promise<void> { await http.delete(`/services/${id}`); },

  async listEspeces(): Promise<Espece[]> {
    const { data } = await http.get('/especes');
    return especeListDtoSchema.parse(data).items.map(toEspece);
  },
  async setEspeceActive(id: string, active: boolean): Promise<void> { await http.post(`/especes/${id}/${active ? 'activate' : 'deactivate'}`); },
  async setRaceActive(id: string, active: boolean): Promise<void> { await http.post(`/races/${id}/${active ? 'activate' : 'deactivate'}`); },
  async setGestation(id: string, jours: number | null): Promise<void> { await http.put(`/especes/${id}/gestation`, { jours }); },
};
