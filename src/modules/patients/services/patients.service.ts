import { http } from '@/core/http/client';
import { PageParams, toQuery } from '@/core/http/pagination';
import {
  PatientDetail, PatientForm, PatientRow, patientDetailDtoSchema, patientPageDtoSchema, toDetail, toRequestBody, toRow,
} from '../models/patient';

export const patientsService = {
  async list(params: PageParams & { type?: string; proprietaire?: string }): Promise<{ items: PatientRow[]; total: number }> {
    const { data } = await http.get('/patients', {
      params: { ...toQuery(params), ...(params.type ? { type: params.type } : {}), ...(params.proprietaire ? { proprietaire: params.proprietaire } : {}) },
    });
    const d = patientPageDtoSchema.parse(data);
    return { items: d.items.map(toRow), total: d.total };
  },
  async get(id: string): Promise<PatientDetail> {
    const { data } = await http.get(`/patients/${id}`);
    return toDetail(patientDetailDtoSchema.parse(data));
  },
  async create(f: PatientForm): Promise<PatientDetail> {
    const { data } = await http.post('/patients', toRequestBody(f));
    return toDetail(patientDetailDtoSchema.parse(data));
  },
  async update(id: string, f: PatientForm): Promise<PatientDetail> {
    const { data } = await http.put(`/patients/${id}`, toRequestBody(f));
    return toDetail(patientDetailDtoSchema.parse(data));
  },
};
