import type { Failure } from './profilesDb';
import { createInvoice } from './billingDb';
import { ESPECES } from './referentielsDb';
import { OWNERS, PATIENTS, ownerName } from './patientsDb';
import { sendToOwner } from './notifDb';

/** Vaccins proposés par la spécification. */
export const VACCINS = ['Rage', 'Parvovirose', 'Maladie de Carré', 'Hépatite de Rubarth', 'Leptospirose', 'Toux du chenil', 'Leucose féline', 'Typhus félin', 'Autre'] as const;

export type RappelStatut = 'a_jour' | 'bientot' | 'en_retard' | 'non_defini';
/** « Rappel bientôt » : échéance dans moins de 30 jours (spécification). */
export const REMINDER_WINDOW_DAYS = 30;

export interface DemoVaccination {
  id: string; patientId: string; vaccin: string; date: string; rappel: string | null; lot: string; notes: string;
  tarif: number; numero: string | null; factureId: string | null; createdBy: string;
}
export type CampagneStatut = 'planifiee' | 'encours' | 'terminee';
export interface CampagneAnimal { id: string; animal: string; proprietaire: string; vaccin: string; date: string }
export interface DemoCampagne { id: string; nom: string; especeId: string; vaccin: string; zone: string; date: string; vises: number | null; statut: CampagneStatut; animaux: CampagneAnimal[] }

const today = (now = new Date()) => now.toISOString().slice(0, 10);
const inDays = (n: number, now = new Date()) => new Date(now.getTime() + n * 86_400_000).toISOString().slice(0, 10);

const seedVaccinations = (): DemoVaccination[] => [
  { id: '1', patientId: '1', vaccin: 'Rage', date: inDays(-355), rappel: inDays(10), lot: 'RB-2025-014', notes: '', tarif: 0, numero: null, factureId: null, createdBy: 'Dr Amadou Sy' },
  { id: '2', patientId: '1', vaccin: 'Parvovirose', date: inDays(-400), rappel: inDays(-35), lot: 'PV-2024-203', notes: 'Rappel à planifier', tarif: 0, numero: null, factureId: null, createdBy: 'Dr Amadou Sy' },
  { id: '3', patientId: '2', vaccin: 'Typhus félin', date: inDays(-165), rappel: inDays(200), lot: 'TF-2025-007', notes: '', tarif: 0, numero: null, factureId: null, createdBy: 'Dr Amadou Sy' },
  { id: '4', patientId: '3', vaccin: 'Autre', date: inDays(-30), rappel: null, lot: '', notes: 'Pas de rappel défini', tarif: 0, numero: null, factureId: null, createdBy: 'Dr Amadou Sy' },
];
const seedCampagnes = (): DemoCampagne[] => [
  {
    id: '1', nom: 'Campagne antirabique Ziguinchor', especeId: 'chien', vaccin: 'Rage', zone: 'Ziguinchor', date: inDays(-6), vises: 120, statut: 'encours',
    animaux: [
      { id: 'a1', animal: 'Lola', proprietaire: 'Famille Badji', vaccin: 'Rage', date: inDays(-6) },
      { id: 'a2', animal: 'Rocky', proprietaire: 'Moussa Diallo', vaccin: 'Rage', date: inDays(-5) },
      { id: 'a3', animal: 'Sultan', proprietaire: '', vaccin: 'Rage', date: inDays(-5) },
    ],
  },
  { id: '2', nom: 'Vaccination PPR petits ruminants', especeId: 'ovin', vaccin: 'Autre', zone: 'Kandialang', date: inDays(14), vises: 200, statut: 'planifiee', animaux: [] },
];

export let VACCINATIONS: DemoVaccination[] = seedVaccinations();
export let CAMPAGNES: DemoCampagne[] = seedCampagnes();
const REMINDED = new Set<string>();
export const resetVaccinations = () => { VACCINATIONS = seedVaccinations(); CAMPAGNES = seedCampagnes(); REMINDED.clear(); };

const fail = (status: number, code: string, message: string): Failure => ({ status, code, message });
const notFound = (what: string) => fail(404, 'not_found', `${what} introuvable`);

/** Statut calculé en comparant la date de rappel à la date du jour (spécification). */
export function rappelStatut(rappel: string | null, now = new Date()): RappelStatut {
  if (!rappel) return 'non_defini';
  const jours = Math.round((Date.parse(rappel) - Date.parse(today(now))) / 86_400_000);
  if (jours < 0) return 'en_retard';
  return jours < REMINDER_WINDOW_DAYS ? 'bientot' : 'a_jour';
}

const patientOf = (id: string) => PATIENTS.find((p) => p.id === id);
const ownerOfPatient = (id: string) => OWNERS.find((o) => o.id === patientOf(id)?.ownerId);

/* ---------- Registre ---------- */

