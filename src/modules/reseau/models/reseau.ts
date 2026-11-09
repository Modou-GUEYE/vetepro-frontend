import { z } from 'zod';

/* ---------- Cas partagés ---------- */

export const CAS_CATEGORIES = ['2ᵉ avis', 'Urgent', 'Dermatologie', 'Chirurgie', 'Reproduction', 'Autre'] as const;
export const CAS_CATEGORIE_TONE = { '2ᵉ avis': 'blue', Urgent: 'red', Dermatologie: 'violet', Chirurgie: 'amber', Reproduction: 'green', Autre: 'slate' } as const;

const personSchema = z.object({ id: z.string(), nom: z.string(), profil: z.string() });

const casSchema = z.object({
  id: z.string(), auteur: personSchema, clinique: z.string(), ville: z.string(), espece: z.string(), categorie: z.string(), titre: z.string(), description: z.string(), date: z.string(), resolu: z.boolean(),
  nb_votes: z.number(), a_vote: z.boolean(), peut_cloturer: z.boolean(),
  avis: z.array(z.object({ id: z.string(), auteur: personSchema, ville: z.string(), texte: z.string(), date: z.string() })),
});
export type Cas = z.infer<typeof casSchema>;
export const casDtoSchema = casSchema;
export const casListDtoSchema = z.object({ items: z.array(casSchema), especes: z.array(z.string()) });
export const especesDtoSchema = z.object({ items: z.array(z.string()) });

export interface CasFilters { q: string; espece: string; statut: '' | 'ouvert' | 'resolu' }
export const emptyCasFilters = (): CasFilters => ({ q: '', espece: '', statut: '' });
export const hasCasFilters = (f: CasFilters) => f.q !== '' || f.espece !== '' || f.statut !== '';

/** Cas anonymisé : titre, espèce et description obligatoires. Le serveur refuse un nom de propriétaire. */
export const casFormSchema = z.object({
  titre: z.string().trim().min(1, 'Titre requis'),
  espece: z.string().min(1, 'Espèce requise'),
  categorie: z.enum(CAS_CATEGORIES),
  description: z.string().trim().min(1, 'Description requise'),
});
export type CasForm = z.infer<typeof casFormSchema>;
export const emptyCasForm = (espece = ''): CasForm => ({ titre: '', espece, categorie: '2ᵉ avis', description: '' });

export const avisSchema = z.object({ texte: z.string().trim().min(1, 'Écrivez votre avis') });

/* ---------- Veille épidémiologique ---------- */

export const GRAVITES = ['elevee', 'moyenne', 'faible'] as const;
export type Gravite = (typeof GRAVITES)[number];
export const GRAVITE_LABEL: Record<Gravite, string> = { elevee: 'Élevée', moyenne: 'Moyenne', faible: 'Faible' };
export const GRAVITE_TONE = { elevee: 'red', moyenne: 'amber', faible: 'green' } as const;
export const EPI_STATUTS = ['active', 'surveillance', 'resolu'] as const;
export type EpiStatut = (typeof EPI_STATUTS)[number];
export const EPI_STATUT_LABEL: Record<EpiStatut, string> = { active: 'Active', surveillance: 'Surveillance', resolu: 'Résolu' };
export const EPI_STATUT_TONE = { active: 'red', surveillance: 'amber', resolu: 'green' } as const;

const epiSchema = z.object({
  id: z.string(), maladie: z.string(), espece: z.string(), ville: z.string(), cas: z.number(), gravite: z.enum(GRAVITES), statut: z.enum(EPI_STATUTS), declarant: personSchema, clinique: z.string(), date: z.string(), notes: z.string(),
  peut_resoudre: z.boolean(),
});
export type Epidemie = z.infer<typeof epiSchema>;
export const epiDtoSchema = epiSchema.extend({ alerte_declenchee: z.boolean().optional() });
export const epiListDtoSchema = z.object({
  items: z.array(epiSchema),
  stats: z.object({ actifs: z.number(), cas: z.number(), localites: z.number(), signalements: z.number() }),
  alertes: z.array(z.object({ maladie: z.string(), ville: z.string(), foyers: z.number(), cas: z.number() })),
});
export const actifsDtoSchema = z.object({ actifs: z.number() });

export interface EpiFilters { q: string; gravite: '' | Gravite }
export const emptyEpiFilters = (): EpiFilters => ({ q: '', gravite: '' });

/** Foyer : maladie, espèce et localité obligatoires, au moins un cas. */
export const epiFormSchema = z.object({
  maladie: z.string().trim().min(1, 'Maladie requise'),
  espece: z.string().min(1, 'Espèce requise'),
  ville: z.string().trim().min(1, 'Localité requise'),
  cas: z.coerce.number({ invalid_type_error: 'Nombre de cas requis' }).int('Nombre entier requis').min(1, 'Au moins 1 cas'),
  gravite: z.enum(GRAVITES),
  notes: z.string().trim(),
});
export type EpiForm = z.input<typeof epiFormSchema>;
export const emptyEpiForm = (espece = ''): EpiForm => ({ maladie: '', espece, ville: '', cas: 1, gravite: 'moyenne', notes: '' });

/* ---------- Annuaire ---------- */

const confrereSchema = z.object({ id: z.string(), nom: z.string(), clinique: z.string(), ville: z.string(), telephone: z.string(), email: z.string(), specialites: z.array(z.string()), equipements: z.array(z.string()) });
export type Confrere = z.infer<typeof confrereSchema>;
export const annuaireDtoSchema = z.object({ items: z.array(confrereSchema) });
export const orientationDtoSchema = z.object({ id: z.string(), patient: z.string(), confrere: z.string() });

export const orientationFormSchema = z.object({ patient_id: z.string().min(1, 'Choisissez le patient à orienter'), motif: z.string().trim().min(1, "Motif de l'orientation requis") });
export type OrientationForm = z.infer<typeof orientationFormSchema>;

export const telHref = (t: string) => `tel:${t.replace(/\s/g, '')}`;
export const initials = (nom: string) => nom.replace(/^Dr\s+/, '').split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
