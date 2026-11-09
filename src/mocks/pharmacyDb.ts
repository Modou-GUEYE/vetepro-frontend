import type { Failure } from './profilesDb';
import { notify } from './notifDb';
import { INVOICES, PAYMENT_MODES, createInvoice, DemoInvoice } from './billingDb';
import { OWNERS, ownerName } from './patientsDb';

export const ARTICLE_CATEGORIES = ['Antibiotique', 'Antiparasitaire', 'Anti-inflammatoire', 'Anesthésique', 'Antiémétique', 'Vaccin', 'Antiparasitaire externe', 'Vitamines', 'Autre'] as const;
export type MovementType = 'entree' | 'consultation' | 'vente' | 'hospitalisation' | 'ajustement';

export interface DemoArticle { id: string; code: string; nom: string; categorie: string; unite: string; quantite: number; seuil: number; peremption: string | null; prix: number; actif: boolean; deleted?: boolean }
export interface DemoMovement { id: string; articleId: string; type: MovementType; quantite: number; date: string; by: string; reference: string }

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const art = (n: number, nom: string, categorie: string, unite: string, quantite: number, seuil: number, prix: number, peremption: string | null = null, actif = true): DemoArticle =>
  ({ id: String(n), code: `ART-${String(n).padStart(4, '0')}`, nom, categorie, unite, quantite, seuil, peremption, prix, actif });

const seedArticles = (): DemoArticle[] => [
  art(1, 'Méthylprednisolone 4mg', 'Anti-inflammatoire', 'Comprimés', 40, 10, 350, inDays(400)),
  art(2, 'Amoxicilline vét. 250mg', 'Antibiotique', 'Comprimés', 7, 20, 200, inDays(20)),
  art(3, 'Métoclopramide 10mg', 'Antiémétique', 'Comprimés', 0, 10, 150, inDays(300)),
  art(4, 'Frontline Spray', 'Antiparasitaire externe', 'Flacon 250ml', 15, 5, 4500, inDays(500)),
  art(5, 'Drontal Plus', 'Antiparasitaire', 'Comprimés', 60, 15, 1200, inDays(250)),
  art(6, 'Vaccin typhus félin', 'Vaccin', 'Dose', 10, 4, 12500, inDays(120)),
  art(7, 'Ivermectine 1%', 'Antiparasitaire', 'Flacon 50ml', 12, 4, 6500, inDays(600), false),
];

const mv = (n: number, articleId: string, type: MovementType, quantite: number, date: string, reference: string): DemoMovement => ({ id: `m${n}`, articleId, type, quantite, date, by: 'Dr Amadou Sy', reference });
const seedMovements = (): DemoMovement[] => [
  mv(1, '1', 'entree', 54, '2025-02-01T09:00:00.000Z', 'Stock initial'),
  mv(2, '1', 'consultation', -14, '2025-03-01T10:00:00.000Z', 'Consultation du 01/03/2025'),
  mv(3, '2', 'entree', 23, '2025-02-01T09:00:00.000Z', 'Stock initial'),
  mv(4, '2', 'consultation', -6, '2025-03-08T22:00:00.000Z', 'Consultation du 08/03/2025'),
  mv(5, '2', 'consultation', -10, '2025-03-08T22:00:00.000Z', 'Consultation du 08/03/2025'),
];

export let ARTICLES: DemoArticle[] = seedArticles();
export let MOVEMENTS: DemoMovement[] = seedMovements();
/** Dates d'utilisation d'un article dans un traitement (consultation, hospitalisation). */
export let TREATMENT_USE: Record<string, string[]> = { '2': [inDays(-2)] };
export const resetPharmacy = () => { ARTICLES = seedArticles(); MOVEMENTS = seedMovements(); TREATMENT_USE = { '2': [inDays(-2)] }; };

const notFound: Failure = { status: 404, code: 'not_found', message: 'Article introuvable' };
const live = () => ARTICLES.filter((a) => !a.deleted);
export const getArticle = (id: string): DemoArticle | Failure => live().find((a) => a.id === id) ?? notFound;

export type Level = 'ok' | 'faible' | 'rupture';
/** Rupture à zéro ; faible quand le stock passe en dessous du seuil d'alerte. */
export const levelOf = (a: Pick<DemoArticle, 'quantite' | 'seuil'>): Level => (a.quantite <= 0 ? 'rupture' : a.quantite < a.seuil ? 'faible' : 'ok');
export const daysToExpiry = (a: Pick<DemoArticle, 'peremption'>, now = new Date()) => (a.peremption ? Math.ceil((new Date(a.peremption).getTime() - now.getTime()) / 86_400_000) : null);

/** Traitement en cours : article utilisé dans les 14 derniers jours (consultation ou hospitalisation). */
export const TREATMENT_WINDOW_DAYS = 14;
export const inActiveTreatment = (id: string, now = new Date()) =>
  (TREATMENT_USE[id] ?? []).some((d) => (now.getTime() - new Date(d).getTime()) / 86_400_000 <= TREATMENT_WINDOW_DAYS);
