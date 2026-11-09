import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { ReportFilters, ReportType, emptyFilters, periodError, periodRange } from '../models/report';
import { reportingService } from '../services/reporting.service';

export type ReportingTab = 'detail' | 'reglementaire';

/** Rapports détaillés : un seul état de filtres ; changer de rapport garde la période et remet les filtres propres au rapport. */
export function useReportsViewModel() {
  const can = useCan();
  const [tab, setTab] = useState<ReportingTab>('detail');
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters());
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const error = periodError(filters);
  const report = useQuery({ queryKey: ['report', filters], queryFn: () => reportingService.report(filters), enabled: tab === 'detail' && !error, placeholderData: keepPreviousData });

  const set = <K extends keyof ReportFilters>(k: K, v: ReportFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const chooseType = (type: ReportType) => setFilters((f) => ({ ...emptyFilters(type), period: f.period, du: f.du, au: f.au }));

  return {
    tab, setTab, filters, set, chooseType, periodError: error, range: periodRange(filters.period, filters.du, filters.au),
    report: report.data, loading: report.isLoading, canExport: can('reporting', 'read'),
    invoiceId, openInvoice: setInvoiceId, closeInvoice: () => setInvoiceId(null),
    consultationId, openConsultation: setConsultationId, closeConsultation: () => setConsultationId(null),
  };
}

export const triggerDownload = (name: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};

/** Ouvre le document dans une fenêtre d'impression (« Enregistrer au format PDF »). */
export function printHtml(html: string): boolean {
  const w = window.open('', '_blank', 'width=1000,height=800');
  if (!w) return false;
  w.document.write(html); w.document.close(); w.focus();
  setTimeout(() => w.print(), 250);
  return true;
}
