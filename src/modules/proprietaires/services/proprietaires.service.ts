import { http } from '@/core/http/client';
import { PageParams, toQuery } from '@/core/http/pagination';
import { Owner, OwnerChoice, OwnerForm, ownerChoicesDtoSchema, ownerPageDtoSchema, toOwner } from '../models/proprietaire';

export const proprietairesService = {
  async list(params: PageParams & { statut?: string }): Promise<{ items: Owner[]; total: number }> {
    const { data } = await http.get('/proprietaires', { params: { ...toQuery(params), ...(params.statut ? { statut: params.statut } : {}) } });
    const d = ownerPageDtoSchema.parse(data);
    return { items: d.items.map(toOwner), total: d.total };
  },
  async choices(): Promise<OwnerChoice[]> {
    const { data } = await http.get('/proprietaires/choix');
    return ownerChoicesDtoSchema.parse(data).items;
  },
  async create(f: OwnerForm): Promise<void> { await http.post('/proprietaires', f); },
  async update(id: string, f: OwnerForm): Promise<void> { await http.put(`/proprietaires/${id}`, f); },
  async setActive(id: string, active: boolean): Promise<void> { await http.post(`/proprietaires/${id}/${active ? 'activate' : 'deactivate'}`); },
  async remove(id: string): Promise<void> { await http.delete(`/proprietaires/${id}`); },
};
