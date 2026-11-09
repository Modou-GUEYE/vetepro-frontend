import type { Failure } from './profilesDb';
import { INVOICES, InvoiceLine, createInvoice, DemoInvoice, PAYMENT_MODES } from './billingDb';
import { decrement, getArticle, recordTreatmentUse, DemoArticle } from './pharmacyDb';
import { NewPatientInput, OWNERS, PATIENTS, checkNewPatient, createProvisionalPatient, ownerName } from './patientsDb';
import { notify } from './notifDb';
import { vetName, veterinarians } from './rdvDb';

export const EXIT_STATES = ['gueri', 'ameliore', 'stable', 'transfere', 'decede'] as const;
export type ExitState = (typeof EXIT_STATES)[number];
export const EXIT_LABEL: Record<ExitState, string> = { gueri: 'Guéri, rétabli', ameliore: 'Amélioré', stable: 'Stable', transfere: 'Transféré', decede: 'Décédé' };
export const CARE_TYPES = ['soin', 'medicament', 'examen'] as const;
export type CareType = (typeof CARE_TYPES)[number];

export interface CareLine { acte: string; type: CareType; articleId: string | null; nom: string; quantite: number; prixUnitaire: number }
export interface Prescription { id: string; date: string; heure: string; vetNom: string; observations: string; lignes: CareLine[] }
export interface DemoHospi {
  id: string; numero: string; patientId: string; vetId: string | null; box: string; dateEntree: string; dateSortiePrevue: string | null;
  tarifJour: number; tarifConsultation: number; motif: string; observations: string; statut: 'encours' | 'sorti';
  prescriptions: Prescription[];
  sortie: { date: string; etat: ExitState; compteRendu: string; factureId: string } | null;
  createdBy: string;
}

const today = (now = new Date()) => now.toISOString().slice(0, 10);
const inDays = (n: number, now = new Date()) => new Date(now.getTime() + n * 86_400_000).toISOString().slice(0, 10);

const line = (acte: string, type: CareType, nom: string, quantite: number, prixUnitaire: number, articleId: string | null = null): CareLine => ({ acte, type, articleId, nom, quantite, prixUnitaire });

const seed = (): DemoHospi[] => [
  {
    id: '1', numero: 'HOS-0001', patientId: '4', vetId: '2', box: 'Cage A-3', dateEntree: inDays(-3), dateSortiePrevue: inDays(1), tarifJour: 5000, tarifConsultation: 3000,
    motif: 'Déshydratation, perfusion', observations: 'Animal abattu à l\'entrée', statut: 'encours', createdBy: 'Fatou Diallo', sortie: null,
    prescriptions: [{ id: 'p1', date: inDays(-3), heure: '09:00', vetNom: 'Dr Fatou Diallo', observations: 'Perfusion pendant 24 h', lignes: [line('Pose de perfusion', 'soin', '', 1, 4000)] }],
  },
];

export let HOSPIS: DemoHospi[] = seed();
export const resetHospis = () => { HOSPIS = seed(); };

const notFound: Failure = { status: 404, code: 'not_found', message: 'Hospitalisation introuvable' };
export const getHospi = (id: string): DemoHospi | Failure => HOSPIS.find((h) => h.id === id) ?? notFound;

/** Durée du séjour en jours calendaires, au moins 1 (comme le prototype V4). */
export const daysBetween = (from: string, to: string) => Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000));
export const stayEnd = (h: DemoHospi, now = new Date()) => h.sortie?.date ?? today(now);
export const careTotal = (h: DemoHospi) => h.prescriptions.reduce((n, p) => n + p.lignes.reduce((m, l) => m + l.quantite * l.prixUnitaire, 0), 0);
export const stayTotal = (h: DemoHospi, now = new Date()) => h.tarifJour * daysBetween(h.dateEntree, stayEnd(h, now)) + h.tarifConsultation + careTotal(h);

const ownerOfPatient = (patientId: string) => OWNERS.find((o) => o.id === PATIENTS.find((p) => p.id === patientId)?.ownerId);

/** Lignes de la facture de sortie : consultation initiale, hébergement, puis chaque soin et médicament. */
export function exitInvoiceLines(h: DemoHospi, dateSortie: string): InvoiceLine[] {
  const jours = daysBetween(h.dateEntree, dateSortie);
  const out: InvoiceLine[] = [];
  if (h.tarifConsultation > 0) out.push({ description: "Consultation initiale d'admission", quantite: 1, prixUnitaire: h.tarifConsultation });
  out.push({ description: `Hébergement, ${h.box} (${jours} jour${jours > 1 ? 's' : ''})`, quantite: jours, prixUnitaire: h.tarifJour });
  for (const p of h.prescriptions) for (const l of p.lignes) out.push({ description: l.type === 'medicament' ? l.nom : l.nom ? `${l.acte}, ${l.nom}` : l.acte, quantite: l.quantite, prixUnitaire: l.prixUnitaire });
  return out;
}

