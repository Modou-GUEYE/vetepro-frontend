import { DEMO_USERS, fullName } from './authDb';
import { notify } from './notifDb';
import { can, effectivePermissions } from '@/core/auth/permissions';
import { getProfile } from './profilesDb';
import type { Failure } from './profilesDb';
import { getCabinet, packModules } from './subscriptionDb';

/**
 * Forum vétérinaire (spécification) : un post (titre, description, fichiers, personnes mentionnées) affiche l'identité de son auteur
 * (nom, prénom, profil) ; les utilisateurs réagissent (commentaire, j'aime, je n'aime pas, repartage) ; un compteur indique les posts non lus ;
 * les personnes mentionnées reçoivent une notification dans l'application.
 */
export const CATEGORIES = ['Général', 'Cas cliniques', 'Entraide', 'Annonces', 'Matériel', 'Emploi', 'Réglementation'] as const;
export const FICHIER_MAX_OCTETS = 10 * 1024 * 1024;
export const FICHIERS_MAX = 5;

export interface DemoPiece { nom: string; taille: number; type: 'image' | 'pdf' | 'doc' }
export interface DemoComment { id: string; auteurId: string; texte: string; date: string; mentions: string[] }
export interface DemoPost {
  id: string; auteurId: string; titre: string; categorie: string; contenu: string; date: string; pieces: DemoPiece[]; mentions: string[];
  likes: string[]; dislikes: string[]; commentaires: DemoComment[]; reposts: { userId: string; date: string }[]; repostDe: string | null; luPar: string[]; supprime: boolean;
}
export interface Person { id: string; nom: string; profil: string; cabinet: string }

/** Confrères des autres établissements du réseau : ils n'ont pas de compte de démonstration, mais leurs posts et leurs noms existent. */
const REMOTE: Person[] = [
  { id: 'r1', nom: 'Ousmane Diallo', profil: 'Vétérinaire', cabinet: 'Clinique Saint-Louis' },
  { id: 'r2', nom: 'Aïssatou Mbaye', profil: 'Vétérinaire', cabinet: 'Cabinet Vétérinaire de Thiès' },
  { id: 'r3', nom: 'Cheikh Ndour', profil: "Technicien d'élevage", cabinet: 'Cabinet de Kaolack' },
  { id: 'r4', nom: 'Mame Diarra Fall', profil: 'Vétérinaire', cabinet: 'Cabinet Louga Santé Animale' },
];

/** Utilisateurs qui ont accès au forum : droit de lecture du profil (exceptions comprises) et pack de leur cabinet qui l'inclut. */
const localUsers = () => DEMO_USERS.filter((u) => !u.deleted && u.actif && u.profilId !== 'super_admin'
  && can(effectivePermissions(getProfile(u.profilId)?.permissions ?? {}, u.overrides), 'reseau', 'read') && packModules(u.cabinetId ?? '1').has('reseau'));

export function personOf(id: string): Person {
  const r = REMOTE.find((x) => x.id === id);
  if (r) return r;
  const u = DEMO_USERS.find((x) => x.id === id);
  if (!u) return { id, nom: 'Utilisateur inconnu', profil: '', cabinet: '' };
  return { id, nom: fullName(u), profil: getProfile(u.profilId)?.label ?? '', cabinet: getCabinet(u.cabinetId ?? '1')?.nom ?? '' };
}

/** Personnes que l'on peut mentionner : les utilisateurs de la plateforme qui ont accès au forum, sauf `exceptId`. */
export const mentionables = (exceptId = ''): Person[] => [...localUsers().map((u) => personOf(u.id)), ...REMOTE].filter((p) => p.id !== exceptId);

/** Les personnes mentionnées sont celles dont le texte contient « @Prénom Nom ». */
export const extractMentions = (texte: string): string[] => mentionables().filter((p) => texte.includes(`@${p.nom}`)).map((p) => p.id);

