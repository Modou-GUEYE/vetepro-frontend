import { z } from 'zod';
import type { BadgeTone } from '@/shared/ui';

/**
 * Packs, promotions et durée d'essai : contrat du service Administration, section « platform »
 * (`/administration/platform/packs`, `/promotions`, `/commercial-settings`). Les noms de champs sont ceux du backend, sans traduction.
 */

/** Les montants arrivent en chaîne décimale (« 15000.00 »). */
const amount = z.string();

export const platformPackSchema = z.object({
  id: z.string(), name: z.string(), target: z.string().nullable(),
  monthly_price: amount, annual_price: amount, user_limit: z.number().nullable(), commitment_months: z.number(),
  features: z.array(z.string()), module_codes: z.array(z.string()),
  is_published: z.boolean(), is_featured: z.boolean(), is_custom: z.boolean(),
  /** Cabinets rattachés au pack par un abonnement, y compris en attente ou expiré (pas seulement les abonnements actifs). */
  subscriber_count: z.number(),
});
export type PlatformPack = z.infer<typeof platformPackSchema>;

export const platformPromoSchema = z.object({
  id: z.string(), code: z.string(), discount_percent: z.number(), duration_months: z.number(), usage_limit: z.number(),
  starts_on: z.string(), ends_on: z.string(), pack_ids: z.array(z.string()), is_active: z.boolean(), is_automatic: z.boolean(),
  /** Attributions confirmées par e-mail, une par cabinet ; les devis et inscriptions en attente ne comptent pas. */
  used_count: z.number(),
});
export type PlatformPromo = z.infer<typeof platformPromoSchema>;

/** Catalogue provisoire des modules : `GET /platform/modules` renvoie directement un tableau. */
export const platformModuleSchema = z.object({ code: z.string(), label: z.string() });
export const platformModulesSchema = z.array(platformModuleSchema);
export type PlatformModule = z.infer<typeof platformModuleSchema>;

export const commercialSettingsSchema = z.object({ trial_days: z.number() });
export type CommercialSettings = z.infer<typeof commercialSettingsSchema>;

/** Historique des modifications commerciales : `before` et `after` sont l'état de la ressource avant et après l'action. */
export const platformHistorySchema = z.object({
  id: z.string(), actor: z.string(), action: z.string(), resource_type: z.string(), resource_id: z.string(),
  before: z.record(z.unknown()).nullable(), after: z.record(z.unknown()).nullable(), created_at: z.string(),
});
export type PlatformHistory = z.infer<typeof platformHistorySchema>;
export const HISTORY_PAGE_SIZE = 20;

/** Liste paginée du backend : `page` et `page_size` (100 au plus). */
export const pageOf = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), total: z.number(), page: z.number(), page_size: z.number() });

/* ---------- Formulaire d'un pack ---------- */

const requiredStr = (msg: string) => z.string().trim().min(1, msg);
const optionalInt = (msg: string, min = 0) => z.string().trim().refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= min), msg);
/** Montant strictement positif, au plus deux décimales. */
const money = (msg: string) => z.string().trim().regex(/^\d+(\.\d{1,2})?$/, msg).refine((v) => Number(v) > 0, msg);

/** Une fonctionnalité par ligne. */
const lines = (v: string) => v.split('\n').map((l) => l.trim()).filter(Boolean);

/** Durées d'engagement décrites par la V5 : sans engagement, six ou douze mois. */
export const COMMITMENT_OPTIONS = [0, 6, 12] as const;

export const packFormSchema = z.object({
  name: requiredStr("Renseignez le nom de l'offre").max(200, '200 caractères au maximum'),
  target: z.string().trim(),
  monthly_price: money('Tarif mensuel invalide'),
  annual_price: money('Tarif annuel invalide'),
  user_limit: optionalInt("Nombre d'utilisateurs invalide", 1),
  commitment_months: z.string().trim().regex(/^\d+$/, "Durée d'engagement invalide"),
  features: z.string(),
  module_codes: z.array(z.string()),
  is_published: z.boolean(),
  is_featured: z.boolean(),
});
export type PackForm = z.infer<typeof packFormSchema>;

