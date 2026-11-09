import type { ModuleKey } from '@/core/auth/permissions';

export type Canal = 'email' | 'sms' | 'whatsapp';
export const CANAUX: Canal[] = ['email', 'sms', 'whatsapp'];
export const CANAL_LABEL: Record<Canal, string> = { email: 'E-mail', sms: 'SMS', whatsapp: 'WhatsApp' };

/** Journal des envois (propriétaires) : chaque tentative est gardée, réussie ou non. */
export interface SendLog { id: string; date: string; canal: Canal; destinataire: string; sujet: string; reference: string; statut: 'envoye' | 'echec'; erreur: string }

/** Notification dans l'application. userId vide : tous les utilisateurs ayant le droit de lecture du module. */
export interface AppNotification { id: string; userId: string | null; module: ModuleKey | null; type: 'rdv' | 'stock' | 'hospitalisation' | 'insemination' | 'vaccination' | 'mention' | 'epidemie'; titre: string; message: string; lien: string; date: string; luPar: string[] }

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

const seedNotifs = (): AppNotification[] => [
  { id: 'n1', userId: null, module: 'pharmacie', type: 'stock', titre: 'Stock faible', message: 'Amoxicilline vét. 250mg : il reste 7 comprimés (seuil 20).', lien: '/pharmacie', date: ago(95), luPar: [] },
  { id: 'n2', userId: null, module: 'pharmacie', type: 'stock', titre: 'Rupture de stock', message: 'Métoclopramide 10mg est épuisé.', lien: '/pharmacie', date: ago(300), luPar: [] },
  { id: 'n3', userId: '2', module: null, type: 'rdv', titre: 'Nouveau rendez-vous', message: 'Bouba, demain à 09:00, Contrôle après gastro-entérite (par Omar Diouf).', lien: '/rendez-vous?id=3', date: ago(40), luPar: [] },
];

export let NOTIFS: AppNotification[] = seedNotifs();
export let SENDS: SendLog[] = [];
export const resetNotifications = () => { NOTIFS = seedNotifs(); SENDS = []; };

export interface Contact { telephone: string; email: string }

/** Un numéro est utilisable à partir de 9 chiffres ; une adresse e-mail doit être de la forme a@b.c. */
const phoneOk = (t: string) => t.replace(/\D/g, '').length >= 9;
const emailOk = (e: string) => /^\S+@\S+\.\S+$/.test(e.trim());

/**
 * Envoi d'un message au propriétaire par le canal choisi. Un contact manquant ou invalide est un échec,
 * gardé dans le journal : l'action qui a déclenché l'envoi n'est pas annulée pour autant.
 */
export function sendToOwner(contact: Contact, canal: Canal, sujet: string, reference: string, now = new Date()): SendLog {
  const destinataire = canal === 'email' ? contact.email.trim() : contact.telephone.trim();
  const ok = canal === 'email' ? emailOk(contact.email) : phoneOk(contact.telephone);
  const erreur = ok ? '' : canal === 'email' ? "Aucune adresse e-mail enregistrée pour ce propriétaire" : 'Aucun numéro de téléphone valide pour ce propriétaire';
  const log: SendLog = { id: `s${SENDS.length + 1}`, date: now.toISOString(), canal, destinataire, sujet, reference, statut: ok ? 'envoye' : 'echec', erreur };
  SENDS.push(log);
  return log;
}

export const sendsOf = (reference: string) => SENDS.filter((s) => s.reference === reference).sort((a, b) => b.date.localeCompare(a.date));

export function notify(n: Omit<AppNotification, 'id' | 'date' | 'luPar'>, now = new Date()) {
  const created: AppNotification = { ...n, id: `n${Date.now()}-${NOTIFS.length}`, date: now.toISOString(), luPar: [] };
  NOTIFS.push(created);
  return created;
}

export const notificationsFor = (userId: string, canRead: (m: ModuleKey) => boolean) =>
  NOTIFS
    .filter((n) => (n.userId ? n.userId === userId : n.module === null || canRead(n.module)))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((n) => ({ ...n, lu: n.luPar.includes(userId) }));

export function markRead(id: string, userId: string): boolean {
  const n = NOTIFS.find((x) => x.id === id);
  if (!n) return false;
  if (!n.luPar.includes(userId)) n.luPar.push(userId);
  return true;
}

export function markAllRead(userId: string, canRead: (m: ModuleKey) => boolean) {
  for (const n of notificationsFor(userId, canRead)) markRead(n.id, userId);
}
