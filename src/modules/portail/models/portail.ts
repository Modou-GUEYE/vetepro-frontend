import { z } from 'zod';
import { packSchema } from '@/modules/abonnement/models/abonnement';

export const ANNONCE_FILTERS = [
  { key: 'all', label: 'Toutes' }, { key: 'alerte', label: 'Alertes' }, { key: 'vaccination', label: 'Vaccinations' },
  { key: 'communique', label: 'Communiqués' }, { key: 'evenement', label: 'Événements' }, { key: 'actualite', label: 'Actualités' },
] as const;
export type AnnonceFilter = (typeof ANNONCE_FILTERS)[number]['key'];
export const CATEGORIE_LABEL: Record<string, string> = { alerte: 'Alerte', vaccination: 'Vaccination', communique: 'Communiqué', evenement: 'Événement', actualite: 'Actualité' };

const annonceSchema = z.object({ id: z.string(), categorie: z.string(), titre: z.string(), resume: z.string(), texte: z.string(), zone: z.string(), date: z.string(), publie: z.boolean() });
const temoignageSchema = z.object({ id: z.string(), auteur: z.string(), role: z.string(), texte: z.string(), publie: z.boolean() });

export const portalSchema = z.object({
  contenu: z.object({
    titre: z.string(), sous_titre: z.string(), contact: z.object({ telephone: z.string(), email: z.string(), adresse: z.string() }),
    pourquoi: z.array(z.object({ titre: z.string(), texte: z.string() })),
  }),
  chiffres: z.object({ cabinets: z.number(), veterinaires: z.number(), profils: z.number() }),
  packs: z.array(packSchema), annonces: z.array(annonceSchema), temoignages: z.array(temoignageSchema),
  essai_jours: z.number(), annee_mois_offerts: z.number(), operateurs: z.array(z.string()), vivier: z.number(),
  offre_lancement: z.object({ code: z.string(), pct: z.number(), mois: z.number(), limite: z.number(), restantes: z.number() }).nullable(),
});
export type Portal = z.infer<typeof portalSchema>;
export type Annonce = z.infer<typeof annonceSchema>;

export const filterAnnonces = (items: Annonce[], f: AnnonceFilter) => (f === 'all' ? items : items.filter((a) => a.categorie === f));

/** Texte d'offre du portail : essai gratuit, puis offre de lancement s'il en reste. */
export function offerText(p: Pick<Portal, 'essai_jours' | 'offre_lancement'>): string {
  const base = `Tarifs mensuels par cabinet. Essai gratuit de ${p.essai_jours} jours, sans engagement.`;
  const o = p.offre_lancement;
  return o ? `${base} Offre de lancement : -${o.pct} % pendant ${o.mois} mois pour les ${o.limite} premiers inscrits (encore ${o.restantes} place${o.restantes > 1 ? 's' : ''}).` : base;
}

/** Pas de défilement : l'index revient au début après la dernière annonce. */
export const wrapIndex = (i: number, n: number) => (n === 0 ? 0 : ((i % n) + n) % n);

/* ---------- Adhésion rapide ---------- */

const phoneOk = (v: string) => v.replace(/\D/g, '').length >= 9;

/* ---------- Dépôt de CV ---------- */

export const PROFILS = [{ key: 'veterinaire', label: 'Vétérinaire' }, { key: 'assistant', label: 'Assistant' }, { key: 'technicien', label: 'Technicien' }] as const;
export const DISPOS = [{ key: 'immediate', label: 'Immédiate' }, { key: '1mois', label: 'Sous 1 mois' }, { key: '3mois', label: 'Sous 3 mois' }] as const;

