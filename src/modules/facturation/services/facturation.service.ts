import { http } from '@/core/http/client';
import { PageParams, toQuery } from '@/core/http/pagination';
import {
  InvoiceDetail, InvoiceForm, InvoiceRow, InvoiceStats, SaleRow, computeTotals, invoiceDetailDtoSchema, invoicePageDtoSchema, saleListDtoSchema, toDetail, toStats,
} from '../models/facture';

export const facturationService = {
  async list(params: PageParams & { statut?: string; proprietaire?: string; du?: string; au?: string }): Promise<{ items: InvoiceRow[]; total: number; stats: InvoiceStats }> {
    const { data } = await http.get('/factures', { params: { ...toQuery(params), ...(params.statut ? { statut: params.statut } : {}), ...(params.proprietaire ? { proprietaire: params.proprietaire } : {}), ...(params.du ? { du: params.du } : {}), ...(params.au ? { au: params.au } : {}) } });
    const d = invoicePageDtoSchema.parse(data);
    return { items: d.items, total: d.total, stats: toStats(d.stats) };
  },
  async get(id: string): Promise<InvoiceDetail> {
    return toDetail(invoiceDetailDtoSchema.parse((await http.get(`/factures/${id}`)).data));
  },
  async create(f: InvoiceForm, proprietaireId: string | null, consultationId?: string): Promise<InvoiceDetail> {
    const lignes = f.lignes.map((l) => ({ description: l.description, quantite: Number(l.quantite), prix_unitaire: Number(l.prixUnitaire) }));
    const t = computeTotals(lignes.map((l) => ({ quantite: l.quantite, prixUnitaire: l.prix_unitaire })), Number(f.remisePct || 0), 0);
    const { data } = await http.post('/factures', {
      patient_id: f.patientId, proprietaire_id: proprietaireId, consultation_id: consultationId ?? null, date: f.date, lignes, remise_pct: Number(f.remisePct || 0), mode: f.mode,
      montant_recu: Math.min(Number(f.montantRecu || 0), t.total), notes: f.notes,
    });
    return toDetail(invoiceDetailDtoSchema.parse(data));
  },
  async pay(id: string, montant: number, mode: string): Promise<InvoiceDetail> {
    return toDetail(invoiceDetailDtoSchema.parse((await http.post(`/factures/${id}/paiements`, { montant, mode })).data));
  },
  async credit(id: string, montant: number, motif: string): Promise<InvoiceDetail> {
    return toDetail(invoiceDetailDtoSchema.parse((await http.post(`/factures/${id}/avoirs`, { montant, motif })).data));
  },
  async listSales(params: PageParams): Promise<{ items: SaleRow[]; total: number }> {
    const { data } = await http.get('/pharmacie/ventes', { params: toQuery(params) });
    const d = saleListDtoSchema.parse(data);
    return { items: d.items, total: d.total };
  },
};
