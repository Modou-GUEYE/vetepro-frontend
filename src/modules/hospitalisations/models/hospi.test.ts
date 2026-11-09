import { describe, expect, it } from 'vitest';
import { admissionFormSchema, emptyAdmission, emptyLine, emptyPrescription, exitTotals, prescriptionFormSchema, prescriptionTotal } from './hospi';

describe('hospitalisation : formulaires', () => {
  it("exige box, motif et un patient", () => {
    const r = admissionFormSchema.safeParse(emptyAdmission());
    expect(r.success).toBe(false);
    const paths = r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['box', 'motif', 'patientId']));
  });
  it("valide un nouvel animal avec son propriétaire", () => {
    const f = emptyAdmission({ mode: 'nouveau', box: 'A1', motif: 'Perfusion', np: { nom: 'Rocky', especeId: 'chien', raceId: '', sexe: '', naissance: '', ownerMode: 'nouveau', ownerId: '', prenom: 'Awa', ownerNom: 'Sow', telephone: '', email: '' } });
    const r = admissionFormSchema.safeParse(f);
    expect(r.success ? [] : r.error.issues.map((i) => i.path.join('.'))).toEqual(['np.telephone']);
  });
  it('refuse une sortie prévue avant l\'entrée', () => {
    const r = admissionFormSchema.safeParse(emptyAdmission({ patientId: '1', box: 'A1', motif: 'x', dateEntree: '2026-10-20', dateSortiePrevue: '2026-10-19' }));
    expect(r.success ? [] : r.error.issues.map((i) => i.path.join('.'))).toEqual(['dateSortiePrevue']);
  });
  it('exige un médicament choisi ou un acte tarifé', () => {
    const base = emptyPrescription();
    const bad = prescriptionFormSchema.safeParse({ ...base, lignes: [{ ...emptyLine(), type: 'medicament' }, { ...emptyLine(), acte: 'Perfusion', prixUnitaire: '' }] });
    expect(bad.success ? [] : bad.error.issues.map((i) => i.path.join('.'))).toEqual(['lignes.0.articleId', 'lignes.1.prixUnitaire']);
  });
});

describe('hospitalisation : montants', () => {
  it("prend le prix de l'article pour un médicament et la saisie pour un soin", () => {
    const lignes = [{ ...emptyLine(), type: 'medicament' as const, articleId: '2', quantite: '4' }, { ...emptyLine(), acte: 'Perfusion', quantite: '1', prixUnitaire: '4000' }];
    expect(prescriptionTotal(lignes, () => 200)).toBe(4800);
  });
  it('calcule la facture de sortie avec lignes ajoutées, remise et montant reçu', () => {
    const t = exitTotals([{ quantite: 3, prix_unitaire: 5000 }, { quantite: 1, prix_unitaire: 3000 }], [{ quantite: '1', prixUnitaire: '2000' }], 10, 10000);
    expect(t).toEqual({ sous: 20000, total: 18000, recu: 10000, reste: 8000 });
  });
  it('ne compte jamais un montant reçu supérieur au total', () => {
    expect(exitTotals([{ quantite: 1, prix_unitaire: 1000 }], [], 0, 5000)).toMatchObject({ recu: 1000, reste: 0 });
  });
});
