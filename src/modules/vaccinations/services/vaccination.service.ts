import { http } from '@/core/http/client';
import {
  BillForm, Campagne, CampagneForm, VaccinationDocument, VaccinationForm, VaccinationRow, VaccinationStats, TerrainForm,
  campagneDtoSchema, campagnesDtoSchema, carnetDtoSchema, vaccinationDocumentDtoSchema, vaccinationDtoSchema, vaccinationListDtoSchema,
} from '../models/vaccination';

export const vaccinationService = {
  async list(q: string): Promise<{ items: VaccinationRow[]; stats: VaccinationStats }> {
    const d = vaccinationListDtoSchema.parse((await http.get('/vaccinations', { params: q ? { q } : {} })).data);
    return { items: d.items, stats: d.stats };
  },
  async carnet(patientId: string): Promise<VaccinationRow[]> { return carnetDtoSchema.parse((await http.get(`/patients/${patientId}/vaccinations`)).data).items; },
  async create(f: VaccinationForm): Promise<VaccinationRow> {
    return vaccinationDtoSchema.parse((await http.post('/vaccinations', {
      patient_id: f.patientId, vaccin: f.vaccin, date: f.date, rappel: f.rappel || null, lot: f.lot, notes: f.notes, tarif: Number(f.tarif || 0),
    })).data);
  },
  async document(id: string): Promise<VaccinationDocument> { return vaccinationDocumentDtoSchema.parse((await http.get(`/vaccinations/${id}`)).data); },
  async bill(id: string, f: BillForm): Promise<VaccinationRow> { return vaccinationDtoSchema.parse((await http.post(`/vaccinations/${id}/facturer`, { tarif: Number(f.tarif) })).data); },

  async campagnes(): Promise<Campagne[]> { return campagnesDtoSchema.parse((await http.get('/campagnes-vaccination')).data).items; },
  async createCampagne(f: CampagneForm): Promise<Campagne> {
    return campagneDtoSchema.parse((await http.post('/campagnes-vaccination', {
      nom: f.nom, espece_id: f.especeId, vaccin: f.vaccin, zone: f.zone, date: f.date, vises: f.vises === '' ? null : Number(f.vises),
    })).data);
  },
  async changeStatus(id: string, action: 'lancer' | 'cloturer'): Promise<Campagne> { return campagneDtoSchema.parse((await http.post(`/campagnes-vaccination/${id}/${action}`)).data); },
  async addAnimal(id: string, f: TerrainForm): Promise<Campagne> { return campagneDtoSchema.parse((await http.post(`/campagnes-vaccination/${id}/animaux`, f)).data); },
  async removeAnimal(id: string, animalId: string): Promise<Campagne> { return campagneDtoSchema.parse((await http.delete(`/campagnes-vaccination/${id}/animaux/${animalId}`)).data); },
};
