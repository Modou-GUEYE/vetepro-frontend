import { http } from '@/core/http/client';
import { downloadFile } from '@/core/http/download';
import { registrationSchema } from '@/modules/abonnement/models/abonnement';
import {
  Cv, CvAction, SurMesureForm, AnnonceForm, TemoignageForm, ContenuForm,
  annonceSchema, cabinetsSchema, contenusSchema, cvSchema, cvsSchema, journalSchema, modulesCatalogueSchema, reclamationsSchema, reseauSchema, surMesureToDto,
  temoignageSchema, contenuToDto,
} from '../models/association';
import { HISTORY_PAGE_SIZE, PackForm, PromoForm, TrialForm, commercialSettingsSchema, packBody, pageOf, platformHistorySchema, platformModulesSchema, platformPackSchema, platformPromoSchema, promoBody, trialBody } from '../models/offres';
import { z } from 'zod';

const root = '/association';
/** Packs, promotions et durée d'essai : service Administration, section « platform ». */
const platform = '/administration/platform';

/** Lit toutes les pages d'une liste du backend (100 éléments au plus par page). */
async function fetchAll<T extends z.ZodTypeAny>(path: string, item: T): Promise<z.infer<T>[]> {
  const out: z.infer<T>[] = [];
  for (let page = 1; ; page++) {
    const p = pageOf(item).parse((await http.get(path, { params: { page, page_size: 100 } })).data);
    out.push(...p.items);
    if (out.length >= p.total || p.items.length === 0) return out;
  }
}

export const associationService = {
  async reseau() { return reseauSchema.parse((await http.get(`${root}/tableau`)).data); },
  async cabinets(p: { statut: string; q: string }) { return cabinetsSchema.parse((await http.get(`${root}/cabinets`, { params: p })).data).items; },
  async createEntity(f: SurMesureForm) { return registrationSchema.parse((await http.post(`${root}/cabinets`, surMesureToDto(f))).data); },
  async extend(id: string, jours: number) { await http.post(`${root}/cabinets/${id}/prolonger`, { jours }); },
  async journal() { return journalSchema.parse((await http.get(`${root}/journal`)).data).items; },

  /** Ancien contrat : l'offre sur mesure n'est pas encore branchée sur Administration. */
  async modulesCatalogue() { return modulesCatalogueSchema.parse((await http.get(`${root}/offres`)).data); },
  async modules() { return platformModulesSchema.parse((await http.get(`${platform}/modules`)).data); },
  packs: () => fetchAll(`${platform}/packs`, platformPackSchema),
  promotions: () => fetchAll(`${platform}/promotions`, platformPromoSchema),
  async commercialSettings() { return commercialSettingsSchema.parse((await http.get(`${platform}/commercial-settings`)).data); },
  async commercialHistory(p: { page: number; q: string }) {
    const params = { page: p.page, page_size: HISTORY_PAGE_SIZE, ...(p.q ? { q: p.q } : {}) };
    return pageOf(platformHistorySchema).parse((await http.get(`${platform}/commercial-history`, { params })).data);
  },
  async savePack(id: string | null, f: PackForm) {
    const r = id ? await http.patch(`${platform}/packs/${id}`, packBody(f)) : await http.post(`${platform}/packs`, packBody(f));
    return platformPackSchema.parse(r.data);
  },
  async deletePack(id: string) { await http.delete(`${platform}/packs/${id}`); },
  async saveTrial(f: TrialForm) { return commercialSettingsSchema.parse((await http.put(`${platform}/commercial-settings`, trialBody(f))).data); },
  async savePromo(id: string | null, f: PromoForm) {
    const r = id ? await http.patch(`${platform}/promotions/${id}`, promoBody(f)) : await http.post(`${platform}/promotions`, promoBody(f));
    return platformPromoSchema.parse(r.data);
  },
  async deletePromo(id: string) { await http.delete(`${platform}/promotions/${id}`); },

  async contenus() { return contenusSchema.parse((await http.get(`${root}/contenus`)).data); },
  async saveContenu(f: ContenuForm) { await http.put(`${root}/contenus`, contenuToDto(f)); },
  async saveAnnonce(id: string | null, f: AnnonceForm) {
    const r = id ? await http.put(`${root}/annonces/${id}`, f) : await http.post(`${root}/annonces`, f);
    return annonceSchema.parse(r.data);
  },
  async deleteAnnonce(id: string) { await http.delete(`${root}/annonces/${id}`); },
  async saveTemoignage(id: string | null, f: TemoignageForm) {
    const r = id ? await http.put(`${root}/temoignages/${id}`, f) : await http.post(`${root}/temoignages`, f);
    return temoignageSchema.parse(r.data);
  },
  async deleteTemoignage(id: string) { await http.delete(`${root}/temoignages/${id}`); },

  download: (cv: Pick<Cv, 'id' | 'fichier'>) => downloadFile(`${root}/cvs/${cv.id}/fichier`, cv.fichier?.nom ?? 'cv.pdf'),
  async cvs(statut: string): Promise<Cv[]> { return cvsSchema.parse((await http.get(`${root}/cvs`, { params: { statut } })).data).items; },
  async reviewCv(id: string, action: CvAction) { return cvSchema.parse((await http.post(`${root}/cvs/${id}/${action}`)).data); },

  async reclamations() { return reclamationsSchema.parse((await http.get(`${root}/reclamations`)).data); },
  async setReclamationStatut(id: string, statut: string) { await http.put(`${root}/reclamations/${id}`, { statut }); },
};
