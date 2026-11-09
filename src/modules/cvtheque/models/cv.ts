import { z } from 'zod';

export const PROFILS = ['veterinaire', 'assistant', 'technicien'] as const;
export const PROFIL_LABEL = { veterinaire: 'Vétérinaire', assistant: 'Assistant', technicien: 'Technicien' } as const;
export const DISPOS = ['immediate', '1mois', '3mois'] as const;
export const DISPO_LABEL = { immediate: 'Immédiate', '1mois': 'Sous 1 mois', '3mois': 'Sous 3 mois' } as const;
export const DISPO_TONE = { immediate: 'green', '1mois': 'amber', '3mois': 'slate' } as const;

export const cvSchema = z.object({
  id: z.string(), nom: z.string(), profil: z.enum(PROFILS), ville: z.string(), experience: z.number(), disponibilite: z.enum(DISPOS), telephone: z.string(), email: z.string(),
  competences: z.array(z.string()), presentation: z.string(), statut: z.string(), depose_le: z.string(), fichier: z.object({ nom: z.string(), taille: z.number() }).nullable(),
});
export const cvsDtoSchema = z.object({ items: z.array(cvSchema), total: z.number() });
export type Cv = z.infer<typeof cvSchema>;

export interface CvFilters { q: string; profil: string; ville: string; disponibilite: string; experience: string; competence: string }
export const EMPTY_FILTERS: CvFilters = { q: '', profil: '', ville: '', disponibilite: '', experience: '', competence: '' };
export const hasFilters = (f: CvFilters) => Object.values(f).some(Boolean);

export const toParams = (f: CvFilters) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));

export const experienceLabel = (n: number) => (n <= 0 ? 'Débutant' : `${n} an${n > 1 ? 's' : ''} d'expérience`);
/** Intitulé du poste affiché sous le nom, déduit du profil. */
export const TITRE_PROFIL = { veterinaire: 'Docteur vétérinaire', assistant: 'Assistant vétérinaire', technicien: 'Technicien vétérinaire' } as const;
/** « Nouveau » pendant les 7 jours qui suivent le dépôt. */
export const isRecent = (deposeLe: string, now = Date.now()) => now - Date.parse(deposeLe) <= 7 * 86_400_000;
export const isRecent30 = (deposeLe: string, now = Date.now()) => now - Date.parse(deposeLe) <= 30 * 86_400_000;
/** Chiffres du bandeau : calculés sur tous les profils visibles, quels que soient les filtres. */
export const cvStats = (items: Cv[], now = Date.now()) => ({
  visibles: items.length,
  veterinaires: items.filter((c) => c.profil === 'veterinaire').length,
  immediats: items.filter((c) => c.disponibilite === 'immediate').length,
  nouveaux: items.filter((c) => isRecent30(c.depose_le, now)).length,
});
export const villesOf = (items: Cv[]) => [...new Set(items.map((c) => c.ville))].sort((a, b) => a.localeCompare(b, 'fr'));
/** Lien WhatsApp : indicatif du Sénégal ajouté si le numéro est saisi sans indicatif. */
export const waHref = (t: string) => { const d = t.replace(/\D/g, ''); return `https://wa.me/${d.startsWith('221') ? d : `221${d}`}`; };
export const initials = (nom: string) => nom.replace(/^Dr\.?\s+/i, '').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
/** Lien pour appeler : on garde les chiffres et le « + » éventuel. */
export const telHref = (t: string) => `tel:${t.replace(/[^\d+]/g, '')}`;
