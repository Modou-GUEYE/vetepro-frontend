import { z } from 'zod';

export const CANAUX = ['email', 'sms', 'whatsapp'] as const;
export type Canal = (typeof CANAUX)[number];
export const CANAL_LABEL: Record<Canal, string> = { email: 'E-mail', sms: 'SMS', whatsapp: 'WhatsApp' };

export const sendDtoSchema = z.object({
  id: z.string(), date: z.string(), canal: z.enum(CANAUX), destinataire: z.string(), sujet: z.string(), statut: z.enum(['envoye', 'echec']), erreur: z.string(),
});
export type SendLog = z.infer<typeof sendDtoSchema>;

export const notificationListDtoSchema = z.object({
  items: z.array(z.object({ id: z.string(), type: z.enum(['rdv', 'stock', 'hospitalisation', 'insemination', 'vaccination', 'mention', 'epidemie']), titre: z.string(), message: z.string(), lien: z.string(), date: z.string(), lu: z.boolean() })),
  non_lues: z.number(),
});
export type AppNotification = z.infer<typeof notificationListDtoSchema>['items'][number];

/** « il y a 5 min », « il y a 2 h », sinon la date. */
export function since(iso: string, now = new Date()): string {
  const min = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d < 8 ? `il y a ${d} j` : new Date(iso).toLocaleDateString('fr-FR');
}
