import { http } from '@/core/http/client';
import { Ticket, TicketForm, ticketDtoSchema, ticketsDtoSchema } from '../models/ticket';

export const supportService = {
  async list(): Promise<{ items: Ticket[]; adresse: string }> {
    const d = ticketsDtoSchema.parse((await http.get('/support/reclamations')).data);
    return { items: d.items, adresse: d.adresse_support };
  },
  async create(f: TicketForm): Promise<Ticket> { return ticketDtoSchema.parse((await http.post('/support/reclamations', f)).data); },
};
