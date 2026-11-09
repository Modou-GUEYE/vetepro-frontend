import { describe, expect, it } from 'vitest';
import { emptyPatientForm, patientFormSchema, toRequestBody } from './patient';

const animal = { ...emptyPatientForm('animal'), proprietaireId: '1', nom: 'Luna', especeId: 'chien' };
const troupeau = { ...emptyPatientForm('troupeau'), proprietaireId: '1', nom: 'Troupeau Fall', especeId: 'bovin', effectif: '20', femelles: '12', males: '5', jeunes: '3' };

describe('formulaire de dossier patient', () => {
  it('accepte un animal avec propriétaire, nom et espèce', () => expect(patientFormSchema.safeParse(animal).success).toBe(true));

  it('refuse un animal sans propriétaire, nom ou espèce', () => {
    const r = patientFormSchema.safeParse({ ...animal, proprietaireId: '', nom: '', especeId: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path[0]).sort()).toEqual(['especeId', 'nom', 'proprietaireId']);
  });

  it('refuse une date de naissance dans le futur', () => expect(patientFormSchema.safeParse({ ...animal, naissance: '2999-01-01' }).success).toBe(false));

  it("exige l'effectif d'un troupeau et que femelles + mâles + jeunes ne le dépassent pas", () => {
    expect(patientFormSchema.safeParse(troupeau).success).toBe(true);
    expect(patientFormSchema.safeParse({ ...troupeau, effectif: '' }).success).toBe(false);
    expect(patientFormSchema.safeParse({ ...troupeau, effectif: '10' }).success).toBe(false);
    expect(patientFormSchema.safeParse({ ...troupeau, femelles: '', males: '', jeunes: '' }).success).toBe(true);
  });

  it("n'applique pas les règles du troupeau à un animal", () => {
    expect(patientFormSchema.safeParse({ ...animal, effectif: '', femelles: '99' }).success).toBe(true);
  });

  it('convertit le formulaire en requête (nombres, vides en null)', () => {
    expect(toRequestBody(troupeau)).toMatchObject({ type: 'troupeau', effectif: 20, femelles: 12, race_id: null, sexe: null, naissance: null });
  });
});
