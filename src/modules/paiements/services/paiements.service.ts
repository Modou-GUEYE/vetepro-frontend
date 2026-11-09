import { http } from '@/core/http/client';
import { Canal, Methode, OpenInvoice, Refund, Suspens, Transaction, TxFilters, openInvoicesDtoSchema, refundListDtoSchema, suspensListDtoSchema, txDtoSchema, txListDtoSchema } from '../models/paiements';

export const paiementsService = {
  async list(f: TxFilters) { return txListDtoSchema.parse((await http.get('/paiements/transactions', { params: f })).data); },
  async get(id: string): Promise<Transaction> { return txDtoSchema.parse((await http.get(`/paiements/transactions/${id}`)).data); },
  async start(factureId: string, body: { canal: Canal; methode: Methode; alias: string; montant: number }): Promise<Transaction> {
    return txDtoSchema.parse((await http.post(`/factures/${factureId}/paiements-electroniques`, body)).data);
  },
  async startFromPage(body: { facture_id: string | null; canal: Canal; methode: Methode; alias: string; montant: number; libelle: string }): Promise<Transaction> {
    return txDtoSchema.parse((await http.post('/paiements/transactions', body)).data);
  },
  async cancel(id: string): Promise<Transaction> { return txDtoSchema.parse((await http.post(`/paiements/transactions/${id}/annulation`)).data); },
  async relaunch(id: string): Promise<Transaction> { return txDtoSchema.parse((await http.post(`/paiements/transactions/${id}/relance`)).data); },
  /** Démonstration : simule le retour de l'opérateur. */
  async simulate(id: string, resultat: 'succes' | 'refus'): Promise<Transaction> { return txDtoSchema.parse((await http.post(`/paiements/transactions/${id}/simulation`, { resultat })).data); },
  async setExpiration(minutes: number): Promise<void> { await http.put('/paiements/parametres', { expiration_min: minutes }); },
  async refunds(): Promise<Refund[]> { return refundListDtoSchema.parse((await http.get('/paiements/remboursements')).data).items; },
  async refund(id: string, body: { montant: number; motif: string; canal: string; avoir: boolean }): Promise<void> { await http.post(`/paiements/transactions/${id}/remboursements`, body); },
  async suspens(): Promise<Suspens[]> { return suspensListDtoSchema.parse((await http.get('/paiements/non-identifies')).data).items; },
  async openInvoices(alias = ''): Promise<OpenInvoice[]> { return openInvoicesDtoSchema.parse((await http.get('/paiements/factures-ouvertes', { params: { alias } })).data).items; },
  async attach(id: string, factureId: string): Promise<void> { await http.post(`/paiements/non-identifies/${id}/rattachement`, { facture_id: factureId }); },
  async refundSuspens(id: string, motif: string): Promise<void> { await http.post(`/paiements/non-identifies/${id}/remboursement`, { motif }); },
};
