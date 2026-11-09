/**
 * Interrupteur par module : une section branchée sur le vrai backend n'enregistre plus ses mocks, ses requêtes
 * partent vers la passerelle pendant que le reste de l'application reste simulé.
 * On le règle avec `VITE_REAL_MODULES` (noms séparés par des virgules, par exemple `offres`).
 */
export const REAL_MODULE_PATHS: Record<string, string[]> = {
  /** Packs et offres plateforme : packs, promotions, durée d'essai, historique commercial et catalogue des modules. */
  offres: ['*/administration/platform/'],
};

export const parseRealModules = (raw: string | undefined): string[] => (raw ?? '').split(',').map((m) => m.trim()).filter(Boolean);

export const unknownRealModules = (real: string[]): string[] => real.filter((m) => !(m in REAL_MODULE_PATHS));

const pathOf = (handler: { info: object }): string | undefined => {
  const path = (handler.info as { path?: unknown }).path;
  return typeof path === 'string' ? path : undefined;
};

/** Retire les handlers dont l'adresse appartient à un module réel. Les handlers sans adresse texte sont conservés. */
export function withoutRealModules<H extends { info: object }>(handlers: H[], real: string[]): H[] {
  const prefixes = real.flatMap((m) => REAL_MODULE_PATHS[m] ?? []);
  if (prefixes.length === 0) return handlers;
  return handlers.filter((h) => {
    const path = pathOf(h);
    return path === undefined || !prefixes.some((p) => path.startsWith(p));
  });
}
