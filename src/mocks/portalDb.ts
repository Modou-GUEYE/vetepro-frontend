import { DEMO_USERS, DemoUser } from './authDb';
import { ORDRE_FORMAT } from './cabinetDb';
import type { Failure } from './profilesDb';
import {
  CABINETS, DemoCabinetRec, DemoPack, DemoPromo, EntiteType, ENTITE_LABEL, Moyen, PACKS, PROMOS, Periode, SETTINGS, cabinetNom, cabinetUrl, checkMoyen, getCabinet, getPack,
  isFailure, moyenLabel, quote, statutOf, trace, joursRestants,
} from './subscriptionDb';
import { TICKETS } from './supportDb';

/** Contenus du site de l'association, annonces, témoignages et CVthèque (spécification : portail public). */
export interface DemoContent {
  titre: string; sousTitre: string; contactTel: string; contactEmail: string; contactAdresse: string;
  pourquoi: { titre: string; texte: string }[];
}
export type AnnonceCat = 'alerte' | 'vaccination' | 'communique' | 'evenement' | 'actualite';
export const ANNONCE_CATS: { key: AnnonceCat; label: string }[] = [
  { key: 'alerte', label: 'Alerte' }, { key: 'vaccination', label: 'Vaccination' }, { key: 'communique', label: 'Communiqué' }, { key: 'evenement', label: 'Événement' }, { key: 'actualite', label: 'Actualité' },
];
export interface DemoAnnonce { id: string; categorie: AnnonceCat; titre: string; resume: string; texte: string; zone: string; date: string; publie: boolean }
export interface DemoTemoignage { id: string; auteur: string; role: string; texte: string; publie: boolean }

export type CvProfil = 'veterinaire' | 'assistant' | 'technicien';
export type CvDispo = 'immediate' | '1mois' | '3mois';
export type CvStatut = 'nouveau' | 'valide' | 'archive';
export const PROFIL_LABEL: Record<CvProfil, string> = { veterinaire: 'Vétérinaire', assistant: 'Assistant', technicien: 'Technicien' };
export const DISPO_LABEL: Record<CvDispo, string> = { immediate: 'Immédiate', '1mois': 'Sous 1 mois', '3mois': 'Sous 3 mois' };
export interface DemoCv {
  id: string; nom: string; profil: CvProfil; ville: string; experience: number; disponibilite: CvDispo; telephone: string; email: string; competences: string[]; presentation: string;
  statut: CvStatut; source: 'site' | 'association'; creeLe: string; consentement: { date: string; version: string }; retire: boolean; archivePar: 'association' | 'auto' | 'candidat' | null;
  /** Fichier du CV (PDF) : simulé, on garde le nom et la taille. Supprimé avec le profil retiré ou archivé automatiquement. */
  fichier: { nom: string; taille: number } | null;
}

const DAY = 86_400_000;
const ago = (n: number) => new Date(Date.now() - n * DAY).toISOString();

const seedContent = (): DemoContent => ({
  titre: 'La force du réseau mutualisé',
  sousTitre: 'Une plateforme unique, partagée par les cabinets vétérinaires du pays. Mutualisons nos outils, nos données et nos talents pour mieux soigner, ensemble.',
  contactTel: '33 800 00 00', contactEmail: 'contact@vetepro.sn', contactAdresse: 'Association des vétérinaires du Sénégal, Dakar',
  pourquoi: [
    { titre: 'Un outil professionnel mutualisé', texte: 'Une plateforme complète, pensée pour être partagée entre confrères du réseau.' },
    { titre: 'Des tarifs maîtrisés', texte: "Un essai gratuit, des packs sans engagement et des offres de lancement pour les premiers cabinets inscrits." },
    { titre: 'Paiement mobile', texte: 'Wave, Orange Money et espèces pris en charge nativement.' },
  ],
});

