import { z } from 'zod';

export const CATEGORIES = ['Général', 'Cas cliniques', 'Entraide', 'Annonces', 'Matériel', 'Emploi', 'Réglementation'] as const;
export const FICHIER_MAX_OCTETS = 10 * 1024 * 1024;
export const FICHIERS_MAX = 5;

export const FILTRES = ['toutes', 'non_lues', 'mentions', 'miennes'] as const;
export type Filtre = (typeof FILTRES)[number];
export const FILTRE_LABEL: Record<Filtre, string> = { toutes: 'Toutes les publications', non_lues: 'Non lues', mentions: 'Mes mentions', miennes: 'Mes publications' };

export type Tri = 'recentes' | 'populaires';

const personSchema = z.object({ id: z.string(), nom: z.string(), profil: z.string(), cabinet: z.string() });
export type Person = z.infer<typeof personSchema>;

const pieceSchema = z.object({ nom: z.string(), taille: z.number(), type: z.enum(['image', 'pdf', 'doc']) });
export type Piece = z.infer<typeof pieceSchema>;

const commentSchema = z.object({ id: z.string(), auteur: personSchema, texte: z.string(), date: z.string() });
export type Comment = z.infer<typeof commentSchema>;

const baseSchema = z.object({
  id: z.string(), auteur: personSchema, titre: z.string(), categorie: z.string(), contenu: z.string(), date: z.string(), pieces: z.array(pieceSchema), mentions: z.array(personSchema),
  nb_likes: z.number(), nb_dislikes: z.number(), aime: z.boolean(), naime_pas: z.boolean(), repartage: z.boolean(), nb_repartages: z.number(), lu: z.boolean(), supprimable: z.boolean(),
  commentaires: z.array(commentSchema),
});
export const postSchema = baseSchema.extend({ origine: baseSchema.nullable().optional(), repartage_de: z.string().nullable() });
export type Post = z.infer<typeof postSchema>;
export type PostOrigin = z.infer<typeof baseSchema>;

export const postsDtoSchema = z.object({
  items: z.array(postSchema),
  compteurs: z.object({ toutes: z.number(), non_lues: z.number(), mentions: z.number(), miennes: z.number(), categories: z.record(z.number()) }),
});
export const peopleDtoSchema = z.object({ items: z.array(personSchema) });
export const unreadDtoSchema = z.object({ non_lus: z.number() });

export interface ForumFilters { filtre: Filtre; categorie: string; q: string; tri: Tri }
export const emptyFilters = (): ForumFilters => ({ filtre: 'toutes', categorie: '', q: '', tri: 'recentes' });

/** Publication : titre et description obligatoires (spécification), fichiers facultatifs. */
export const postFormSchema = z.object({
  titre: z.string().trim().min(1, 'Titre requis'),
  categorie: z.enum(CATEGORIES),
  contenu: z.string().trim().min(1, 'Description requise'),
  fichiers: z.array(z.custom<File>())
    .max(FICHIERS_MAX, `${FICHIERS_MAX} fichiers au plus`)
    .refine((l) => l.every((f) => f.size <= FICHIER_MAX_OCTETS), 'Chaque fichier doit faire 10 Mo au plus'),
});
export type PostForm = z.infer<typeof postFormSchema>;
export const emptyPostForm = (): PostForm => ({ titre: '', categorie: 'Général', contenu: '', fichiers: [] });

export const initials = (nom: string) => nom.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

/** Personnes dont le texte contient « @Prénom Nom ». */
export const mentionedIn = (texte: string, people: Person[]) => people.filter((p) => texte.includes(`@${p.nom}`));

export type Segment = { texte: string; mention: boolean };
/** Découpe un texte pour mettre en valeur les « @Prénom Nom » reconnus. */
export function segments(texte: string, people: Person[]): Segment[] {
  const noms = people.map((p) => `@${p.nom}`).sort((a, b) => b.length - a.length);
  if (noms.length === 0) return [{ texte, mention: false }];
  const re = new RegExp(`(${noms.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  return texte.split(re).filter(Boolean).map((t) => ({ texte: t, mention: noms.includes(t) }));
}

/** Mention en cours de saisie juste avant le curseur : « @Fa » ou « @Fatou D ». */
export function pendingMention(texte: string, cursor: number): { debut: number; requete: string } | null {
  const m = texte.slice(0, cursor).match(/@([^\s@]{0,20}(?:\s[^\s@]{0,20})?)$/);
  return m ? { debut: cursor - m[0].length, requete: m[1] } : null;
}

export const matchPeople = (people: Person[], requete: string) => {
  const q = requete.toLowerCase();
  return people.filter((p) => { const n = p.nom.toLowerCase(); return n.startsWith(q) || n.split(' ').some((w) => w.startsWith(q)); }).slice(0, 6);
};
