import { describe, expect, it } from 'vitest';
import { ApiError } from '@/core/http/errors';
import { mapLoginError } from './loginErrors';

describe('mapLoginError', () => {
  it('message générique', () =>
    expect(mapLoginError(new ApiError('x', 401, 'invalid_credentials'))).toBe('Identifiant ou mot de passe incorrect'));
  it('compte bloqué', () =>
    expect(mapLoginError(new ApiError('x', 423, 'account_locked'))).toContain('15 minutes'));
  it('compte désactivé', () =>
    expect(mapLoginError(new ApiError('x', 403, 'account_disabled'))).toBe('Compte désactivé, contactez votre administrateur'));
  it('compte supprimé', () =>
    expect(mapLoginError(new ApiError('x', 403, 'account_deleted'))).toBe('Compte supprimé, contactez votre administrateur'));
  it('repli sur le message du serveur', () => expect(mapLoginError(new ApiError('Panne', 500))).toBe('Panne'));
});