const DAY = 86_400_000;
const ago = (days: number, hour = 9) => { const d = new Date(Date.now() - days * DAY); d.setHours(hour, 0, 0, 0); return d.toISOString(); };

const seed = (): DemoPost[] => [
  {
    id: '1', auteurId: 'r2', titre: 'Rupture de vaccin antirabique : qui a du stock ?', categorie: 'Entraide', date: ago(3, 8),
    contenu: "Bonjour à tous, notre fournisseur est en rupture de vaccin antirabique jusqu'à fin du mois. Un confrère aurait-il quelques doses à céder ou un autre fournisseur à recommander ?",
    pieces: [], mentions: [], likes: ['r1', 'r3', '3'], dislikes: [],
    commentaires: [{ id: 'c1', auteurId: 'r1', texte: "Laborex Dakar en a reçu mardi, appelez-les avant jeudi.", date: ago(3, 10), mentions: [] }],
    reposts: [], repostDe: null, luPar: [], supprime: false,
  },
  {
    id: '2', auteurId: 'r1', titre: 'Boiterie persistante sur vache Ndama : avis ?', categorie: 'Cas cliniques', date: ago(1, 18),
    contenu: "Vache Ndama de 4 ans, boiterie postérieure droite depuis 3 semaines sans amélioration sous anti-inflammatoires. @Fatou Diallo, tu as déjà eu ce cas de boiterie sur Ndama ? Je joins l'échographie.",
    pieces: [{ nom: 'echo_jarret_ndama.jpg', taille: 862_000, type: 'image' }, { nom: 'bilan_sanguin.pdf', taille: 318_000, type: 'pdf' }], mentions: ['2'], likes: ['2'], dislikes: [], commentaires: [], reposts: [], repostDe: null, luPar: [], supprime: false,
  },
  {
    id: '3', auteurId: '1', titre: 'Journées scientifiques vétérinaires : programme publié', categorie: 'Annonces', date: ago(5, 12),
    contenu: "Le programme des Journées scientifiques est en ligne. Inscriptions ouvertes jusqu'au 30 novembre. Des ateliers pratiques d'échographie et d'insémination sont prévus.",
    pieces: [{ nom: 'programme_JSV_2026.pdf', taille: 1_250_000, type: 'pdf' }], mentions: [], likes: ['r1', 'r2', 'r3', '2'], dislikes: [],
    commentaires: [{ id: 'c2', auteurId: '2', texte: "Merci pour l'information, je m'inscris à l'atelier d'échographie.", date: ago(4, 9), mentions: [] }],
    reposts: [{ userId: 'r3', date: ago(4, 8) }], repostDe: null, luPar: ['1'], supprime: false,
  },
  {
    id: '4', auteurId: 'r3', titre: '', categorie: 'Annonces', date: ago(4, 8),
    contenu: 'À partager largement auprès des éleveurs de la zone centre.', pieces: [], mentions: [], likes: [], dislikes: [], commentaires: [], reposts: [], repostDe: '3', luPar: [], supprime: false,
  },
  {
    id: '5', auteurId: 'r2', titre: "Échographe portable d'occasion à vendre", categorie: 'Matériel', date: ago(8, 16),
    contenu: 'Échographe portable convexe et linéaire, très bon état, idéal pour le terrain. Prix à débattre.', pieces: [], mentions: [], likes: ['2'], dislikes: ['r1'], commentaires: [], reposts: [], repostDe: null, luPar: ['1', '2', '3', '4', '6'], supprime: false,
  },
];

export let POSTS: DemoPost[] = seed();
export const resetForum = () => { POSTS = seed(); };

