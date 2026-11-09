import { z } from 'zod';

export const TICKET_STATUTS = ['ouvert', 'encours', 'resolu', 'ferme'] as const;
export const TICKET_LABEL = { ouvert: 'Ouvert', encours: 'En cours', resolu: 'Résolu', ferme: 'Fermé' } as const;
export const TICKET_TONE = { ouvert: 'blue', encours: 'amber', resolu: 'green', ferme: 'slate' } as const;

const ticketSchema = z.object({
  id: z.string(), numero: z.string(), date: z.string(), objet: z.string(), message: z.string(), statut: z.enum(TICKET_STATUTS), auteur: z.string(), mis_a_jour: z.string(), notifie_a: z.string(),
});
export const ticketsDtoSchema = z.object({ items: z.array(ticketSchema), total: z.number(), adresse_support: z.string() });
export const ticketDtoSchema = ticketSchema;
export type Ticket = z.infer<typeof ticketSchema>;

/** Réclamation : objet et message obligatoires (spécification). */
export const ticketFormSchema = z.object({ objet: z.string().trim().min(1, 'Objet requis'), message: z.string().trim().min(1, 'Message requis') });
export type TicketForm = z.infer<typeof ticketFormSchema>;
