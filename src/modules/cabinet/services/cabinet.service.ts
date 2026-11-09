import { http } from '@/core/http/client';
import { CabinetForm, cabinetDtoSchema } from '../models/cabinet';

export const cabinetService = {
  async get() { return cabinetDtoSchema.parse((await http.get('/cabinet')).data); },
  async save(f: CabinetForm) {
    const body = { nom: f.nom, ordre: f.ordre, adresse: f.adresse, telephone: f.telephone, email: f.email, logo: f.logo, twofa_obligatoire: f.twofaObligatoire };
    return cabinetDtoSchema.parse((await http.put('/cabinet', body)).data);
  },
};
