import { z } from 'zod';
import { CANAUX, Canal, sendDtoSchema } from '@/modules/notifications/models/notification';
import { NewPatientForm, emptyNewPatient, validateNewPatient } from '@/modules/patients/models/newPatient';

export type RdvStatus = 'confirme' | 'termine' | 'annule';
export const STATUS_LABEL: Record<RdvStatus, string> = { confirme: 'Confirmé', termine: 'Terminé', annule: 'Annulé' };
export const STATUS_TONE = { confirme: 'green', termine: 'slate', annule: 'red' } as const;
export const DURATIONS = [15, 30, 45, 60, 90] as const;
export const DURATION_LABEL = (d: number) => (d < 60 ? `${d} min` : d === 60 ? '1 h' : `${Math.floor(d / 60)} h ${d % 60}`);
export const MOTIFS = ['Consultation générale', 'Vaccination', 'Chirurgie', 'Urgence', 'Contrôle post-opératoire', 'Bilan de santé', 'Toilettage'];

const vetRef = z.object({ id: z.string(), nom: z.string() });
const summarySchema = z.object({
  id: z.string(), date: z.string(), heure: z.string(), duree: z.number(), statut: z.enum(['confirme', 'termine', 'annule']), motif: z.string(), notes: z.string(), canal: z.enum(CANAUX),
  consultation_id: z.string().nullable(), veterinaire: vetRef,
  patient: z.object({ id: z.string(), nom: z.string(), espece: z.string(), provisoire: z.boolean() }).nullable(),
  proprietaire: z.object({ id: z.string(), nom: z.string(), telephone: z.string(), email: z.string() }).nullable(),
  passe: z.boolean(),
});
export const rdvListDtoSchema = z.object({ items: z.array(summarySchema), total: z.number() });
export const rdvDetailDtoSchema = summarySchema.extend({
  historique: z.array(z.object({ at: z.string(), by: z.string(), action: z.enum(['creation', 'modification', 'annulation', 'consultation']), detail: z.string() })),
  envois: z.array(sendDtoSchema), envoi: sendDtoSchema.nullable().optional(),
});
export const slotsDtoSchema = z.object({ creneaux: z.array(z.string()) });
export const vetChoicesDtoSchema = z.object({ items: z.array(z.object({ id: z.string(), nom: z.string(), specialite: z.string() })) });

export type RdvRow = z.infer<typeof summarySchema>;
export type RdvDetail = z.infer<typeof rdvDetailDtoSchema>;

/* ---------- Formulaire ---------- */

export const rdvFormSchema = z.object({
  mode: z.enum(['existant', 'nouveau']),
  patientId: z.string(),
  np: z.custom<NewPatientForm>(),
  date: z.string().min(1, 'La date est obligatoire'),
  duree: z.string(), vetId: z.string().min(1, 'Choisissez un vétérinaire'), heure: z.string().min(1, 'Choisissez un créneau disponible'),
  motif: z.string(), notes: z.string(), canal: z.enum(CANAUX),
}).superRefine((v, ctx) => {
  if (v.mode === 'existant' && !v.patientId) ctx.addIssue({ code: 'custom', path: ['patientId'], message: 'Choisissez un patient' });
  if (v.mode === 'nouveau') validateNewPatient(v.np, ctx);
});
export type RdvForm = z.infer<typeof rdvFormSchema>;

export const emptyRdvForm = (o: Partial<RdvForm> = {}): RdvForm => ({
  mode: 'existant', patientId: '', np: emptyNewPatient(), date: '', duree: '30', vetId: '', heure: '', motif: '', notes: '', canal: 'sms', ...o,
});
export const formFromRdv = (r: RdvRow): RdvForm => emptyRdvForm({ patientId: r.patient?.id ?? '', date: r.date, duree: String(r.duree), vetId: r.veterinaire.id, heure: r.heure, motif: r.motif, notes: r.notes, canal: r.canal });

export { type Canal };

/* ---------- Dates du planning ---------- */

export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseDay = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y!, m! - 1, d!); };
export const addDays = (s: string, n: number) => { const d = parseDay(s); d.setDate(d.getDate() + n); return isoDay(d); };
/** Lundi de la semaine qui contient le jour donné. */
export const weekStart = (s: string) => { const d = parseDay(s); return addDays(s, -((d.getDay() + 6) % 7)); };

export type PlanningView = 'mois' | 'semaine' | 'liste';

/** Jours à afficher dans la grille du mois : de lundi à dimanche, semaines complètes. */
export function monthGrid(anchor: string): string[] {
  const d = parseDay(anchor);
  const first = isoDay(new Date(d.getFullYear(), d.getMonth(), 1));
  const last = isoDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const start = weekStart(first);
  const end = addDays(weekStart(last), 6);
  const out: string[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) out.push(day);
  return out;
}

export function rangeOf(view: PlanningView, anchor: string): { du: string; au: string } {
  if (view === 'semaine') { const s = weekStart(anchor); return { du: s, au: addDays(s, 6) }; }
  if (view === 'liste') { const g = monthGrid(anchor); const d = parseDay(anchor); return { du: isoDay(new Date(d.getFullYear(), d.getMonth(), 1)), au: g[g.length - 1]! }; }
  const g = monthGrid(anchor);
  return { du: g[0]!, au: g[g.length - 1]! };
}

const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
export const monthLabel = (anchor: string) => { const s = fmtMonth.format(parseDay(anchor)); return s[0]!.toUpperCase() + s.slice(1); };
export const dayLabel = (s: string) => { const l = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(parseDay(s)); return l[0]!.toUpperCase() + l.slice(1); };
export const weekLabel = (anchor: string) => {
  const s = weekStart(anchor), e = addDays(s, 6);
  const f = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
  return `${f.format(parseDay(s))} au ${f.format(parseDay(e))}`;
};
export const endTime = (heure: string, duree: number) => {
  const m = Number(heure.slice(0, 2)) * 60 + Number(heure.slice(3, 5)) + duree;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
