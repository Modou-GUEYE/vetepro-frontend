import { describe, expect, it } from 'vitest';
import { billFormSchema, campagneFormSchema, emptyCampagne, emptyVaccination, terrainFormSchema, vaccinationFormSchema } from './vaccination';
import { vaccinationHtml } from './printVaccination';

const msg = (r: { success: boolean; error?: { issues: { message: string }[] } }) => (r.success ? '' : r.error!.issues[0].message);

describe('formulaire de vaccination', () => {
  it('exige l\'animal et la date', () => {
    expect(msg(vaccinationFormSchema.safeParse(emptyVaccination()))).toBe('Animal et date requis');
    expect(vaccinationFormSchema.safeParse(emptyVaccination({ patientId: '1' })).success).toBe(true);
    expect(msg(vaccinationFormSchema.safeParse(emptyVaccination({ patientId: '1', date: '' })))).toBe('Animal et date requis');
  });
  it('le rappel ne précède pas la vaccination et le tarif est un entier', () => {
    expect(msg(vaccinationFormSchema.safeParse(emptyVaccination({ patientId: '1', date: '2026-01-10', rappel: '2026-01-01' })))).toContain('rappel');
    expect(vaccinationFormSchema.safeParse(emptyVaccination({ patientId: '1', tarif: '12,5' })).success).toBe(false);
  });
});

describe('autres formulaires', () => {
  it('« Facturer » refuse un montant nul', () => {
    expect(msg(billFormSchema.safeParse({ tarif: '0' }))).toBe('Montant invalide');
    expect(msg(billFormSchema.safeParse({ tarif: '' }))).toBe('Montant invalide');
    expect(billFormSchema.safeParse({ tarif: '3500' }).success).toBe(true);
  });
  it('campagne : nom et zone requis, espèce cible obligatoire', () => {
    expect(msg(campagneFormSchema.safeParse({ ...emptyCampagne(), especeId: 'chien' }))).toBe('Nom et zone requis');
    expect(campagneFormSchema.safeParse({ ...emptyCampagne(), nom: 'A', zone: 'B' }).success).toBe(false);
    expect(campagneFormSchema.safeParse({ ...emptyCampagne(), nom: 'A', zone: 'B', especeId: 'chien', vises: '50' }).success).toBe(true);
  });
  it('saisie terrain : nom de l\'animal requis', () => {
    expect(msg(terrainFormSchema.safeParse({ animal: ' ', proprietaire: '', vaccin: '' }))).toBe("Nom de l'animal requis");
  });
});

describe('facture de vaccination imprimable', () => {
  it('reprend le propriétaire, l\'animal, le lot et échappe les textes saisis', () => {
    const html = vaccinationHtml({
      id: '1', vaccin: 'Rage', date: '2026-10-01', rappel: '2027-10-01', statut: 'a_jour', lot: 'L<1>', notes: '', tarif: 5000, numero: 'VAC-0001', facture_id: '1',
      patient: { id: '1', nom: 'Rex', espece: 'Chien' }, proprietaire: { id: '1', nom: 'Moussa Diallo', telephone: '77', adresse: 'Dakar' },
      animal: { nom: 'Rex', espece: 'Chien', race: 'Berger', sexe: 'M', puce: '' },
    });
    expect(html).toContain('VAC-0001');
    expect(html).toContain('Moussa Diallo');
    expect(html).toContain('L&lt;1&gt;');
    expect(html).not.toContain('L<1>');
  });
});
