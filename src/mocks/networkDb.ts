import { DEMO_USERS } from './authDb';
import { notify } from './notifDb';
import { personOf } from './forumDb';
import { OWNERS, getPatient, ownerName } from './patientsDb';
import type { Failure } from './profilesDb';
import { cabinetNom, getCabinet } from './subscriptionDb';

/**
 * Collaboration et réseau (maintenue par le produit le 26/10/2026, d'après le prototype V5) : cas cliniques partagés et anonymisés,
 * veille épidémiologique avec alerte automatique, annuaire des confrères avec orientation d'un patient.
 */
const DAY = 86_400_000;
const day = (n: number) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);

/** Établissement et ville d'un utilisateur de la plateforme (les confrères d'ailleurs sont saisis dans les données de départ). */
export function siteOf(userId: string): { clinique: string; ville: string } {
  const u = DEMO_USERS.find((x) => x.id === userId);
  const c = getCabinet(u?.cabinetId ?? '1');
  return c ? { clinique: cabinetNom(c), ville: c.ville } : { clinique: personOf(userId).cabinet, ville: '' };
}
const notFound = (what: string): Failure => ({ status: 404, code: 'not_found', message: `${what} introuvable` });

/* ---------- Cas partagés ---------- */

export const CAS_CATEGORIES = ['2ᵉ avis', 'Urgent', 'Dermatologie', 'Chirurgie', 'Reproduction', 'Autre'] as const;
export interface DemoAvis { id: string; auteurId: string; ville: string; texte: string; date: string }
export interface DemoCas {
  id: string; auteurId: string; clinique: string; ville: string; espece: string; categorie: string; titre: string; description: string; date: string;
  resolu: boolean; votes: string[]; avis: DemoAvis[];
}

const seedCas = (): DemoCas[] => [
  {
    id: '1', auteurId: '1', clinique: 'Cabinet de Fann', ville: 'Dakar', espece: 'Bovin', categorie: '2ᵉ avis', titre: 'Boiterie persistante sur vache laitière malgré traitement', date: day(2), resolu: false, votes: ['r1', 'r2', 'r4'],
    description: "Vache Ndama, 4 ans, boiterie postérieure droite depuis 3 semaines. Pas d'amélioration sous anti-inflammatoires. Pas de plaie visible. Température normale.",
    avis: [
      { id: 'a1', auteurId: 'r1', ville: 'Thiès', texte: "As-tu fait une radio du jarret ? Ça ressemble à une arthrose ou une lésion articulaire profonde.", date: day(1) },
      { id: 'a2', auteurId: 'r4', ville: 'Louga', texte: "Vérifie aussi la présence d'un abcès de sole, fréquent en saison des pluies.", date: day(1) },
    ],
  },
  {
    id: '2', auteurId: 'r1', clinique: 'Clinique de Thiès', ville: 'Thiès', espece: 'Chien', categorie: 'Dermatologie', titre: 'Dermatose généralisée récidivante chez un chien de 3 ans', date: day(4), resolu: true, votes: ['1', '2', 'r2', 'r4', '3'],
    description: "Prurit intense, alopécie symétrique, croûtes. Récidive après chaque arrêt de corticoïdes. Suspicion allergie ou gale.",
    avis: [{ id: 'a3', auteurId: 'r2', ville: 'Dakar', texte: 'Fais un raclage cutané pour écarter la gale sarcoptique avant tout.', date: day(3) }],
  },
  {
    id: '3', auteurId: 'r4', clinique: 'Cabinet Louga Santé Animale', ville: 'Louga', espece: 'Volaille', categorie: 'Urgent', titre: 'Mortalité élevée dans un élevage de poulets : diagnostic ?', date: day(0), resolu: false, votes: ['r1', '2'],
    description: "Élevage de 500 poulets, mortalité de 40 sujets en 48 h. Symptômes respiratoires, diarrhée verdâtre. Newcastle suspecté.",
    avis: [],
  },
];

export let CAS: DemoCas[] = seedCas();

/** Les cas sont anonymisés : aucun nom de propriétaire connu ne doit apparaître dans le titre ou la description. */
const ownerNamed = (texte: string) => OWNERS.find((o) => texte.toLowerCase().includes(ownerName(o).toLowerCase()));

