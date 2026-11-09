import { http } from '@/core/http/client';
import { toNewPatientDto } from '@/modules/patients/models/newPatient';
import { AdmissionForm, ExitForm, ExitPreview, HospiDetail, HospiRow, HospiStats, PrescriptionForm, exitPreviewDtoSchema, hospiDetailDtoSchema, hospiListDtoSchema } from '../models/hospi';

const info = (f: AdmissionForm) => ({
  veterinaire_id: f.vetId || null, box: f.box, date_entree: f.dateEntree, date_sortie_prevue: f.dateSortiePrevue || null,
  tarif_jour: Number(f.tarifJour), tarif_consultation: Number(f.tarifConsultation || 0), motif: f.motif, observations: f.observations,
});

export const hospiService = {
  async list(statut: 'encours' | 'sorti', q: string): Promise<{ items: HospiRow[]; stats: HospiStats }> {
    const d = hospiListDtoSchema.parse((await http.get('/hospitalisations', { params: { statut, ...(q ? { q } : {}) } })).data);
    return { items: d.items, stats: d.stats };
  },
  async get(id: string): Promise<HospiDetail> { return hospiDetailDtoSchema.parse((await http.get(`/hospitalisations/${id}`)).data); },
  async admit(f: AdmissionForm): Promise<HospiDetail> {
    const patient = f.mode === 'existant' ? { patient_id: f.patientId } : { nouveau_patient: toNewPatientDto(f.np) };
    return hospiDetailDtoSchema.parse((await http.post('/hospitalisations', { ...info(f), ...patient })).data);
  },
  async update(id: string, f: AdmissionForm): Promise<HospiDetail> { return hospiDetailDtoSchema.parse((await http.put(`/hospitalisations/${id}`, info(f))).data); },
  async prescribe(id: string, f: PrescriptionForm): Promise<HospiDetail> {
    return hospiDetailDtoSchema.parse((await http.post(`/hospitalisations/${id}/prescriptions`, {
      date: f.date, heure: f.heure, veterinaire_id: f.vetId || null, observations: f.observations,
      lignes: f.lignes.map((l) => ({ acte: l.acte, type: l.type, article_id: l.type === 'medicament' ? l.articleId : null, quantite: Number(l.quantite), prix_unitaire: Number(l.prixUnitaire || 0) })),
    })).data);
  },
  async exitPreview(id: string, date: string): Promise<ExitPreview> { return exitPreviewDtoSchema.parse((await http.get(`/hospitalisations/${id}/apercu-sortie`, { params: { date } })).data); },
  async discharge(id: string, f: ExitForm): Promise<HospiDetail> {
    return hospiDetailDtoSchema.parse((await http.post(`/hospitalisations/${id}/sortie`, {
      date_sortie: f.dateSortie, etat: f.etat, compte_rendu: f.compteRendu, remise_pct: Number(f.remisePct || 0), mode: f.mode, montant_recu: Number(f.montantRecu || 0),
      lignes: f.lignes.map((l) => ({ description: l.description, quantite: Number(l.quantite), prix_unitaire: Number(l.prixUnitaire) })),
    })).data);
  },
};
