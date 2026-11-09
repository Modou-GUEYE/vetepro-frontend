import { z } from 'zod';
import type { BadgeTone } from '@/shared/ui';
import { phoneOk } from '@/modules/paiements/models/paiements';

export const ALIAS_TYPES = ['Téléphone', 'E-mail', 'Identifiant marchand'] as const;
export type AliasType = (typeof ALIAS_TYPES)[number];
export type TransferType = 'inter' | 'simple' | 'multiple';
export const TRANSFER_LABEL: Record<TransferType, string> = { inter: 'Transfert intercomptes', simple: 'Transfert simple', multiple: 'Transfert multiple' };
export const TRANSFER_API: Record<TransferType, string> = { inter: 'Intercomptes', simple: 'Simple', multiple: 'Multiple' };

const accountSchema = z.object({ id: z.string(), type: z.enum(['Banque', 'Wallet']), nom: z.string(), institution: z.string(), numero: z.string(), solde: z.number(), principal: z.boolean(), canal: z.string().nullable() });
export type Account = z.infer<typeof accountSchema>;
const operationSchema = z.object({ date: z.string(), libelle: z.string(), compte: z.string(), montant: z.number(), statut: z.string() });
export const accountsDtoSchema = z.object({ items: z.array(accountSchema), solde_total: z.number(), operations: z.array(operationSchema) });
export type Operation = z.infer<typeof operationSchema>;

const aliasSchema = z.object({ id: z.string(), compte: z.string(), compte_id: z.string(), type: z.string(), valeur: z.string(), defaut: z.boolean(), actif: z.boolean(), date: z.string() });
export type Alias = z.infer<typeof aliasSchema>;
export const aliasListDtoSchema = z.object({ items: z.array(aliasSchema) });
export const aliasDtoSchema = aliasSchema;

const beneficiarySchema = z.object({ nom: z.string(), alias: z.string(), montant: z.number() });
export type Beneficiary = z.infer<typeof beneficiarySchema>;
const transferSchema = z.object({ id: z.string(), reference: z.string(), date: z.string(), type: z.string(), depuis: z.string(), beneficiaires: z.array(beneficiarySchema), montant: z.number(), motif: z.string(), statut: z.enum(['attente', 'succes']) });
export type Transfer = z.infer<typeof transferSchema>;
export const transferListDtoSchema = z.object({ items: z.array(transferSchema) });
export const transferDtoSchema = transferSchema;
export const codeDtoSchema = z.object({ code_demo: z.string(), expire_a: z.string() });

const recipientSchema = z.object({ nom: z.string(), alias: z.string(), montant: z.number(), statut: z.enum(['attente', 'paye', 'refuse', 'annule']) });
export type Recipient = z.infer<typeof recipientSchema>;
const requestSchema = z.object({
  id: z.string(), reference: z.string(), date: z.string(), type: z.string(), canal: z.string(), motif: z.string(), echeance: z.string(),
  destinataires: z.array(recipientSchema), montant: z.number(), avancement: z.enum(['paye', 'partiel', 'attente', 'cloturee']),
});
export type PaymentRequest = z.infer<typeof requestSchema>;
export const requestListDtoSchema = z.object({ items: z.array(requestSchema) });
export const requestDtoSchema = requestSchema;
export const clientsDtoSchema = z.object({ items: z.array(z.object({ id: z.string(), nom: z.string(), telephone: z.string() })) });
export type Client = z.infer<typeof clientsDtoSchema>['items'][number];

export const AVANCEMENT_LABEL: Record<PaymentRequest['avancement'], string> = { paye: 'Payée', partiel: 'Partielle', attente: 'En attente', cloturee: 'Clôturée' };
export const AVANCEMENT_TONE: Record<PaymentRequest['avancement'], BadgeTone> = { paye: 'green', partiel: 'blue', attente: 'amber', cloturee: 'slate' };
export const RECIPIENT_LABEL: Record<Recipient['statut'], string> = { attente: 'En attente', paye: 'Payé', refuse: 'Refusé', annule: 'Annulé' };
export const RECIPIENT_TONE: Record<Recipient['statut'], BadgeTone> = { attente: 'amber', paye: 'green', refuse: 'red', annule: 'slate' };

export const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
export const aliasOk = (s: string) => phoneOk(s) || emailOk(s) || /^[A-Z0-9-]{4,20}$/i.test(s);
/** Format attendu selon le type d'alias ; renvoie le message d'erreur, ou undefined si la valeur est valide. */
export function aliasError(type: string, valeur: string): string | undefined {
  const v = valeur.trim();
  if (!v) return 'Valeur requise';
  const ok = type === 'Téléphone' ? phoneOk(v) : type === 'E-mail' ? emailOk(v) : /^[A-Z0-9-]{4,20}$/i.test(v);
  return ok ? undefined : `Format invalide pour un alias de type ${type}`;
}

export interface Row { nom: string; alias: string; montant: string }
export const emptyRow = (): Row => ({ nom: '', alias: '', montant: '' });
export const rowsTotal = (rows: Row[]) => rows.reduce((n, r) => n + (/^\d+$/.test(r.montant) ? Number(r.montant) : 0), 0);
/** Première erreur d'une liste de bénéficiaires ou destinataires, ou undefined si tout est complet. */
export function rowsError(rows: Row[], phoneOnly: boolean, valid: (alias: string) => boolean = phoneOnly ? phoneOk : (a) => aliasOk(a.trim())): string | undefined {
  for (const r of rows) {
    if (!r.nom.trim() || !r.alias.trim() || !r.montant) return 'Complétez chaque ligne : nom, numéro ou alias, montant';
    if (!valid(r.alias)) return `Numéro ou alias invalide : ${r.alias}`;
    if (!/^\d+$/.test(r.montant) || Number(r.montant) < 1) return 'Chaque montant doit être un nombre entier positif';
  }
  return undefined;
}
