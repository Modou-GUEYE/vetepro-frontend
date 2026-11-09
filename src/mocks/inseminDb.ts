import type { Failure } from './profilesDb';
import { addCredit, createInvoice, getInvoice, paid, remaining, reprice, statusOf, total } from './billingDb';
import { ESPECES } from './referentielsDb';
import { NewPatientInput, OWNERS, PATIENTS, checkNewPatient, createProvisionalPatient, ownerName } from './patientsDb';
import { notify, sendToOwner } from './notifDb';
import { veterinarians, vetName } from './rdvDb';

export const METHODES = ['ia', 'ia_congelee', 'ia_fraiche', 'naturelle', 'transplant'] as const;
export type Methode = (typeof METHODES)[number];
export const METHODE_LABEL: Record<Methode, string> = {
  ia: 'IA', ia_congelee: 'IA semence congelée', ia_fraiche: 'IA semence fraîche', naturelle: 'Saillie naturelle', transplant: 'Transplantation embryonnaire',
};
const IA_METHODES: Methode[] = ['ia', 'ia_congelee', 'ia_fraiche'];
export const DIAG_METHODES = ['echographie', 'palpation', 'test_lait', 'observation'] as const;
export type DiagMethode = (typeof DIAG_METHODES)[number];
export const RESULTATS = ['attente', 'positif', 'negatif'] as const;
export type Resultat = (typeof RESULTATS)[number];

/** Seuils paramétrables de la spécification. */
export const SETTINGS = { doublonJours: 15, imminentJours: 14, diagnosticDelaiJours: 30, rappelMiseBasJours: 7 };

export interface Semence { raceGeniteur: string; nomGeniteur: string; lot: string; dose: string; origine: string; dateCollecte: string | null }
export interface Diagnostic { date: string; methode: DiagMethode | null; resultat: Resultat }
export interface MiseBas { date: string; vivants: number; morts: number; observations: string }
export interface InsemHistory { at: string; by: string; action: 'creation' | 'modification' | 'diagnostic' | 'mise-bas' | 'suppression'; detail: string }
export interface DemoInsemination {
  id: string; numero: string; patientId: string; date: string; methode: Methode; vetId: string | null; statut: 'planifie' | 'realise'; observations: string;
  semence: Semence; tarif: number; modePaiement: string; factureId: string | null;
  diagnostic: Diagnostic | null; miseBasPrevue: string | null; miseBas: MiseBas | null;
  history: InsemHistory[]; deleted?: { motif: string; by: string; at: string };
}

const today = (now = new Date()) => now.toISOString().slice(0, 10);
const inDays = (n: number, now = new Date()) => new Date(now.getTime() + n * 86_400_000).toISOString().slice(0, 10);
const addDays = (date: string, n: number) => new Date(Date.parse(date) + n * 86_400_000).toISOString().slice(0, 10);
const diffDays = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
const fail = (status: number, code: string, message: string): Failure => ({ status, code, message });
const notFound = fail(404, 'not_found', 'Acte introuvable');

const sem = (o: Partial<Semence> = {}): Semence => ({ raceGeniteur: '', nomGeniteur: '', lot: '', dose: '', origine: '', dateCollecte: null, ...o });
const created = (by: string, at: string): InsemHistory[] => [{ at, by, action: 'creation', detail: 'Acte créé' }];

