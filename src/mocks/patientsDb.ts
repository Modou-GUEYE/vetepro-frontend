import { ESPECES } from './referentielsDb';
import type { Failure } from './profilesDb';

export type PatientType = 'animal' | 'troupeau';
export type Sexe = 'M' | 'F';
export type StatutRepro = 'entier' | 'sterilise' | 'inconnu';

export interface DemoOwner { id: string; prenom: string; nom: string; telephone: string; email: string; adresse: string; actif: boolean; creeLe: string; deleted?: boolean }
export interface HistoryEntry { at: string; by: string; action: 'creation' | 'modification'; changes: { champ: string; avant: string; apres: string }[] }
export interface DemoPatient {
  id: string; matricule: string; type: PatientType; ownerId: string; nom: string; especeId: string; raceId: string | null;
  sexe: Sexe | null; naissance: string | null; antecedents: string; statutRepro: StatutRepro | null;
  effectif: number | null; femelles: number | null; males: number | null; jeunes: number | null; localisation: string; recensement: string | null; note: string;
  history: HistoryEntry[];
  /** Fiche créée depuis un rendez-vous ou une admission : à compléter après la consultation. */
  provisoire?: boolean;
}

const o = (id: string, prenom: string, nom: string, telephone: string, email: string, adresse: string, actif = true, creeLe = '2025-02-01'): DemoOwner => ({ id, prenom, nom, telephone, email, adresse, actif, creeLe });

const seedOwners = (): DemoOwner[] => [
  o('1', 'Moussa', 'Diallo', '77 123 45 67', 'moussa@email.com', 'Médina, Dakar'),
  o('2', 'Fatou', 'Sané', '70 987 65 43', 'fatou@email.com', 'Ziguinchor'),
  o('3', 'Omar', 'Badji', '76 555 44 33', 'omar@email.com', 'Kandialang'),
  o('4', 'Aïssatou', 'Ndiaye', '78 222 11 00', 'aissatou@email.com', 'Thiès', false),
];

const created = (by: string, at: string): HistoryEntry[] => [{ at, by, action: 'creation', changes: [] }];
const animal = (n: number, nom: string, ownerId: string, especeId: string, raceId: string, sexe: Sexe, naissance: string, antecedents: string, statutRepro: StatutRepro): DemoPatient => ({
  id: String(n), matricule: `PAT-${String(n).padStart(4, '0')}`, type: 'animal', ownerId, nom, especeId, raceId, sexe, naissance, antecedents, statutRepro,
  effectif: null, femelles: null, males: null, jeunes: null, localisation: '', recensement: null, note: '', history: created('Dr Amadou Sy', '2025-02-01T09:00:00.000Z'),
});
const troupeau = (n: number, nom: string, ownerId: string, especeId: string, raceId: string, effectif: number, femelles: number, males: number, jeunes: number, localisation: string, recensement: string, note: string): DemoPatient => ({
  id: String(n), matricule: `PAT-${String(n).padStart(4, '0')}`, type: 'troupeau', ownerId, nom, especeId, raceId, sexe: null, naissance: null, antecedents: '', statutRepro: null,
  effectif, femelles, males, jeunes, localisation, recensement, note, history: created('Dr Amadou Sy', '2025-02-01T09:00:00.000Z'),
});

const seedPatients = (): DemoPatient[] => [
  animal(1, 'Rex', '1', 'chien', 'chien-berger-allemand', 'M', '2020-05-10', 'Allergie aux puces', 'entier'),
  animal(2, 'Mimi', '2', 'chat', 'chat-persan', 'F', '2019-03-22', 'Aucun', 'sterilise'),
  animal(3, 'Kiki', '3', 'oiseau', 'oiseau-perroquet-gris-du-gabon', 'M', '2021-08-01', '', 'inconnu'),
  animal(4, 'Bouba', '1', 'chien', 'chien-labrador-retriever', 'M', '2022-01-15', 'Dysplasie légère', 'sterilise'),
  troupeau(5, 'Troupeau Diallo Bovins', '1', 'bovin', 'bovin-zebu-gobra', 45, 28, 12, 5, 'Ferme Boucotte, Ziguinchor', '2025-02-15', 'Bon état général'),
  troupeau(6, 'Troupeau Sané Ovins', '2', 'ovin', 'ovin-mouton-peul-peul', 30, 18, 8, 4, 'Pâturage Lyndiane', '2025-01-20', 'Quelques cas de tiques'),
  troupeau(7, 'Troupeau Badji Caprins', '3', 'caprin', 'caprin-chevre-djallonke', 20, 14, 4, 2, 'Kandialang', '2025-03-01', ''),
];

