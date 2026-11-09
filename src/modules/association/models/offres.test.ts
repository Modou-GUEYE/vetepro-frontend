import { describe, expect, it } from 'vitest';
import {
  COMMITMENT_OPTIONS, PlatformPack, PlatformPromo, emptyPack, emptyPromo, packBody, packFormSchema, packToForm, pageOf, platformHistorySchema, platformModulesSchema,
  platformPackSchema, platformPromoSchema, portalOfferText, promoBody, promoFormSchema, promoState, trialBody, trialFormSchema,
} from './offres';

const promo = (over: Partial<PlatformPromo> = {}): PlatformPromo => ({
  id: 'p', code: 'X', discount_percent: 5, duration_months: 6, usage_limit: 10, starts_on: '2026-01-01', ends_on: '2026-12-31', pack_ids: [], is_active: true, is_automatic: true, used_count: 3, ...over,
});

const packApi = {
  id: '5f0c3b1e-0000-4000-8000-000000000001', name: 'Pro', target: null, monthly_price: '25000.00', annual_price: '250000.00', user_limit: null, commitment_months: 12,
  features: ['Agenda'], module_codes: ['patients'], is_published: true, is_featured: false, is_custom: false, subscriber_count: 4, created_at: '2026-11-01T10:00:00Z', updated_at: '2026-11-01T10:00:00Z',
};

describe('contrat du backend', () => {
  it('lit un pack avec son nombre de cabinets', () => {
    const p = platformPackSchema.parse(packApi);
    expect(p.monthly_price).toBe('25000.00');
    expect(p.target).toBeNull();
    expect(p.subscriber_count).toBe(4);
  });

  it('refuse un pack auquel il manque un champ (aucune valeur de repli)', () => {
    expect(platformPackSchema.safeParse({ ...packApi, subscriber_count: undefined }).success).toBe(false);
    expect(platformPackSchema.safeParse({ id: 'a', name: 'Libre', monthly_price: '0.00', annual_price: '0.00', is_custom: true }).success).toBe(false);
  });

  it('lit une promotion avec son nombre d\'utilisations, et une page', () => {
    const body = { id: 'p', code: 'X', discount_percent: 5, duration_months: 6, usage_limit: 10, starts_on: '2026-01-01', ends_on: '2026-12-31', pack_ids: [], is_active: true, is_automatic: false, used_count: 2 };
    expect(platformPromoSchema.parse(body).used_count).toBe(2);
    expect(platformPromoSchema.safeParse({ ...body, used_count: undefined }).success).toBe(false);
    expect(pageOf(platformPromoSchema).parse({ items: [body], total: 1, page: 1, page_size: 100 }).items).toHaveLength(1);
  });

  it('lit le catalogue des modules : un tableau de code et libellé', () => {
    expect(platformModulesSchema.parse([{ code: 'patients', label: 'Dossiers patients' }])).toHaveLength(1);
    expect(platformModulesSchema.safeParse({ items: [] }).success).toBe(false);
  });
});

describe('historique commercial', () => {
  const entry = { id: 'h1', actor: 'Mame Gaye', action: 'pack.update', resource_type: 'pack', resource_id: 'a', before: { name: 'Pro' }, after: { name: 'Pro+' }, created_at: '2026-11-06T10:00:00Z' };
  it("lit une entrée avec l'état avant et après", () => {
    expect(platformHistorySchema.parse(entry).after).toEqual({ name: 'Pro+' });
    expect(platformHistorySchema.parse({ ...entry, before: null, after: null }).before).toBeNull();
  });
  it('refuse une entrée incomplète', () => {
    expect(platformHistorySchema.safeParse({ id: 'h1', actor: 'x' }).success).toBe(false);
  });
});

