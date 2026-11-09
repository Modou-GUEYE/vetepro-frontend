import { z } from 'zod';
import type { BadgeTone } from '@/shared/ui';

export const CANALS = ['Wave', 'Orange Money', 'PI-SPI'] as const;
export type Canal = (typeof CANALS)[number];
export type Methode = 'qr' | 'demande';
export type TxStatut = 'attente' | 'succes' | 'refus' | 'expire' | 'annule';

export const STATUT_LABEL: Record<TxStatut, string> = { attente: 'En attente', succes: 'Confirmée', refus: 'Refusée', expire: 'Expirée', annule: 'Annulée' };
export const STATUT_TONE: Record<TxStatut, BadgeTone> = { attente: 'amber', succes: 'green', refus: 'red', expire: 'slate', annule: 'slate' };
export const METHODE_LABEL: Record<Methode, string> = { qr: 'QR code', demande: 'Demande de paiement' };

const txSchema = z.object({
  id: z.string(), reference: z.string(), date: z.string(), facture: z.object({ id: z.string(), numero: z.string(), reste: z.number() }).nullable(),
  canal: z.enum(CANALS), methode: z.enum(['qr', 'demande']), payeur: z.string(), alias: z.string(), montant: z.number(), libelle: z.string(),
  statut: z.enum(['attente', 'succes', 'refus', 'expire', 'annule']), motif: z.string(), rembourse: z.number(), expire_a: z.string(),
  historique: z.array(z.object({ statut: z.enum(['attente', 'succes', 'refus', 'expire', 'annule']), date: z.string() })),
});
export type Transaction = z.infer<typeof txSchema>;
export const txDtoSchema = txSchema;
export const txListDtoSchema = z.object({
  items: z.array(txSchema), expiration_min: z.number(),
  stats: z.object({ encaisse: z.number(), nb_encaisse: z.number(), en_attente: z.number(), nb_attente: z.number(), echecs: z.number(), rembourse: z.number(), nb_rembourse: z.number(), non_identifies: z.number(), nb_transactions: z.number() }),
});
export const refundListDtoSchema = z.object({ items: z.array(z.object({ id: z.string(), reference: z.string(), date: z.string(), origine: z.string(), beneficiaire: z.string(), canal: z.string(), montant: z.number(), motif: z.string(), avoir: z.string(), par: z.string() })) });
export type Refund = z.infer<typeof refundListDtoSchema>['items'][number];
export const suspensListDtoSchema = z.object({ items: z.array(z.object({ id: z.string(), reference: z.string(), date: z.string(), canal: z.string(), payeur: z.string(), alias: z.string(), montant: z.number(), libelle: z.string(), statut: z.enum(['suspens', 'rattache', 'rembourse']), facture: z.string().nullable() })) });
export type Suspens = z.infer<typeof suspensListDtoSchema>['items'][number];
export const openInvoicesDtoSchema = z.object({ items: z.array(z.object({ id: z.string(), numero: z.string(), client: z.string(), reste: z.number(), suggere: z.boolean() })) });
export type OpenInvoice = z.infer<typeof openInvoicesDtoSchema>['items'][number];

export const REFUND_REASONS = ['Trop-perçu', 'Prestation annulée', 'Erreur de montant', 'Doublon de paiement', 'Réclamation client', 'Autre'] as const;
/** Motif choisi et commentaire libre, tels que conservés sur le remboursement et l'avoir. */
export const refundMotif = (reason: string, comment: string) => (comment.trim() ? `${reason} : ${comment.trim()}` : reason);

export interface TxFilters { statut: string; canal: string; q: string; du: string; au: string }
export const emptyTxFilters = (): TxFilters => ({ statut: '', canal: '', q: '', du: '', au: '' });

export const phoneOk = (s: string) => /^(\+221)?7[0-8]\d{7}$/.test(s.replace(/[\s.-]/g, ''));

/** Alias du payeur : un numéro pour les portefeuilles mobiles ; PI-SPI accepte aussi une adresse e-mail ou un identifiant SN-PI-123456. */
export const aliasOkFor = (canal: string, s: string) => phoneOk(s) || (canal === 'PI-SPI' && (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()) || /^SN-PI-\d{6,}$/i.test(s.trim())));
export const aliasLabel = (canal: string) => (canal === 'PI-SPI' ? 'Alias du payeur' : 'Numéro du payeur');
export const aliasError = (canal: string) => (canal === 'PI-SPI' ? 'Alias invalide (téléphone, e-mail ou SN-PI-123456)' : 'Numéro du payeur invalide');

/** Secondes avant l'expiration d'une transaction en attente (jamais négatif). */
export const secondsLeft = (expireA: string, now = Date.now()) => Math.max(0, Math.round((new Date(expireA).getTime() - now) / 1000));
export const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Motif de carré noir et blanc dérivé de la référence : image de démonstration, pas un vrai QR code (le vrai vient de l'opérateur). */
export function qrPattern(seed: string, size = 25): boolean[][] {
  let h = 2166136261;
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const next = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h; };
  const finder = (r: number, c: number) => {
    for (const [fr, fc] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
      const dr = r - fr, dc = c - fc;
      if (dr >= -1 && dr <= 7 && dc >= -1 && dc <= 7) {
        if (dr < 0 || dc < 0 || dr > 6 || dc > 6) return false;
        return dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
      }
    }
    return null;
  };
  return Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => finder(r, c) ?? (next() & 1) === 1));
}
