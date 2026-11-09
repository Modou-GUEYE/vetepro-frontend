import { http } from '@/core/http/client';
import {
  Cas, CasFilters, CasForm, EpiFilters, EpiForm, Confrere, OrientationForm, actifsDtoSchema, annuaireDtoSchema, casDtoSchema, casListDtoSchema, epiDtoSchema, epiFormSchema, epiListDtoSchema, especesDtoSchema, orientationDtoSchema,
} from '../models/reseau';

export const reseauService = {
  async especes(): Promise<string[]> { return especesDtoSchema.parse((await http.get('/reseau/especes-actives')).data).items; },

  async listCas(f: CasFilters) { return casListDtoSchema.parse((await http.get('/reseau/cas', { params: { q: f.q, espece: f.espece, statut: f.statut } })).data); },
  async createCas(f: CasForm): Promise<Cas> { return casDtoSchema.parse((await http.post('/reseau/cas', f)).data); },
  async reply(id: string, texte: string): Promise<Cas> { return casDtoSchema.parse((await http.post(`/reseau/cas/${id}/avis`, { texte })).data); },
  async vote(id: string): Promise<Cas> { return casDtoSchema.parse((await http.post(`/reseau/cas/${id}/utile`)).data); },
  async close(id: string): Promise<Cas> { return casDtoSchema.parse((await http.post(`/reseau/cas/${id}/cloture`)).data); },

  async listEpidemies(f: EpiFilters) { return epiListDtoSchema.parse((await http.get('/reseau/epidemies', { params: { q: f.q, gravite: f.gravite } })).data); },
  async activeCount(): Promise<number> { return actifsDtoSchema.parse((await http.get('/reseau/epidemies/actifs')).data).actifs; },
  async report(f: EpiForm) { return epiDtoSchema.parse((await http.post('/reseau/epidemies', epiFormSchema.parse(f))).data); },
  async resolve(id: string) { return epiDtoSchema.parse((await http.post(`/reseau/epidemies/${id}/resolution`)).data); },

  async annuaire(q: string): Promise<Confrere[]> { return annuaireDtoSchema.parse((await http.get('/reseau/annuaire', { params: { q } })).data).items; },
  async orient(id: string, f: OrientationForm) { return orientationDtoSchema.parse((await http.post(`/reseau/annuaire/${id}/orientations`, f)).data); },
};