const seedAnnonces = (): DemoAnnonce[] => [
  { id: 'an1', categorie: 'actualite', titre: 'Soins vétérinaires en zone rurale : les tournées mobiles s\'étendent', resume: 'Des équipes mobiles assurent soins, vaccinations et conseils au plus près des éleveurs.', texte: 'Des équipes mobiles de vétérinaires et d\'assistants assurent soins, vaccinations et conseils au plus près des éleveurs. De nouvelles tournées sont programmées dans les régions de Kaolack, Tambacounda et Kolda. Les cabinets membres qui souhaitent y participer peuvent se signaler auprès de l\'association.', zone: 'Milieu rural', date: '2026-10-01', publie: true },
  { id: 'an2', categorie: 'alerte', titre: 'Alerte : recrudescence de la peste des petits ruminants', resume: 'Plusieurs foyers de PPR ont été signalés. Renforcez la surveillance.', texte: 'Plusieurs foyers de PPR ont été signalés. Renforcez la surveillance, isolez les animaux suspects et déclarez chaque cas à l\'association. Les campagnes de vaccination sont ouvertes aux cabinets membres.', zone: 'Petits ruminants', date: '2026-10-06', publie: true },
  { id: 'an3', categorie: 'vaccination', titre: 'Campagne nationale de vaccination du bétail', resume: 'Une campagne de vaccination des bovins et petits ruminants est en cours.', texte: 'Une campagne de vaccination des bovins et petits ruminants est en cours dans les zones d\'élevage. Les cabinets membres peuvent s\'inscrire pour participer et coordonner les tournées avec l\'association.', zone: 'Zones rurales', date: '2026-10-03', publie: true },
  { id: 'an4', categorie: 'communique', titre: 'Communiqué de l\'association à l\'attention des membres', resume: 'Nouvelles orientations du réseau mutualisé et mesures de coordination à venir.', texte: 'L\'association informe ses membres des nouvelles orientations du réseau mutualisé et des mesures de coordination à venir. Le détail complet est disponible dans l\'espace membre.', zone: 'Association', date: '2026-09-30', publie: true },
  { id: 'an5', categorie: 'evenement', titre: 'Journées scientifiques vétérinaires : inscriptions ouvertes', resume: 'Rencontres, ateliers pratiques et partages de cas cliniques.', texte: 'Rencontres, ateliers pratiques et partages de cas cliniques entre confrères du réseau. Une occasion de se former et d\'échanger sur les enjeux de la santé animale au Sénégal.', zone: 'Dakar', date: '2026-11-15', publie: true },
  { id: 'an6', categorie: 'alerte', titre: 'Vigilance renforcée : suspicion d\'influenza aviaire', resume: 'Des cas suspects chez les volailles appellent à la vigilance.', texte: 'Des cas suspects chez les volailles appellent à la vigilance des praticiens et des éleveurs. Limitez les mouvements d\'animaux, renforcez le nettoyage des élevages et signalez tout cas suspect.', zone: 'Volailles', date: '2026-09-28', publie: true },
  { id: 'an7', categorie: 'vaccination', titre: 'Rappel : vaccination antirabique des animaux de compagnie et du bétail', resume: 'Un rappel est lancé auprès des cabinets pour maintenir une couverture élevée.', texte: 'Un rappel est lancé auprès des cabinets pour maintenir une couverture vaccinale élevée contre la rage. Pensez à mettre à jour les carnets de vaccination de vos patients.', zone: 'Tout le territoire', date: '2026-09-25', publie: false },
];

const seedTemoignages = (): DemoTemoignage[] => [
  { id: 'te1', auteur: 'Dr Aïssatou Mbaye', role: 'Cabinet membre, Dakar', texte: "Depuis qu'on est sur la plateforme mutualisée, la facturation et les rappels vaccinaux nous font gagner un temps fou.", publie: true },
  { id: 'te2', auteur: 'Dr Ousmane Diallo', role: 'Clinique membre, Thiès', texte: "La CVthèque du réseau m'a permis de recruter un assistant en une semaine. La mutualisation, ça marche.", publie: true },
  { id: 'te3', auteur: 'Dr Fatou Sarr', role: 'Cabinet membre, Rufisque', texte: 'Partager les référentiels et les outils entre confrères a changé notre façon de travailler au quotidien.', publie: true },
];

const cv = (id: string, nom: string, profil: CvProfil, ville: string, experience: number, disponibilite: CvDispo, telephone: string, email: string, competences: string[], presentation: string, statut: CvStatut, age: number, extra: Partial<DemoCv> = {}): DemoCv =>
  ({ id, nom, profil, ville, experience, disponibilite, telephone, email, competences, presentation, statut, source: 'site', creeLe: ago(age), consentement: { date: ago(age), version: 'v1.2' }, retire: false, archivePar: null, fichier: null, ...extra });

const seedCvs = (): DemoCv[] => [
  cv('cv1', 'Dr Mariama Ba', 'veterinaire', 'Dakar', 6, 'immediate', '77 123 45 67', 'mariama.ba@mail.sn', ['Chirurgie', 'Animaux de compagnie', 'Échographie'], 'Vétérinaire polyvalente, six ans en clinique canine et féline.', 'valide', 20, { fichier: { nom: 'CV-Mariama-Ba.pdf', taille: 412_000 } }),
  cv('cv2', 'Dr Ibrahima Ndiaye', 'veterinaire', 'Thiès', 11, '1mois', '76 222 33 44', 'i.ndiaye@mail.sn', ['Grands animaux', 'Insémination artificielle', 'Reproduction'], 'Spécialiste de la reproduction bovine et ovine.', 'valide', 45, { fichier: { nom: 'CV-Ibrahima-Ndiaye.pdf', taille: 286_000 } }),
  cv('cv3', 'Awa Sow', 'assistant', 'Dakar', 3, 'immediate', '78 555 66 77', 'awa.sow@mail.sn', ['Accueil', 'Facturation', 'Soins infirmiers'], 'Assistante vétérinaire, à l\'aise avec la caisse et le suivi des dossiers.', 'valide', 12, { fichier: { nom: 'CV-Awa-Sow.pdf', taille: 198_000 } }),
  cv('cv4', 'Moussa Faye', 'technicien', 'Kaolack', 4, '3mois', '70 888 99 00', '', ['Vaccination', 'Élevage', 'Terrain'], 'Technicien d\'élevage, campagnes de vaccination en zone rurale.', 'nouveau', 3),
  cv('cv5', 'Dr Khady Diop', 'veterinaire', 'Saint-Louis', 2, '1mois', '77 400 50 60', 'khady.diop@mail.sn', ['Animaux de compagnie', 'Médecine interne'], 'Jeune diplômée, stage de fin d\'études en clinique.', 'nouveau', 1),
  cv('cv6', 'Cheikh Gueye', 'assistant', 'Ziguinchor', 5, 'immediate', '76 300 40 50', 'cheikh.gueye@mail.sn', ['Pharmacie', 'Stock'], 'Gestion de pharmacie vétérinaire.', 'valide', 400),
];

