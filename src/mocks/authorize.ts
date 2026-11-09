import { Action, ModuleKey, can, effectivePermissions } from '@/core/auth/permissions';
import { HttpResponse } from 'msw';
import { DEMO_USERS, DemoUser, fullName } from './authDb';
import { getProfile } from './profilesDb';

/** Utilisateur identifié par le jeton de démonstration. */
export function caller(request: Request): DemoUser | undefined {
  const id = request.headers.get('Authorization')?.match(/^Bearer mock-access-(\d+)$/)?.[1];
  return DEMO_USERS.find((u) => u.id === id && !u.deleted && u.actif);
}

/** Vérifie le droit effectif au moment de l'appel : un changement de droits s'applique donc tout de suite. */
export function authorize(request: Request, module: ModuleKey | null, action: Action = 'read'): { user: DemoUser; by: string } | { response: Response } {
  const user = caller(request);
  if (!user) return { response: HttpResponse.json({ code: 'unauthenticated', message: 'Non connecté' }, { status: 401 }) };
  if (module && !can(effectivePermissions(getProfile(user.profilId)?.permissions ?? {}, user.overrides), module, action)) {
    return { response: HttpResponse.json({ code: 'permission_denied', message: "Vous n'avez pas les droits pour effectuer cette action." }, { status: 403 }) };
  }
  return { user, by: fullName(user) };
}

/** Droits effectifs d'un utilisateur, pour filtrer ce qu'il voit (notifications par module). */
export const permissionsOf = (user: DemoUser) => effectivePermissions(getProfile(user.profilId)?.permissions ?? {}, user.overrides);
