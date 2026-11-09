import { http } from '@/core/http/client';
import { toNewPatientDto } from '@/modules/patients/models/newPatient';
import {
  Acte, ActeFilters, DeleteForm, DiagnosticForm, Gestation, InsemForm, InsemStats, MiseBasForm, Rappel, acteDtoSchema, gestationsDtoSchema, insemListDtoSchema, rappelEnvoiDtoSchema, rappelsDtoSchema,
} from '../models/insemination';

/** Confirmations demandées par l'utilisateur après un avertissement (doublon, remise à zéro du résultat). */
export interface Confirmations { doublon?: boolean; reinitialisation?: boolean }

const body = (f: InsemForm, c: Confirmations) => ({
  date: f.date, methode: f.methode, veterinaire_id: f.vetId || null, statut: f.statut, observations: f.observations,
  semence: { race_geniteur: f.raceGeniteur, nom_geniteur: f.nomGeniteur, lot: f.lot, dose: f.dose, origine: f.origine, date_collecte: f.dateCollecte || null },
  tarif: Number(f.tarif || 0), mode_paiement: f.modePaiement, confirmer_doublon: !!c.doublon, confirmer_reinitialisation: !!c.reinitialisation,
});

export const inseminationService = {
  async list(f: ActeFilters): Promise<{ items: Acte[]; stats: InsemStats }> {
    const params = Object.fromEntries(Object.entries({ filtre: f.filtre === 'all' ? '' : f.filtre, q: f.q, du: f.du, au: f.au, espece: f.espece, methode: f.methode, veterinaire: f.veterinaire }).filter(([, v]) => v));
    const d = insemListDtoSchema.parse((await http.get('/inseminations', { params })).data);
    return { items: d.items, stats: d.stats };
  },
  async gestations(): Promise<Gestation[]> { return gestationsDtoSchema.parse((await http.get('/inseminations/gestations')).data).items; },
  async rappels(): Promise<{ items: Rappel[]; delaiDiagnostic: number; delaiMiseBas: number }> {
    const d = rappelsDtoSchema.parse((await http.get('/inseminations/rappels')).data);
    return { items: d.items, delaiDiagnostic: d.delai_diagnostic, delaiMiseBas: d.delai_mise_bas };
  },
  async sendRappel(id: string): Promise<{ ok: boolean; message: string }> { return rappelEnvoiDtoSchema.parse((await http.post(`/inseminations/rappels/${id}/envoyer`)).data); },
  async create(f: InsemForm, c: Confirmations = {}): Promise<Acte> {
    const patient = f.mode === 'existant' ? { patient_id: f.patientId } : { nouveau_patient: toNewPatientDto(f.np) };
    return acteDtoSchema.parse((await http.post('/inseminations', { ...body(f, c), ...patient })).data);
  },
  async update(id: string, f: InsemForm, c: Confirmations = {}): Promise<Acte> {
    return acteDtoSchema.parse((await http.put(`/inseminations/${id}`, { ...body(f, c), patient_id: f.patientId })).data);
  },
  async diagnose(id: string, f: DiagnosticForm): Promise<Acte> {
    return acteDtoSchema.parse((await http.post(`/inseminations/${id}/diagnostic`, { date: f.date, methode: f.methode, resultat: f.resultat, mise_bas_prevue: f.miseBasPrevue || null })).data);
  },
  async miseBas(id: string, f: MiseBasForm): Promise<Acte> {
    return acteDtoSchema.parse((await http.post(`/inseminations/${id}/mise-bas`, { date: f.date, vivants: Number(f.vivants || 0), morts: Number(f.morts || 0), observations: f.observations })).data);
  },
  async remove(id: string, f: DeleteForm): Promise<void> { await http.delete(`/inseminations/${id}`, { data: f }); },
};