export let CONTENT: DemoContent = seedContent();
export let ANNONCES: DemoAnnonce[] = seedAnnonces();
export let TEMOIGNAGES: DemoTemoignage[] = seedTemoignages();
export let CVS: DemoCv[] = seedCvs();
export const resetPortal = () => { CONTENT = seedContent(); ANNONCES = seedAnnonces(); TEMOIGNAGES = seedTemoignages(); CVS = seedCvs(); };

const EMAIL = /^\S+@\S+\.\S+$/;
const phoneOk = (t: string) => t.replace(/\D/g, '').length >= 9;
const bad = (message: string, code = 'invalid', status = 422): Failure => ({ status, code, message });
const nextId = (prefix: string, list: { id: string }[]) => `${prefix}${Math.max(0, ...list.map((x) => Number(x.id.replace(/\D/g, '')))) + 1}`;

/* ---------- Site public ---------- */

/** Chiffres clés calculés à partir des données de la plateforme (spécification) : cabinets dont l'accès est ouvert et vétérinaires de ces cabinets. */
export function chiffresCles(now = Date.now()) {
  const actifs = CABINETS.filter((c) => statutOf(c, now) !== 'expire');
  return { cabinets: actifs.length, veterinaires: actifs.reduce((n, c) => n + c.veterinaires, 0), profils: CVS.filter(isVisibleCv).length };
}
export const publicPacks = () => PACKS.filter((p) => p.actif && !p.personnalise);
export const publishedAnnonces = () => ANNONCES.filter((a) => a.publie).sort((a, b) => b.date.localeCompare(a.date));
export const compteurVivier = () => CVS.filter((c) => !c.retire && c.statut !== 'archive').length;

/* ---------- CVthèque ---------- */

const isVisibleCv = (c: DemoCv) => c.statut === 'valide' && !c.retire;

/** Archivage automatique des profils déposés depuis plus de 12 mois (spécification). */
export function autoArchive(now = Date.now()) {
  for (const c of CVS) if (c.statut !== 'archive' && now - Date.parse(c.creeLe) > 365 * DAY) { c.statut = 'archive'; c.archivePar = 'auto'; c.fichier = null; }
}

export interface CvInput { nom: string; profil: string; ville: string; experience: number; disponibilite: string; telephone: string; email: string; competences: string; presentation: string; consentement: boolean; fichier?: { nom: string; taille: number; type: string } | null }
export const CV_MAX_OCTETS = 2 * 1024 * 1024;
export function depositCv(i: CvInput, now = new Date()): DemoCv | Failure {
  if (!i.nom.trim() || !i.ville.trim() || !i.telephone.trim()) return bad('Nom, ville et téléphone sont requis');
  if (!phoneOk(i.telephone)) return bad('Numéro de téléphone invalide');
  if (i.email.trim() && !EMAIL.test(i.email.trim())) return bad('Adresse e-mail invalide');
  if (!(i.profil in PROFIL_LABEL)) return bad('Choisissez un profil');
  if (!(i.disponibilite in DISPO_LABEL)) return bad('Choisissez une disponibilité');
  if (i.fichier) {
    if (!/\.pdf$/i.test(i.fichier.nom) || (i.fichier.type && i.fichier.type !== 'application/pdf')) return bad('Le CV doit être au format PDF', 'fichier_invalide');
    if (i.fichier.taille > CV_MAX_OCTETS) return bad('Le CV ne doit pas dépasser 2 Mo', 'fichier_trop_gros');
    if (i.fichier.taille === 0) return bad('Le fichier est vide', 'fichier_invalide');
  }
  if (!i.consentement) return bad('Votre consentement à la diffusion de vos données est requis', 'consentement_requis');
  const c: DemoCv = {
    id: nextId('cv', CVS), nom: i.nom.trim(), profil: i.profil as CvProfil, ville: i.ville.trim(), experience: Math.max(0, Math.floor(Number(i.experience) || 0)), disponibilite: i.disponibilite as CvDispo,
    telephone: i.telephone.trim(), email: i.email.trim(), competences: i.competences.split(',').map((x) => x.trim()).filter(Boolean), presentation: i.presentation.trim(),
    statut: 'nouveau', source: 'site', creeLe: now.toISOString(), consentement: { date: now.toISOString(), version: 'v1.2' }, retire: false, archivePar: null, fichier: i.fichier ? { nom: i.fichier.nom, taille: i.fichier.taille } : null,
  };
  CVS.push(c);
  return c;
}