/* ---------- Admission ---------- */

export interface AdmissionInput {
  patientId: string | null; nouveauPatient: NewPatientInput | null; vetId: string | null; box: string; dateEntree: string; dateSortiePrevue: string | null;
  tarifJour: number; tarifConsultation: number; motif: string; observations: string;
}

const validVet = (id: string | null) => !id || veterinarians().some((v) => v.id === id);

function checkAdmission(i: AdmissionInput, now: Date, ignoreId?: string): Failure | null {
  if (!i.dateEntree) return { status: 422, code: 'invalid', message: "La date d'entrée est obligatoire" };
  if (i.dateEntree > today(now)) return { status: 422, code: 'invalid', message: "La date d'entrée ne peut pas être dans le futur" };
  if (i.dateSortiePrevue && i.dateSortiePrevue < i.dateEntree) return { status: 422, code: 'invalid', message: "La sortie prévue ne peut pas précéder l'entrée" };
  if (!i.box.trim()) return { status: 422, code: 'invalid', message: 'Le box ou la cage est obligatoire' };
  if (!Number.isInteger(i.tarifJour) || i.tarifJour < 0) return { status: 422, code: 'invalid', message: "Le tarif d'hébergement par jour est obligatoire (nombre entier)" };
  if (!Number.isInteger(i.tarifConsultation) || i.tarifConsultation < 0) return { status: 422, code: 'invalid', message: 'Le tarif de la consultation initiale doit être un nombre entier' };
  if (!i.motif.trim()) return { status: 422, code: 'invalid', message: "Le motif d'hospitalisation est obligatoire" };
  if (!validVet(i.vetId)) return { status: 422, code: 'vet_unavailable', message: 'Ce vétérinaire est indisponible' };
  void ignoreId;
  return null;
}

const nextNumber = () => `HOS-${String(Math.max(0, ...HOSPIS.map((h) => Number(h.numero.slice(4)))) + 1).padStart(4, '0')}`;

/** Admission. Un patient déjà hospitalisé est refusé (« les doublons ne sont pas permis »). Un animal inconnu reçoit une fiche provisoire. */
export function admit(i: AdmissionInput, by: string, now = new Date()): DemoHospi | Failure {
  const err = checkAdmission(i, now);
  if (err) return err;
  let patientId = i.patientId;
  if (patientId) {
    if (!PATIENTS.some((p) => p.id === patientId)) return { status: 422, code: 'invalid', message: 'Choisissez un patient' };
    if (HOSPIS.some((h) => h.patientId === patientId && h.statut === 'encours')) return { status: 409, code: 'already_hospitalized', message: 'Ce patient est déjà hospitalisé' };
  } else if (i.nouveauPatient) {
    const e = checkNewPatient(i.nouveauPatient);
    if (e) return e;
    const p = createProvisionalPatient(i.nouveauPatient, by, now);
    if ('status' in p) return p;
    patientId = p.id;
  } else return { status: 422, code: 'invalid', message: 'Choisissez un patient existant ou saisissez un nouvel animal' };

  const h: DemoHospi = {
    id: String(Math.max(0, ...HOSPIS.map((x) => Number(x.id))) + 1), numero: nextNumber(), patientId, vetId: i.vetId, box: i.box.trim(), dateEntree: i.dateEntree,
    dateSortiePrevue: i.dateSortiePrevue, tarifJour: i.tarifJour, tarifConsultation: i.tarifConsultation, motif: i.motif.trim(), observations: i.observations.trim(),
    statut: 'encours', prescriptions: [], sortie: null, createdBy: by,
  };
  HOSPIS.push(h);
  return h;
}

/** Modification des informations d'une hospitalisation en cours ; le patient ne change pas. */
export function updateHospi(id: string, i: Omit<AdmissionInput, 'patientId' | 'nouveauPatient'>, now = new Date()): DemoHospi | Failure {
  const h = getHospi(id);
  if ('status' in h) return h;
  if (h.statut !== 'encours') return { status: 409, code: 'not_editable', message: 'Cette hospitalisation est archivée' };
  const err = checkAdmission({ ...i, patientId: h.patientId, nouveauPatient: null }, now, id);
  if (err) return err;
  Object.assign(h, { vetId: i.vetId, box: i.box.trim(), dateEntree: i.dateEntree, dateSortiePrevue: i.dateSortiePrevue, tarifJour: i.tarifJour, tarifConsultation: i.tarifConsultation, motif: i.motif.trim(), observations: i.observations.trim() });
  return h;
}

