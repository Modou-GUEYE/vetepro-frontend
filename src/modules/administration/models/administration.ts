import { z } from 'zod';
import type { Overrides, PermissionMap } from '@/core/auth/permissions';

const userDtoSchema = z.object({
  id: z.string(), prenom: z.string(), nom: z.string(), identifiant: z.string(), email: z.string(),
  telephone: z.string(), specialite: z.string(), profil_id: z.string(), profil_label: z.string(), profil_base: z.string(),
  actif: z.boolean(), twofa: z.boolean().default(false), nb_exceptions: z.number(),
});

export const userPageDtoSchema = z.object({ items: z.array(userDtoSchema), total: z.number(), page: z.number(), page_size: z.number() });
export const userDetailDtoSchema = userDtoSchema.extend({ exceptions: z.record(z.record(z.enum(['grant', 'deny']))) });
export const createdUserDtoSchema = userDtoSchema.extend({ message: z.string() });

export interface UserRow {
  id: string; prenom: string; nom: string; identifiant: string; email: string; telephone: string;
  specialite: string; profilId: string; profilLabel: string; profilBase: string; actif: boolean; twofa: boolean; nbExceptions: number;
}

export const toUserRow = (d: z.infer<typeof userDtoSchema>): UserRow => ({
  id: d.id, prenom: d.prenom, nom: d.nom, identifiant: d.identifiant, email: d.email, telephone: d.telephone,
  specialite: d.specialite, profilId: d.profil_id, profilLabel: d.profil_label, profilBase: d.profil_base, actif: d.actif, twofa: d.twofa, nbExceptions: d.nb_exceptions,
});

export const fullName = (u: Pick<UserRow, 'prenom' | 'nom'>) => `${u.prenom} ${u.nom}`;
export const initials = (u: Pick<UserRow, 'prenom' | 'nom'>) => `${u.prenom[0] ?? ''}${u.nom[0] ?? ''}`.toUpperCase();

export interface UserPage { items: UserRow[]; total: number; page: number; pageSize: number }
export interface UserDetail extends UserRow { exceptions: Overrides }

export const userFormSchema = z.object({
  prenom: z.string().trim().min(1, 'Le prénom est obligatoire'),
  nom: z.string().trim().min(1, 'Le nom est obligatoire'),
  identifiant: z.string().trim().min(3, '3 caractères minimum').regex(/^[A-Za-z0-9._-]+$/, 'Lettres, chiffres, point, tiret et underscore uniquement'),
  email: z.string().trim().email('Adresse e-mail invalide'),
  telephone: z.string().trim().regex(/^(\+?[\d\s]{9,16})?$/, 'Numéro de téléphone invalide'),
  specialite: z.string().trim(),
  profilId: z.string().min(1, 'Choisissez un profil'),
});
export type UserForm = z.infer<typeof userFormSchema>;

export const emptyUserForm: UserForm = { prenom: '', nom: '', identifiant: '', email: '', telephone: '', specialite: '', profilId: '' };

const profileDtoSchema = z.object({
  id: z.string(), label: z.string(), base_role: z.string().optional(), system: z.boolean(), users_count: z.number().optional(),
  permissions: z.record(z.array(z.enum(['read', 'create', 'update', 'delete']))),
});
export const profileListDtoSchema = z.object({ items: z.array(profileDtoSchema) });
export const profileDtoOnly = profileDtoSchema;

export interface Profile { id: string; label: string; baseRole: string; system: boolean; usersCount: number; permissions: PermissionMap }
export const toProfile = (d: z.infer<typeof profileDtoSchema>): Profile => ({
  id: d.id, label: d.label, baseRole: d.base_role ?? '', system: d.system, usersCount: d.users_count ?? 0, permissions: d.permissions as PermissionMap,
});