/** Retrait à la demande du candidat : identifié par son téléphone ou son e-mail ; le profil disparaît du vivier. */
export function withdrawCv(contact: string): number | Failure {
  const k = contact.trim().toLowerCase();
  if (!k) return bad('Indiquez le téléphone ou l\'e-mail utilisé lors du dépôt');
  const digits = k.replace(/\D/g, '');
  const found = CVS.filter((c) => !c.retire && ((c.email && c.email.toLowerCase() === k) || (digits.length >= 9 && c.telephone.replace(/\D/g, '') === digits)));
  if (!found.length) return bad('Aucun profil ne correspond à ce contact', 'not_found', 404);
  found.forEach((c) => { c.retire = true; c.statut = 'archive'; c.archivePar = 'candidat'; c.fichier = null; });
  return found.length;
}

/** Consultation par les Administrateurs et Vétérinaires : seuls les profils validés, avec filtres. */
export function searchCvs(f: { profil?: string; ville?: string; disponibilite?: string; experienceMin?: number; competence?: string; q?: string }, now = Date.now()) {
  autoArchive(now);
  return CVS.filter(isVisibleCv).filter((c) =>
    (!f.profil || c.profil === f.profil) && (!f.disponibilite || c.disponibilite === f.disponibilite) && (!f.ville || c.ville.toLowerCase().includes(f.ville.toLowerCase())) &&
    (!f.experienceMin || c.experience >= f.experienceMin) && (!f.competence || c.competences.some((x) => x.toLowerCase().includes(f.competence!.toLowerCase()))) &&
    (!f.q || `${c.nom} ${c.presentation} ${c.competences.join(' ')}`.toLowerCase().includes(f.q.toLowerCase())),
  ).sort((a, b) => b.creeLe.localeCompare(a.creeLe));
}

/* ---------- Inscription et adhésion ---------- */

export const generatePassword = () => {
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)]!;
  const body = Array.from({ length: 8 }, () => pick('abcdefghjkmnpqrstuvwxyz')).join('');
  return `${pick('ABCDEFGHJKMNPQRSTUVWXYZ')}${body}${pick('23456789')}${pick('#@!$%')}`;
};

export interface InscriptionInput {
  packId: string; periode: Periode; promoCode: string; nom: string; prenom: string; email: string; identifiant: string; ordre: string; etablissement: string;
  typeEtablissement: 'cabinet' | 'clinique'; adresse: string; ville: string; telephone: string; doubleAuth: boolean; moyen: Moyen | null; cgu: boolean;
}
export interface InscriptionResult {
  cabinet: DemoCabinetRec; pack: DemoPack; essaiFin: string; urlAcces: string; lienExpire: string; identifiant: string; email: string;
  apresEssai: { montant: number; periode: Periode; remise: number; promo: string | null }; email_simule: { destinataire: string; objet: string; motDePasse: string };
}

const nextUserId = () => String(Math.max(0, ...DEMO_USERS.map((u) => Number(u.id))) + 1);
const emailTaken = (e: string) => DEMO_USERS.some((u) => !u.deleted && u.email === e.toLowerCase()) || CABINETS.some((c) => c.email.toLowerCase() === e.toLowerCase());
const loginTaken = (l: string) => DEMO_USERS.some((u) => u.identifiant === l.toLowerCase());

/** Crée le cabinet, son administrateur (mot de passe généré, envoyé par e-mail) et démarre l'essai gratuit. */
function createCabinetWithAdmin(i: {
  nom: string; ordre: string; adresse: string; ville: string; telephone: string; email: string; prenom: string; lastName: string; identifiant: string;
  packId: string; periode: Periode; essai: boolean; promoCode: string; source: DemoCabinetRec['source']; entite: EntiteType; doubleAuth: boolean; veterinaires: number;
}, now: Date) {
  const id = String(Math.max(0, ...CABINETS.map((c) => Number(c.id))) + 1);
  const motDePasse = generatePassword();
  const cabinet: DemoCabinetRec = {
    id, nom: i.nom.trim(), ordre: i.ordre.trim().toUpperCase(), adresse: i.adresse.trim(), ville: i.ville.trim(), telephone: i.telephone.trim(), email: i.email.trim().toLowerCase(),
    responsable: `${i.prenom} ${i.lastName}`.trim(), entite: i.entite, packId: i.packId, periode: i.periode, essai: i.essai, debut: now.toISOString(),
    fin: new Date(now.getTime() + SETTINGS.essaiJours * DAY).toISOString(), promoCode: i.promoCode, source: i.source, veterinaires: i.veterinaires, doubleAuth: i.doubleAuth, url: cabinetUrl(i.nom), paiements: [],
  };
  CABINETS.push(cabinet);
  const admin: DemoUser = {
    id: nextUserId(), identifiant: i.identifiant.toLowerCase(), motDePasse, prenom: i.prenom.trim(), nom: i.lastName.trim(), email: i.email.trim().toLowerCase(), telephone: i.telephone.trim(),
    specialite: '', profilId: 'admin', actif: true, overrides: {}, cabinetId: id, twofaRequise: i.doubleAuth || undefined,
  };
  DEMO_USERS.push(admin);
  return { cabinet, admin, motDePasse };
}