export interface VaccinationInput { patientId: string; vaccin: string; date: string; rappel: string | null; lot: string; notes: string; tarif: number }

function checkVaccination(i: VaccinationInput, now: Date): Failure | null {
  if (!i.patientId || !i.date) return fail(422, 'invalid', 'Animal et date requis');
  const p = patientOf(i.patientId);
  if (!p) return notFound('Animal');
  if (p.type !== 'animal') return fail(422, 'invalid', 'Le carnet vaccinal concerne un animal ; un troupeau se vaccine par une campagne');
  if (!(VACCINS as readonly string[]).includes(i.vaccin)) return fail(422, 'invalid', 'Choisissez un vaccin de la liste');
  if (i.date > today(now)) return fail(422, 'invalid', 'La date de la vaccination ne peut pas être dans le futur');
  if (i.rappel && i.rappel < i.date) return fail(422, 'invalid', 'Le rappel ne peut pas précéder la vaccination');
  if (!Number.isInteger(i.tarif) || i.tarif < 0) return fail(422, 'invalid', 'Le tarif est un nombre entier (0 si la vaccination n\'est pas facturée)');
  return null;
}

const nextNumero = () => `VAC-${String(Math.max(0, ...VACCINATIONS.map((v) => Number((v.numero ?? 'VAC-0').slice(4)))) + 1).padStart(4, '0')}`;

/** Facture liée dans la facturation (suivi des paiements) ; le document imprimable porte le numéro VAC-xxxx. */
function bill(v: DemoVaccination, by: string, now: Date): Failure | null {
  const p = patientOf(v.patientId);
  const o = ownerOfPatient(v.patientId);
  const inv = createInvoice({
    date: today(now), source: 'vaccination', ownerId: o?.id ?? null, clientLabel: o ? ownerName(o) : 'Client', patientId: v.patientId, consultationId: null,
    lines: [{ description: `Vaccination, ${v.vaccin}${p ? ` (${p.nom})` : ''}`, quantite: 1, prixUnitaire: v.tarif }], remisePct: 0, notes: `Vaccination ${v.date}`,
  }, by, now);
  if ('status' in inv) return inv;
  v.factureId = inv.id;
  v.numero = nextNumero();
  return null;
}

export function createVaccination(i: VaccinationInput, by: string, now = new Date()): DemoVaccination | Failure {
  const err = checkVaccination(i, now);
  if (err) return err;
  const v: DemoVaccination = {
    id: String(Math.max(0, ...VACCINATIONS.map((x) => Number(x.id))) + 1), patientId: i.patientId, vaccin: i.vaccin, date: i.date, rappel: i.rappel || null,
    lot: i.lot.trim(), notes: i.notes.trim(), tarif: 0, numero: null, factureId: null, createdBy: by,
  };
  if (i.tarif > 0) {
    v.tarif = i.tarif;
    const e = bill(v, by, now);
    if (e) return e;
  }
  VACCINATIONS.push(v);
  return v;
}

/** « Facturer » : enregistre le tarif d'une vaccination non encore facturée (montant strictement positif). */
export function billVaccination(id: string, tarif: number, by: string, now = new Date()): DemoVaccination | Failure {
  const v = VACCINATIONS.find((x) => x.id === id);
  if (!v) return notFound('Vaccination');
  if (v.factureId) return fail(409, 'already_invoiced', 'Cette vaccination est déjà facturée');
  if (!Number.isInteger(tarif) || tarif <= 0) return fail(422, 'invalid', 'Montant invalide');
  v.tarif = tarif;
  const e = bill(v, by, now);
  if (e) { v.tarif = 0; return e; }
  return v;
}

export const getVaccination = (id: string): DemoVaccination | Failure => VACCINATIONS.find((x) => x.id === id) ?? notFound('Vaccination');
export const vaccinationsOfPatient = (patientId: string) => VACCINATIONS.filter((v) => v.patientId === patientId).sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));

export function listVaccinations(p: { q?: string }) {
  const q = (p.q ?? '').trim().toLowerCase();
  return VACCINATIONS
    .filter((v) => {
      if (!q) return true;
      const pt = patientOf(v.patientId);
      const o = ownerOfPatient(v.patientId);
      return `${pt?.nom ?? ''} ${o ? ownerName(o) : ''} ${v.vaccin}`.toLowerCase().includes(q);
    })
    .sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));
}

/** Les compteurs portent sur tout le registre, indépendamment de la recherche. */
export function vaccinationStats(now = new Date()) {
  const n = (s: RappelStatut) => VACCINATIONS.filter((v) => rappelStatut(v.rappel, now) === s).length;
  return { total: VACCINATIONS.length, a_jour: n('a_jour'), bientot: n('bientot'), en_retard: n('en_retard') };
}

