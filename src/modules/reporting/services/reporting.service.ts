import { http } from '@/core/http/client';
import { RegulatoryReport, Report, ReportFilters, ReportType, regulatoryDtoSchema, reportDtoSchema, toParams } from '../models/report';

export const reportingService = {
  async report(f: ReportFilters): Promise<Report> { return reportDtoSchema.parse((await http.get('/rapports', { params: { type: f.type, ...toParams(f) } })).data); },
  async regulatory(p: { du: string; au: string; activites: string[] }): Promise<RegulatoryReport> {
    return regulatoryDtoSchema.parse((await http.get('/rapport-reglementaire', { params: { du: p.du, au: p.au, activites: p.activites.join(',') } })).data);
  },
};
export type { ReportType };