export const CV_MAX_OCTETS = 2 * 1024 * 1024;
export const cvSchema = z.object({
  nom: z.string().trim().min(1, 'Nom, ville et téléphone sont requis'),
  profil: z.enum(['veterinaire', 'assistant', 'technicien']),
  ville: z.string().trim().min(1, 'Nom, ville et téléphone sont requis'),
  experience: z.coerce.number().int('Nombre entier attendu').min(0, 'Valeur positive attendue').max(60, 'Valeur trop élevée'),
  disponibilite: z.enum(['immediate', '1mois', '3mois']),
  telephone: z.string().trim().min(1, 'Nom, ville et téléphone sont requis').refine(phoneOk, 'Numéro de téléphone invalide'),
  email: z.string().trim().refine((v) => v === '' || /^\S+@\S+\.\S+$/.test(v), 'Adresse e-mail invalide'),
  competences: z.string(),
  presentation: z.string().max(600, '600 caractères au maximum'),
  consentement: z.boolean().refine((v) => v, 'Votre consentement à la diffusion de vos données est requis'),
  fichier: z.custom<File | null>().refine((f) => !f || /\.pdf$/i.test(f.name) && (!f.type || f.type === 'application/pdf'), 'Le CV doit être au format PDF').refine((f) => !f || f.size <= CV_MAX_OCTETS, 'Le CV ne doit pas dépasser 2 Mo'),
});
export type CvForm = z.infer<typeof cvSchema>;
export const emptyCv = (): CvForm => ({ nom: '', profil: 'veterinaire', ville: '', experience: 0, disponibilite: 'immediate', telephone: '', email: '', competences: '', presentation: '', consentement: false, fichier: null });

/** Message unique quand nom, ville ou téléphone manquent (spécification). */
export const cvMissing = (e: Partial<Record<keyof CvForm, unknown>>) => !!(e.nom || e.ville) && 'Nom, ville et téléphone sont requis';

/* ---------- Inscription ---------- */

export const ORDRE_FORMAT = /^ODVS-\d{4}$/i;
export const infosSchema = z.object({
  nom: z.string().trim().min(1, 'Le nom est requis'),
  prenom: z.string().trim().min(1, 'Le prénom est requis'),
  email: z.string().trim().min(1, "L'adresse e-mail est requise").email('Adresse e-mail invalide'),
  identifiant: z.string().trim().min(1, "Le nom d'utilisateur est requis").regex(/^[a-z0-9._-]{3,}$/i, '3 caractères minimum : lettres, chiffres, point, tiret'),
  ordre: z.string().trim().min(1, "Le numéro d'ordre est requis").regex(ORDRE_FORMAT, "Format du numéro d'ordre attendu : ODVS-0000"),
  typeEtablissement: z.enum(['cabinet', 'clinique']),
  etablissement: z.string().trim().min(1, "Le nom de l'établissement est requis"),
  adresse: z.string().trim().min(1, "L'adresse est requise"),
  ville: z.string().trim().min(1, 'La ville est requise'),
  telephone: z.string().trim().min(1, 'Le téléphone est requis').refine(phoneOk, 'Numéro de téléphone invalide (ex. 77 123 45 67)'),
  doubleAuth: z.boolean(),
});
export type InfosForm = z.infer<typeof infosSchema>;
export const TYPES_ETABLISSEMENT = [{ key: 'cabinet', label: 'Cabinet vétérinaire' }, { key: 'clinique', label: 'Clinique vétérinaire' }] as const;

/** Nom d'utilisateur proposé à partir du prénom et du nom : « prenom.nom » en minuscules, sans accents ni espaces. */
export function usernameFrom(prenom: string, nom: string): string {
  const clean = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return [clean(prenom), clean(nom)].filter(Boolean).join('.');
}
export const emptyInfos = (): InfosForm => ({ nom: '', prenom: '', email: '', identifiant: '', ordre: '', typeEtablissement: 'cabinet', etablissement: '', adresse: '', ville: '', telephone: '', doubleAuth: false });

/** Champs du formulaire concernés par un refus du serveur, pour revenir à la bonne étape. */
export const stepOfError = (code: string | undefined): 1 | 2 | 3 => {
  if (code === 'pack_requis' || code === 'promo_invalide') return 1;
  if (['email_pris', 'identifiant_pris', 'identifiant_invalide', 'ordre_invalide', 'invalid'].includes(code ?? '')) return 2;
  return 3;
};

export const CGU_TEXT = "1. Objet : mise à disposition d'un logiciel de gestion vétérinaire en mode SaaS. 2. Essai gratuit sans engagement. 3. Abonnement mensuel ou annuel, renouvelable ; à défaut de renouvellement à l'échéance, l'accès des profils du cabinet est suspendu jusqu'au paiement. 4. Le cabinet reste propriétaire de ses données ; hébergement sécurisé et sauvegardes quotidiennes. 5. Support assuré par l'équipe VétéPro. 6. Données personnelles traitées conformément à la loi n° 2008-12.";
