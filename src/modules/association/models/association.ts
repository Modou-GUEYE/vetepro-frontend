import { z } from 'zod';
import type { BadgeTone } from '@/shared/ui';
import { cabinetSchema } from '@/modules/abonnement/services/abonnement.service';

/* ---------- Réseau et cabinets ---------- */

export const reseauSchema = z.object({
  cabinets: z.number(), essai: z.number(), actifs: z.number(), expires: z.number(), mrr: z.number(), cvNouveaux: z.number(), cvValides: z.number(), reclamationsOuvertes: z.number(),
  echeances: z.array(z.object({ id: z.string(), nom: z.string(), jours: z.number() })),
});
export type Reseau = z.infer<typeof reseauSchema>;
export const cabinetsSchema = z.object({ items: z.array(cabinetSchema), total: z.number() });

export const STATUT_ABO_LABEL = { essai: 'Essai', actif: 'Actif', expire: 'Expiré' } as const;
export const STATUT_ABO_TONE: Record<keyof typeof STATUT_ABO_LABEL, BadgeTone> = { essai: 'blue', actif: 'green', expire: 'red' };
export const SOURCE_LABEL: Record<string, string> = { portail: 'Portail', adhesion: 'Adhésion rapide', association: 'Association', demo: 'Démonstration' };

export const ENTITES = [
  { key: 'cabinet_individuel', label: 'Cabinet individuel' }, { key: 'cabinet_activite', label: 'Cabinet en activité' }, { key: 'clinique', label: 'Clinique' }, { key: 'reseau', label: 'Réseau' },
] as const;

export const journalSchema = z.object({ items: z.array(z.object({ id: z.string(), date: z.string(), par: z.string(), action: z.string(), cible: z.string() })) });
export type JournalEntry = z.infer<typeof journalSchema>['items'][number];

const requiredStr = (msg: string) => z.string().trim().min(1, msg);
const optionalInt = (msg: string, min = 0) => z.string().trim().refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= min), msg);

export const surMesureSchema = z.object({
  entite: z.string().min(1, "Choisissez le type d'entité"), nom: requiredStr("Renseignez le nom de l'entité"), ordre: z.string().trim().refine((v) => v === '' || /^ODVS-\d{4}$/i.test(v), "Format du numéro d'ordre attendu : ODVS-0000"),
  adresse: z.string().trim(), ville: z.string().trim(), telephone: z.string().trim().refine((v) => v.replace(/\D/g, '').length >= 9, 'Numéro de téléphone invalide'),
  email: z.string().trim().email('Adresse e-mail invalide'), responsable: requiredStr('Renseignez le responsable'), identifiant: z.string().trim().regex(/^[a-z0-9._-]{3,}$/i, "Nom d'utilisateur invalide (3 caractères minimum)"),
  tarif: z.string().trim().regex(/^\d+$/, 'Tarif invalide'), utilisateursMax: optionalInt("Nombre d'utilisateurs invalide", 1), veterinaires: optionalInt('Nombre de vétérinaires invalide', 1),
  modules: z.array(z.string()).min(1, 'Choisissez au moins un module'), periode: z.enum(['mensuel', 'annuel']), essai: z.boolean(),
});
export type SurMesureForm = z.infer<typeof surMesureSchema>;
export const emptySurMesure = (): SurMesureForm => ({ entite: 'clinique', nom: '', ordre: '', adresse: '', ville: '', telephone: '', email: '', responsable: '', identifiant: '', tarif: '', utilisateursMax: '', veterinaires: '1', modules: [], periode: 'mensuel', essai: true });
export const surMesureToDto = (f: SurMesureForm) => ({
  entite: f.entite, nom: f.nom, ordre: f.ordre, adresse: f.adresse, ville: f.ville, telephone: f.telephone, email: f.email, responsable: f.responsable, identifiant: f.identifiant,
  tarif: Number(f.tarif), modules: f.modules, utilisateurs_max: f.utilisateursMax === '' ? null : Number(f.utilisateursMax), veterinaires: Number(f.veterinaires || 1), periode: f.periode, essai: f.essai,
});

export const prolongationSchema = z.object({ jours: z.string().trim().refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 90, 'Entre 1 et 90 jours') });

/* ---------- Catalogue de modules (offre sur mesure, section pas encore branchée sur le backend) ---------- */

export const modulesCatalogueSchema = z.object({ modules: z.array(z.object({ key: z.string(), label: z.string() })), toujours_actifs: z.array(z.string()) });

/* ---------- Contenus du site ---------- */

export const annonceSchema = z.object({ id: z.string(), categorie: z.string(), titre: z.string(), resume: z.string(), texte: z.string(), zone: z.string(), date: z.string(), publie: z.boolean() });
export type Annonce = z.infer<typeof annonceSchema>;
export const temoignageSchema = z.object({ id: z.string(), auteur: z.string(), role: z.string(), texte: z.string(), publie: z.boolean() });
export type Temoignage = z.infer<typeof temoignageSchema>;
export const contenuSchema = z.object({
  titre: z.string(), sous_titre: z.string(), contact: z.object({ telephone: z.string(), email: z.string(), adresse: z.string() }), pourquoi: z.array(z.object({ titre: z.string(), texte: z.string() })),
});
export type Contenu = z.infer<typeof contenuSchema>;
export const contenusSchema = z.object({ contenu: contenuSchema, annonces: z.array(annonceSchema), temoignages: z.array(temoignageSchema), categories: z.array(z.object({ key: z.string(), label: z.string() })) });

