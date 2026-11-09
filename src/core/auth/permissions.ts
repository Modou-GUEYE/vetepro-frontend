import { useSessionStore } from './session.store';

/** Les quatre actions du prototype V4 : Consulter, Créer, Modifier, Supprimer. */
export type Action = 'read' | 'create' | 'update' | 'delete';

export const MODULES = [
  'patients', 'proprietaires', 'rdv', 'consultations', 'vaccinations', 'hospitalisations',
  'insemination', 'pharmacie', 'stock', 'ventes', 'ordonnances', 'facturation', 'reporting', 'services',
  'utilisateurs', 'habilitations', 'referentiels', 'support', 'cvtheque', 'reseau', 'paiements', 'comptes',
] as const;
export type ModuleKey = (typeof MODULES)[number];

/** Droits effectifs, calculés par le serveur (profil + exceptions par utilisateur). */
export type PermissionMap = Partial<Record<ModuleKey, Action[]>>;

export const ACTIONS: Action[] = ['read', 'create', 'update', 'delete'];
export const ACTION_LABELS: Record<Action, string> = { read: 'Consulter', create: 'Créer', update: 'Modifier', delete: 'Supprimer' };

export const MODULE_LABELS: Record<ModuleKey, string> = {
  patients: 'Dossiers patients', proprietaires: 'Propriétaires', rdv: 'Rendez-vous', consultations: 'Consultations',
  vaccinations: 'Vaccinations', hospitalisations: 'Hospitalisations', insemination: 'Insémination', pharmacie: 'Pharmacie (articles)', stock: 'Réapprovisionnement et mouvements', ventes: 'Ventes de médicaments',
  ordonnances: 'Ordonnances', facturation: 'Facturation', reporting: 'Reporting', services: 'Services',
  utilisateurs: 'Utilisateurs', habilitations: 'Habilitations', referentiels: 'Référentiels', support: 'Réclamation et support', cvtheque: 'CVthèque du réseau', reseau: 'Réseau et forum', paiements: 'Paiements électroniques', comptes: 'Gestion de compte',
};

/** Exception propre à un utilisateur : droit accordé en plus du profil, ou retiré malgré le profil. */
export type OverrideState = 'grant' | 'deny';
export type Overrides = Partial<Record<ModuleKey, Partial<Record<Action, OverrideState>>>>;
export type CellOrigin = 'inherit' | 'grant' | 'deny';

export const can = (permissions: PermissionMap, module: ModuleKey, action: Action = 'read') =>
  permissions[module]?.includes(action) ?? false;

export const useCan = () => {
  const permissions = useSessionStore((s) => s.permissions);
  return (module: ModuleKey, action: Action = 'read') => can(permissions, module, action);
};

/** Droit effectif d'une case : profil, corrigé par l'exception de l'utilisateur s'il y en a une. */
export function cellState(base: PermissionMap, overrides: Overrides, module: ModuleKey, action: Action): { on: boolean; origin: CellOrigin } {
  const o = overrides[module]?.[action];
  if (o === 'grant') return { on: true, origin: 'grant' };
  if (o === 'deny') return { on: false, origin: 'deny' };
  return { on: can(base, module, action), origin: 'inherit' };
}

export function effectivePermissions(base: PermissionMap, overrides: Overrides): PermissionMap {
  const out: PermissionMap = {};
  for (const m of MODULES) {
    const actions = ACTIONS.filter((a) => cellState(base, overrides, m, a).on);
    if (actions.length) out[m] = actions;
  }
  return out;
}

/** Inverse le droit effectif d'une case. Une exception n'est gardée que si elle diffère du profil. */
export function toggleOverride(base: PermissionMap, overrides: Overrides, module: ModuleKey, action: Action): Overrides {
  const desired = !cellState(base, overrides, module, action).on;
  const next: Overrides = { ...overrides, [module]: { ...overrides[module] } };
  const row = next[module]!;
  if (desired === can(base, module, action)) delete row[action];
  else row[action] = desired ? 'grant' : 'deny';
  if (Object.keys(row).length === 0) delete next[module];
  return next;
}

export const countOverrides = (o: Overrides) => Object.values(o).reduce((n, row) => n + Object.keys(row ?? {}).length, 0);

export const countRights = (p: PermissionMap) => Object.values(p).reduce((n, a) => n + (a?.length ?? 0), 0);
export const TOTAL_RIGHTS = MODULES.length * ACTIONS.length;
