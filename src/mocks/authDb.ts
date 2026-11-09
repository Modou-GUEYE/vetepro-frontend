import type { Overrides } from '@/core/auth/permissions';
import { effectivePermissions } from '@/core/auth/permissions';
import type { Role } from '@/core/auth/session.store';
import { CABINET, resetCabinet } from './cabinetDb';
import { cabinetNom, getCabinet, joursRestants, packModules, resetSubscriptions, getPack, statutOf } from './subscriptionDb';
import { getProfile, Failure } from './profilesDb';
export type { Failure };

/** Données de démonstration du lot L1, d'après la spécification. */
export interface DemoUser {
  id: string;
  identifiant: string;
  motDePasse: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  specialite: string;
  profilId: string;
  actif: boolean;
  deleted?: boolean;
  overrides: Overrides;
  /** Double authentification activée par l'utilisateur ; `twofaRequise` : imposée par le cabinet, à configurer à la connexion. */
  twofa?: boolean;
  twofaMethode?: TwoFactorMethod;
  twofaRequise?: boolean;
  codesSecours?: string[];
  appareils?: string[];
  /** Cabinet de rattachement (« 1 » par défaut) ; le Super-admin n'en a pas. */
  cabinetId?: string;
}

const u = (id: string, identifiant: string, motDePasse: string, prenom: string, nom: string, email: string, telephone: string, profilId: string, extra: Partial<DemoUser> = {}): DemoUser =>
  ({ id, identifiant, motDePasse, prenom, nom, email, telephone, specialite: '', profilId, actif: true, overrides: {}, ...extra });

const seedUsers = (): DemoUser[] => [
  u('1', 'admin', 'Admin#2026', 'Amadou', 'Sy', 'amadou.sy@vetepro.sn', '77 001 00 00', 'admin'),
  u('2', 'veto', 'Veto#2026', 'Fatou', 'Diallo', 'fatou.diallo@vetepro.sn', '77 002 00 00', 'veterinaire', { specialite: 'Grands animaux' }),
  u('3', 'assistant', 'Assist#2026', 'Omar', 'Diouf', 'omar.diouf@vetepro.sn', '77 003 00 00', 'assistant'),
  u('6', 'double', 'Double#2026', 'Ibrahima', 'Ba', 'ibrahima.ba@vetepro.sn', '77 006 00 00', 'veterinaire', { twofa: true, twofaMethode: 'sms', codesSecours: ['AB12-CD34', 'EF56-GH78'], specialite: 'Animaux de compagnie' }),
  u('7', 'desactive', 'Desact#2026', 'Compte', 'Désactivé', 'desactive@vetepro.sn', '77 007 00 00', 'assistant', { actif: false }),
  u('9', 'securise', 'Secure#2026', 'Khady', 'Sow', 'khady.sow@vetepro.sn', '77 009 00 00', 'assistant', { twofaRequise: true }),
  u('8', 'expire', 'Expire#2026', 'Cheikh', 'Sarr', 'cheikh.sarr@vetepro.sn', '77 008 00 00', 'admin', { cabinetId: '2' }),
  u('11', 'essai', 'Essai#2026', 'Aïssatou', 'Mbaye', 'cabinet.thies@vet.sn', '77 011 00 00', 'admin', { cabinetId: '3' }),
  u('12', 'echeance', 'Echeance#2026', 'Fatou', 'Sarr', 'cabinet.kaolack@vet.sn', '77 012 00 00', 'admin', { cabinetId: '5' }),
  u('10', 'asso', 'Asso#2026', 'Mame', 'Gaye', 'mame.gaye@asso-veterinaires.sn', '77 010 00 00', 'super_admin', { cabinetId: '0' }),
];

export let DEMO_USERS: DemoUser[] = seedUsers();
export const resetUsers = () => { DEMO_USERS = seedUsers(); };
export const setUsers = (users: DemoUser[]) => { DEMO_USERS = users; };
export const fullName = (x: DemoUser) => `${x.prenom} ${x.nom}`;

export const TWOFA_CODE = '123456';
export type TwoFactorMethod = 'sms' | 'email' | 'app';
export const TWOFA_METHODS: TwoFactorMethod[] = ['sms', 'email', 'app'];
export const LOCK_MINUTES = 15;
export const MAX_FAILURES = 5;