const result = (c: DemoCabinetRec, pack: DemoPack, admin: DemoUser, motDePasse: string, q: ReturnType<typeof quote>, now: Date): InscriptionResult => {
  const qq = isFailure(q) ? null : q;
  return {
    cabinet: c, pack, essaiFin: c.fin, urlAcces: c.url, lienExpire: new Date(now.getTime() + 7 * DAY).toISOString(), identifiant: admin.identifiant, email: admin.email,
    apresEssai: { montant: qq?.net ?? pack.prix, periode: c.periode, remise: qq?.remise ?? 0, promo: qq?.promo?.code ?? null },
    email_simule: { destinataire: admin.email, objet: 'Bienvenue sur VétéPro : vos identifiants', motDePasse },
  };
};

const ENTITE_OF_TYPE: Record<string, EntiteType> = { cabinet: 'cabinet_activite', clinique: 'clinique' };

/** Inscription en ligne : choix du pack, informations, paiement et CGU (spécification, parcours en 4 étapes). Aucun débit pendant l'essai. */
export function register(i: InscriptionInput, now = new Date()): InscriptionResult | Failure {
  const pack = getPack(i.packId);
  if (!pack || !pack.actif || pack.personnalise) return bad('Sélectionnez un package', 'pack_requis');
  const required: [string, string][] = [['nom', 'Nom'], ['prenom', 'Prénom'], ['email', 'Adresse e-mail'], ['identifiant', "Nom d'utilisateur"], ['ordre', "Numéro d'ordre"], ['etablissement', "Nom de l'établissement"], ['adresse', 'Adresse'], ['telephone', 'Téléphone']];
  const missing = required.filter(([k]) => !String((i as unknown as Record<string, string>)[k] ?? '').trim()).map(([, l]) => l);
  if (missing.length) return bad(`Champs obligatoires manquants : ${missing.join(', ')}`);
  if (!EMAIL.test(i.email.trim())) return bad('Adresse e-mail invalide');
  if (emailTaken(i.email)) return bad('Cette adresse e-mail est déjà utilisée', 'email_pris');
  if (!/^[a-z0-9._-]{3,}$/i.test(i.identifiant.trim())) return bad("Nom d'utilisateur invalide (3 caractères minimum, lettres, chiffres, point, tiret)", 'identifiant_invalide');
  if (loginTaken(i.identifiant.trim())) return bad("Ce nom d'utilisateur est déjà pris", 'identifiant_pris');
  if (!ORDRE_FORMAT.test(i.ordre.trim())) return bad("Format du numéro d'ordre attendu : ODVS-0000", 'ordre_invalide');
  if (!phoneOk(i.telephone)) return bad('Numéro de téléphone invalide');
  const q = quote(i.packId, i.periode, i.promoCode, now.getTime());
  if (isFailure(q)) return q;
  if (!i.cgu) return bad("L'acceptation des conditions générales d'utilisation est obligatoire", 'cgu_requises');
  const refus = checkMoyen(i.moyen, now);
  if (refus) return refus;
  const { cabinet, admin, motDePasse } = createCabinetWithAdmin({
    nom: i.etablissement, ordre: i.ordre, adresse: i.adresse, ville: i.ville, telephone: i.telephone, email: i.email, prenom: i.prenom, lastName: i.nom, identifiant: i.identifiant,
    packId: i.packId, periode: i.periode, essai: true, promoCode: q.promo?.code ?? '', source: 'portail', entite: ENTITE_OF_TYPE[i.typeEtablissement] ?? 'cabinet_activite', doubleAuth: i.doubleAuth, veterinaires: 1,
  }, now);
  cabinet.paiements.push({ date: now.toISOString(), montant: 0, libelle: `Essai gratuit de ${SETTINGS.essaiJours} jours, moyen enregistré`, moyen: moyenLabel(i.moyen!) });
  if (q.promo) q.promo.utilises += 1;
  trace(admin.identifiant, 'Inscription en ligne', cabinet.nom, now);
  return result(cabinet, pack, admin, motDePasse, q, now);
}

/** Adhésion rapide depuis le portail : nom du cabinet, responsable, téléphone, e-mail, puis essai gratuit. */
export function quickJoin(i: { packId: string; nom: string; responsable: string; telephone: string; email: string }, now = new Date()): InscriptionResult | Failure {
  const pack = getPack(i.packId);
  if (!pack || !pack.actif || pack.personnalise) return bad('Sélectionnez un package', 'pack_requis');
  if (!i.nom.trim()) return bad('Renseignez le nom du cabinet');
  if (!i.responsable.trim()) return bad('Renseignez le nom du responsable');
  if (!phoneOk(i.telephone)) return bad('Numéro de téléphone invalide');
  if (!EMAIL.test(i.email.trim())) return bad('Adresse e-mail invalide');
  if (emailTaken(i.email)) return bad('Cette adresse e-mail est déjà utilisée', 'email_pris');
  const [prenom = '', ...rest] = i.responsable.trim().split(/\s+/);
  let identifiant = i.email.split('@')[0]!.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'admin';
  for (let n = 2; loginTaken(identifiant); n += 1) identifiant = `${identifiant.replace(/\d+$/, '')}${n}`;
  const q = quote(i.packId, 'mensuel', '', now.getTime());
  const { cabinet, admin, motDePasse } = createCabinetWithAdmin({
    nom: i.nom, ordre: '', adresse: '', ville: '', telephone: i.telephone, email: i.email, prenom, lastName: rest.join(' ') || prenom, identifiant,
    packId: i.packId, periode: 'mensuel', essai: true, promoCode: !isFailure(q) && q.promo ? q.promo.code : '', source: 'adhesion', entite: 'cabinet_activite', doubleAuth: false, veterinaires: 1,
  }, now);
  if (!isFailure(q) && q.promo) q.promo.utilises += 1;
  trace(admin.identifiant, 'Adhésion rapide', cabinet.nom, now);
  return result(cabinet, pack, admin, motDePasse, q, now);
}

