import { http } from '@/core/http/client';
import { Canal, notificationListDtoSchema } from '../models/notification';

export const notificationsService = {
  async list() {
    const d = notificationListDtoSchema.parse((await http.get('/notifications')).data);
    return { items: d.items, unread: d.non_lues };
  },
  async markRead(id: string): Promise<void> { await http.post(`/notifications/${id}/lue`); },
  async markAllRead(): Promise<void> { await http.post('/notifications/lues'); },
  /** Envoi d'un document au propriétaire : retourne le destinataire. */
  async send(path: string, canal: Canal): Promise<string> {
    return ((await http.post(path, { canal })).data as { envoye_a: string }).envoye_a;
  },
};