export let OWNERS: DemoOwner[] = seedOwners();
export let PATIENTS: DemoPatient[] = seedPatients();
export const resetPatients = () => { OWNERS = seedOwners(); PATIENTS = seedPatients(); };

const notFound = (what: string): Failure => ({ status: 404, code: 'not_found', message: `${what} introuvable` });
const liveOwners = () => OWNERS.filter((x) => !x.deleted);
export const ownerName = (x: Pick<DemoOwner, 'prenom' | 'nom'>) => `${x.prenom} ${x.nom}`;
export const patientCount = (ownerId: string) => PATIENTS.filter((p) => p.ownerId === ownerId).length;
const especeOf = (id: string) => ESPECES.find((e) => e.id === id);
const raceName = (especeId: string, raceId: string | null) => especeOf(especeId)?.races.find((r) => r.id === raceId)?.nom ?? '';

/* ---------- Propriétaires ---------- */

export interface OwnerInput { prenom: string; nom: string; telephone: string; email: string; adresse: string }

function checkOwner(i: OwnerInput): Failure | null {
  if (!i.prenom.trim() || !i.nom.trim()) return { status: 422, code: 'invalid', message: 'Le prénom et le nom sont obligatoires' };
  if (i.email.trim() && !/^\S+@\S+\.\S+$/.test(i.email.trim())) return { status: 422, code: 'invalid', message: 'Adresse e-mail invalide' };
  return null;
}

export function listOwners(p: { q?: string; statut?: string; page: number; pageSize: number }) {
  const q = (p.q ?? '').trim().toLowerCase();
  const rows = liveOwners()
    .filter((x) => !q || `${ownerName(x)} ${x.telephone} ${x.email}`.toLowerCase().includes(q))
    .filter((x) => !p.statut || (p.statut === 'actif' ? x.actif : !x.actif));
  const start = (p.page - 1) * p.pageSize;
  return { items: rows.slice(start, start + p.pageSize), total: rows.length };
}

export const getOwner = (id: string): DemoOwner | Failure => liveOwners().find((x) => x.id === id) ?? notFound('Propriétaire');
export const ownerChoices = () => liveOwners().filter((x) => x.actif).sort((a, b) => ownerName(a).localeCompare(ownerName(b), 'fr'));

export function createOwner(i: OwnerInput): DemoOwner | Failure {
  const err = checkOwner(i);
  if (err) return err;
  const x: DemoOwner = { id: String(Math.max(0, ...OWNERS.map((y) => Number(y.id))) + 1), prenom: i.prenom.trim(), nom: i.nom.trim(), telephone: i.telephone.trim(), email: i.email.trim(), adresse: i.adresse.trim(), actif: true, creeLe: new Date().toISOString().slice(0, 10) };
  OWNERS.push(x);
  return x;
}

export function updateOwner(id: string, i: OwnerInput): DemoOwner | Failure {
  const x = liveOwners().find((y) => y.id === id);
  if (!x) return notFound('Propriétaire');
  const err = checkOwner(i);
  if (err) return err;
  Object.assign(x, { prenom: i.prenom.trim(), nom: i.nom.trim(), telephone: i.telephone.trim(), email: i.email.trim(), adresse: i.adresse.trim() });
  return x;
}

export function setOwnerActive(id: string, actif: boolean): DemoOwner | Failure {
  const x = liveOwners().find((y) => y.id === id);
  if (!x) return notFound('Propriétaire');
  x.actif = actif;
  return x;
}

/** Suppression impossible tant qu'un animal ou un troupeau est rattaché (spécification). */
export function deleteOwner(id: string): null | Failure {
  const x = liveOwners().find((y) => y.id === id);
  if (!x) return notFound('Propriétaire');
  const n = patientCount(id);
  if (n > 0) return { status: 409, code: 'owner_has_patients', message: `Suppression impossible : ${n} animal(aux) ou troupeau(x) sont rattachés à ${ownerName(x)}.` };
  x.deleted = true;
  x.actif = false;
  return null;
}

/* ---------- Patients (animaux et troupeaux) ---------- */

export interface PatientInput {
  type: PatientType; ownerId: string; nom: string; especeId: string; raceId: string | null;
  sexe: Sexe | null; naissance: string | null; antecedents: string; statutRepro: StatutRepro | null;
  effectif: number | null; femelles: number | null; males: number | null; jeunes: number | null; localisation: string; recensement: string | null; note: string;
}