const notFound = (): Failure => ({ status: 404, code: 'not_found', message: 'Publication introuvable' });
const find = (id: string) => POSTS.find((p) => p.id === id && !p.supprime);
const nextId = () => String(Math.max(0, ...POSTS.map((p) => Number(p.id))) + 1);
const origin = (p: DemoPost) => (p.repostDe ? find(p.repostDe) : undefined);
const mentionsMe = (p: DemoPost, userId: string) => p.mentions.includes(userId) || p.commentaires.some((c) => c.mentions.includes(userId));
const isUnread = (p: DemoPost, userId: string) => p.auteurId !== userId && !p.luPar.includes(userId);

export const unreadCount = (userId: string) => POSTS.filter((p) => !p.supprime && isUnread(p, userId)).length;

export type Filtre = 'toutes' | 'non_lues' | 'mentions' | 'miennes';
export const FILTRES: Filtre[] = ['toutes', 'non_lues', 'mentions', 'miennes'];

export function counters(userId: string) {
  const all = POSTS.filter((p) => !p.supprime);
  return {
    toutes: all.length, non_lues: all.filter((p) => isUnread(p, userId)).length, mentions: all.filter((p) => mentionsMe(p, userId)).length, miennes: all.filter((p) => p.auteurId === userId).length,
    categories: Object.fromEntries(CATEGORIES.map((c) => [c, all.filter((p) => p.categorie === c).length])) as Record<string, number>,
  };
}

export function listPosts(userId: string, f: { filtre?: string; categorie?: string; q?: string; tri?: string } = {}): DemoPost[] {
  const q = (f.q ?? '').trim().toLowerCase();
  return POSTS
    .filter((p) => !p.supprime)
    .filter((p) => f.filtre === 'non_lues' ? isUnread(p, userId) : f.filtre === 'mentions' ? mentionsMe(p, userId) : f.filtre === 'miennes' ? p.auteurId === userId : true)
    .filter((p) => !f.categorie || p.categorie === f.categorie)
    .filter((p) => { if (!q) return true; const a = personOf(p.auteurId); return `${p.titre} ${p.contenu} ${a.nom} ${p.categorie}`.toLowerCase().includes(q); })
    .sort(f.tri === 'populaires'
      ? (a, b) => (b.likes.length + b.commentaires.length * 2 + b.reposts.length * 2) - (a.likes.length + a.commentaires.length * 2 + a.reposts.length * 2)
      : (a, b) => b.date.localeCompare(a.date));
}

export const getPost = (id: string): DemoPost | Failure => find(id) ?? notFound();
export const originOf = origin;

/** Une personne mentionnée qui a un compte reçoit une notification dans l'application (jamais l'auteur lui-même). */
function notifyMentions(ids: string[], byId: string, message: string, postId: string, now: Date) {
  const by = personOf(byId).nom;
  for (const id of ids) {
    if (id === byId || !localUsers().some((u) => u.id === id)) continue;
    notify({ userId: id, module: null, type: 'mention', titre: `${by} vous a mentionné`, message, lien: `/forum?post=${postId}` }, now);
  }
}

export interface PostInput { titre: string; categorie: string; contenu: string; pieces: DemoPiece[] }

export function createPost(i: PostInput, byId: string, now = new Date()): DemoPost | Failure {
  if (!i.titre.trim()) return { status: 422, code: 'invalid', message: 'Titre requis' };
  if (!i.contenu.trim()) return { status: 422, code: 'invalid', message: 'Description requise' };
  if (!(CATEGORIES as readonly string[]).includes(i.categorie)) return { status: 422, code: 'invalid', message: 'Catégorie inconnue' };
  if (i.pieces.length > FICHIERS_MAX) return { status: 422, code: 'invalid', message: `${FICHIERS_MAX} fichiers au plus par publication` };
  const trop = i.pieces.find((f) => f.taille > FICHIER_MAX_OCTETS);
  if (trop) return { status: 422, code: 'invalid', message: `${trop.nom} dépasse 10 Mo` };
  const mentions = extractMentions(i.contenu).filter((id) => id !== byId);
  const p: DemoPost = {
    id: nextId(), auteurId: byId, titre: i.titre.trim(), categorie: i.categorie, contenu: i.contenu.trim(), date: now.toISOString(), pieces: i.pieces, mentions,
    likes: [], dislikes: [], commentaires: [], reposts: [], repostDe: null, luPar: [byId], supprime: false,
  };
  POSTS.push(p);
  notifyMentions(mentions, byId, `« ${p.titre} »`, p.id, now);
  return p;
}