export interface AccessDto {
  user: { id: string; nom: string; role: Role; profil: string; cabinet_id: string; cabinet_nom: string };
  permissions: Record<string, string[]>;
  modules: string[];
  abonnement: { statut: 'essai' | 'actif' | 'expire'; jours_restants?: number; fin?: string; pack?: { id: string; nom: string }; periode?: 'mensuel' | 'annuel' };
}

export const ASSOCIATION_NOM = 'Association des vétérinaires';

/** Accès d'un utilisateur : droits du profil limités aux modules du pack du cabinet, et état de son abonnement. */
export function buildAccess(user: DemoUser, now = Date.now()): AccessDto {
  const profil = getProfile(user.profilId);
  const role = profil?.baseRole ?? 'assistant';
  if (role === 'super_admin') {
    return { user: { id: user.id, nom: fullName(user), role, profil: profil?.label ?? '', cabinet_id: '0', cabinet_nom: ASSOCIATION_NOM }, permissions: {}, modules: [], abonnement: { statut: 'actif' } };
  }
  const cab = getCabinet(user.cabinetId ?? '1');
  const statut = cab ? statutOf(cab, now) : 'actif';
  const open = packModules(cab?.id ?? '1');
  const all = effectivePermissions(profil?.permissions ?? {}, user.overrides);
  const permissions = Object.fromEntries(Object.entries(all).filter(([m]) => open.has(m as never)));
  const pack = cab && getPack(cab.packId);
  return {
    user: { id: user.id, nom: fullName(user), role, profil: profil?.label ?? '', cabinet_id: cab?.id ?? '1', cabinet_nom: cab ? cabinetNom(cab) : CABINET.nom },
    permissions: permissions as Record<string, string[]>,
    modules: Object.keys(profil?.permissions ?? {}).filter((m) => open.has(m as never)),
    abonnement: statut === 'expire'
      ? { statut, fin: cab?.fin, pack: pack && { id: pack.id, nom: pack.nom }, periode: cab?.periode }
      : { statut, jours_restants: cab ? joursRestants(cab, now) : undefined, fin: cab?.fin, pack: pack && { id: pack.id, nom: pack.nom }, periode: cab?.periode },
  };
}

export const buildSession = (u: DemoUser) => ({
  ...buildAccess(u),
  access_token: `mock-access-${u.id}`,
  refresh_token: `mock-refresh-${u.id}`,
});

export type LoginOutcome =
  | { kind: 'ok'; user: DemoUser }
  | { kind: '2fa'; challengeId: string; methode: TwoFactorMethod; destinataire: string }
  | { kind: 'setup'; challengeId: string }
  | { kind: 'error' } & Failure;

const failures = new Map<string, { count: number; lockedUntil: number }>();
export const resetFailures = () => failures.clear();
export const resetAll = () => { failures.clear(); resetUsers(); pending.clear(); resetCabinet(); resetSubscriptions(); };

const invalid: LoginOutcome = { kind: 'error', status: 401, code: 'invalid_credentials', message: 'Identifiant ou mot de passe incorrect' };
const challengeError = (): LoginOutcome => ({ kind: 'error', status: 401, code: 'invalid_challenge', message: 'Session de vérification expirée, reconnectez-vous' });

/** Où le code est envoyé, masqué : SMS « 77 *** ** 06 », e-mail « i***@vetepro.sn », ou l'application d'authentification. */
export function maskedTarget(user: DemoUser, methode: TwoFactorMethod): string {
  if (methode === 'app') return "votre application d'authentification";
  if (methode === 'sms') { const d = user.telephone.split(' '); return `${d[0]} *** ** ${d[d.length - 1]}`; }
  const [name, domain] = user.email.split('@');
  return `${name?.[0] ?? ''}***@${domain ?? ''}`;
}

/** Double authentification imposée : par le cabinet (réglage « obligatoire pour tous ») ou, en démonstration, pour ce compte seulement. */
export const twofaImposee = (user: DemoUser) => CABINET.twofaObligatoire || !!user.twofaRequise;

/** Défi de connexion en cours : l'identifiant du défi est celui de l'utilisateur (`ch-<id>`). */
const pending = new Map<string, TwoFactorMethod>();
const challengeOf = (user: DemoUser) => `ch-${user.id}`;
const userOfChallenge = (challengeId: string) => DEMO_USERS.find((x) => challengeOf(x) === challengeId && !x.deleted && x.actif);

