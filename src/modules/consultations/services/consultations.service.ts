import { http } from '@/core/http/client';
import { PageParams, toQuery } from '@/core/http/pagination';
import {
  ConsultationDetail, ConsultationForm, ConsultationRow, consultationDetailDtoSchema, consultationPageDtoSchema, serviceChoicesDtoSchema, toDetail, toRow,
} from '../models/consultation';

const body = (f: ConsultationForm) => ({
  patient_id: f.patientId, date: f.date, service_id: f.serviceId, motif: f.motif, examen: f.examen, diagnostic: f.diagnostic, notes: f.notes,
  stock: f.stock.map((l) => ({ article_id: l.articleId, quantite: Number(l.quantite), dosage: l.dosage, posologie: l.posologie })),
  externes: f.externes.map((e) => ({ nom: e.nom, quantite: Number(e.quantite), dosage: e.dosage, posologie: e.posologie })),
});

export const consultationsService = {
  async list(params: PageParams & { patient?: string; date?: string }): Promise<{ items: ConsultationRow[]; total: number }> {
    const extra = Object.fromEntries(Object.entries({ patient: params.patient, date: params.date }).filter(([, v]) => v));
    const d = consultationPageDtoSchema.parse((await http.get('/consultations', { params: { ...toQuery(params), ...extra } })).data);
    return { items: d.items.map(toRow), total: d.total };
  },
  async listPrescriptions(params: PageParams): Promise<{ items: ConsultationRow[]; total: number }> {
    const d = consultationPageDtoSchema.parse((await http.get('/ordonnances', { params: toQuery(params) })).data);
    return { items: d.items.map(toRow), total: d.total };
  },
  async get(id: string): Promise<ConsultationDetail> { return toDetail(consultationDetailDtoSchema.parse((await http.get(`/consultations/${id}`)).data)); },
  async create(f: ConsultationForm): Promise<ConsultationDetail> { return toDetail(consultationDetailDtoSchema.parse((await http.post('/consultations', body(f))).data)); },

  async serviceChoices() { return serviceChoicesDtoSchema.parse((await http.get('/services/actifs')).data).items; },
};
