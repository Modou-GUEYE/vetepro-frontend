const DEVICE_KEY = 'vetepro:appareil';
const REMEMBER_KEY = 'vetepro:identifiant';

/** Identifiant de cet appareil, envoyé à la connexion pour « faire confiance à cet appareil » (la double authentification n'est alors plus demandée pendant 30 jours). */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); }
    return id;
  } catch {
    return 'appareil-inconnu';
  }
}

/** « Se souvenir de moi » : seul l'identifiant est gardé, jamais le mot de passe. */
export const rememberedLogin = (): string => { try { return localStorage.getItem(REMEMBER_KEY) ?? ''; } catch { return ''; } };
export const rememberLogin = (identifiant: string | null) => {
  try { if (identifiant) localStorage.setItem(REMEMBER_KEY, identifiant); else localStorage.removeItem(REMEMBER_KEY); } catch { /* stockage indisponible : on ne retient rien */ }
};
