import { http } from '@/core/http/client';
import { Access } from '@/core/auth/session.store';
import {
  AuthSession, LoginResult, ProfileForm, profileDtoSchema, TwoFactorMethod, TwoFactorStatus, challengeDtoSchema, codesDtoSchema, meDtoSchema, sentDtoSchema, sessionDtoSchema, sessionWithCodesDtoSchema,
  setupChallengeDtoSchema, toAccess, twofaStatusDtoSchema,
} from '../models/auth';

const toSession = (d: ReturnType<typeof sessionDtoSchema.parse>): AuthSession => ({
  ...toAccess(d),
  accessToken: d.access_token,
  refreshToken: d.refresh_token,
});

export const authService = {
  async login(identifiant: string, motDePasse: string, appareilId: string): Promise<LoginResult> {
    const { data } = await http.post('/auth/login', { identifiant, mot_de_passe: motDePasse, appareil_id: appareilId });
    if (data?.twofa_required) { const c = challengeDtoSchema.parse(data); return { kind: '2fa', challengeId: c.challenge_id, methode: c.methode, destinataire: c.destinataire }; }
    if (data?.twofa_setup_required) return { kind: 'setup', challengeId: setupChallengeDtoSchema.parse(data).challenge_id };
    return { kind: 'session', session: toSession(sessionDtoSchema.parse(data)) };
  },

  async verifyTwoFactor(challengeId: string, code: string, faireConfiance: boolean, appareilId: string): Promise<AuthSession> {
    const { data } = await http.post('/auth/2fa/verify', { challenge_id: challengeId, code, faire_confiance: faireConfiance, appareil_id: appareilId });
    return toSession(sessionDtoSchema.parse(data));
  },

  async verifyBackupCode(challengeId: string, code: string): Promise<AuthSession> {
    const { data } = await http.post('/auth/2fa/backup', { challenge_id: challengeId, code });
    return toSession(sessionDtoSchema.parse(data));
  },

  async resendCode(challengeId: string): Promise<string> {
    return sentDtoSchema.parse((await http.post('/auth/2fa/resend', { challenge_id: challengeId })).data).destinataire;
  },

  /** Configuration imposée par le cabinet, à la connexion. */
  async startSetup(challengeId: string, methode: TwoFactorMethod): Promise<string> {
    return sentDtoSchema.parse((await http.post('/auth/2fa/setup', { challenge_id: challengeId, methode })).data).destinataire;
  },
  async confirmSetup(challengeId: string, code: string): Promise<{ session: AuthSession; codes: string[] }> {
    const d = sessionWithCodesDtoSchema.parse((await http.post('/auth/2fa/setup/verify', { challenge_id: challengeId, code })).data);
    return { session: toSession(d), codes: d.codes_secours };
  },

  /** Mon compte. */
  async twofaStatus(): Promise<TwoFactorStatus> {
    const d = twofaStatusDtoSchema.parse((await http.get('/auth/2fa/status')).data);
    return { active: d.active, methode: d.methode, requise: d.requise, codesSecoursRestants: d.codes_secours_restants };
  },
  async startActivation(methode: TwoFactorMethod): Promise<string> {
    return sentDtoSchema.parse((await http.post('/auth/2fa/activer', { methode })).data).destinataire;
  },
  async confirmActivation(code: string): Promise<string[]> {
    return codesDtoSchema.parse((await http.post('/auth/2fa/activer/confirmer', { code })).data).codes_secours;
  },
  async disableTwofa(motDePasse: string): Promise<void> { await http.post('/auth/2fa/desactiver', { mot_de_passe: motDePasse }); },
  async renewBackupCodes(motDePasse: string): Promise<string[]> {
    return codesDtoSchema.parse((await http.post('/auth/2fa/codes-secours', { mot_de_passe: motDePasse })).data).codes_secours;
  },

  async profile() { return profileDtoSchema.parse((await http.get('/auth/profil')).data); },
  async updateProfile(f: ProfileForm) { return profileDtoSchema.parse((await http.put('/auth/profil', f)).data); },

  async me(): Promise<Access> {
    const { data } = await http.get('/auth/me');
    return toAccess(meDtoSchema.parse(data));
  },

  async logout(refreshToken: string | null): Promise<void> {
    await http.post('/auth/logout', { refresh_token: refreshToken });
  },

  async changePassword(ancien: string, nouveau: string): Promise<void> {
    await http.post('/auth/change-password', { ancien, nouveau });
  },

  async forgotPassword(email: string): Promise<void> {
    await http.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, motDePasse: string): Promise<void> {
    await http.post('/auth/reset-password', { token, mot_de_passe: motDePasse });
  },
};