export function listCas(f: { q?: string; espece?: string; statut?: string } = {}): DemoCas[] {
  const q = (f.q ?? '').trim().toLowerCase();
  return CAS
    .filter((c) => !f.espece || c.espece === f.espece)
    .filter((c) => f.statut === 'ouvert' ? !c.resolu : f.statut === 'resolu' ? c.resolu : true)
    .filter((c) => !q || `${c.titre} ${c.espece} ${c.categorie} ${c.description}`.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));
}
export const casEspeces = () => [...new Set(CAS.map((c) => c.espece))].sort((a, b) => a.localeCompare(b, 'fr'));
export const getCas = (id: string): DemoCas | Failure => CAS.find((c) => c.id === id) ?? notFound('Cas');

export interface CasInput { titre: string; espece: string; categorie: string; description: string }
export function createCas(i: CasInput, byId: string, now = new Date()): DemoCas | Failure {
  if (!i.titre.trim()) return { status: 422, code: 'invalid', message: 'Titre requis' };
  if (!i.espece.trim()) return { status: 422, code: 'invalid', message: 'Espèce requise' };
  if (!i.description.trim()) return { status: 422, code: 'invalid', message: 'Description requise' };
  if (!(CAS_CATEGORIES as readonly string[]).includes(i.categorie)) return { status: 422, code: 'invalid', message: 'Catégorie inconnue' };
  const o = ownerNamed(`${i.titre} ${i.description}`);
  if (o) return { status: 422, code: 'not_anonymous', message: `Le cas doit rester anonyme : retirez le nom du propriétaire (${ownerName(o)})` };
  const c: DemoCas = {
    id: String(Math.max(0, ...CAS.map((x) => Number(x.id))) + 1), auteurId: byId, ...siteOf(byId), espece: i.espece.trim(), categorie: i.categorie, titre: i.titre.trim(), description: i.description.trim(),
    date: now.toISOString().slice(0, 10), resolu: false, votes: [], avis: [],
  };
  CAS.push(c);
  return c;
}

/** « Utile » : une voix par personne, un second clic la retire. */
export function toggleUtile(id: string, userId: string): DemoCas | Failure {
  const c = CAS.find((x) => x.id === id);
  if (!c) return notFound('Cas');
  const at = c.votes.indexOf(userId);
  if (at >= 0) c.votes.splice(at, 1); else c.votes.push(userId);
  return c;
}

export function addAvis(id: string, texte: string, byId: string, now = new Date()): DemoCas | Failure {
  const c = CAS.find((x) => x.id === id);
  if (!c) return notFound('Cas');
  if (!texte.trim()) return { status: 422, code: 'invalid', message: 'Écrivez votre avis' };
  c.avis.push({ id: `a${Date.now()}-${c.avis.length}`, auteurId: byId, ville: siteOf(byId).ville, texte: texte.trim(), date: now.toISOString().slice(0, 10) });
  return c;
}

/** Seul l'auteur clôture son cas (l'Administrateur, qui modère le réseau, peut aussi le faire). */
export function resolveCas(id: string, userId: string, canModerate: boolean): DemoCas | Failure {
  const c = CAS.find((x) => x.id === id);
  if (!c) return notFound('Cas');
  if (c.auteurId !== userId && !canModerate) return { status: 403, code: 'permission_denied', message: "Seul l'auteur du cas peut le clôturer" };
  c.resolu = true;
  return c;
}

/* ---------- Veille épidémiologique ---------- */

export const GRAVITES = ['elevee', 'moyenne', 'faible'] as const;
export type Gravite = (typeof GRAVITES)[number];
export type EpiStatut = 'active' | 'surveillance' | 'resolu';
export interface DemoEpi { id: string; maladie: string; espece: string; ville: string; cas: number; gravite: Gravite; statut: EpiStatut; declarantId: string; clinique: string; date: string; notes: string }

