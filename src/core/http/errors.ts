import axios from 'axios';

/** Format d'erreur standard de l'API (voir socle transverse back). */
export interface ApiErrorBody {
  code?: string;
  message?: string;
  details?: Record<string, string[]>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

const FALLBACKS: Record<number, string> = {
  0: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
  403: "Vous n'avez pas les droits pour effectuer cette action.",
  404: 'Ressource introuvable.',
  409: 'Cette opération est en conflit avec une donnée existante.',
  422: 'Certaines informations sont invalides.',
  429: 'Trop de tentatives, réessayez dans quelques instants.',
  500: 'Une erreur est survenue, réessayez plus tard.',
};

/** Détail d'erreur du backend : liste d'objets `{ location, code, message }`. */
interface BackendDetail { location?: unknown[]; message?: string }

/**
 * Lit le corps d'une erreur, au format du backend (`{ error: { code, message, details: [...] } }`)
 * ou au format plat des mocks (`{ code, message, details: { champ: [...] } }`).
 */
export function readBody(data: unknown): ApiErrorBody | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const root = data as { error?: unknown } & ApiErrorBody;
  const raw = (typeof root.error === 'object' && root.error !== null ? root.error : root) as {
    code?: string; message?: string; details?: unknown;
  };
  let details: Record<string, string[]> | undefined;
  if (Array.isArray(raw.details)) {
    details = {};
    for (const d of raw.details as BackendDetail[]) {
      const key = String(d.location?.[d.location.length - 1] ?? '_');
      (details[key] ??= []).push(d.message ?? 'Valeur invalide.');
    }
  } else if (raw.details && typeof raw.details === 'object') {
    details = raw.details as Record<string, string[]>;
  }
  return { code: raw.code, message: raw.message, details };
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 0;
    const body = readBody(err.response?.data);
    return new ApiError(
      body?.message ?? FALLBACKS[status] ?? FALLBACKS[500],
      status,
      body?.code,
      body?.details,
    );
  }
  return new ApiError(FALLBACKS[500], 500);
}

/** Message d'une règle métier refusée (422) : l'intercepteur n'affiche pas de toast pour ce statut, le formulaire doit le montrer. */
export const unprocessableMessage = (err: unknown): string | null => {
  const e = toApiError(err);
  return e.status === 422 ? e.message : null;
};
