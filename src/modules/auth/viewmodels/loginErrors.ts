import { toApiError } from '@/core/http/errors';

/** Messages de connexion imposés par la spécification (message générique, compte bloqué, compte désactivé). */
export function mapLoginError(err: unknown): string {
  const e = toApiError(err);
  switch (e.code) {
    case 'invalid_credentials': return 'Identifiant ou mot de passe incorrect';
    case 'account_locked': return 'Compte bloqué après plusieurs échecs. Réessayez dans 15 minutes.';
    case 'account_deleted': return 'Compte supprimé, contactez votre administrateur';
    case 'account_disabled': return 'Compte désactivé, contactez votre administrateur';
    default: return e.message;
  }
}