export const emptyPack = (): PackForm => ({
  name: '', target: '', monthly_price: '', annual_price: '', user_limit: '', commitment_months: '0', features: '', module_codes: [], is_published: false, is_featured: false,
});
export const packToForm = (p: PlatformPack): PackForm => ({
  name: p.name, target: p.target ?? '', monthly_price: p.monthly_price, annual_price: p.annual_price,
  user_limit: p.user_limit === null ? '' : String(p.user_limit), commitment_months: String(p.commitment_months),
  features: p.features.join('\n'), module_codes: p.module_codes, is_published: p.is_published, is_featured: p.is_featured,
});
/** Corps envoyé à `POST /platform/packs` et `PATCH /platform/packs/{id}` : conversion de la saisie en types, aucun renommage. */
export const packBody = (f: PackForm) => ({
  name: f.name, target: f.target === '' ? null : f.target, monthly_price: f.monthly_price, annual_price: f.annual_price,
  user_limit: f.user_limit === '' ? null : Number(f.user_limit), commitment_months: Number(f.commitment_months),
  features: lines(f.features), module_codes: f.module_codes, is_published: f.is_published, is_featured: f.is_featured,
});

/* ---------- Durée d'essai ---------- */

export const trialFormSchema = z.object({
  trial_days: z.string().trim().refine((v) => /^\d+$/.test(v) && Number(v) <= 90, "La durée d'essai doit être comprise entre 0 et 90 jours"),
});
export type TrialForm = z.infer<typeof trialFormSchema>;
export const trialBody = (f: TrialForm): CommercialSettings => ({ trial_days: Number(f.trial_days) });

/* ---------- Formulaire d'une promotion ---------- */

export const promoFormSchema = z.object({
  code: requiredStr('Code requis').max(64, '64 caractères au maximum').regex(/^[A-Za-z0-9_-]+$/, 'Lettres, chiffres, tirets et underscores uniquement'),
  discount_percent: z.string().trim().refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 100, 'Entre 1 et 100 %'),
  duration_months: z.string().trim().refine((v) => /^\d+$/.test(v) && Number(v) >= 1, 'Au moins 1 mois'),
  usage_limit: z.string().trim().refine((v) => /^\d+$/.test(v) && Number(v) >= 1, 'Au moins 1 cabinet'),
  starts_on: z.string().min(1, 'Date de début requise'),
  ends_on: z.string().min(1, 'Date de fin requise'),
  pack_ids: z.array(z.string()),
  is_active: z.boolean(),
  is_automatic: z.boolean(),
}).refine((f) => !f.starts_on || !f.ends_on || f.ends_on >= f.starts_on, { path: ['ends_on'], message: 'La date de fin doit suivre la date de début' });
export type PromoForm = z.infer<typeof promoFormSchema>;

const today = () => new Date().toISOString().slice(0, 10);
export const emptyPromo = (): PromoForm => ({
  code: '', discount_percent: '10', duration_months: '3', usage_limit: '10', starts_on: today(),
  ends_on: new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10), pack_ids: [], is_active: true, is_automatic: false,
});
export const promoToForm = (p: PlatformPromo): PromoForm => ({
  code: p.code, discount_percent: String(p.discount_percent), duration_months: String(p.duration_months), usage_limit: String(p.usage_limit),
  starts_on: p.starts_on, ends_on: p.ends_on, pack_ids: p.pack_ids, is_active: p.is_active, is_automatic: p.is_automatic,
});
export const promoBody = (f: PromoForm) => ({
  code: f.code, discount_percent: Number(f.discount_percent), duration_months: Number(f.duration_months), usage_limit: Number(f.usage_limit),
  starts_on: f.starts_on, ends_on: f.ends_on, pack_ids: f.pack_ids, is_active: f.is_active, is_automatic: f.is_automatic,
});

/* ---------- État d'une promotion (déduit des champs du backend) ---------- */

export type PromoState = 'actif' | 'inactif' | 'expire' | 'a_venir';
export const PROMO_STATE_LABEL: Record<PromoState, string> = { actif: 'En cours', inactif: 'Désactivé', expire: 'Expiré', a_venir: 'À venir' };
export const PROMO_STATE_TONE: Record<PromoState, BadgeTone> = { actif: 'green', inactif: 'slate', expire: 'red', a_venir: 'blue' };
export function promoState(p: PlatformPromo, now = today()): PromoState {
  if (!p.is_active) return 'inactif';
  if (p.ends_on < now) return 'expire';
  if (p.starts_on > now) return 'a_venir';
  return 'actif';
}

/** Texte d'offre sous le titre des packs du portail : essai, puis offre de lancement automatique en cours s'il y en a une. */
export function portalOfferText(trialDays: number, promo: PlatformPromo | undefined): string {
  const base = `Tarifs mensuels par cabinet. Essai gratuit de ${trialDays} jours`;
  if (!promo) return `${base}.`;
  return `${base}, -${promo.discount_percent} % pendant ${promo.duration_months} mois pour les ${promo.usage_limit} premiers inscrits.`;
}