export function attemptLogin(identifiant: string, motDePasse: string, now = Date.now(), deviceId?: string): LoginOutcome {
  const key = identifiant.trim().toLowerCase();
  const state = failures.get(key) ?? { count: 0, lockedUntil: 0 };
  if (state.lockedUntil > now) {
    return { kind: 'error', status: 423, code: 'account_locked', message: `Compte bloqué pendant ${LOCK_MINUTES} minutes` };
  }
  const user = DEMO_USERS.find((x) => x.identifiant === key);
  if (!user || user.motDePasse !== motDePasse) {
    const count = state.count + 1;
    failures.set(key, { count: count >= MAX_FAILURES ? 0 : count, lockedUntil: count >= MAX_FAILURES ? now + LOCK_MINUTES * 60_000 : 0 });
    return invalid;
  }
  failures.delete(key);
  if (user.deleted) return { kind: 'error', status: 403, code: 'account_deleted', message: 'Compte supprimé, contactez votre administrateur' };
  if (!user.actif) {
    return { kind: 'error', status: 403, code: 'account_disabled', message: 'Compte désactivé, contactez votre administrateur' };
  }
  if (user.twofa) {
    if (deviceId && user.appareils?.includes(deviceId)) return { kind: 'ok', user };
    const methode = user.twofaMethode ?? 'sms';
    return { kind: '2fa', challengeId: challengeOf(user), methode, destinataire: maskedTarget(user, methode) };
  }
  if (twofaImposee(user)) return { kind: 'setup', challengeId: challengeOf(user) };
  return { kind: 'ok', user };
}

/** Code de vérification ; « faire confiance à cet appareil » dispense du code les 30 jours suivants (simulé par l'identifiant d'appareil). */
export function verifyTwoFactor(challengeId: string, code: string, trust?: { deviceId?: string; faireConfiance?: boolean }): LoginOutcome {
  const user = userOfChallenge(challengeId);
  if (!user || !user.twofa) return challengeError();
  if (code !== TWOFA_CODE) return { kind: 'error', status: 401, code: 'invalid_code', message: 'Code incorrect' };
  if (trust?.faireConfiance && trust.deviceId && !user.appareils?.includes(trust.deviceId)) user.appareils = [...(user.appareils ?? []), trust.deviceId];
  return { kind: 'ok', user };
}

/** Code de secours : à usage unique. */
export function verifyBackupCode(challengeId: string, code: string): LoginOutcome {
  const user = userOfChallenge(challengeId);
  if (!user || !user.twofa) return challengeError();
  const wanted = code.trim().toUpperCase();
  if (!user.codesSecours?.includes(wanted)) return { kind: 'error', status: 401, code: 'invalid_code', message: 'Code de secours incorrect ou déjà utilisé' };
  user.codesSecours = user.codesSecours.filter((c) => c !== wanted);
  return { kind: 'ok', user };
}

export function resendCode(challengeId: string): { destinataire: string } | Failure {
  const user = userOfChallenge(challengeId);
  if (!user) return { status: 401, code: 'invalid_challenge', message: 'Session de vérification expirée, reconnectez-vous' };
  const methode = user.twofa ? (user.twofaMethode ?? 'sms') : (pending.get(challengeId) ?? 'sms');
  return { destinataire: maskedTarget(user, methode) };
}

/** Huit codes de secours au format XXXX-XXXX, sans caractères ambigus. */
export function generateBackupCodes(): string[] {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return Array.from({ length: 8 }, () => `${part()}-${part()}`);
}

/* ---------- Activation de la double authentification (Mon compte, ou configuration imposée par le cabinet) ---------- */

export const twofaStatus = (userId: string) => {
  const u = DEMO_USERS.find((x) => x.id === userId);
  return { active: !!u?.twofa, methode: u?.twofa ? (u.twofaMethode ?? 'sms') : null, requise: !!u && twofaImposee(u), codes_secours_restants: u?.codesSecours?.length ?? 0 };
};