const seed = (): DemoInsemination[] => [
  {
    id: '1', numero: 'INS-0001', patientId: '5', date: inDays(-75), methode: 'ia_congelee', vetId: '2', statut: 'realise', observations: 'Synchronisation des chaleurs',
    semence: sem({ raceGeniteur: 'Zébu Gobra', nomGeniteur: 'Toro-221', lot: 'LOT-2026-001', dose: '1 paillette', origine: 'ANEV', dateCollecte: inDays(-400) }),
    tarif: 25000, modePaiement: '', factureId: null, diagnostic: { date: inDays(-35), methode: 'echographie', resultat: 'positif' }, miseBasPrevue: inDays(208), miseBas: null,
    history: created('Dr Fatou Diallo', inDays(-75) + 'T09:00:00.000Z'),
  },
  {
    id: '2', numero: 'INS-0002', patientId: '6', date: inDays(-140), methode: 'naturelle', vetId: '2', statut: 'realise', observations: '',
    semence: sem({ nomGeniteur: 'Bélier Peul n°4' }), tarif: 0, modePaiement: '', factureId: null,
    diagnostic: { date: inDays(-100), methode: 'palpation', resultat: 'positif' }, miseBasPrevue: inDays(10), miseBas: null, history: created('Dr Fatou Diallo', inDays(-140) + 'T09:00:00.000Z'),
  },
  {
    id: '3', numero: 'INS-0003', patientId: '7', date: inDays(-60), methode: 'ia_fraiche', vetId: '2', statut: 'realise', observations: '',
    semence: sem({ nomGeniteur: 'Bouc Djallonké 2', lot: 'LOT-2026-014' }), tarif: 0, modePaiement: '', factureId: null,
    diagnostic: { date: inDays(-30), methode: 'echographie', resultat: 'negatif' }, miseBasPrevue: null, miseBas: null, history: created('Dr Fatou Diallo', inDays(-60) + 'T09:00:00.000Z'),
  },
  {
    id: '4', numero: 'INS-0004', patientId: '5', date: inDays(6), methode: 'ia', vetId: '2', statut: 'planifie', observations: 'Seconde vache du troupeau',
    semence: sem(), tarif: 0, modePaiement: '', factureId: null, diagnostic: null, miseBasPrevue: null, miseBas: null, history: created('Dr Fatou Diallo', inDays(-2) + 'T09:00:00.000Z'),
  },
];

export let INSEMS: DemoInsemination[] = seed();
const FLAGGED = new Set<string>();
export const resetInseminations = () => { INSEMS = seed(); FLAGGED.clear(); SENT.clear(); };

const live = () => INSEMS.filter((i) => !i.deleted);
export const getInsemination = (id: string): DemoInsemination | Failure => live().find((i) => i.id === id) ?? notFound;
const patientOf = (id: string) => PATIENTS.find((p) => p.id === id);
const ownerOf = (patientId: string) => OWNERS.find((o) => o.id === patientOf(patientId)?.ownerId);
export const gestationJours = (patientId: string) => ESPECES.find((e) => e.id === patientOf(patientId)?.especeId)?.gestationJours ?? null;
const validVet = (id: string | null) => !id || veterinarians().some((v) => v.id === id);
const nextNumero = () => `INS-${String(Math.max(0, ...INSEMS.map((i) => Number(i.numero.slice(4)))) + 1).padStart(4, '0')}`;

/* ---------- Création et modification ---------- */

export interface InsemInput {
  patientId: string | null; nouveauPatient: NewPatientInput | null; date: string; methode: string; vetId: string | null; statut: string; observations: string;
  semence: Semence; tarif: number; modePaiement: string;
  /** Doublon signalé et confirmé par l'utilisateur. */
  confirmerDoublon: boolean;
  /** Repasser en « Planifié » un acte dont le diagnostic est en attente : confirmé par l'utilisateur. */
  confirmerReinitialisation: boolean;
}

function check(i: InsemInput, now: Date): Failure | null {
  if (!i.date) return fail(422, 'invalid', "La date de l'acte est obligatoire");
  if (!(METHODES as readonly string[]).includes(i.methode)) return fail(422, 'invalid', 'La méthode est obligatoire');
  if (i.statut !== 'planifie' && i.statut !== 'realise') return fail(422, 'invalid', 'Le statut est obligatoire');
  if (i.statut === 'realise' && i.date > today(now)) return fail(422, 'invalid', "La date de l'acte ne peut être dans le futur que pour un acte planifié");
  if (i.statut === 'realise' && IA_METHODES.includes(i.methode as Methode) && !i.semence.lot.trim() && !i.semence.nomGeniteur.trim()) {
    return fail(422, 'traceability', 'Une IA réalisée exige au moins le n° de lot ou le nom du géniteur (traçabilité de la semence)');
  }
  if (!Number.isInteger(i.tarif) || i.tarif < 0) return fail(422, 'invalid', "Le tarif de l'acte est un nombre entier");
  if (!validVet(i.vetId)) return fail(422, 'vet_unavailable', 'Ce vétérinaire est indisponible');
  return null;
}

