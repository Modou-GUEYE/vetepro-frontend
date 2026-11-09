import { http } from '@/core/http/client';
import {
  Alias, Beneficiary, Client, PaymentRequest, Transfer, accountsDtoSchema, aliasDtoSchema, aliasListDtoSchema, clientsDtoSchema, codeDtoSchema, requestDtoSchema, requestListDtoSchema, transferDtoSchema, transferListDtoSchema,
} from '../models/comptes';

export interface TransferBody { type: string; compte_debite: string; compte_credite?: string; montant?: number; beneficiaires?: Beneficiary[]; motif: string; code: string }
export interface RequestBody { multiple: boolean; canal: string; echeance: string; motif: string; destinataires: Beneficiary[] }

export const comptesService = {
  async accounts() { return accountsDtoSchema.parse((await http.get('/comptes')).data); },

  async aliases(): Promise<Alias[]> { return aliasListDtoSchema.parse((await http.get('/comptes/alias')).data).items; },
  async addAlias(body: { compte_id: string; type: string; valeur: string; defaut: boolean }): Promise<Alias> { return aliasDtoSchema.parse((await http.post('/comptes/alias', body)).data); },
  async setDefault(id: string): Promise<Alias> { return aliasDtoSchema.parse((await http.post(`/comptes/alias/${id}/defaut`)).data); },
  async toggleAlias(id: string): Promise<Alias> { return aliasDtoSchema.parse((await http.post(`/comptes/alias/${id}/bascule`)).data); },
  async deleteAlias(id: string): Promise<void> { await http.delete(`/comptes/alias/${id}`); },

  async transfers(): Promise<Transfer[]> { return transferListDtoSchema.parse((await http.get('/comptes/transferts')).data).items; },
  async requestCode() { return codeDtoSchema.parse((await http.post('/comptes/transferts/code')).data); },
  async transfer(body: TransferBody): Promise<Transfer> { return transferDtoSchema.parse((await http.post('/comptes/transferts', body)).data); },

  async requests(): Promise<PaymentRequest[]> { return requestListDtoSchema.parse((await http.get('/comptes/demandes')).data).items; },
  async createRequest(body: RequestBody): Promise<PaymentRequest> { return requestDtoSchema.parse((await http.post('/comptes/demandes', body)).data); },
  async actOnRecipient(id: string, index: number, action: 'relance' | 'paye' | 'refuse' | 'annule'): Promise<PaymentRequest> {
    return requestDtoSchema.parse((await http.post(`/comptes/demandes/${id}/destinataires/${index}/${action}`)).data);
  },
  async clients(): Promise<Client[]> { return clientsDtoSchema.parse((await http.get('/comptes/clients')).data).items; },
};
