import type { Failure } from './profilesDb';

/** Réclamation envoyée à l'équipe support (spécification : objet et message, notification automatique). */
export type TicketStatut = 'ouvert' | 'encours' | 'resolu' | 'ferme';
export interface DemoTicket { id: string; numero: string; date: string; objet: string; message: string; statut: TicketStatut; auteur: string; misAJour: string; notifieA: string }

export const SUPPORT_ADDRESS = 'support@example.com';
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

const seed = (): DemoTicket[] => [
  { id: '1', numero: 'TCK-0001', date: inDays(-9), objet: 'Impression de facture impossible', message: "Le bouton Imprimer ne s'ouvre pas depuis la page Facturation.", statut: 'resolu', auteur: 'Amadou Sy', misAJour: inDays(-8), notifieA: SUPPORT_ADDRESS },
  { id: '2', numero: 'TCK-0002', date: inDays(-2), objet: 'Lenteur du planning', message: 'Le planning des rendez-vous met plusieurs secondes à se charger le lundi matin.', statut: 'encours', auteur: 'Amadou Sy', misAJour: inDays(-1), notifieA: SUPPORT_ADDRESS },
];

export let TICKETS: DemoTicket[] = seed();
export const resetSupport = () => { TICKETS = seed(); };

const nextNumero = () => `TCK-${String(Math.max(0, ...TICKETS.map((t) => Number(t.numero.slice(4)))) + 1).padStart(4, '0')}`;

/** L'Administrateur du cabinet envoie une réclamation ; une notification part automatiquement vers l'équipe support. */
export function createTicket(i: { objet: string; message: string }, by: string, now = new Date()): DemoTicket | Failure {
  if (!i.objet.trim()) return { status: 422, code: 'invalid', message: 'Objet requis' };
  if (!i.message.trim()) return { status: 422, code: 'invalid', message: 'Message requis' };
  const t: DemoTicket = {
    id: String(Math.max(0, ...TICKETS.map((x) => Number(x.id))) + 1), numero: nextNumero(), date: now.toISOString(), objet: i.objet.trim(), message: i.message.trim(),
    statut: 'ouvert', auteur: by, misAJour: now.toISOString(), notifieA: SUPPORT_ADDRESS,
  };
  TICKETS.push(t);
  return t;
}

export const listTickets = (p: { statut?: string } = {}) => TICKETS.filter((t) => !p.statut || t.statut === p.statut).sort((a, b) => b.date.localeCompare(a.date));
export const getTicket = (id: string): DemoTicket | Failure => TICKETS.find((t) => t.id === id) ?? { status: 404, code: 'not_found', message: 'Réclamation introuvable' };

/** Back-office de l'association : changement de statut d'une réclamation reçue. */
export function setTicketStatut(id: string, statut: string, now = new Date()): DemoTicket | Failure {
  const t = TICKETS.find((x) => x.id === id);
  if (!t) return { status: 404, code: 'not_found', message: 'Réclamation introuvable' };
  if (!['ouvert', 'encours', 'resolu', 'ferme'].includes(statut)) return { status: 422, code: 'invalid', message: 'Statut inconnu' };
  t.statut = statut as TicketStatut; t.misAJour = now.toISOString();
  return t;
}