export const annonceFormSchema = z.object({
  categorie: z.string().min(1, 'Choisissez une catégorie'), titre: requiredStr("Renseignez le titre de l'annonce"), resume: requiredStr("Renseignez le résumé de l'annonce"), texte: z.string().trim(),
  zone: z.string().trim(), date: z.string().min(1, 'Renseignez la date de publication'), publie: z.boolean(),
});
export type AnnonceForm = z.infer<typeof annonceFormSchema>;
export const emptyAnnonce = (): AnnonceForm => ({ categorie: 'actualite', titre: '', resume: '', texte: '', zone: '', date: new Date().toISOString().slice(0, 10), publie: true });

export const temoignageFormSchema = z.object({ auteur: requiredStr("L'auteur est requis"), role: z.string().trim(), texte: requiredStr('Le témoignage est requis'), publie: z.boolean() });
export type TemoignageForm = z.infer<typeof temoignageFormSchema>;

export const contenuFormSchema = z.object({
  titre: requiredStr('Le titre est requis'), sousTitre: requiredStr("Le message d'accueil est requis"), telephone: z.string().trim(), email: z.string().trim().email('Adresse e-mail de contact invalide'), adresse: z.string().trim(),
  pourquoi: z.array(z.object({ titre: z.string().trim(), texte: z.string().trim() })),
});
export type ContenuForm = z.infer<typeof contenuFormSchema>;
export const contenuToForm = (c: Contenu): ContenuForm => ({ titre: c.titre, sousTitre: c.sous_titre, telephone: c.contact.telephone, email: c.contact.email, adresse: c.contact.adresse, pourquoi: c.pourquoi });
export const contenuToDto = (f: ContenuForm) => ({ titre: f.titre, sous_titre: f.sousTitre, contact: { telephone: f.telephone, email: f.email, adresse: f.adresse }, pourquoi: f.pourquoi.filter((p) => p.titre) });

/* ---------- CVthèque ---------- */

export const PROFIL_LABEL: Record<string, string> = { veterinaire: 'Vétérinaire', assistant: 'Assistant', technicien: 'Technicien' };
export const DISPO_LABEL: Record<string, string> = { immediate: 'Immédiate', '1mois': 'Sous 1 mois', '3mois': 'Sous 3 mois' };
export const cvSchema = z.object({
  id: z.string(), nom: z.string(), profil: z.string(), ville: z.string(), experience: z.number(), disponibilite: z.string(), telephone: z.string(), email: z.string(), competences: z.array(z.string()), presentation: z.string(),
  statut: z.enum(['nouveau', 'valide', 'archive']), depose_le: z.string(), fichier: z.object({ nom: z.string(), taille: z.number() }).nullable(), source: z.string(), consentement: z.object({ date: z.string(), version: z.string() }), retire: z.boolean(), archive_par: z.enum(['association', 'auto', 'candidat']).nullable(),
});
export type Cv = z.infer<typeof cvSchema>;
export const cvsSchema = z.object({ items: z.array(cvSchema), total: z.number() });
export const CV_FILTERS = [{ key: '', label: 'Tous' }, { key: 'nouveau', label: 'Nouveau' }, { key: 'valide', label: 'Validé' }, { key: 'archive', label: 'Archivé' }, { key: 'retire', label: 'Retiré' }] as const;
export type CvAction = 'valider' | 'archiver' | 'restaurer';

export type CvState = 'nouveau' | 'valide' | 'archive' | 'retire';
export const cvState = (c: Cv): CvState => (c.retire ? 'retire' : c.statut);
export const CV_STATE_LABEL: Record<CvState, string> = { nouveau: 'Nouveau', valide: 'Validé', archive: 'Archivé', retire: 'Retiré' };
export const CV_STATE_TONE: Record<CvState, BadgeTone> = { nouveau: 'blue', valide: 'green', archive: 'slate', retire: 'red' };
export const ARCHIVE_LABEL = { association: "Archivé par l'association", auto: 'Archivé automatiquement après 12 mois', candidat: 'Retiré à la demande du candidat' } as const;

/* ---------- Réclamations ---------- */

export const reclamationSchema = z.object({
  id: z.string(), numero: z.string(), date: z.string(), objet: z.string(), message: z.string(), statut: z.enum(['ouvert', 'encours', 'resolu', 'ferme']), auteur: z.string(), cabinet: z.string(), mis_a_jour: z.string(),
});
export type Reclamation = z.infer<typeof reclamationSchema>;
export const reclamationsSchema = z.object({ items: z.array(reclamationSchema), total: z.number(), adresse_support: z.string() });
