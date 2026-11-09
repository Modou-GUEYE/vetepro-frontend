import { describe, expect, it } from 'vitest';
import { buildApiUrl } from './config';

describe('adresse de l\'API', () => {
  it('reste relative quand la passerelle n\'est pas renseignée (mocks)', () => {
    expect(buildApiUrl(undefined)).toBe('/api/v1');
    expect(buildApiUrl('')).toBe('/api/v1');
  });
  it('ajoute /api/v1 à l\'adresse de la passerelle', () => {
    expect(buildApiUrl('http://gateway.example:9080')).toBe('http://gateway.example:9080/api/v1');
    expect(buildApiUrl('https://api.vetepro.sn')).toBe('https://api.vetepro.sn/api/v1');
  });
  it('ignore les espaces et la barre oblique finale', () => {
    expect(buildApiUrl(' http://localhost:9080/ ')).toBe('http://localhost:9080/api/v1');
    expect(buildApiUrl('http://localhost:9080///')).toBe('http://localhost:9080/api/v1');
  });
});
