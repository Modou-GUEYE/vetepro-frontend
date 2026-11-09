import { z } from 'zod';
import type { Access } from '@/core/auth/session.store';

const roleSchema = z.enum(['super_admin', 'admin', 'veterinaire', 'assistant']);

export const accessDtoSchema = z.object({
  user: z.object({ id: z.string(), nom: z.string(), role: roleSchema, profil: z.string(), cabinet_id: z.string(), cabinet_nom: z.string() }),
  permissions: z.record(z.array(z.enum(['read', 'create', 'update', 'delete']))),
  modules: z.array(z.string()),
  abonnement: z.object({
    statut: z.enum(['essai', 'actif', 'expire']), jours_restants: z.number().optional(), fin: z.string().optional(),
    pack: z.object({ id: z.string(), nom: z.string() }).optional(), periode: z.enum(['mensuel', 'annuel']).optional(),
  }),
});

export const sessionDtoSchema = accessDtoSchema.extend({ access_token: z.string(), refresh_token: z.string() });
export const meDtoSchema = accessDtoSchema;
export const TWOFA_METHODS = ['sms', 'email', 'app'] as const;
export type TwoFactorMethod = (typeof TWOFA_METHODS)[number];
export const METHOD_LABEL: Record<TwoFactorMethod, string> = { sms: 'SMS', email: 'E-mail', app: 'Application' };
export const METHOD_HINT: Record<TwoFactorMethod, string> = {
  sms: 'Un code à 6 chiffres est envoyé par SMS sur votre téléphone.',
  email: 'Un code à 6 chiffres est envoyé à votre adresse e-mail.',
  app: "Le code à 6 chiffres est affiché par votre application d'authentification.",
};

export const challengeDtoSchema = z.object({ twofa_required: z.literal(true), challenge_id: z.string(), methode: z.enum(TWOFA_METHODS), destinataire: z.string() });
export const setupChallengeDtoSchema = z.object({ twofa_setup_required: z.literal(true), challenge_id: z.string() });
export const sentDtoSchema = z.object({ destinataire: z.string() });
export const sessionWithCodesDtoSchema = sessionDtoSchema.extend({ codes_secours: z.array(z.string()) });
export const codesDtoSchema = z.object({ codes_secours: z.array(z.string()) });
export const twofaStatusDtoSchema = z.object({ active: z.boolean(), methode: z.enum(TWOFA_METHODS).nullable(), requise: z.boolean(), codes_secours_restants: z.number() });
export type TwoFactorStatus = { active: boolean; methode: TwoFactorMethod | null; requise: boolean; codesSecoursRestants: number };

type AccessDto = z.infer<typeof accessDtoSchema>;

export const toAccess = (d: AccessDto): Access => ({
  user: { id: d.user.id, nom: d.user.nom, role: d.user.role, profil: d.user.profil, cabinetId: d.user.cabinet_id, cabinetNom: d.user.cabinet_nom },
  permissions: d.permissions as Access['permissions'],
  modules: d.modules,
  abonnement: { statut: d.abonnement.statut, joursRestants: d.abonnement.jours_restants, fin: d.abonnement.fin, pack: d.abonnement.pack, periode: d.abonnement.periode },
});

export type AuthSession = Access & { accessToken: string; refreshToken: string };
export type LoginResult =
  | { kind: 'session'; session: AuthSession }
  | { kind: '2fa'; challengeId: string; methode: TwoFactorMethod; destinataire: string }
  | { kind: 'setup'; challengeId: string };

export const loginFormSchema = z.object({
  identifiant: z.string().trim().min(1, 'Saisissez votre identifiant'),
  motDePasse: z.string().min(1, 'Saisissez votre mot de passe'),
});
export type LoginForm = z.infer<typeof loginFormSchema>;

export const profileDtoSchema = z.object({ identifiant: z.string(), email: z.string(), telephone: z.string() });
export const profileFormSchema = z.object({
  email: z.string().trim().email('Adresse e-mail invalide'),
  telephone: z.string().trim().refine((v) => v === '' || v.replace(/\D/g, '').length >= 9, 'Numéro invalide (ex. 77 123 45 67)'),
});
export type ProfileForm = z.infer<typeof profileFormSchema>;

export const forgotFormSchema = z.object({ email: z.string().trim().email('Adresse e-mail invalide') });
export type ForgotForm = z.infer<typeof forgotFormSchema>;