const cleanSemence = (s: Semence): Semence => ({
  raceGeniteur: s.raceGeniteur.trim(), nomGeniteur: s.nomGeniteur.trim(), lot: s.lot.trim(), dose: s.dose.trim(), origine: s.origine.trim(), dateCollecte: s.dateCollecte || null,
});

/** Deux actes sur la même femelle à moins de 15 jours déclenchent un avertissement de doublon, à confirmer. */
function duplicate(patientId: string, date: string, ignoreId?: string): DemoInsemination | undefined {
  return live().find((x) => x.id !== ignoreId && x.patientId === patientId && Math.abs(diffDays(x.date, date)) < SETTINGS.doublonJours);
}

const invoiceLine = (i: Pick<DemoInsemination, 'methode' | 'semence' | 'tarif'>) => [{
  description: `Insémination, ${METHODE_LABEL[i.methode]}${i.semence.raceGeniteur ? `, ${i.semence.raceGeniteur}` : ''}`, quantite: 1, prixUnitaire: i.tarif,
}];

/** Facture liée « Impayée » quand un tarif est renseigné ; le mode de paiement saisi reste indicatif (seul un paiement enregistré met la facture à jour). */
function invoiceFor(a: DemoInsemination, by: string, now: Date): Failure | null {
  const o = ownerOf(a.patientId);
  const inv = createInvoice({
    date: today(now), source: 'insemination', ownerId: o?.id ?? null, clientLabel: o ? ownerName(o) : 'Client', patientId: a.patientId, consultationId: null,
    lines: invoiceLine(a), remisePct: 0, notes: `Acte d'insémination ${a.numero}`,
  }, by, now);
  if ('status' in inv) return inv;
  a.factureId = inv.id;
  return null;
}

export function createInsemination(i: InsemInput, by: string, now = new Date()): DemoInsemination | Failure {
  const err = check(i, now);
  if (err) return err;
  let patientId = i.patientId;
  if (patientId) {
    if (!patientOf(patientId)) return fail(422, 'invalid', 'Choisissez un patient');
    const d = duplicate(patientId, i.date);
    if (d && !i.confirmerDoublon) return fail(422, 'duplicate', `Un acte existe déjà pour cette femelle à moins de ${SETTINGS.doublonJours} jours (${d.numero}, ${d.date.split('-').reverse().join('/')})`);
  } else if (i.nouveauPatient) {
    const e = checkNewPatient(i.nouveauPatient);
    if (e) return e;
  } else return fail(422, 'invalid', 'Choisissez un patient existant ou saisissez un nouvel animal');

  if (!patientId) {
    const p = createProvisionalPatient(i.nouveauPatient!, by, now);
    if ('status' in p) return p;
    patientId = p.id;
  }
  const a: DemoInsemination = {
    id: String(Math.max(0, ...INSEMS.map((x) => Number(x.id))) + 1), numero: nextNumero(), patientId, date: i.date, methode: i.methode as Methode, vetId: i.vetId,
    statut: i.statut as 'planifie' | 'realise', observations: i.observations.trim(), semence: cleanSemence(i.semence), tarif: i.tarif, modePaiement: i.modePaiement,
    factureId: null, diagnostic: null, miseBasPrevue: null, miseBas: null, history: created(by, now.toISOString()),
  };
  if (a.tarif > 0) {
    const e = invoiceFor(a, by, now);
    if (e) return e;
  }
  INSEMS.push(a);
  return a;
}

