export interface PasswordCheck { label: string; ok: boolean }

/** Règles de la spécification : 8 caractères, majuscule, minuscule, chiffre, caractère spécial. */
export const passwordChecks = (pw: string): PasswordCheck[] => [
  { label: '8 caractères minimum', ok: pw.length >= 8 },
  { label: 'Une majuscule', ok: /[A-Z]/.test(pw) },
  { label: 'Une minuscule', ok: /[a-z]/.test(pw) },
  { label: 'Un chiffre', ok: /\d/.test(pw) },
  { label: 'Un caractère spécial', ok: /[^A-Za-z0-9]/.test(pw) },
];

export const isPasswordValid = (pw: string) => passwordChecks(pw).every((c) => c.ok);

export function passwordStrength(pw: string): { score: number; label: 'Vide' | 'Faible' | 'Moyen' | 'Fort' } {
  if (!pw) return { score: 0, label: 'Vide' };
  const score = passwordChecks(pw).filter((c) => c.ok).length;
  return { score, label: score <= 2 ? 'Faible' : score <= 4 ? 'Moyen' : 'Fort' };
}