export function listPatients(p: { q?: string; type?: string; ownerId?: string; page: number; pageSize: number }) {
  const q = (p.q ?? '').trim().toLowerCase();
  const rows = PATIENTS
    .filter((x) => !p.type || x.type === p.type)
    .filter((x) => !p.ownerId || x.ownerId === p.ownerId)
    .filter((x) => {
      if (!q) return true;
      const owner = OWNERS.find((y) => y.id === x.ownerId);
      return `${x.matricule} ${x.nom} ${especeOf(x.especeId)?.nom ?? ''} ${raceName(x.especeId, x.raceId)} ${owner ? ownerName(owner) : ''}`.toLowerCase().includes(q);
    })
    .sort((a, b) => Number(b.id) - Number(a.id));
  const start = (p.page - 1) * p.pageSize;
  return { items: rows.slice(start, start + p.pageSize), total: rows.length };
}

export const getPatient = (id: string): DemoPatient | Failure => PATIENTS.find((x) => x.id === id) ?? notFound('Dossier');

const sexLabel = (s: Sexe | null) => (s === 'M' ? 'Mâle' : s === 'F' ? 'Femelle' : '');
const reproLabel = (s: StatutRepro | null) => (s === 'entier' ? 'Entier(e)' : s === 'sterilise' ? 'Stérilisé(e)' : s === 'inconnu' ? 'Inconnu' : '');
const n = (v: number | null) => (v === null ? '' : String(v));

/** Champs suivis dans l'historique des modifications (auteur, date, avant, après). */
function snapshot(x: Pick<DemoPatient, keyof PatientInput>): Record<string, string> {
  const owner = OWNERS.find((y) => y.id === x.ownerId);
  const base: Record<string, string> = {
    Propriétaire: owner ? ownerName(owner) : '', Nom: x.nom, Espèce: especeOf(x.especeId)?.nom ?? '', Race: raceName(x.especeId, x.raceId),
  };
  if (x.type === 'animal') {
    return { ...base, Sexe: sexLabel(x.sexe), 'Date de naissance': x.naissance ?? '', 'Antécédents / allergies': x.antecedents, 'Statut reproducteur': reproLabel(x.statutRepro) };
  }
  return {
    ...base, 'Effectif total': n(x.effectif), Femelles: n(x.femelles), Mâles: n(x.males), Jeunes: n(x.jeunes),
    Localisation: x.localisation, 'Date de recensement': x.recensement ?? '', Note: x.note,
  };
}

function check(i: PatientInput, current?: DemoPatient): Failure | null {
  const owner = liveOwners().find((y) => y.id === i.ownerId);
  if (!owner) return { status: 422, code: 'invalid_owner', message: 'Choisissez un propriétaire' };
  if (!owner.actif && current?.ownerId !== i.ownerId) return { status: 422, code: 'owner_inactive', message: 'Ce propriétaire est désactivé' };
  if (!i.nom.trim()) return { status: 422, code: 'invalid', message: i.type === 'animal' ? "Le nom de l'animal est obligatoire" : 'Le nom du troupeau est obligatoire' };
  const e = especeOf(i.especeId);
  if (!e) return { status: 422, code: 'invalid_species', message: "Choisissez l'espèce" };
  if (!e.actif && current?.especeId !== i.especeId) return { status: 422, code: 'species_inactive', message: "Cette espèce n'est pas prise en charge par le cabinet" };
  if (i.raceId && !e.races.some((r) => r.id === i.raceId)) return { status: 422, code: 'invalid_race', message: 'Cette race ne correspond pas à l\'espèce' };
  if (i.type === 'animal') {
    if (i.naissance && i.naissance > new Date().toISOString().slice(0, 10)) return { status: 422, code: 'invalid', message: 'La date de naissance ne peut pas être dans le futur' };
    return null;
  }
  if (!i.effectif || !Number.isInteger(i.effectif) || i.effectif < 1) return { status: 422, code: 'invalid', message: "L'effectif total est obligatoire (nombre entier)" };
  const parts = (i.femelles ?? 0) + (i.males ?? 0) + (i.jeunes ?? 0);
  if (parts > i.effectif) return { status: 422, code: 'invalid', message: `Femelles, mâles et jeunes (${parts}) dépassent l'effectif total (${i.effectif})` };
  return null;
}

const clean = (i: PatientInput): PatientInput => i.type === 'animal'
  ? { ...i, nom: i.nom.trim(), antecedents: i.antecedents.trim(), effectif: null, femelles: null, males: null, jeunes: null, localisation: '', recensement: null, note: '' }
  : { ...i, nom: i.nom.trim(), localisation: i.localisation.trim(), note: i.note.trim(), sexe: null, naissance: null, antecedents: '', statutRepro: null };