export function updateInsemination(id: string, i: InsemInput, by: string, now = new Date()): DemoInsemination | Failure {
  const a = getInsemination(id);
  if ('status' in a) return a;
  if (a.miseBas) return fail(409, 'not_editable', 'La mise-bas est enregistrée : cet acte ne peut plus être modifié');
  const err = check(i, now);
  if (err) return err;
  const patientId = i.patientId ?? a.patientId;
  if (!patientOf(patientId)) return fail(422, 'invalid', 'Choisissez un patient');
  if (i.statut === 'planifie' && a.diagnostic && a.diagnostic.resultat !== 'attente') return fail(422, 'invalid', "Un résultat de diagnostic impose le statut « Réalisé »");
  if (i.statut === 'planifie' && a.diagnostic && !i.confirmerReinitialisation) return fail(422, 'reset_confirm', 'Repasser l\'acte en « Planifié » remet le résultat à « En attente ». Confirmez pour continuer');
  if (a.diagnostic && i.date > a.diagnostic.date && i.statut === 'realise') return fail(422, 'invalid', "La date de l'acte ne peut pas suivre celle du diagnostic");
  const d = duplicate(patientId, i.date, id);
  if (d && !i.confirmerDoublon) return fail(422, 'duplicate', `Un acte existe déjà pour cette femelle à moins de ${SETTINGS.doublonJours} jours (${d.numero}, ${d.date.split('-').reverse().join('/')})`);

  const next = { ...a, patientId, date: i.date, methode: i.methode as Methode, vetId: i.vetId, statut: i.statut as 'planifie' | 'realise', observations: i.observations.trim(), semence: cleanSemence(i.semence), modePaiement: i.modePaiement };
  const changes: string[] = [];
  const labels: [string, unknown, unknown][] = [
    ['patient', a.patientId, next.patientId], ['date', a.date, next.date], ['méthode', a.methode, next.methode], ['technicien', a.vetId, next.vetId], ['statut', a.statut, next.statut],
    ['semence', JSON.stringify(a.semence), JSON.stringify(next.semence)], ['observations', a.observations, next.observations],
  ];
  for (const [k, x, y] of labels) if (x !== y) changes.push(k);

  if (i.tarif !== a.tarif) {
    if (a.factureId) {
      const inv = getInvoice(a.factureId);
      if ('status' in inv) return inv;
      if (inv.payments.length > 0) return fail(409, 'already_paid', "Le tarif d'un acte dont la facture a déjà reçu un paiement ne peut plus être modifié");
      if (i.tarif > 0) { const r = reprice(a.factureId, invoiceLine({ ...next, tarif: i.tarif })); if ('status' in r) return r; }
      else { const r = addCredit(a.factureId, total(inv), 'Tarif de l\'acte ramené à 0', by, now); if ('status' in r) return r; a.factureId = null; }
    }
    changes.push('tarif');
  }

  Object.assign(a, next, { tarif: i.tarif });
  if (!a.factureId && i.tarif > 0) {
    const e = invoiceFor(a, by, now);
    if (e) return e;
  }
  if (i.statut === 'planifie') { a.diagnostic = null; a.miseBasPrevue = null; }
  a.history.unshift({ at: now.toISOString(), by, action: 'modification', detail: changes.length ? `Modifié : ${changes.join(', ')}` : 'Aucun changement' });
  return a;
}

/* ---------- Diagnostic et mise-bas ---------- */

export interface DiagnosticInput { date: string; methode: string; resultat: string; miseBasPrevue: string | null }

