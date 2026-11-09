import { http } from '@/core/http/client';
import { Dashboard, dashboardDtoSchema } from '../models/dashboard';

export const dashboardService = {
  async get(): Promise<Dashboard> { return dashboardDtoSchema.parse((await http.get('/tableau-de-bord')).data); },
};