/** Création : le matricule est généré automatiquement (spécification). */
export function createPatient(input: PatientInput, by: string, now = new Date()): DemoPatient | Failure {
  const err = check(input);
  if (err) return err;
  const i = clean(input);
  const id = Math.max(0, ...PATIENTS.map((x) => Number(x.id))) + 1;
  const p: DemoPatient = { ...i, id: String(id), matricule: `PAT-${String(id).padStart(4, '0')}`, history: created(by, now.toISOString()) };
  PATIENTS.push(p);
  return p;
}

/** Modification tracée : auteur, date et champs changés (spécification). */
export function updatePatient(id: string, input: PatientInput, by: string, now = new Date()): DemoPatient | Failure {
  const p = PATIENTS.find((x) => x.id === id);
  if (!p) return notFound('Dossier');
  if (input.type !== p.type) return { status: 422, code: 'invalid', message: 'Le type du dossier (animal ou troupeau) ne peut pas changer' };
  const err = check(input, p);
  if (err) return err;
  const i = clean(input);
  const before = snapshot(p), after = snapshot({ ...p, ...i });
  const changes = Object.keys(after).filter((k) => before[k] !== after[k]).map((k) => ({ champ: k, avant: before[k] || '—', apres: after[k] || '—' }));
  Object.assign(p, i);
  p.provisoire = false;
  if (changes.length) p.history = [{ at: now.toISOString(), by, action: 'modification', changes }, ...p.history];
  return p;
}

export const patientEspece = (p: DemoPatient) => ({ id: p.especeId, nom: especeOf(p.especeId)?.nom ?? '' });
export const patientRace = (p: DemoPatient) => (p.raceId ? { id: p.raceId, nom: raceName(p.especeId, p.raceId) } : null);

/* ---------- Fiche provisoire (rendez-vous ou admission d'un animal inconnu) ---------- */

export interface NewPatientInput {
  nom: string; especeId: string; raceId: string | null; naissance: string | null; sexe: Sexe | null;
  /** Propriétaire existant, ou nouveau propriétaire (nom, prénom et téléphone obligatoires). */
  ownerId: string | null; owner: { prenom: string; nom: string; telephone: string; email: string } | null;
}

export function checkNewPatient(i: NewPatientInput): Failure | null {
  if (!i.nom.trim()) return { status: 422, code: 'invalid', message: "Le nom de l'animal est obligatoire" };
  if (!i.especeId) return { status: 422, code: 'invalid_species', message: "Choisissez l'espèce" };
  if (i.ownerId) return liveOwners().some((o) => o.id === i.ownerId) ? null : notFound('Propriétaire');
  if (!i.owner) return { status: 422, code: 'invalid', message: 'Choisissez ou saisissez le propriétaire' };
  if (!i.owner.prenom.trim() || !i.owner.nom.trim()) return { status: 422, code: 'invalid', message: 'Le prénom et le nom du propriétaire sont obligatoires' };
  if (!i.owner.telephone.trim()) return { status: 422, code: 'invalid', message: 'Le numéro de téléphone du propriétaire est obligatoire' };
  return null;
}

/**
 * Crée le propriétaire (s'il est nouveau) et un dossier marqué « à compléter ». Rien n'est gardé si une étape échoue.
 * Le dossier complet se termine après la consultation (spécification : « les ajouter après la consultation »).
 */
export function createProvisionalPatient(i: NewPatientInput, by: string, now = new Date()): DemoPatient | Failure {
  const err = checkNewPatient(i);
  if (err) return err;
  let owner: DemoOwner | undefined = i.ownerId ? OWNERS.find((o) => o.id === i.ownerId) : undefined;
  const createdOwner = !owner;
  if (!owner) {
    const o2 = createOwner({ ...i.owner!, adresse: '' });
    if ('status' in o2) return o2;
    owner = o2;
  }
  const p = createPatient({
    type: 'animal', ownerId: owner.id, nom: i.nom, especeId: i.especeId, raceId: i.raceId, sexe: i.sexe, naissance: i.naissance, antecedents: '', statutRepro: null,
    effectif: null, femelles: null, males: null, jeunes: null, localisation: '', recensement: null, note: '',
  }, by, now);
  if ('status' in p) {
    if (createdOwner) OWNERS.splice(OWNERS.indexOf(owner), 1);
    return p;
  }
  p.provisoire = true;
  return p;
}