export function diagnose(id: string, i: DiagnosticInput, by: string, now = new Date()): DemoInsemination | Failure {
  const a = getInsemination(id);
  if ('status' in a) return a;
  if (a.statut !== 'realise') return fail(409, 'not_realised', "Le diagnostic n'est possible que sur un acte réalisé");
  if (a.miseBas) return fail(409, 'not_editable', 'La mise-bas est déjà enregistrée');
  if (!i.date) return fail(422, 'invalid', 'La date du diagnostic est obligatoire');
  if (i.date < a.date) return fail(422, 'invalid', "La date du diagnostic ne peut précéder la date de l'acte");
  if (i.date > today(now)) return fail(422, 'invalid', 'La date du diagnostic ne peut pas être dans le futur');
  if (!(RESULTATS as readonly string[]).includes(i.resultat)) return fail(422, 'invalid', 'Le résultat est obligatoire');
  if (i.methode && !(DIAG_METHODES as readonly string[]).includes(i.methode)) return fail(422, 'invalid', 'Méthode de diagnostic inconnue');
  if (i.miseBasPrevue && i.miseBasPrevue < a.date) return fail(422, 'invalid', "La mise-bas prévue ne peut précéder l'acte");

  a.diagnostic = { date: i.date, methode: (i.methode || null) as DiagMethode | null, resultat: i.resultat as Resultat };
  if (i.resultat === 'positif') {
    const jours = gestationJours(a.patientId);
    a.miseBasPrevue = i.miseBasPrevue || (jours ? addDays(a.date, jours) : null);
  } else a.miseBasPrevue = null;
  a.history.unshift({ at: now.toISOString(), by, action: 'diagnostic', detail: i.resultat === 'positif' ? 'Diagnostic positif, gestante' : i.resultat === 'negatif' ? 'Diagnostic négatif, acte clos en échec' : 'Diagnostic en attente' });
  return a;
}

export interface MiseBasInput { date: string; vivants: number; morts: number; observations: string }

export function recordMiseBas(id: string, i: MiseBasInput, by: string, now = new Date()): DemoInsemination | Failure {
  const a = getInsemination(id);
  if ('status' in a) return a;
  if (a.diagnostic?.resultat !== 'positif') return fail(409, 'not_pregnant', 'Cet acte n\'a pas de diagnostic positif');
  if (a.miseBas) return fail(409, 'not_editable', 'La mise-bas est déjà enregistrée');
  if (!i.date) return fail(422, 'invalid', 'La date de mise-bas réelle est obligatoire');
  if (i.date < a.date) return fail(422, 'invalid', "La date réelle ne peut précéder la date de l'acte");
  if (i.date > today(now)) return fail(422, 'invalid', 'La date de mise-bas ne peut pas être dans le futur');
  if (!Number.isInteger(i.vivants) || i.vivants < 0 || !Number.isInteger(i.morts) || i.morts < 0) return fail(422, 'invalid', 'Le nombre de naissances est un nombre entier');
  a.miseBas = { date: i.date, vivants: i.vivants, morts: i.morts, observations: i.observations.trim() };
  a.history.unshift({ at: now.toISOString(), by, action: 'mise-bas', detail: `${i.vivants} vivant(s), ${i.morts} mort(s)` });
  return a;
}

/** Suppression logique par l'Administrateur, avec motif ; refusée si la facture a reçu un paiement, sinon la facture est annulée par un avoir. */
export function deleteInsemination(id: string, motif: string, by: string, now = new Date()): null | Failure {
  const a = getInsemination(id);
  if ('status' in a) return a;
  if (!motif.trim()) return fail(422, 'invalid', 'Le motif de suppression est obligatoire');
  if (a.factureId) {
    const inv = getInvoice(a.factureId);
    if (!('status' in inv)) {
      if (paid(inv) > 0) return fail(409, 'already_paid', 'Suppression refusée : la facture de cet acte est payée ou partiellement payée');
      if (statusOf(inv) !== 'annulee') { const r = addCredit(a.factureId, total(inv), `Acte ${a.numero} supprimé : ${motif.trim()}`, by, now); if ('status' in r) return r; }
    }
  }
  a.deleted = { motif: motif.trim(), by, at: now.toISOString() };
  a.history.unshift({ at: now.toISOString(), by, action: 'suppression', detail: motif.trim() });
  return null;
}