/* ---------- Back-office du Super-admin ---------- */

export const reseauStats = (now = Date.now()) => {
  const by = (s: string) => CABINETS.filter((c) => statutOf(c, now) === s).length;
  const mrr = Math.round(CABINETS.filter((c) => statutOf(c, now) === 'actif').reduce((n, c) => n + (getPack(c.packId)?.prix ?? 0) * (c.periode === 'annuel' ? (12 - SETTINGS.anneeMoisOfferts) / 12 : 1), 0));
  return {
    cabinets: CABINETS.length, essai: by('essai'), actifs: by('actif'), expires: by('expire'), mrr,
    cvNouveaux: CVS.filter((c) => c.statut === 'nouveau' && !c.retire).length, cvValides: CVS.filter(isVisibleCv).length,
    reclamationsOuvertes: TICKETS.filter((t) => t.statut === 'ouvert' || t.statut === 'encours').length,
    echeances: CABINETS.filter((c) => statutOf(c, now) !== 'expire' && joursRestants(c, now) <= 7).map((c) => ({ id: c.id, nom: cabinetNom(c), jours: joursRestants(c, now) })),
  };
};

export interface PackInput { nom: string; cible: string; prix: number; engagement: string; fonctionnalites: string[]; modules: string[]; utilisateursMax: number | null; star: boolean; actif: boolean }
function packInputError(i: PackInput, exceptId?: string): Failure | null {
  if (!i.nom.trim()) return bad("Renseignez le nom de l'offre");
  if (!(i.prix >= 0)) return bad('Tarif invalide');
  if (PACKS.some((p) => p.id !== exceptId && p.nom.toLowerCase() === i.nom.trim().toLowerCase())) return bad('Une offre porte déjà ce nom', 'nom_pris', 409);
  if (i.modules.length === 0) return bad('Choisissez au moins un module');
  return null;
}

export function savePack(id: string | null, i: PackInput, by: string, now = new Date()): DemoPack | Failure {
  const err = packInputError(i, id ?? undefined);
  if (err) return err;
  const data = { nom: i.nom.trim(), cible: i.cible.trim(), prix: Math.round(i.prix), engagement: i.engagement.trim(), fonctionnalites: i.fonctionnalites.map((f) => f.trim()).filter(Boolean), modules: i.modules as DemoPack['modules'], utilisateursMax: i.utilisateursMax, star: i.star, actif: i.actif };
  let pack: DemoPack;
  if (id) {
    const p = getPack(id);
    if (!p) return bad('Offre introuvable', 'not_found', 404);
    Object.assign(p, data); pack = p;
    trace(by, "Modification d'une offre", p.nom, now);
  } else {
    pack = { id: `pk${PACKS.length + 1}-${now.getTime()}`, personnalise: false, ...data };
    PACKS.push(pack);
    trace(by, "Création d'une offre", pack.nom, now);
  }
  if (pack.star && !pack.personnalise) PACKS.forEach((p) => { if (p.id !== pack.id) p.star = false; }); // une seule offre « Le plus choisi »
  return pack;
}

/** Une offre utilisée par un cabinet se désactive, elle ne se supprime pas. */
export function deletePack(id: string, by: string, now = new Date()): Failure | null {
  const p = getPack(id);
  if (!p) return bad('Offre introuvable', 'not_found', 404);
  if (CABINETS.some((c) => c.packId === id)) return bad('Cette offre est utilisée par des cabinets : désactivez-la plutôt que de la supprimer', 'pack_utilise', 409);
  PACKS.splice(PACKS.indexOf(p), 1);
  trace(by, "Suppression d'une offre", p.nom, now);
  return null;
}

export function saveSettings(i: { essaiJours: number; anneeMoisOfferts: number }, by: string, now = new Date()) {
  if (!(Number.isInteger(i.essaiJours) && i.essaiJours >= 0 && i.essaiJours <= 90)) return bad("La durée d'essai doit être comprise entre 0 et 90 jours");
  if (!(Number.isInteger(i.anneeMoisOfferts) && i.anneeMoisOfferts >= 0 && i.anneeMoisOfferts <= 6)) return bad("Le nombre de mois offerts en annuel doit être compris entre 0 et 6");
  SETTINGS.essaiJours = i.essaiJours; SETTINGS.anneeMoisOfferts = i.anneeMoisOfferts;
  trace(by, "Modification de l'essai et de l'offre annuelle", `${i.essaiJours} jours, ${i.anneeMoisOfferts} mois offerts`, now);
  return SETTINGS;
}

