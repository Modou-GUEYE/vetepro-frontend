import { http } from '@/core/http/client';
import { toNewPatientDto } from '@/modules/patients/models/newPatient';
import { RdvDetail, RdvForm, RdvRow, rdvDetailDtoSchema, rdvListDtoSchema, slotsDtoSchema, vetChoicesDtoSchema } from '../models/rdv';

const body = (f: RdvForm) => ({
  date: f.date, heure: f.heure, duree: Number(f.duree), veterinaire_id: f.vetId, motif: f.motif, notes: f.notes, canal: f.canal,
  ...(f.mode === 'existant' ? { patient_id: f.patientId } : { nouveau_patient: toNewPatientDto(f.np) }),
});

export const rdvService = {
  async list(params: { du: string; au: string; veterinaire?: string; statut?: string; q?: string }): Promise<RdvRow[]> {
    const query = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
    return rdvListDtoSchema.parse((await http.get('/rendez-vous', { params: query })).data).items;
  },
  async get(id: string): Promise<RdvDetail> { return rdvDetailDtoSchema.parse((await http.get(`/rendez-vous/${id}`)).data); },
  async slots(veterinaire: string, date: string, duree: number, ignorer?: string): Promise<string[]> {
    return slotsDtoSchema.parse((await http.get('/rendez-vous/disponibilites', { params: { veterinaire, date, duree, ...(ignorer ? { ignorer } : {}) } })).data).creneaux;
  },
  async create(f: RdvForm): Promise<RdvDetail> { return rdvDetailDtoSchema.parse((await http.post('/rendez-vous', body(f))).data); },
  async update(id: string, f: RdvForm): Promise<RdvDetail> { return rdvDetailDtoSchema.parse((await http.put(`/rendez-vous/${id}`, body(f))).data); },
  async cancel(id: string): Promise<RdvDetail> { return rdvDetailDtoSchema.parse((await http.delete(`/rendez-vous/${id}`)).data); },
  async complete(id: string, consultationId: string): Promise<void> { await http.post(`/rendez-vous/${id}/terminer`, { consultation_id: consultationId }); },
  async resend(id: string): Promise<void> { await http.post(`/rendez-vous/${id}/notifications/renvoyer`); },
  async vets() { return vetChoicesDtoSchema.parse((await http.get('/veterinaires')).data).items; },
};