/* ---------- Liste, suivi, indicateurs ---------- */

export type QuickFilter = 'all' | 'planifie' | 'realise' | 'positif' | 'negatif';

export function listInseminations(p: { filtre?: string; q?: string; du?: string; au?: string; especeId?: string; methode?: string; vetId?: string }) {
  const q = (p.q ?? '').trim().toLowerCase();
  return live()
    .filter((a) => {
      if (p.filtre === 'planifie' || p.filtre === 'realise') return a.statut === p.filtre;
      if (p.filtre === 'positif' || p.filtre === 'negatif') return a.diagnostic?.resultat === p.filtre;
      return true;
    })
    .filter((a) => !p.du || a.date >= p.du)
    .filter((a) => !p.au || a.date <= p.au)
    .filter((a) => !p.especeId || patientOf(a.patientId)?.especeId === p.especeId)
    .filter((a) => !p.methode || a.methode === p.methode)
    .filter((a) => !p.vetId || a.vetId === p.vetId)
    .filter((a) => {
      if (!q) return true;
      const o = ownerOf(a.patientId);
      return `${patientOf(a.patientId)?.nom ?? ''} ${o ? ownerName(o) : ''} ${a.semence.raceGeniteur} ${a.semence.nomGeniteur} ${a.numero}`.toLowerCase().includes(q);
    })
    .sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));
}

export type GestationState = 'en_cours' | 'imminente' | 'passee' | 'a_completer';
/** Gestantes (résultat positif, mise-bas non enregistrée), triées par date de mise-bas prévue. */
export function gestations(now = new Date()) {
  const t = today(now);
  return live()
    .filter((a) => a.diagnostic?.resultat === 'positif' && !a.miseBas)
    .map((a) => {
      const jours = a.miseBasPrevue ? diffDays(a.miseBasPrevue, t) : null;
      const duree = gestationJours(a.patientId);
      const progression = a.miseBasPrevue && duree ? Math.min(100, Math.max(0, Math.round((diffDays(t, a.date) / duree) * 100))) : 0;
      const etat: GestationState = jours === null ? 'a_completer' : jours < 0 ? 'passee' : jours <= SETTINGS.imminentJours ? 'imminente' : 'en_cours';
      return { acte: a, joursRestants: jours, progression, etat };
    })
    .sort((x, y) => (x.acte.miseBasPrevue ?? '9999').localeCompare(y.acte.miseBasPrevue ?? '9999'));
}

export function insemStats(now = new Date()) {
  const all = live();
  const realises = all.filter((a) => a.statut === 'realise').length;
  const positifs = all.filter((a) => a.diagnostic?.resultat === 'positif').length;
  const g = gestations(now);
  return {
    total: all.length, planifies: all.filter((a) => a.statut === 'planifie').length, realises, positifs,
    negatifs: all.filter((a) => a.diagnostic?.resultat === 'negatif').length,
    taux_reussite: realises > 0 ? Math.round((positifs / realises) * 100) : 0,
    gestantes: g.length, imminentes: g.filter((x) => x.etat === 'imminente').length, passees: g.filter((x) => x.etat === 'passee').length,
  };
}

export function factureOf(a: DemoInsemination) {
  if (!a.factureId) return null;
  const inv = getInvoice(a.factureId);
  return 'status' in inv ? null : { id: inv.id, numero: inv.numero, total: total(inv), reste: remaining(inv), statut: statusOf(inv) };
}

/* ---------- Rappels programmés ---------- */

export type RappelType = 'diag' | 'mb';
export type RappelStatut = 'programme' | 'envoye' | 'en_retard';
export interface Rappel { id: string; acte: DemoInsemination; type: RappelType; date: string; texte: string; envoye: string | null; statut: RappelStatut }

/** Rappels déjà partis : clé « acte:type » vers la date d'envoi. */
const SENT = new Map<string, string>();