export const recordTreatmentUse = (id: string, date = today()) => { (TREATMENT_USE[id] ??= []).push(date); };

export interface ArticleInput { nom: string; categorie: string; unite: string; quantite: number; seuil: number; peremption: string | null; prix: number }

function validate(i: ArticleInput, creating: boolean): Failure | null {
  if (!i.nom.trim()) return { status: 422, code: 'invalid', message: "Le nom de l'article est obligatoire" };
  if (!ARTICLE_CATEGORIES.includes(i.categorie as never)) return { status: 422, code: 'invalid', message: 'Choisissez une catégorie' };
  if (!i.unite.trim()) return { status: 422, code: 'invalid', message: "L'unité est obligatoire" };
  if (!Number.isInteger(i.seuil) || i.seuil < 0) return { status: 422, code: 'invalid', message: "Le seuil d'alerte doit être un nombre entier" };
  if (!Number.isInteger(i.prix) || i.prix < 0) return { status: 422, code: 'invalid', message: 'Le prix unitaire doit être un nombre entier de FCFA' };
  if (creating && (!Number.isInteger(i.quantite) || i.quantite < 0)) return { status: 422, code: 'invalid', message: 'La quantité doit être un nombre entier' };
  return null;
}
const duplicate = (i: ArticleInput, exceptId?: string) => live().some((a) => a.id !== exceptId && a.nom.toLowerCase() === i.nom.trim().toLowerCase() && a.unite.toLowerCase() === i.unite.trim().toLowerCase());

function move(articleId: string, type: MovementType, quantite: number, by: string, reference: string, now = new Date()) {
  MOVEMENTS.push({ id: `m${MOVEMENTS.length + 1}`, articleId, type, quantite, date: now.toISOString(), by, reference });
}

/** Ajout : le code article est généré automatiquement, le stock initial est tracé comme une entrée. */
export function createArticle(i: ArticleInput, by: string, now = new Date()): DemoArticle | Failure {
  const err = validate(i, true);
  if (err) return err;
  if (duplicate(i)) return { status: 409, code: 'article_exists', message: 'Cet article existe déjà' };
  const n = Math.max(0, ...ARTICLES.map((a) => Number(a.id))) + 1;
  const a: DemoArticle = { id: String(n), code: `ART-${String(n).padStart(4, '0')}`, nom: i.nom.trim(), categorie: i.categorie, unite: i.unite.trim(), quantite: i.quantite, seuil: i.seuil, peremption: i.peremption, prix: i.prix, actif: true };
  ARTICLES.push(a);
  if (i.quantite > 0) move(a.id, 'entree', i.quantite, by, 'Stock initial', now);
  return a;
}

/** Modification : la quantité ne change que par réapprovisionnement ou sortie (mouvements tracés). */
export function updateArticle(id: string, i: ArticleInput): DemoArticle | Failure {
  const a = live().find((x) => x.id === id);
  if (!a) return notFound;
  const err = validate(i, false);
  if (err) return err;
  if (duplicate(i, id)) return { status: 409, code: 'article_exists', message: 'Cet article existe déjà' };
  Object.assign(a, { nom: i.nom.trim(), categorie: i.categorie, unite: i.unite.trim(), seuil: i.seuil, peremption: i.peremption, prix: i.prix });
  return a;
}

export function restock(id: string, quantite: number, by: string, now = new Date()): DemoArticle | Failure {
  const a = live().find((x) => x.id === id);
  if (!a) return notFound;
  if (!Number.isInteger(quantite) || quantite < 1) return { status: 422, code: 'invalid', message: 'La quantité à ajouter doit être un nombre entier positif' };
  a.quantite += quantite;
  move(id, 'entree', quantite, by, 'Réapprovisionnement', now);
  return a;
}

export function setArticleActive(id: string, actif: boolean, now = new Date()): DemoArticle | Failure {
  const a = live().find((x) => x.id === id);
  if (!a) return notFound;
  if (!actif && inActiveTreatment(id, now)) return { status: 409, code: 'in_treatment', message: 'Désactivation impossible : cet article est utilisé dans un traitement en cours' };
  a.actif = actif;
  return a;
}

export function deleteArticle(id: string, now = new Date()): null | Failure {
  const a = live().find((x) => x.id === id);
  if (!a) return notFound;
  if (inActiveTreatment(id, now)) return { status: 409, code: 'in_treatment', message: 'Suppression impossible : cet article est utilisé dans un traitement en cours' };
  a.deleted = true;
  a.actif = false;
  return null;
}