/* ---------- Prescriptions ---------- */

export interface PrescriptionInput {
  date: string; heure: string; vetId: string | null; observations: string;
  lignes: { acte: string; type: CareType; articleId: string | null; quantite: number; prixUnitaire: number }[];
}

/**
 * Prescription en cours de séjour. Les médicaments prennent le prix de l'article et sortent du stock en tout ou rien ;
 * le total à payer est recalculé à partir des lignes.
 */
export function prescribe(id: string, i: PrescriptionInput, by: string, now = new Date()): DemoHospi | Failure {
  const h = getHospi(id);
  if ('status' in h) return h;
  if (h.statut !== 'encours') return { status: 409, code: 'not_editable', message: 'Cette hospitalisation est archivée' };
  if (!i.date || !i.heure) return { status: 422, code: 'invalid', message: 'La date et l\'heure de la prescription sont obligatoires' };
  if (i.date < h.dateEntree || i.date > today(now)) return { status: 422, code: 'invalid', message: `La date doit être comprise entre l'entrée (${h.dateEntree.split('-').reverse().join('/')}) et aujourd'hui` };
  if (!validVet(i.vetId)) return { status: 422, code: 'vet_unavailable', message: 'Ce vétérinaire est indisponible' };
  if (i.lignes.length === 0) return { status: 422, code: 'invalid', message: 'Ajoutez au moins une ligne de prescription' };

  const wanted = new Map<string, number>();
  const lignes: CareLine[] = [];
  for (const l of i.lignes) {
    if (!(CARE_TYPES as readonly string[]).includes(l.type)) return { status: 422, code: 'invalid', message: 'Type de ligne inconnu' };
    if (!Number.isInteger(l.quantite) || l.quantite < 1) return { status: 422, code: 'invalid', message: 'La quantité doit être un nombre entier positif' };
    if (l.type === 'medicament') {
      const a = l.articleId ? getArticle(l.articleId) : null;
      if (!a || 'status' in a || !a.actif) return { status: 404, code: 'not_found', message: 'Médicament non référencé ou désactivé' };
      wanted.set(a.id, (wanted.get(a.id) ?? 0) + l.quantite);
      lignes.push({ acte: l.acte.trim() || 'Médicament', type: 'medicament', articleId: a.id, nom: a.nom, quantite: l.quantite, prixUnitaire: a.prix });
    } else {
      if (!l.acte.trim()) return { status: 422, code: 'invalid', message: "L'acte ou la description est obligatoire" };
      if (!Number.isInteger(l.prixUnitaire) || l.prixUnitaire < 0) return { status: 422, code: 'unpriced', message: `Acte non tarifé : ${l.acte.trim()}` };
      lignes.push({ acte: l.acte.trim(), type: l.type, articleId: null, nom: '', quantite: l.quantite, prixUnitaire: l.prixUnitaire });
    }
  }
  for (const [aid, q] of wanted) {
    const a = getArticle(aid) as DemoArticle;
    if (a.quantite <= 0) return { status: 409, code: 'out_of_stock', message: `Article épuisé : ${a.nom}` };
    if (q > a.quantite) return { status: 409, code: 'insufficient_stock', message: `Stock insuffisant pour ${a.nom} : ${a.quantite} disponible(s)` };
  }
  for (const [aid, q] of wanted) { decrement(aid, q, 'hospitalisation', by, h.numero, now); recordTreatmentUse(aid, i.date); }

  h.prescriptions.push({ id: `p${Date.now()}-${h.prescriptions.length}`, date: i.date, heure: i.heure, vetNom: vetName(i.vetId) || by, observations: i.observations.trim(), lignes });
  return h;
}

/* ---------- Sortie ---------- */

export interface ExitInput {
  dateSortie: string; etat: string; compteRendu: string; lignes: { description: string; quantite: number; prixUnitaire: number }[]; remisePct: number; mode: string; montantRecu: number;
}