export interface PromoInput { code: string; pct: number; mois: number; limite: number; debut: string; fin: string; packs: string[]; actif: boolean; auto: boolean }
export function savePromo(id: string | null, i: PromoInput, by: string, now = new Date()): DemoPromo | Failure {
  const code = i.code.trim().toUpperCase();
  if (!code) return bad('Code requis');
  if (!(i.pct > 0 && i.pct <= 100)) return bad('Le pourcentage doit être compris entre 1 et 100');
  if (!(i.mois >= 1) || !(i.limite >= 1)) return bad('Durée et nombre de cabinets doivent être supérieurs à zéro');
  if (!i.debut || !i.fin || i.fin < i.debut) return bad('La date de fin doit suivre la date de début');
  if (PROMOS.some((p) => p.id !== id && p.code === code)) return bad('Ce code existe déjà', 'code_pris', 409);
  let promo: DemoPromo;
  if (id) {
    const p = PROMOS.find((x) => x.id === id);
    if (!p) return bad('Promotion introuvable', 'not_found', 404);
    Object.assign(p, { ...i, code }); promo = p;
  } else { promo = { id: `pr${PROMOS.length + 1}-${now.getTime()}`, utilises: 0, ...i, code }; PROMOS.push(promo); }
  if (promo.auto) PROMOS.forEach((p) => { if (p.id !== promo.id) p.auto = false; }); // une seule offre de lancement automatique
  trace(by, id ? "Modification d'une promotion" : "Création d'une promotion", code, now);
  return promo;
}
export function deletePromo(id: string, by: string, now = new Date()): Failure | null {
  const p = PROMOS.find((x) => x.id === id);
  if (!p) return bad('Promotion introuvable', 'not_found', 404);
  PROMOS.splice(PROMOS.indexOf(p), 1);
  trace(by, "Suppression d'une promotion", p.code, now);
  return null;
}

/** Offre sur mesure : l'association crée le pack personnalisé et l'entité du visiteur après accord ; les identifiants partent comme pour une inscription. */
export interface SurMesureInput {
  entite: string; nom: string; ordre: string; adresse: string; ville: string; telephone: string; email: string; responsable: string; identifiant: string;
  tarif: number; modules: string[]; utilisateursMax: number | null; periode: Periode; essai: boolean; veterinaires: number;
}
export function createCustomEntity(i: SurMesureInput, by: string, now = new Date()): InscriptionResult | Failure {
  if (!(i.entite in ENTITE_LABEL)) return bad("Choisissez le type d'entité");
  const required: [string, string][] = [['nom', "Nom de l'entité"], ['responsable', 'Responsable'], ['email', 'Adresse e-mail'], ['identifiant', "Nom d'utilisateur"], ['telephone', 'Téléphone']];
  const missing = required.filter(([k]) => !String((i as unknown as Record<string, string>)[k] ?? '').trim()).map(([, l]) => l);
  if (missing.length) return bad(`Champs obligatoires manquants : ${missing.join(', ')}`);
  if (i.ordre.trim() && !ORDRE_FORMAT.test(i.ordre.trim())) return bad("Format du numéro d'ordre attendu : ODVS-0000", 'ordre_invalide');
  if (!EMAIL.test(i.email.trim())) return bad('Adresse e-mail invalide');
  if (emailTaken(i.email)) return bad('Cette adresse e-mail est déjà utilisée', 'email_pris');
  if (loginTaken(i.identifiant.trim())) return bad("Ce nom d'utilisateur est déjà pris", 'identifiant_pris');
  if (!phoneOk(i.telephone)) return bad('Numéro de téléphone invalide');
  if (i.modules.length === 0) return bad('Choisissez au moins un module');
  if (!(i.tarif >= 0)) return bad('Tarif invalide');
  const pack: DemoPack = {
    id: `sm${PACKS.length + 1}-${now.getTime()}`, nom: `Sur mesure, ${i.nom.trim()}`, cible: ENTITE_LABEL[i.entite as EntiteType], prix: Math.round(i.tarif), engagement: 'Convenu avec l\'association',
    fonctionnalites: ['Offre personnalisée'], modules: i.modules as DemoPack['modules'], utilisateursMax: i.utilisateursMax, star: false, actif: true, personnalise: true,
  };
  PACKS.push(pack);
  const [prenom = '', ...rest] = i.responsable.trim().split(/\s+/);
  const { cabinet, admin, motDePasse } = createCabinetWithAdmin({
    nom: i.nom, ordre: i.ordre, adresse: i.adresse, ville: i.ville, telephone: i.telephone, email: i.email, prenom, lastName: rest.join(' ') || prenom, identifiant: i.identifiant.trim(),
    packId: pack.id, periode: i.periode, essai: i.essai, promoCode: '', source: 'association', entite: i.entite as EntiteType, doubleAuth: false, veterinaires: Math.max(1, i.veterinaires || 1),
  }, now);
  if (!i.essai) cabinet.fin = new Date(now.getTime() + (i.periode === 'annuel' ? 365 : 30) * DAY).toISOString();
  trace(by, 'Création d\'une entité sur mesure', `${cabinet.nom} (${ENTITE_LABEL[i.entite as EntiteType]})`, now);
  return result(cabinet, pack, admin, motDePasse, { base: pack.prix, remise: 0, net: pack.prix, promo: null, periode: i.periode }, now);
}