/**
 * Rappels de la spécification : diagnostic de gestation à faire (délai après l'acte) et mise-bas imminente (quelques jours avant
 * la date prévue). Un rappel dont la date est passée sans envoi est « en retard » et s'envoie à la main.
 */
export function rappels(now = new Date()): Rappel[] {
  const t = today(now);
  const out: Rappel[] = [];
  for (const a of live()) {
    const nom = patientOf(a.patientId)?.nom ?? '';
    const push = (type: RappelType, date: string, texte: string) => {
      const envoye = SENT.get(`${a.id}-${type}`) ?? null;
      out.push({ id: `${a.id}-${type}`, acte: a, type, date, texte, envoye, statut: envoye ? 'envoye' : date < t ? 'en_retard' : 'programme' });
    };
    if (a.statut === 'realise' && !a.diagnostic) push('diag', addDays(a.date, SETTINGS.diagnosticDelaiJours), `Diagnostic de gestation à réaliser pour ${nom}`);
    if (a.diagnostic?.resultat === 'positif' && !a.miseBas && a.miseBasPrevue) {
      push('mb', addDays(a.miseBasPrevue, -SETTINGS.rappelMiseBasJours), `Mise-bas prévue le ${a.miseBasPrevue.split('-').reverse().join('/')} pour ${nom}`);
    }
  }
  return out.sort((x, y) => x.date.localeCompare(y.date));
}

function deliver(r: Rappel, now: Date): { ok: boolean; message: string } {
  const a = r.acte;
  const nom = patientOf(a.patientId)?.nom ?? '';
  const o = ownerOf(a.patientId);
  const sujet = r.type === 'diag' ? `Diagnostic de gestation à faire : ${nom}` : `Mise-bas imminente : ${nom}, prévue le ${a.miseBasPrevue!.split('-').reverse().join('/')}`;
  const log = sendToOwner({ telephone: o?.telephone ?? '', email: o?.email ?? '' }, 'sms', sujet, `insem:${a.id}`, now);
  notify({ userId: a.vetId, module: a.vetId ? null : 'insemination', type: 'insemination', titre: r.type === 'diag' ? 'Diagnostic de gestation à faire' : 'Mise-bas imminente', message: `${nom} (${a.numero}) : ${r.texte}.`, lien: '/insemination?onglet=rappels' }, now);
  if (log.statut === 'envoye') SENT.set(r.id, today(now));
  return { ok: log.statut === 'envoye', message: log.statut === 'envoye' ? `SMS envoyé au ${log.destinataire}` : log.erreur };
}

/** « Envoyer maintenant » : rappel adressé à l'éleveur (SMS) et au vétérinaire (notification). */
export function sendRappel(id: string, now = new Date()): { rappel: Rappel; ok: boolean; message: string } | Failure {
  const r = rappels(now).find((x) => x.id === id);
  if (!r) return fail(404, 'not_found', 'Rappel introuvable');
  const res = deliver(r, now);
  return { rappel: rappels(now).find((x) => x.id === id) ?? { ...r, envoye: today(now), statut: 'envoye' }, ...res };
}

/** Envoi automatique des rappels qui arrivent à échéance ce jour, puis alerte « mise-bas dépassée » (une fois chacune). */
export function flagReminders(now = new Date()) {
  const t = today(now);
  for (const r of rappels(now)) if (r.statut === 'programme' && r.date === t) deliver(r, now);
  for (const g of gestations(now)) {
    const a = g.acte;
    const key = `${a.id}:passee`;
    if (g.etat !== 'passee' || FLAGGED.has(key)) continue;
    FLAGGED.add(key);
    notify({ userId: a.vetId, module: a.vetId ? null : 'insemination', type: 'insemination', titre: 'Mise-bas dépassée', message: `${patientOf(a.patientId)?.nom ?? ''} (${a.numero}) devait mettre bas le ${a.miseBasPrevue!.split('-').reverse().join('/')}.`, lien: '/insemination?onglet=suivi' }, now);
  }
}

export const insemVetName = (id: string | null) => (id ? vetName(id) : '');