describe('formulaire de pack', () => {
  const ok = { ...emptyPack(), name: 'Pro', monthly_price: '30000', annual_price: '300000' };

  it('exige un nom et deux tarifs strictement positifs', () => {
    const r = packFormSchema.safeParse(emptyPack());
    expect(r.success).toBe(false);
    const msgs = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(msgs).toEqual(expect.arrayContaining(["Renseignez le nom de l'offre", 'Tarif mensuel invalide', 'Tarif annuel invalide']));
    expect(packFormSchema.safeParse({ ...ok, monthly_price: '0' }).success).toBe(false);
    expect(packFormSchema.safeParse({ ...ok, annual_price: '0.00' }).success).toBe(false);
    expect(packFormSchema.safeParse(ok).success).toBe(true);
  });

  it('prépare le corps avec les noms du backend', () => {
    const f = { ...ok, name: ' Pro ', features: 'A\n\n B \n', module_codes: ['patients', 'rdv'], commitment_months: '12', is_published: true };
    expect(packBody(f)).toEqual({
      name: ' Pro ', target: null, monthly_price: '30000', annual_price: '300000', user_limit: null, commitment_months: 12,
      features: ['A', 'B'], module_codes: ['patients', 'rdv'], is_published: true, is_featured: false,
    });
    expect(packBody({ ...f, user_limit: '5' }).user_limit).toBe(5);
  });

  it("propose trois durées d'engagement : aucune, six ou douze mois", () => {
    expect([...COMMITMENT_OPTIONS]).toEqual([0, 6, 12]);
  });

  it('reprend un pack existant dans le formulaire', () => {
    const p: PlatformPack = { ...platformPackSchema.parse(packApi), target: 'Cabinet', user_limit: 3, commitment_months: 6, features: ['A', 'B'], module_codes: ['patients', 'rdv'] };
    expect(packToForm(p)).toMatchObject({ name: 'Pro', target: 'Cabinet', monthly_price: '25000.00', user_limit: '3', commitment_months: '6', features: 'A\nB', module_codes: ['patients', 'rdv'] });
  });
});

describe("durée d'essai", () => {
  it('borne la durée à 0-90 jours', () => {
    expect(trialFormSchema.safeParse({ trial_days: '30' }).success).toBe(true);
    expect(trialFormSchema.safeParse({ trial_days: '91' }).success).toBe(false);
    expect(trialFormSchema.safeParse({ trial_days: '-1' }).success).toBe(false);
    expect(trialBody({ trial_days: '45' })).toEqual({ trial_days: 45 });
  });

  it("décrit l'offre affichée sur le portail", () => {
    expect(portalOfferText(30, undefined)).toBe('Tarifs mensuels par cabinet. Essai gratuit de 30 jours.');
    expect(portalOfferText(14, promo())).toBe('Tarifs mensuels par cabinet. Essai gratuit de 14 jours, -5 % pendant 6 mois pour les 10 premiers inscrits.');
  });
});

describe('promotions', () => {
  const base = { ...emptyPromo(), code: 'RENTREE' };

  it('valide pourcentage, durée, quota et période', () => {
    expect(promoFormSchema.safeParse(base).success).toBe(true);
    expect(promoFormSchema.safeParse({ ...base, discount_percent: '150' }).success).toBe(false);
    expect(promoFormSchema.safeParse({ ...base, duration_months: '0' }).success).toBe(false);
    expect(promoFormSchema.safeParse({ ...base, usage_limit: '0' }).success).toBe(false);
    const r = promoFormSchema.safeParse({ ...base, starts_on: '2026-10-01', ends_on: '2026-01-01' });
    expect(r.success ? '' : r.error.issues[0]!.message).toBe('La date de fin doit suivre la date de début');
    expect(promoBody(base)).toMatchObject({ code: 'RENTREE', discount_percent: 10, pack_ids: [], is_active: true });
  });

  it('applique la règle du backend sur le code : lettres, chiffres, tirets et underscores', () => {
    expect(promoFormSchema.safeParse({ ...base, code: 'LANCEMENT-5_a' }).success).toBe(true);
    expect(promoFormSchema.safeParse({ ...base, code: 'LANCEMENT 5' }).success).toBe(false);
    expect(promoFormSchema.safeParse({ ...base, code: 'PROMO€' }).success).toBe(false);
    expect(promoFormSchema.safeParse({ ...base, code: ' ' }).success).toBe(false);
  });

  it("déduit l'état d'une promotion de ses dates et de son activation", () => {
    const today = '2026-10-27';
    expect(promoState(promo(), today)).toBe('actif');
    expect(promoState(promo({ is_active: false }), today)).toBe('inactif');
    expect(promoState(promo({ ends_on: '2026-06-01' }), today)).toBe('expire');
    expect(promoState(promo({ starts_on: '2026-11-01' }), today)).toBe('a_venir');
  });
});
