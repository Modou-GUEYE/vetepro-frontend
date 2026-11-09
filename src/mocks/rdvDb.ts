import type { Failure } from './profilesDb';
import { getProfile } from './profilesDb';
import { DEMO_USERS, DemoUser, fullName } from './authDb';
import { NewPatientInput, OWNERS, PATIENTS, checkNewPatient, createProvisionalPatient, ownerName } from './patientsDb';
import { CANAL_LABEL, Canal, SendLog, notify, sendToOwner, sendsOf } from './notifDb';

export type RdvStatus = 'confirme' | 'termine' | 'annule';
export const DURATIONS = [15, 30, 45, 60, 90] as const;
/** Horaires du cabinet pour la démonstration : créneaux de 15 minutes entre 8 h et 18 h. */
export const DAY_START = '08:00';
export const DAY_END = '18:00';
const STEP = 15;

export interface RdvHistory { at: string; by: string; action: 'creation' | 'modification' | 'annulation' | 'consultation'; detail: string }
export interface DemoRdv {
  id: string; date: string; heure: string; duree: number; vetId: string; patientId: string; motif: string; notes: string; canal: Canal;
  statut: RdvStatus; consultationId: string | null; createdBy: string; history: RdvHistory[];
}

const today = (now = new Date()) => now.toISOString().slice(0, 10);
const inDays = (n: number, now = new Date()) => new Date(now.getTime() + n * 86_400_000).toISOString().slice(0, 10);
const hist = (by: string, at: string, detail: string): RdvHistory[] => [{ at, by, action: 'creation', detail }];

const seed = (): DemoRdv[] => {
  const mk = (id: string, day: number, heure: string, duree: number, vetId: string, patientId: string, motif: string, extra: Partial<DemoRdv> = {}): DemoRdv => ({
    id, date: inDays(day), heure, duree, vetId, patientId, motif, notes: '', canal: 'sms', statut: day < 0 ? 'termine' : 'confirme', consultationId: null,
    createdBy: 'Omar Diouf', history: hist('Omar Diouf', new Date().toISOString(), `${motif}`), ...extra,
  });
  return [
    mk('1', 0, '09:00', 30, '2', '1', 'Contrôle allergie cutanée'),
    mk('2', 0, '10:30', 45, '6', '2', 'Rappel de vaccination', { canal: 'whatsapp', notes: 'Apporter le carnet' }),
    mk('3', 1, '09:00', 30, '2', '4', 'Contrôle après gastro-entérite', { canal: 'email' }),
    mk('4', 3, '14:00', 60, '6', '3', 'Bilan de santé du troupeau'),
    mk('5', -2, '11:00', 30, '2', '1', 'Première consultation', { consultationId: '1' }),
    mk('6', -1, '15:00', 30, '6', '2', 'Toilettage', { statut: 'annule' }),
  ];
};

export let RDVS: DemoRdv[] = seed();
export const resetRdvs = () => { RDVS = seed(); };

const notFound: Failure = { status: 404, code: 'not_found', message: 'Rendez-vous introuvable' };
export const getRdv = (id: string): DemoRdv | Failure => RDVS.find((r) => r.id === id) ?? notFound;

/* ---------- Vétérinaires ---------- */

export const veterinarians = (): DemoUser[] =>
  DEMO_USERS.filter((u) => !u.deleted && u.actif && getProfile(u.profilId)?.baseRole === 'veterinaire').sort((a, b) => fullName(a).localeCompare(fullName(b), 'fr'));
export const vetName = (id: string | null) => { const u = DEMO_USERS.find((x) => x.id === id); return u ? `Dr ${fullName(u)}` : ''; };

/* ---------- Créneaux ---------- */

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const startsAt = (r: Pick<DemoRdv, 'date' | 'heure'>) => new Date(`${r.date}T${r.heure}:00`);

const overlaps = (a: { heure: string; duree: number }, b: { heure: string; duree: number }) => minutes(a.heure) < minutes(b.heure) + b.duree && minutes(b.heure) < minutes(a.heure) + a.duree;
const busyWith = (vetId: string, date: string, slot: { heure: string; duree: number }, ignoreId?: string) =>
  RDVS.find((r) => r.id !== ignoreId && r.vetId === vetId && r.date === date && r.statut !== 'annule' && overlaps(r, slot));

/** Heures de début libres pour un vétérinaire, une date et une durée : dans les horaires, sans chevauchement, et pas dans le passé. */
export function availability(vetId: string, date: string, duree: number, now = new Date(), ignoreId?: string): string[] {
  const out: string[] = [];
  for (let m = minutes(DAY_START); m + duree <= minutes(DAY_END); m += STEP) {
    const slot = { heure: hhmm(m), duree };
    if (startsAt({ date, heure: slot.heure }) <= now) continue;
    if (!busyWith(vetId, date, slot, ignoreId)) out.push(slot.heure);
  }
  return out;
}

/* ---------- Messages ---------- */

const dmy = (iso: string) => iso.split('-').reverse().join('/');
const ownerOf = (patientId: string) => OWNERS.find((o) => o.id === PATIENTS.find((p) => p.id === patientId)?.ownerId);
const when = (r: Pick<DemoRdv, 'date' | 'heure'>) => `le ${dmy(r.date)} à ${r.heure}`;