export function markRead(id: string, userId: string): DemoPost | Failure {
  const p = find(id);
  if (!p) return notFound();
  if (!p.luPar.includes(userId)) p.luPar.push(userId);
  return p;
}

export function markAllRead(userId: string) { for (const p of POSTS) if (!p.supprime && !p.luPar.includes(userId)) p.luPar.push(userId); }

/** J'aime et je n'aime pas s'excluent ; un second clic retire la réaction. */
export function react(id: string, userId: string, type: string): DemoPost | Failure {
  const p = find(id);
  if (!p) return notFound();
  if (type !== 'like' && type !== 'dislike') return { status: 422, code: 'invalid', message: 'Réaction inconnue' };
  const [mine, other] = type === 'like' ? [p.likes, p.dislikes] : [p.dislikes, p.likes];
  const at = mine.indexOf(userId);
  if (at >= 0) mine.splice(at, 1);
  else { mine.push(userId); const o = other.indexOf(userId); if (o >= 0) other.splice(o, 1); }
  if (!p.luPar.includes(userId)) p.luPar.push(userId);
  return p;
}

export function addComment(id: string, texte: string, byId: string, now = new Date()): DemoPost | Failure {
  const p = find(id);
  if (!p) return notFound();
  if (!texte.trim()) return { status: 422, code: 'invalid', message: 'Commentaire vide' };
  const mentions = extractMentions(texte).filter((m) => m !== byId);
  p.commentaires.push({ id: `c${Date.now()}-${p.commentaires.length}`, auteurId: byId, texte: texte.trim(), date: now.toISOString(), mentions });
  if (!p.luPar.includes(byId)) p.luPar.push(byId);
  notifyMentions(mentions, byId, `« ${texte.trim().slice(0, 80)} »`, p.id, now);
  return p;
}

/** Repartage : on repart toujours de la publication d'origine, une seule fois par personne. */
export function repost(id: string, commentaire: string, byId: string, now = new Date()): DemoPost | Failure {
  const src = find(id);
  if (!src) return notFound();
  const o = origin(src) ?? src;
  if (o.reposts.some((r) => r.userId === byId)) return { status: 409, code: 'already_reposted', message: 'Vous avez déjà repartagé cette publication' };
  o.reposts.push({ userId: byId, date: now.toISOString() });
  if (!o.luPar.includes(byId)) o.luPar.push(byId);
  const mentions = extractMentions(commentaire).filter((m) => m !== byId);
  const p: DemoPost = {
    id: nextId(), auteurId: byId, titre: '', categorie: o.categorie, contenu: commentaire.trim(), date: now.toISOString(), pieces: [], mentions,
    likes: [], dislikes: [], commentaires: [], reposts: [], repostDe: o.id, luPar: [byId], supprime: false,
  };
  POSTS.push(p);
  notifyMentions(mentions, byId, `« ${commentaire.trim().slice(0, 80)} »`, p.id, now);
  return p;
}

/** Un post est supprimé par son auteur, ou par quiconque a le droit de suppression sur le forum (Administrateur). */
export function deletePost(id: string, userId: string, canDeleteAny: boolean): true | Failure {
  const p = find(id);
  if (!p) return notFound();
  if (p.auteurId !== userId && !canDeleteAny) return { status: 403, code: 'permission_denied', message: "Vous n'avez pas les droits pour effectuer cette action." };
  p.supprime = true;
  for (const r of POSTS) if (r.repostDe === id) r.supprime = true;
  return true;
}
