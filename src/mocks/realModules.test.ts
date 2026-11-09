import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { parseRealModules, unknownRealModules, withoutRealModules } from './realModules';

const ok = () => HttpResponse.json({});
const handlers = [
  http.get('*/administration/platform/packs', ok),
  http.post('*/administration/platform/promotions', ok),
  http.get('*/administration/public/packs', ok),
  http.get('*/portail', ok),
];
const paths = (hs: typeof handlers) => hs.map((h) => (h.info as { path: string }).path);

describe('interrupteur par module', () => {
  it('lit la liste des modules réels', () => {
    expect(parseRealModules(undefined)).toEqual([]);
    expect(parseRealModules('')).toEqual([]);
    expect(parseRealModules(' offres , ,portail')).toEqual(['offres', 'portail']);
  });

  it('garde tous les mocks quand aucun module n\'est réel', () => {
    expect(withoutRealModules(handlers, [])).toHaveLength(4);
  });

  it('retire seulement les mocks du module réel', () => {
    expect(paths(withoutRealModules(handlers, ['offres']))).toEqual(['*/administration/public/packs', '*/portail']);
  });

  it('signale un nom de module inconnu', () => {
    expect(unknownRealModules(['offres', 'offre'])).toEqual(['offre']);
  });
});