const seedEpi = (): DemoEpi[] => [
  { id: '1', maladie: 'Maladie de Newcastle', espece: 'Volaille', ville: 'Louga', cas: 40, gravite: 'elevee', statut: 'active', declarantId: 'r4', clinique: 'Cabinet Louga Santé Animale', date: day(0), notes: 'Élevage avicole, forte mortalité. Confinement recommandé.' },
  { id: '2', maladie: 'Fièvre aphteuse', espece: 'Bovin', ville: 'Thiès', cas: 12, gravite: 'elevee', statut: 'active', declarantId: 'r1', clinique: 'Clinique de Thiès', date: day(3), notes: 'Foyer sur troupeau bovin, zone de pâturage commune.' },
  { id: '3', maladie: 'Rage', espece: 'Chien', ville: 'Dakar', cas: 2, gravite: 'moyenne', statut: 'surveillance', declarantId: 'r2', clinique: 'Cabinet vétérinaire de Fann', date: day(7), notes: '2 cas suspects de rage canine, quartier de Fann.' },
  { id: '4', maladie: 'Peste des petits ruminants', espece: 'Caprin', ville: 'Thiès', cas: 8, gravite: 'moyenne', statut: 'active', declarantId: 'r1', clinique: 'Clinique de Thiès', date: day(5), notes: 'Troupeau caprin, symptômes respiratoires et digestifs.' },
  { id: '5', maladie: 'Fièvre aphteuse (suspicion)', espece: 'Bovin', ville: 'Ziguinchor', cas: 3, gravite: 'elevee', statut: 'surveillance', declarantId: '2', clinique: 'Clinique Vétérinaire de Dakar', date: day(8), notes: "Lésions buccales sur 3 bovins, prélèvements envoyés au laboratoire. Restriction de mouvements conseillée." },
  { id: '6', maladie: 'Maladie de Newcastle', espece: 'Volaille', ville: 'Louga', cas: 15, gravite: 'moyenne', statut: 'active', declarantId: 'r3', clinique: 'Cabinet de Kaolack', date: day(1), notes: 'Deuxième élevage touché dans la même zone.' },
];

export let EPIDEMIES: DemoEpi[] = seedEpi();

const norm = (s: string) => s.toLowerCase().trim();
/** Alerte réseau : la même maladie, active dans la même ville, signalée par au moins deux établissements différents. */
export function alertes(): { maladie: string; ville: string; foyers: number; cas: number }[] {
  const groups = new Map<string, { maladie: string; ville: string; cliniques: Set<string>; foyers: number; cas: number }>();
  for (const e of EPIDEMIES.filter((x) => x.statut === 'active')) {
    const k = `${norm(e.maladie)}|${norm(e.ville)}`;
    const g = groups.get(k) ?? { maladie: e.maladie, ville: e.ville, cliniques: new Set<string>(), foyers: 0, cas: 0 };
    g.cliniques.add(e.clinique); g.foyers++; g.cas += e.cas;
    groups.set(k, g);
  }
  return [...groups.values()].filter((g) => g.cliniques.size >= 2).map(({ maladie, ville, foyers, cas }) => ({ maladie, ville, foyers, cas }));
}

export const activeCount = () => EPIDEMIES.filter((e) => e.statut === 'active').length;
export function epiStats() {
  return { actifs: activeCount(), cas: EPIDEMIES.reduce((s, e) => s + e.cas, 0), localites: new Set(EPIDEMIES.map((e) => norm(e.ville))).size, signalements: EPIDEMIES.length };
}

export function listEpidemies(f: { q?: string; gravite?: string } = {}): DemoEpi[] {
  const q = (f.q ?? '').trim().toLowerCase();
  return EPIDEMIES
    .filter((e) => !f.gravite || e.gravite === f.gravite)
    .filter((e) => !q || `${e.maladie} ${e.ville} ${e.espece}`.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));
}
export const getEpidemie = (id: string): DemoEpi | Failure => EPIDEMIES.find((e) => e.id === id) ?? notFound('Foyer');

export interface EpiInput { maladie: string; espece: string; ville: string; cas: number; gravite: string; notes: string }
export function createEpidemie(i: EpiInput, byId: string, now = new Date()): { foyer: DemoEpi; alerteDeclenchee: boolean } | Failure {
  if (!i.maladie.trim()) return { status: 422, code: 'invalid', message: 'Maladie requise' };
  if (!i.espece.trim()) return { status: 422, code: 'invalid', message: 'Espèce requise' };
  if (!i.ville.trim()) return { status: 422, code: 'invalid', message: 'Localité requise' };
  if (!Number.isInteger(i.cas) || i.cas < 1) return { status: 422, code: 'invalid', message: 'Le nombre de cas doit être au moins 1' };
  if (!(GRAVITES as readonly string[]).includes(i.gravite)) return { status: 422, code: 'invalid', message: 'Gravité inconnue' };
  const avant = alertes().length;
  const foyer: DemoEpi = {
    id: String(Math.max(0, ...EPIDEMIES.map((x) => Number(x.id))) + 1), maladie: i.maladie.trim(), espece: i.espece.trim(), ville: i.ville.trim(), cas: i.cas, gravite: i.gravite as Gravite,
    statut: 'active', declarantId: byId, clinique: siteOf(byId).clinique, date: now.toISOString().slice(0, 10), notes: i.notes.trim(),
  };
  EPIDEMIES.push(foyer);
  const nouvelle = alertes().find((a) => norm(a.maladie) === norm(foyer.maladie) && norm(a.ville) === norm(foyer.ville));
  const alerteDeclenchee = !!nouvelle && alertes().length > avant;
  if (alerteDeclenchee && nouvelle) {
    notify({ userId: null, module: 'reseau', type: 'epidemie', titre: `Alerte réseau : ${nouvelle.maladie} à ${nouvelle.ville}`, message: `${nouvelle.foyers} foyers signalés, ${nouvelle.cas} cas cumulés. Vigilance renforcée recommandée.`, lien: '/veille-epidemio' }, now);
  }
  return { foyer, alerteDeclenchee };
}