type Kind = 'creation' | 'modification' | 'annulation';
const ownerMessage = (kind: Kind, r: DemoRdv) => {
  const pat = PATIENTS.find((p) => p.id === r.patientId)?.nom ?? '';
  const vet = vetName(r.vetId);
  return kind === 'creation' ? `Rendez-vous confirmé ${when(r)} avec ${vet} pour ${pat}.`
    : kind === 'modification' ? `Votre rendez-vous pour ${pat} est déplacé ${when(r)} avec ${vet}.`
    : `Votre rendez-vous pour ${pat} ${when(r)} est annulé.`;
};

/** Message au propriétaire par son canal, et notification dans l'application au vétérinaire concerné. Un échec d'envoi n'annule pas le rendez-vous. */
function announce(kind: Kind, r: DemoRdv, by: string, byUserId: string | null, now: Date): SendLog | null {
  const owner = ownerOf(r.patientId);
  const log = owner ? sendToOwner(owner, r.canal, ownerMessage(kind, r), `rdv:${r.id}`, now) : null;
  if (r.vetId !== byUserId) {
    const pat = PATIENTS.find((p) => p.id === r.patientId)?.nom ?? '';
    const titre = kind === 'creation' ? 'Nouveau rendez-vous' : kind === 'modification' ? 'Rendez-vous modifié' : 'Rendez-vous annulé';
    notify({ userId: r.vetId, module: null, type: 'rdv', titre, message: `${pat}, ${when(r)}${r.motif ? `, ${r.motif}` : ''} (par ${by}).`, lien: `/rendez-vous?id=${r.id}` }, now);
  }
  return log;
}

/** Renvoi du dernier message pour un rendez-vous, après un échec. */
export function resend(id: string, by: string, byUserId: string | null, now = new Date()): SendLog | Failure {
  const r = getRdv(id);
  if ('status' in r) return r;
  const kind: Kind = r.statut === 'annule' ? 'annulation' : r.history.some((h) => h.action === 'modification') ? 'modification' : 'creation';
  const owner = ownerOf(r.patientId);
  if (!owner) return { status: 404, code: 'not_found', message: 'Propriétaire introuvable' };
  void by; void byUserId;
  return sendToOwner(owner, r.canal, ownerMessage(kind, r), `rdv:${r.id}`, now);
}

/* ---------- Écritures ---------- */

export interface RdvInput {
  date: string; heure: string; duree: number; vetId: string; patientId: string | null; nouveauPatient: NewPatientInput | null; motif: string; notes: string; canal: Canal;
}

function checkSlot(i: Pick<RdvInput, 'date' | 'heure' | 'duree' | 'vetId'>, now: Date, ignoreId?: string): Failure | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.date) || !/^\d{2}:\d{2}$/.test(i.heure)) return { status: 422, code: 'invalid', message: 'La date et l\'heure sont obligatoires' };
  if (!(DURATIONS as readonly number[]).includes(i.duree)) return { status: 422, code: 'invalid', message: 'Durée inconnue' };
  const vet = veterinarians().find((v) => v.id === i.vetId);
  if (!vet) return { status: 422, code: 'vet_unavailable', message: 'Choisissez un vétérinaire disponible' };
  if (startsAt(i) <= now) return { status: 422, code: 'in_the_past', message: 'Ce créneau est déjà passé' };
  if (minutes(i.heure) < minutes(DAY_START) || minutes(i.heure) + i.duree > minutes(DAY_END)) return { status: 422, code: 'outside_hours', message: `Les rendez-vous se prennent entre ${DAY_START} et ${DAY_END}` };
  if (busyWith(i.vetId, i.date, i, ignoreId)) return { status: 409, code: 'slot_taken', message: `Créneau indisponible : ${vetName(i.vetId)} a déjà un rendez-vous à ce moment` };
  return null;
}

export const canalOk = (c: string): c is Canal => c === 'email' || c === 'sms' || c === 'whatsapp';

/**
 * Prise de rendez-vous. Pour un animal inconnu, une fiche provisoire (animal et propriétaire) est créée, à compléter après la consultation.
 */
export function createRdv(i: RdvInput, by: string, byUserId: string | null, now = new Date()): { rdv: DemoRdv; envoi: SendLog | null } | Failure {
  if (!canalOk(i.canal)) return { status: 422, code: 'invalid', message: 'Canal de notification inconnu' };
  const slotErr = checkSlot(i, now);
  if (slotErr) return slotErr;
  let patientId = i.patientId;
  if (patientId) {
    if (!PATIENTS.some((p) => p.id === patientId)) return { status: 422, code: 'invalid', message: 'Choisissez un patient' };
  } else if (i.nouveauPatient) {
    const e = checkNewPatient(i.nouveauPatient);
    if (e) return e;
    const p = createProvisionalPatient(i.nouveauPatient, by, now);
    if ('status' in p) return p;
    patientId = p.id;
  } else return { status: 422, code: 'invalid', message: 'Choisissez un patient existant ou saisissez un nouvel animal' };

  const rdv: DemoRdv = {
    id: String(Math.max(0, ...RDVS.map((r) => Number(r.id))) + 1), date: i.date, heure: i.heure, duree: i.duree, vetId: i.vetId, patientId, motif: i.motif.trim(), notes: i.notes.trim(),
    canal: i.canal, statut: 'confirme', consultationId: null, createdBy: by, history: hist(by, now.toISOString(), `Rendez-vous ${when(i)} avec ${vetName(i.vetId)}`),
  };
  RDVS.push(rdv);
  return { rdv, envoi: announce('creation', rdv, by, byUserId, now) };
}