export function startTwofaSetup(challengeId: string, methode: string): { destinataire: string } | Failure {
  const user = userOfChallenge(challengeId);
  if (!user || user.twofa) return { status: 401, code: 'invalid_challenge', message: 'Session de vérification expirée, reconnectez-vous' };
  if (!TWOFA_METHODS.includes(methode as TwoFactorMethod)) return { status: 422, code: 'invalid', message: 'Choisissez une méthode' };
  pending.set(challengeId, methode as TwoFactorMethod);
  return { destinataire: maskedTarget(user, methode as TwoFactorMethod) };
}

export function confirmTwofaSetup(challengeId: string, code: string): { user: DemoUser; codes: string[] } | Failure {
  const user = userOfChallenge(challengeId);
  const methode = pending.get(challengeId);
  if (!user || !methode) return { status: 401, code: 'invalid_challenge', message: 'Session de vérification expirée, recommencez' };
  if (code !== TWOFA_CODE) return { status: 401, code: 'invalid_code', message: 'Code incorrect' };
  pending.delete(challengeId);
  user.twofa = true;
  user.twofaMethode = methode;
  user.codesSecours = generateBackupCodes();
  return { user, codes: user.codesSecours };
}

export function disableTwofa(userId: string, motDePasse: string): Failure | null {
  const user = DEMO_USERS.find((x) => x.id === userId && !x.deleted);
  if (!user) return { status: 401, code: 'unauthenticated', message: 'Non connecté' };
  if (user.motDePasse !== motDePasse) return { status: 422, code: 'invalid_current_password', message: 'Mot de passe incorrect' };
  if (twofaImposee(user)) return { status: 403, code: 'twofa_required', message: 'La double authentification est obligatoire dans votre cabinet : désactivation impossible' };
  user.twofa = false;
  user.twofaMethode = undefined;
  user.codesSecours = undefined;
  user.appareils = undefined;
  return null;
}

export function renewBackupCodes(userId: string, motDePasse: string): { codes: string[] } | Failure {
  const user = DEMO_USERS.find((x) => x.id === userId && !x.deleted);
  if (!user) return { status: 401, code: 'unauthenticated', message: 'Non connecté' };
  if (user.motDePasse !== motDePasse) return { status: 422, code: 'invalid_current_password', message: 'Mot de passe incorrect' };
  if (!user.twofa) return { status: 409, code: 'twofa_inactive', message: "La double authentification n'est pas activée" };
  user.codesSecours = generateBackupCodes();
  return { codes: user.codesSecours };
}

export function changePassword(userId: string, ancien: string, nouveau: string): Failure | null {
  const user = DEMO_USERS.find((x) => x.id === userId && !x.deleted);
  if (!user) return { status: 401, code: 'unauthenticated', message: 'Non connecté' };
  if (user.motDePasse !== ancien) return { status: 422, code: 'invalid_current_password', message: 'Mot de passe actuel incorrect' };
  user.motDePasse = nouveau;
  return null;
}

export function requestReset(email: string): Failure | null {
  return DEMO_USERS.some((x) => x.email === email.trim().toLowerCase() && !x.deleted)
    ? null
    : { status: 404, code: 'email_not_found', message: 'Adresse e-mail non reconnue' };
}

/** Jeton « expire » : lien de 3 minutes dépassé ; tout autre jeton est valide. */
export function applyReset(token: string): Failure | null {
  return token === 'expire' ? { status: 410, code: 'link_expired', message: 'Ce lien a expiré' } : null;
}

/** Mon compte : l'utilisateur modifie son e-mail et son téléphone ; l'e-mail reste unique. */
export function updateOwnContact(userId: string, email: string, telephone: string): DemoUser | Failure {
  const user = DEMO_USERS.find((x) => x.id === userId && !x.deleted);
  if (!user) return { status: 401, code: 'unauthenticated', message: 'Non connecté' };
  const mail = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(mail)) return { status: 422, code: 'invalid', message: 'Adresse e-mail invalide' };
  if (telephone.trim() && telephone.replace(/\D/g, '').length < 9) return { status: 422, code: 'invalid', message: 'Numéro de téléphone invalide' };
  if (DEMO_USERS.some((x) => x.id !== userId && !x.deleted && x.email === mail)) return { status: 409, code: 'email_taken', message: 'Cette adresse e-mail est déjà utilisée' };
  user.email = mail;
  user.telephone = telephone.trim();
  return user;
}
