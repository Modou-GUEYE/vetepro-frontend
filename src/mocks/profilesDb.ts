import { Action, MODULES, PermissionMap } from '@/core/auth/permissions';
import type { Role } from '@/core/auth/session.store';

export interface Failure { status: number; code: string; message: string }

/** Profils de démonstration. La matrice est un exemple d'après la spécification ; l'Administrateur peut la modifier (écran Habilitations). */
export interface DemoProfile { id: string; label: string; baseRole: Role; system: boolean; permissions: PermissionMap }

const CU: Action[] = ['read', 'create', 'update'];
const ALL: Action[] = ['read', 'create', 'update', 'delete'];
const R: Action[] = ['read'];

const seeds = (): DemoProfile[] => [
  { id: 'admin', label: 'Administrateur', baseRole: 'admin', system: true, permissions: Object.fromEntries(MODULES.map((m) => [m, [...ALL]])) },
  {
    id: 'veterinaire', label: 'Vétérinaire', baseRole: 'veterinaire', system: true,
    permissions: { patients: ALL, proprietaires: ALL, rdv: ALL, consultations: ALL, vaccinations: ALL, hospitalisations: ALL, insemination: ALL, pharmacie: R, stock: CU, ventes: CU, ordonnances: ALL, facturation: CU, reporting: R, services: R, cvtheque: R, reseau: ['read', 'create'] },
  },
  { id: 'assistant', label: 'Assistant', baseRole: 'assistant', system: true, permissions: { patients: CU, proprietaires: CU, rdv: ALL, vaccinations: CU, insemination: R, pharmacie: R, stock: CU, ventes: CU, services: R, reseau: R } },
  /** Profil de l'association : back-office de la plateforme, sans accès aux données d'un cabinet. */
  { id: 'super_admin', label: 'Super-admin', baseRole: 'super_admin', system: true, permissions: {} },
];

export let PROFILES: DemoProfile[] = seeds();
export const resetProfiles = () => { PROFILES = seeds(); };
export const getProfile = (id: string) => PROFILES.find((p) => p.id === id);

export function duplicateProfile(sourceId: string, label: string): DemoProfile | Failure {
  const source = getProfile(sourceId);
  const name = label.trim();
  if (!source) return { status: 404, code: 'not_found', message: 'Profil introuvable' };
  if (!name) return { status: 422, code: 'invalid', message: 'Le libellé du nouveau profil est obligatoire' };
  if (PROFILES.some((p) => p.label.toLowerCase() === name.toLowerCase())) {
    return { status: 409, code: 'label_taken', message: 'Un profil porte déjà ce libellé' };
  }
  const copy: DemoProfile = {
    id: `p${PROFILES.length + 1}-${Date.now()}`, label: name, baseRole: source.baseRole, system: false,
    permissions: Object.fromEntries(Object.entries(source.permissions).map(([m, a]) => [m, [...(a ?? [])]])),
  };
  PROFILES = [...PROFILES, copy];
  return copy;
}

/** Garde-fou : l'Administrateur ne peut pas perdre l'accès aux utilisateurs et habilitations, sinon plus personne ne pourrait les rétablir. */
export function setProfilePermissions(id: string, permissions: PermissionMap): DemoProfile | Failure {
  const p = getProfile(id);
  if (!p) return { status: 404, code: 'not_found', message: 'Profil introuvable' };
  if (p.id === 'admin') {
    for (const m of ['utilisateurs', 'habilitations'] as const) {
      if (!ALL.every((a) => permissions[m]?.includes(a))) {
        return { status: 409, code: 'protected_profile', message: "L'Administrateur doit garder tous les droits sur les utilisateurs et les habilitations" };
      }
    }
  }
  p.permissions = permissions;
  return p;
}
