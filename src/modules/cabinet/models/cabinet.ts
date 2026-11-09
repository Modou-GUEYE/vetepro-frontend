import { z } from 'zod';

export const cabinetDtoSchema = z.object({
  nom: z.string(), ordre: z.string(), adresse: z.string(), telephone: z.string(), email: z.string(), logo: z.string().nullable(), twofa_obligatoire: z.boolean(),
});
export type CabinetDto = z.infer<typeof cabinetDtoSchema>;

/** Le numéro d'ordre est vérifié sur son format (spécification, inscription) : ODVS suivi de quatre chiffres. */
export const ORDRE_FORMAT = /^ODVS-\d{4}$/i;
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_TYPES = ['image/png', 'image/jpeg'];

const phoneOk = (t: string) => t.replace(/\D/g, '').length >= 9;

export const cabinetFormSchema = z.object({
  nom: z.string().trim().min(1, 'Renseignez le nom du cabinet'),
  ordre: z.string().trim().refine((v) => ORDRE_FORMAT.test(v), "Format attendu : ODVS-0000"),
  adresse: z.string().trim().min(1, "L'adresse est obligatoire"),
  telephone: z.string().trim().refine(phoneOk, 'Numéro invalide (ex. 77 123 45 67)'),
  email: z.string().trim().email('Adresse e-mail invalide'),
  logo: z.string().nullable(),
  twofaObligatoire: z.boolean(),
});
export type CabinetForm = z.infer<typeof cabinetFormSchema>;

export const formFromDto = (d: CabinetDto): CabinetForm => ({ nom: d.nom, ordre: d.ordre, adresse: d.adresse, telephone: d.telephone, email: d.email, logo: d.logo, twofaObligatoire: d.twofa_obligatoire });

/** Refus d'un fichier de logo : type ou poids hors limites (PNG ou JPG, 2 Mo au plus). */
export function logoProblem(file: { type: string; size: number }): string | null {
  if (!LOGO_TYPES.includes(file.type)) return 'Le logo doit être une image PNG ou JPG';
  if (file.size > LOGO_MAX_BYTES) return 'Le logo ne doit pas dépasser 2 Mo';
  return null;
}
