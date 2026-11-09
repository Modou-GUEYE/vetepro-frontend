import { z } from 'zod';
import { formatFcfa } from '@/core/utils/format';

/** Packs, tarifs, moyens de paiement et résultat d'une inscription : partagés par le portail, le renouvellement et le back-office de l'association. */
export type Periode = 'mensuel' | 'annuel';
export const PERIODE_LABEL: Record<Periode, string> = { mensuel: 'Mensuel', annuel: 'Annuel' };

export const packSchema = z.object({
  id: z.string(), nom: z.string(), cible: z.string(), prix: z.number(), prix_annuel: z.number(), engagement: z.string(), fonctionnalites: z.array(z.string()), modules: z.array(z.string()),
  utilisateurs_max: z.number().nullable(), star: z.boolean(), actif: z.boolean(), personnalise: z.boolean(), cabinets: z.number(),
});
export type Pack = z.infer<typeof packSchema>;

export const quoteSchema = z.object({
  base: z.number(), remise: z.number(), net: z.number(), periode: z.enum(['mensuel', 'annuel']),
  promo: z.object({ code: z.string(), pct: z.number(), mois: z.number() }).nullable(),
});
export type Quote = z.infer<typeof quoteSchema>;

export const registrationSchema = z.object({
  cabinet: z.object({ id: z.string(), nom: z.string() }), pack: z.object({ id: z.string(), nom: z.string() }), essai_fin: z.string(), url_acces: z.string(), lien_expire: z.string(), identifiant: z.string(), email: z.string(),
  apres_essai: z.object({ montant: z.number(), periode: z.enum(['mensuel', 'annuel']), remise: z.number(), promo: z.string().nullable() }),
  email_simule: z.object({ destinataire: z.string(), objet: z.string(), mot_de_passe: z.string() }),
});
export type Registration = z.infer<typeof registrationSchema>;

export const packPrice = (p: Pack, periode: Periode) => (periode === 'annuel' ? p.prix_annuel : p.prix);
export const periodSuffix = (periode: Periode) => (periode === 'annuel' ? 'an' : 'mois');
export const priceLabel = (p: Pack, periode: Periode) => `${formatFcfa(packPrice(p, periode))} / ${periodSuffix(periode)}`;
export const usersLabel = (p: Pick<Pack, 'utilisateurs_max'>) => (p.utilisateurs_max === null ? 'Utilisateurs illimités' : `Jusqu'à ${p.utilisateurs_max} utilisateurs`);

/* ---------- Moyen de paiement ---------- */

export const OPERATEURS_DEFAUT = ['Wave', 'Orange Money', 'Free Money'];
export interface MoyenForm { type: 'carte' | 'mobile' | 'pispi'; numero: string; expiration: string; cvc: string; operateur: string }
export const emptyMoyen = (): MoyenForm => ({ type: 'mobile', numero: '', expiration: '', cvc: '', operateur: '' });

const luhn = (digits: string) => {
  let sum = 0;
  [...digits].reverse().forEach((d, i) => { let n = Number(d); if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; } sum += n; });
  return sum % 10 === 0;
};

/** Alias PI-SPI : un numéro de téléphone, une adresse e-mail ou un identifiant « SN-PI-123456 ». Le champ `numero` du moyen le porte. */
export const aliasPispiOk = (v: string) => v.replace(/\D/g, '').length >= 9 && !/[@a-z]/i.test(v.replace(/^\+/, '')) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || /^SN-PI-\d{6,}$/i.test(v.trim());

/** Contrôle du format avant l'envoi (spécification : cartes et numéros de téléphone). Renvoie le message à afficher, ou null. */
export function moyenError(m: MoyenForm, now = new Date()): string | null {
  if (m.type === 'carte') {
    const digits = m.numero.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(digits) || !luhn(digits)) return 'Numéro de carte invalide';
    const [mm, yy] = m.expiration.split('/').map(Number);
    if (!mm || mm < 1 || mm > 12 || !yy) return "Date d'expiration invalide (MM/AA)";
    if (2000 + yy < now.getFullYear() || (2000 + yy === now.getFullYear() && mm < now.getMonth() + 1)) return 'La carte est expirée';
    if (!/^\d{3,4}$/.test(m.cvc)) return 'Code de sécurité invalide';
    return null;
  }
  if (m.type === 'pispi') return aliasPispiOk(m.numero) ? null : 'Alias PI-SPI invalide (téléphone, e-mail ou SN-PI-123456)';
  if (!m.operateur) return "Sélectionnez l'opérateur";
  if (m.numero.replace(/\D/g, '').length < 9) return 'Numéro de téléphone invalide';
  return null;
}

export const moyenToDto = (m: MoyenForm) => (m.type === 'carte' ? { type: 'carte', numero: m.numero, expiration: m.expiration, cvc: m.cvc } : m.type === 'pispi' ? { type: 'pispi', alias: m.numero } : { type: 'mobile', operateur: m.operateur, numero: m.numero });

/** Texte du mot de passe temporaire, à ne montrer qu'avec un bandeau « simulation » : en production il part par e-mail. */
export const ACCESS_VALIDITY_DAYS = 7;