/** Widget « Rappels vaccins (30 j) » : jusqu'à 4 vaccinations à traiter, les plus urgentes d'abord. */
export function vaccineReminders(now = new Date(), limit = 4) {
  return VACCINATIONS
    .filter((v) => ['bientot', 'en_retard'].includes(rappelStatut(v.rappel, now)))
    .sort((a, b) => (a.rappel ?? '').localeCompare(b.rappel ?? ''))
    .slice(0, limit);
}

/**
 * Rappel automatique : un SMS est adressé au propriétaire quand la vaccination passe à « bientôt » ou « en retard ».
 * Sans numéro valide, l'échec est gardé au journal et le rappel reste visible dans le tableau de bord.
 */
export function sendDueReminders(now = new Date()) {
  for (const v of VACCINATIONS) {
    if (REMINDED.has(v.id) || !['bientot', 'en_retard'].includes(rappelStatut(v.rappel, now))) continue;
    REMINDED.add(v.id);
    const o = ownerOfPatient(v.patientId);
    const nom = patientOf(v.patientId)?.nom ?? 'votre animal';
    const quand = v.rappel!.split('-').reverse().join('/');
    sendToOwner({ telephone: o?.telephone ?? '', email: o?.email ?? '' }, 'sms', `Rappel de vaccination : ${nom}, ${v.vaccin} à refaire avant le ${quand}`, `vacc:${v.id}`, now);
  }
}

/* ---------- Campagnes ---------- */

export interface CampagneInput { nom: string; especeId: string; vaccin: string; zone: string; date: string; vises: number | null }

export const progression = (c: Pick<DemoCampagne, 'animaux' | 'vises'>) => (c.vises && c.vises > 0 ? Math.min(100, Math.round((c.animaux.length / c.vises) * 100)) : 0);

export function createCampagne(i: CampagneInput, now = new Date()): DemoCampagne | Failure {
  if (!i.nom.trim() || !i.zone.trim()) return fail(422, 'invalid', 'Nom et zone requis');
  if (!ESPECES.some((e) => e.id === i.especeId)) return fail(422, 'invalid_species', "Choisissez l'espèce cible");
  if (i.vaccin && !(VACCINS as readonly string[]).includes(i.vaccin)) return fail(422, 'invalid', 'Choisissez un vaccin de la liste');
  if (i.vises !== null && (!Number.isInteger(i.vises) || i.vises < 0)) return fail(422, 'invalid', "Le nombre d'animaux visés est un nombre entier");
  const c: DemoCampagne = {
    id: String(Math.max(0, ...CAMPAGNES.map((x) => Number(x.id))) + 1), nom: i.nom.trim(), especeId: i.especeId, vaccin: i.vaccin, zone: i.zone.trim(),
    date: i.date || today(now), vises: i.vises || null, statut: 'planifiee', animaux: [],
  };
  CAMPAGNES.push(c);
  return c;
}

export const getCampagne = (id: string): DemoCampagne | Failure => CAMPAGNES.find((x) => x.id === id) ?? notFound('Campagne');
export const listCampagnes = () => [...CAMPAGNES].sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));

/** « Lancer » : Planifiée vers En cours. « Clôturer » : En cours vers Terminée. */
export function changeCampagneStatus(id: string, action: 'lancer' | 'cloturer'): DemoCampagne | Failure {
  const c = getCampagne(id);
  if ('status' in c) return c;
  if (action === 'lancer') {
    if (c.statut !== 'planifiee') return fail(409, 'invalid_state', 'Seule une campagne planifiée peut être lancée');
    c.statut = 'encours';
  } else {
    if (c.statut !== 'encours') return fail(409, 'invalid_state', 'Seule une campagne en cours peut être clôturée');
    c.statut = 'terminee';
  }
  return c;
}

/** Saisie terrain : la date est celle du jour ; la première saisie d'une campagne planifiée la passe « En cours ». */
export function addCampagneAnimal(id: string, i: { animal: string; proprietaire: string; vaccin: string }, now = new Date()): DemoCampagne | Failure {
  const c = getCampagne(id);
  if ('status' in c) return c;
  if (!i.animal.trim()) return fail(422, 'invalid', "Nom de l'animal requis");
  c.animaux.push({ id: `a${Date.now()}-${c.animaux.length}`, animal: i.animal.trim(), proprietaire: i.proprietaire.trim(), vaccin: i.vaccin || c.vaccin, date: today(now) });
  if (c.statut === 'planifiee') c.statut = 'encours';
  return c;
}

export function removeCampagneAnimal(id: string, animalId: string): DemoCampagne | Failure {
  const c = getCampagne(id);
  if ('status' in c) return c;
  const n = c.animaux.length;
  c.animaux = c.animaux.filter((a) => a.id !== animalId);
  return c.animaux.length === n ? notFound('Ligne') : c;
}
