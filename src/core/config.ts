/** Adresse de la passerelle sans /api/v1 (comme dans le document de l'infra) ; vide : adresse relative, utilisée avec les mocks. */
export const buildApiUrl = (gatewayBaseUrl?: string) => `${(gatewayBaseUrl ?? '').trim().replace(/\/+$/, '')}/api/v1`;

export const config = {
  apiUrl: buildApiUrl(import.meta.env.VITE_GATEWAY_BASE_URL),
  useMocks: import.meta.env.VITE_USE_MOCKS === 'true',
  /** Sections branchées sur le vrai backend pendant que les mocks restent actifs pour le reste (voir mocks/realModules.ts). */
  realModules: (import.meta.env.VITE_REAL_MODULES ?? '').split(',').map((m: string) => m.trim()).filter(Boolean) as string[],
};