/** Un foyer est déclaré résolu par son déclarant (ou par l'Administrateur, qui modère le réseau). */
export function resolveEpidemie(id: string, userId: string, canModerate: boolean): DemoEpi | Failure {
  const e = EPIDEMIES.find((x) => x.id === id);
  if (!e) return notFound('Foyer');
  if (e.declarantId !== userId && !canModerate) return { status: 403, code: 'permission_denied', message: 'Seul le déclarant du foyer peut le marquer comme résolu' };
  e.statut = 'resolu';
  return e;
}

/* ---------- Annuaire du réseau ---------- */

export interface DemoConfrere { id: string; nom: string; clinique: string; ville: string; telephone: string; email: string; specialites: string[]; equipements: string[] }
export interface DemoOrientation { id: string; confrereId: string; patientId: string; patient: string; motif: string; date: string; par: string }

const seedAnnuaire = (): DemoConfrere[] => [
  { id: '1', nom: 'Dr Aïssatou Mbaye', clinique: 'Cabinet vétérinaire de Fann', ville: 'Dakar', telephone: '77 400 11 22', email: 'a.mbaye@vetepro.sn', specialites: ['Médecine féline', 'Chirurgie'], equipements: ['Bloc chirurgical', 'Radiographie', 'Laboratoire'] },
  { id: '2', nom: 'Dr Ousmane Diallo', clinique: 'Clinique vétérinaire de Thiès', ville: 'Thiès', telephone: '70 233 44 55', email: 'o.diallo@vetepro.sn', specialites: ['Élevage bovin', 'Reproduction'], equipements: ['Échographie', 'Insémination'] },
  { id: '3', nom: 'Dr Mame Diarra Fall', clinique: 'Cabinet Louga Santé Animale', ville: 'Louga', telephone: '76 300 40 40', email: 'md.fall@vetepro.sn', specialites: ['Aviculture', 'Ruminants'], equipements: ['Laboratoire', 'Hospitalisation'] },
  { id: '4', nom: 'Dr Cheikh Sarr', clinique: 'Clinique du Sine', ville: 'Fatick', telephone: '33 949 10 10', email: 'c.sarr@vetepro.sn', specialites: ['Médecine canine', 'Urgences'], equipements: ['Bloc chirurgical', 'Hospitalisation', 'Échographie'] },
];

export let ANNUAIRE: DemoConfrere[] = seedAnnuaire();
export let ORIENTATIONS: DemoOrientation[] = [];

export function listAnnuaire(q = ''): DemoConfrere[] {
  const s = q.trim().toLowerCase();
  return ANNUAIRE.filter((a) => !s || `${a.nom} ${a.clinique} ${a.ville} ${a.specialites.join(' ')} ${a.equipements.join(' ')}`.toLowerCase().includes(s));
}

/** Orientation d'un patient vers un confrère : le motif est obligatoire ; la transmission du dossier est tracée. */
export function orienter(confrereId: string, i: { patientId: string; motif: string }, by: string, now = new Date()): DemoOrientation | Failure {
  const a = ANNUAIRE.find((x) => x.id === confrereId);
  if (!a) return notFound('Confrère');
  const p = getPatient(i.patientId);
  if ('code' in p) return { status: 422, code: 'invalid', message: 'Patient requis' };
  if (!i.motif.trim()) return { status: 422, code: 'invalid', message: "Motif de l'orientation requis" };
  const o: DemoOrientation = { id: `o${ORIENTATIONS.length + 1}`, confrereId, patientId: p.id, patient: p.nom, motif: i.motif.trim(), date: now.toISOString(), par: by };
  ORIENTATIONS.push(o);
  return o;
}

export const resetNetwork = () => { CAS = seedCas(); EPIDEMIES = seedEpi(); ANNUAIRE = seedAnnuaire(); ORIENTATIONS = []; };