/** Modification : uniquement tant que le rendez-vous n'est pas passé (spécification) ; le nouveau créneau doit être libre. */
export function updateRdv(id: string, i: Omit<RdvInput, 'patientId' | 'nouveauPatient'>, by: string, byUserId: string | null, now = new Date()): { rdv: DemoRdv; envoi: SendLog | null } | Failure {
  const r = getRdv(id);
  if ('status' in r) return r;
  if (r.statut !== 'confirme') return { status: 409, code: 'not_editable', message: r.statut === 'annule' ? 'Ce rendez-vous est annulé' : 'Ce rendez-vous est terminé' };
  if (startsAt(r) <= now) return { status: 409, code: 'in_the_past', message: 'Ce rendez-vous est passé, il ne peut plus être modifié' };
  if (!canalOk(i.canal)) return { status: 422, code: 'invalid', message: 'Canal de notification inconnu' };
  const err = checkSlot(i, now, id);
  if (err) return err;
  const changes = [
    r.date !== i.date || r.heure !== i.heure ? `créneau ${when(r)} → ${when(i)}` : '', r.vetId !== i.vetId ? `vétérinaire ${vetName(r.vetId)} → ${vetName(i.vetId)}` : '',
    r.duree !== i.duree ? `durée ${r.duree} → ${i.duree} min` : '', r.motif !== i.motif.trim() ? 'motif' : '', r.notes !== i.notes.trim() ? 'notes' : '', r.canal !== i.canal ? `canal ${CANAL_LABEL[r.canal]} → ${CANAL_LABEL[i.canal]}` : '',
  ].filter(Boolean);
  Object.assign(r, { date: i.date, heure: i.heure, duree: i.duree, vetId: i.vetId, motif: i.motif.trim(), notes: i.notes.trim(), canal: i.canal });
  r.history = [{ at: now.toISOString(), by, action: 'modification', detail: changes.join(', ') || 'Aucun changement' }, ...r.history];
  return { rdv: r, envoi: announce('modification', r, by, byUserId, now) };
}

/** Annulation : le rendez-vous reste visible avec son historique (suppression logique) et le propriétaire est prévenu. */
export function cancelRdv(id: string, by: string, byUserId: string | null, now = new Date()): { rdv: DemoRdv; envoi: SendLog | null } | Failure {
  const r = getRdv(id);
  if ('status' in r) return r;
  if (r.statut === 'termine') return { status: 409, code: 'not_editable', message: 'Un rendez-vous terminé ne peut pas être annulé' };
  if (r.statut === 'annule') return { status: 409, code: 'not_editable', message: 'Ce rendez-vous est déjà annulé' };
  r.statut = 'annule';
  r.history = [{ at: now.toISOString(), by, action: 'annulation', detail: `Rendez-vous ${when(r)} annulé` }, ...r.history];
  return { rdv: r, envoi: announce('annulation', r, by, byUserId, now) };
}

/** Rendez-vous honoré : rattaché à la consultation qui vient d'être enregistrée. */
export function completeRdv(id: string, consultationId: string, by: string, now = new Date()): DemoRdv | Failure {
  const r = getRdv(id);
  if ('status' in r) return r;
  if (r.statut !== 'confirme') return { status: 409, code: 'not_editable', message: 'Ce rendez-vous ne peut plus être terminé' };
  r.statut = 'termine';
  r.consultationId = consultationId;
  r.history = [{ at: now.toISOString(), by, action: 'consultation', detail: 'Consultation enregistrée' }, ...r.history];
  return r;
}

export function listRdvs(p: { du?: string; au?: string; vetId?: string; statut?: string; patientId?: string; q?: string }) {
  const q = (p.q ?? '').trim().toLowerCase();
  return RDVS
    .filter((r) => !p.du || r.date >= p.du)
    .filter((r) => !p.au || r.date <= p.au)
    .filter((r) => !p.vetId || r.vetId === p.vetId)
    .filter((r) => !p.statut || r.statut === p.statut)
    .filter((r) => !p.patientId || r.patientId === p.patientId)
    .filter((r) => {
      if (!q) return true;
      const pat = PATIENTS.find((x) => x.id === r.patientId);
      const owner = ownerOf(r.patientId);
      return `${pat?.nom ?? ''} ${owner ? ownerName(owner) : ''} ${r.motif}`.toLowerCase().includes(q);
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure));
}

export const rdvSends = (id: string) => sendsOf(`rdv:${id}`);
export const todayIso = today;