/** Sortie de stock (consultation, vente, hospitalisation) : refusée si l'article est épuisé ou insuffisant. */
export function decrement(id: string, quantite: number, type: Exclude<MovementType, 'entree'>, by: string, reference: string, now = new Date()): DemoArticle | Failure {
  const a = live().find((x) => x.id === id);
  if (!a || !a.actif) return { status: 404, code: 'not_found', message: 'Article non référencé ou désactivé' };
  if (a.quantite <= 0) return { status: 409, code: 'out_of_stock', message: `Article épuisé : ${a.nom}` };
  if (quantite > a.quantite) return { status: 409, code: 'insufficient_stock', message: `Stock insuffisant pour ${a.nom} : ${a.quantite} disponible(s)` };
  const before = levelOf(a);
  a.quantite -= quantite;
  move(id, type, -quantite, by, reference, now);
  const after = levelOf(a);
  if (after !== 'ok' && after !== before) {
    notify({ userId: null, module: 'pharmacie', type: 'stock', titre: after === 'rupture' ? 'Rupture de stock' : 'Stock faible', lien: '/pharmacie',
      message: after === 'rupture' ? `${a.nom} est épuisé.` : `${a.nom} : il reste ${a.quantite} ${a.unite.toLowerCase()} (seuil ${a.seuil}).` }, now);
  }
  return a;
}

export function listArticles(p: { q?: string; categorie?: string; niveau?: string; statut?: string; page: number; pageSize: number }) {
  const q = (p.q ?? '').trim().toLowerCase();
  const rows = live()
    .filter((a) => !q || `${a.nom} ${a.categorie} ${a.code} ${a.unite}`.toLowerCase().includes(q))
    .filter((a) => !p.categorie || a.categorie === p.categorie)
    .filter((a) => !p.niveau || levelOf(a) === p.niveau)
    .filter((a) => !p.statut || (p.statut === 'actif' ? a.actif : !a.actif))
    .sort((x, y) => x.nom.localeCompare(y.nom, 'fr'));
  const start = (p.page - 1) * p.pageSize;
  return { items: rows.slice(start, start + p.pageSize), total: rows.length };
}

export const articleChoices = () => live().filter((a) => a.actif).sort((x, y) => x.nom.localeCompare(y.nom, 'fr'));

export function pharmacyStats() {
  const rows = live();
  return { references: rows.length, ok: rows.filter((a) => levelOf(a) === 'ok').length, faible: rows.filter((a) => levelOf(a) === 'faible').length, rupture: rows.filter((a) => levelOf(a) === 'rupture').length };
}

export function listMovements(p: { articleId?: string; type?: string; du?: string; au?: string; page: number; pageSize: number }) {
  const rows = MOVEMENTS
    .filter((m) => !p.articleId || m.articleId === p.articleId)
    .filter((m) => !p.type || m.type === p.type)
    .filter((m) => !p.du || m.date.slice(0, 10) >= p.du)
    .filter((m) => !p.au || m.date.slice(0, 10) <= p.au)
    .sort((a, b) => b.date.localeCompare(a.date));
  const start = (p.page - 1) * p.pageSize;
  return { items: rows.slice(start, start + p.pageSize), total: rows.length };
}

export interface SaleInput { date: string; ownerId: string | null; mode: string; notes: string; lignes: { articleId: string; quantite: number }[] }

/** Vente au comptoir : prix automatique, stock diminué (tout ou rien), facture payée et reçu générés. */
export function createSale(input: SaleInput, by: string, now = new Date()): DemoInvoice | Failure {
  if (input.lignes.length === 0) return { status: 422, code: 'invalid', message: 'Ajoutez au moins un article' };
  if (!PAYMENT_MODES.includes(input.mode as never)) return { status: 422, code: 'invalid', message: 'Mode de paiement inconnu' };
  const wanted = new Map<string, number>();
  for (const l of input.lignes) wanted.set(l.articleId, (wanted.get(l.articleId) ?? 0) + l.quantite);
  for (const [id, q] of wanted) {
    const a = live().find((x) => x.id === id);
    if (!a || !a.actif) return { status: 404, code: 'not_found', message: 'Article non référencé ou désactivé' };
    if (!Number.isInteger(q) || q < 1) return { status: 422, code: 'invalid', message: 'La quantité doit être un nombre entier positif' };
    if (a.quantite <= 0) return { status: 409, code: 'out_of_stock', message: `Article épuisé : ${a.nom}` };
    if (q > a.quantite) return { status: 409, code: 'insufficient_stock', message: `Stock insuffisant pour ${a.nom} : ${a.quantite} disponible(s)` };
  }
  const owner = input.ownerId ? OWNERS.find((o) => o.id === input.ownerId) : undefined;
  const lines = input.lignes.map((l) => { const a = live().find((x) => x.id === l.articleId)!; return { description: `${a.nom} (${a.unite})`, quantite: l.quantite, prixUnitaire: a.prix }; });
  const amount = lines.reduce((n, l) => n + l.quantite * l.prixUnitaire, 0);
  const inv = createInvoice({
    date: input.date, source: 'vente', ownerId: owner?.id ?? null, clientLabel: owner ? ownerName(owner) : 'Client anonyme', patientId: null, consultationId: null,
    lines, remisePct: 0, notes: input.notes, paiement: { montant: amount, mode: input.mode },
  }, by, now);
  if ('status' in inv) return inv;
  for (const [id, q] of wanted) decrement(id, q, 'vente', by, inv.numero, now);
  return inv;
}

export const salesInvoices = () => INVOICES.filter((x) => x.source === 'vente');
