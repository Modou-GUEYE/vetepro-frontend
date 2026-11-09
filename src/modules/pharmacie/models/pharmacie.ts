import { z } from 'zod';

export type Level = 'ok' | 'faible' | 'rupture';
export const LEVEL_LABEL: Record<Level, string> = { ok: 'OK', faible: 'Faible', rupture: 'Rupture' };
export const LEVEL_TONE = { ok: 'green', faible: 'amber', rupture: 'red' } as const;

const articleSchema = z.object({
  id: z.string(), code: z.string(), nom: z.string(), categorie: z.string(), unite: z.string(), quantite: z.number(), seuil: z.number(), peremption: z.string().nullable(),
  prix: z.number(), actif: z.boolean(), niveau: z.enum(['ok', 'faible', 'rupture']), jours_avant_peremption: z.number().nullable(),
});
export const articlePageDtoSchema = z.object({
  items: z.array(articleSchema), total: z.number(), page: z.number(), page_size: z.number(), categories: z.array(z.string()),
  stats: z.object({ references: z.number(), ok: z.number(), faible: z.number(), rupture: z.number(), ventes_mois: z.number(), ca_pharmacie: z.number() }),
});
export const articleChoicesDtoSchema = z.object({ items: z.array(z.object({ id: z.string(), code: z.string(), nom: z.string(), unite: z.string(), quantite: z.number(), prix: z.number() })) });
export const movementPageDtoSchema = z.object({
  items: z.array(z.object({ id: z.string(), article: z.object({ id: z.string(), nom: z.string() }), type: z.enum(['entree', 'consultation', 'vente', 'hospitalisation', 'ajustement']), quantite: z.number(), date: z.string(), par: z.string(), reference: z.string() })),
  total: z.number(), page: z.number(), page_size: z.number(),
});

export interface Article { id: string; code: string; nom: string; categorie: string; unite: string; quantite: number; seuil: number; peremption: string | null; prix: number; actif: boolean; niveau: Level; joursAvantPeremption: number | null }
export interface ArticleChoice { id: string; code: string; nom: string; unite: string; quantite: number; prix: number }
export interface PharmacyStats { references: number; ok: number; faible: number; rupture: number; ventesMois: number; caPharmacie: number }
export type MovementType = 'entree' | 'consultation' | 'vente' | 'hospitalisation' | 'ajustement';
export interface Movement { id: string; article: { id: string; nom: string }; type: MovementType; quantite: number; date: string; par: string; reference: string }

export const toArticle = (d: z.infer<typeof articleSchema>): Article => ({ ...d, joursAvantPeremption: d.jours_avant_peremption });
export const MOVEMENT_LABEL: Record<MovementType, string> = { entree: 'Entrée', consultation: 'Sortie consultation', vente: 'Vente', hospitalisation: 'Sortie hospitalisation', ajustement: 'Ajustement' };

/** Péremption : alerte à 30 jours, périmé en dessous de 0. */
export function expiryAlert(jours: number | null): { tone: 'amber' | 'red'; label: string } | null {
  if (jours === null || jours > 30) return null;
  return jours < 0 ? { tone: 'red', label: 'Périmé' } : { tone: 'amber', label: jours === 0 ? "Expire aujourd'hui" : `Expire dans ${jours} j` };
}

/** Barre de niveau : pleine à deux fois le seuil, vide en rupture. */
export const levelRatio = (a: Pick<Article, 'quantite' | 'seuil'>) => (a.quantite <= 0 ? 0 : Math.min(1, a.quantite / Math.max(1, a.seuil * 2)));

const intStr = (label: string) => z.string().trim().regex(/^\d+$/, `${label} : nombre entier`);
export const articleFormSchema = z.object({
  nom: z.string().trim().min(1, "Le nom de l'article est obligatoire"),
  categorie: z.string().min(1, 'Choisissez une catégorie'),
  unite: z.string().trim().min(1, "L'unité est obligatoire"),
  quantite: z.string().trim().refine((v) => v === '' || /^\d+$/.test(v), 'Quantité : nombre entier'),
  seuil: intStr("Seuil d'alerte"),
  peremption: z.string(),
  prix: intStr('Prix unitaire'),
});
export type ArticleForm = z.infer<typeof articleFormSchema>;
export const emptyArticleForm: ArticleForm = { nom: '', categorie: '', unite: '', quantite: '0', seuil: '10', peremption: '', prix: '' };

export const restockFormSchema = z.object({ articleId: z.string().min(1, 'Choisissez un médicament'), quantite: z.string().trim().regex(/^\d+$/, 'Nombre entier').refine((v) => Number(v) >= 1, 'Au moins 1') });
export type RestockForm = z.infer<typeof restockFormSchema>;

export const saleFormSchema = z.object({
  date: z.string().min(1, 'La date est obligatoire'), proprietaireId: z.string(), mode: z.string().min(1), notes: z.string(),
  lignes: z.array(z.object({ articleId: z.string().min(1, 'Choisissez un article'), quantite: z.string().trim().regex(/^\d+$/, 'Nombre entier').refine((v) => Number(v) >= 1, 'Au moins 1') })).min(1, 'Ajoutez au moins un article'),
});
export type SaleForm = z.infer<typeof saleFormSchema>;
export const emptySaleForm = (): SaleForm => ({ date: new Date().toISOString().slice(0, 10), proprietaireId: '', mode: 'Espèces', notes: '', lignes: [{ articleId: '', quantite: '1' }] });

/** Total d'une vente et lignes en dépassement de stock (contrôle avant envoi, le serveur refuse aussi). */
export function saleSummary(lignes: { articleId: string; quantite: string }[], choices: ArticleChoice[]) {
  const asked = new Map<string, number>();
  for (const l of lignes) if (l.articleId) asked.set(l.articleId, (asked.get(l.articleId) ?? 0) + (Number(l.quantite) || 0));
  const total = lignes.reduce((n, l) => n + (Number(l.quantite) || 0) * (choices.find((c) => c.id === l.articleId)?.prix ?? 0), 0);
  const over = [...asked].filter(([id, q]) => q > (choices.find((c) => c.id === id)?.quantite ?? 0)).map(([id]) => id);
  return { total, over };
}
