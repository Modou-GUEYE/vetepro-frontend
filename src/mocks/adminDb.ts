import { Overrides, PermissionMap } from '@/core/auth/permissions';
import { DEMO_USERS, DemoUser, fullName } from './authDb';
import { Failure, getProfile, PROFILES } from './profilesDb';

export interface UserInput { prenom: string; nom: string; identifiant: string; email: string; telephone: string; specialite: string; profilId: string }

const notFound: Failure = { status: 404, code: 'not_found', message: 'Utilisateur introuvable' };
/** Utilisateurs du cabinet de démonstration : ni ceux des autres cabinets inscrits, ni le Super-admin de l'association. */
const live = () => DEMO_USERS.filter((u) => !u.deleted && (u.cabinetId ?? '1') === '1');
const find = (id: string) => live().find((u) => u.id === id);

export function listUsers(params: { search?: string; statut?: string; profilId?: string; page: number; pageSize: number }) {
  const q = (params.search ?? '').trim().toLowerCase();
  const rows = live()
    .filter((u) => !q || `${fullName(u)} ${u.identifiant} ${u.email}`.toLowerCase().includes(q))
    .filter((u) => !params.profilId || u.profilId === params.profilId)
    .filter((u) => !params.statut || (params.statut === 'actif' ? u.actif : !u.actif));
  const start = (params.page - 1) * params.pageSize;
  return { items: rows.slice(start, start + params.pageSize), total: rows.length };
}

export const getUser = (id: string): DemoUser | Failure => find(id) ?? notFound;

function conflict(input: UserInput, exceptId?: string): Failure | null {
  const others = DEMO_USERS.filter((u) => !u.deleted && u.id !== exceptId); // l'unicité vaut pour toute la plateforme
  if (others.some((u) => u.identifiant === input.identifiant.trim().toLowerCase())) return { status: 409, code: 'identifiant_taken', message: 'Cet identifiant est déjà utilisé' };
  if (others.some((u) => u.email === input.email.trim().toLowerCase())) return { status: 409, code: 'email_taken', message: 'Cette adresse e-mail est déjà utilisée' };
  if (!getProfile(input.profilId)) return { status: 422, code: 'invalid_profile', message: 'Profil inconnu' };
  return null;
}

/** Ajout : le mot de passe est généré et envoyé par e-mail (spécification), jamais saisi ici. */
export function createUser(input: UserInput): DemoUser | Failure {
  const err = conflict(input);
  if (err) return err;
  const user: DemoUser = {
    id: String(Math.max(0, ...DEMO_USERS.map((u) => Number(u.id))) + 1), motDePasse: 'Genere#2026', actif: true, overrides: {},
    ...input, identifiant: input.identifiant.trim().toLowerCase(), email: input.email.trim().toLowerCase(),
  };
  DEMO_USERS.push(user);
  return user;
}

export function updateUser(id: string, input: UserInput): DemoUser | Failure {
  const user = find(id);
  if (!user) return notFound;
  const err = conflict(input, id);
  if (err) return err;
  Object.assign(user, input, { identifiant: input.identifiant.trim().toLowerCase(), email: input.email.trim().toLowerCase() });
  return user;
}

const self = (id: string, currentId: string | undefined): Failure | null =>
  id === currentId ? { status: 409, code: 'cannot_self', message: 'Vous ne pouvez pas désactiver ou supprimer votre propre compte' } : null;

export function setActive(id: string, actif: boolean, currentId?: string): DemoUser | Failure {
  const user = find(id);
  if (!user) return notFound;
  const err = actif ? null : self(id, currentId);
  if (err) return err;
  user.actif = actif;
  return user;
}

/** Suppression logique : le compte disparaît des listes et ne peut plus se connecter, les données liées sont conservées. */
export function deleteUser(id: string, currentId?: string): null | Failure {
  const user = find(id);
  if (!user) return notFound;
  const err = self(id, currentId);
  if (err) return err;
  user.deleted = true;
  user.actif = false;
  return null;
}

export function setOverrides(id: string, overrides: Overrides): DemoUser | Failure {
  const user = find(id);
  if (!user) return notFound;
  user.overrides = overrides;
  return user;
}

export const profilesWithCounts = () => PROFILES.filter((p) => p.baseRole !== 'super_admin').map((p) => ({ ...p, usersCount: live().filter((u) => u.profilId === p.id && u.actif).length }));
export type { PermissionMap };