/** Sortie du patient : génère la facture (séjour, soins, lignes ajoutées, remise), enregistre le paiement reçu et archive l'hospitalisation. */
export function discharge(id: string, i: ExitInput, by: string, now = new Date()): { hospi: DemoHospi; facture: DemoInvoice } | Failure {
  const h = getHospi(id);
  if ('status' in h) return h;
  if (h.statut !== 'encours') return { status: 409, code: 'not_editable', message: 'Cette hospitalisation est déjà archivée' };
  if (!i.dateSortie) return { status: 422, code: 'invalid', message: 'La date de sortie est obligatoire' };
  if (i.dateSortie < h.dateEntree) return { status: 422, code: 'invalid', message: "La date de sortie ne peut pas précéder l'entrée" };
  if (i.dateSortie > today(now)) return { status: 422, code: 'invalid', message: 'La date de sortie ne peut pas être dans le futur' };
  if (!(EXIT_STATES as readonly string[]).includes(i.etat)) return { status: 422, code: 'invalid', message: "L'état à la sortie est obligatoire" };
  if (!(PAYMENT_MODES as readonly string[]).includes(i.mode)) return { status: 422, code: 'invalid', message: 'Mode de paiement inconnu' };

  const owner = ownerOfPatient(h.patientId);
  const extra = i.lignes.filter((l) => l.description.trim() || l.prixUnitaire);
  const inv = createInvoice({
    date: i.dateSortie, source: 'hospitalisation', ownerId: owner?.id ?? null, clientLabel: owner ? ownerName(owner) : 'Client', patientId: h.patientId, consultationId: null,
    lines: [...exitInvoiceLines(h, i.dateSortie), ...extra], remisePct: i.remisePct, notes: `Hospitalisation ${h.numero}`,
    paiement: i.montantRecu > 0 ? { montant: i.montantRecu, mode: i.mode } : undefined,
  }, by, now);
  if ('status' in inv) return inv;
  h.statut = 'sorti';
  h.sortie = { date: i.dateSortie, etat: i.etat as ExitState, compteRendu: i.compteRendu.trim(), factureId: inv.id };
  void INVOICES;
  return { hospi: h, facture: inv };
}

export function listHospis(p: { statut: 'encours' | 'sorti'; q?: string }) {
  const q = (p.q ?? '').trim().toLowerCase();
  return HOSPIS
    .filter((h) => h.statut === p.statut)
    .filter((h) => {
      if (!q) return true;
      const pat = PATIENTS.find((x) => x.id === h.patientId);
      const owner = ownerOfPatient(h.patientId);
      return `${h.numero} ${pat?.nom ?? ''} ${owner ? ownerName(owner) : ''} ${h.motif} ${h.box}`.toLowerCase().includes(q);
    })
    .sort((a, b) => (p.statut === 'encours' ? a.dateEntree.localeCompare(b.dateEntree) : (b.sortie?.date ?? '').localeCompare(a.sortie?.date ?? '')));
}

export function hospiStats(now = new Date()) {
  const sortis = HOSPIS.filter((h) => h.statut === 'sorti');
  const t = today(now);
  return {
    en_cours: HOSPIS.filter((h) => h.statut === 'encours').length,
    sorties: sortis.length,
    soins_aujourdhui: HOSPIS.reduce((n, h) => n + h.prescriptions.filter((p) => p.date === t).length, 0),
    ca_hospitalisation: sortis.reduce((n, h) => { const f = INVOICES.find((x) => x.id === h.sortie?.factureId); return n + (f ? f.lines.reduce((m, l) => m + l.quantite * l.prixUnitaire, 0) * (1 - f.remisePct / 100) : 0); }, 0),
  };
}

/** Alerte au tableau de notifications quand la sortie prévue est dépassée (une fois par séjour). */
export function flagOverdue(now = new Date()) {
  for (const h of HOSPIS) {
    if (h.statut === 'encours' && h.dateSortiePrevue && h.dateSortiePrevue < today(now) && !OVERDUE_FLAGGED.has(h.id)) {
      OVERDUE_FLAGGED.add(h.id);
      const pat = PATIENTS.find((p) => p.id === h.patientId)?.nom ?? '';
      notify({ userId: h.vetId, module: h.vetId ? null : 'hospitalisations', type: 'hospitalisation', titre: 'Sortie prévue dépassée', message: `${pat} (${h.numero}) devait sortir le ${h.dateSortiePrevue.split('-').reverse().join('/')}.`, lien: `/hospitalisations?id=${h.id}` }, now);
    }
  }
}
const OVERDUE_FLAGGED = new Set<string>();
export const resetOverdue = () => OVERDUE_FLAGGED.clear();
