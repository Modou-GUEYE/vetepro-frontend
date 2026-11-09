import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import { readBody, toApiError } from './errors';

const axiosError = (status: number, data: unknown) =>
  new AxiosError('x', 'ERR', undefined, undefined, { status, data, statusText: '', headers: {}, config: {} as never });

describe('erreurs de l\'API', () => {
  it('lit le format du backend { error: { code, message } }', () => {
    const e = toApiError(axiosError(401, { error: { code: 'http_401', message: 'Authentification requise.', details: [] } }));
    expect(e.status).toBe(401);
    expect(e.code).toBe('http_401');
    expect(e.message).toBe('Authentification requise.');
  });

  it('regroupe les détails de validation par champ', () => {
    const body = readBody({ error: { code: 'validation_error', message: 'Invalide', details: [
      { location: ['body', 'monthly_price'], code: 'x', message: 'Valeur invalide.' },
      { location: ['body', 'monthly_price'], code: 'y', message: 'Trop grand.' },
      { location: ['query', 'page_size'], code: 'z', message: 'Hors limite.' },
    ] } });
    expect(body?.details).toEqual({ monthly_price: ['Valeur invalide.', 'Trop grand.'], page_size: ['Hors limite.'] });
  });

  it('lit toujours le format plat des mocks', () => {
    const e = toApiError(axiosError(403, { code: 'permission_denied', message: 'Refusé', details: { nom: ['requis'] } }));
    expect(e.code).toBe('permission_denied');
    expect(e.details).toEqual({ nom: ['requis'] });
  });

  it('retombe sur un message par défaut sans corps', () => {
    expect(toApiError(axiosError(404, '')).message).toBe('Ressource introuvable.');
  });
});