export function extendCabinet(id: string, jours: number, by: string, now = new Date()): DemoCabinetRec | Failure {
  const c = getCabinet(id);
  if (!c) return bad('Cabinet introuvable', 'not_found', 404);
  if (!(jours >= 1 && jours <= 90)) return bad('La prolongation doit être comprise entre 1 et 90 jours');
  c.fin = new Date(Math.max(now.getTime(), Date.parse(c.fin)) + jours * DAY).toISOString();
  trace(by, `Prolongation de ${jours} jours`, cabinetNom(c), now);
  return c;
}

export function saveAnnonce(id: string | null, i: Omit<DemoAnnonce, 'id'>, by: string, now = new Date()): DemoAnnonce | Failure {
  if (!i.titre.trim()) return bad("Renseignez le titre de l'annonce");
  if (!i.resume.trim()) return bad("Renseignez le résumé de l'annonce");
  if (!ANNONCE_CATS.some((c) => c.key === i.categorie)) return bad('Choisissez une catégorie');
  if (!i.date) return bad('Renseignez la date de publication');
  const data = { ...i, titre: i.titre.trim(), resume: i.resume.trim(), texte: i.texte.trim() || i.resume.trim(), zone: i.zone.trim() };
  let a: DemoAnnonce;
  if (id) { const x = ANNONCES.find((y) => y.id === id); if (!x) return bad('Annonce introuvable', 'not_found', 404); Object.assign(x, data); a = x; }
  else { a = { id: nextId('an', ANNONCES), ...data }; ANNONCES.push(a); }
  trace(by, id ? "Modification d'une annonce" : "Création d'une annonce", a.titre, now);
  return a;
}
export function deleteAnnonce(id: string, by: string, now = new Date()): Failure | null {
  const a = ANNONCES.find((x) => x.id === id);
  if (!a) return bad('Annonce introuvable', 'not_found', 404);
  ANNONCES.splice(ANNONCES.indexOf(a), 1);
  trace(by, "Suppression d'une annonce", a.titre, now);
  return null;
}

export function saveTemoignage(id: string | null, i: Omit<DemoTemoignage, 'id'>, by: string, now = new Date()): DemoTemoignage | Failure {
  if (!i.auteur.trim() || !i.texte.trim()) return bad("L'auteur et le témoignage sont requis");
  let t: DemoTemoignage;
  if (id) { const x = TEMOIGNAGES.find((y) => y.id === id); if (!x) return bad('Témoignage introuvable', 'not_found', 404); Object.assign(x, i); t = x; }
  else { t = { id: nextId('te', TEMOIGNAGES), ...i }; TEMOIGNAGES.push(t); }
  trace(by, id ? "Modification d'un témoignage" : "Création d'un témoignage", t.auteur, now);
  return t;
}
export function deleteTemoignage(id: string, by: string, now = new Date()): Failure | null {
  const t = TEMOIGNAGES.find((x) => x.id === id);
  if (!t) return bad('Témoignage introuvable', 'not_found', 404);
  TEMOIGNAGES.splice(TEMOIGNAGES.indexOf(t), 1);
  trace(by, "Suppression d'un témoignage", t.auteur, now);
  return null;
}

export function saveContent(i: DemoContent, by: string, now = new Date()): DemoContent | Failure {
  if (!i.titre.trim() || !i.sousTitre.trim()) return bad("Le titre et le message d'accueil sont requis");
  if (!EMAIL.test(i.contactEmail.trim())) return bad('Adresse e-mail de contact invalide');
  CONTENT = { ...i, pourquoi: i.pourquoi.filter((p) => p.titre.trim()) };
  trace(by, 'Modification des textes du site', 'Accueil et contact', now);
  return CONTENT;
}

/** Validation et archivage des profils par l'association ; un profil archivé peut être remis à valider. */
export function reviewCv(id: string, action: 'valider' | 'archiver' | 'restaurer', by: string, now = new Date()): DemoCv | Failure {
  const c = CVS.find((x) => x.id === id);
  if (!c) return bad('Profil introuvable', 'not_found', 404);
  if (c.retire) return bad('Ce candidat a retiré son profil', 'cv_retire', 409);
  if (action === 'valider') { if (c.statut === 'valide') return bad('Ce profil est déjà validé', 'deja', 409); c.statut = 'valide'; c.archivePar = null; }
  else if (action === 'archiver') { c.statut = 'archive'; c.archivePar = 'association'; }
  else { c.statut = 'nouveau'; c.archivePar = null; c.creeLe = now.toISOString(); }
  trace(by, action === 'valider' ? 'Validation d\'un CV' : action === 'archiver' ? 'Archivage d\'un CV' : 'CV remis à valider', c.nom, now);
  return c;
}
