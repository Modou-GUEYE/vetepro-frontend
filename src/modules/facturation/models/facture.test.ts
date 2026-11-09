import { describe, expect, it } from 'vitest';
import { computeTotals, emptyInvoiceForm, invoiceFormSchema } from './facture';

describe('calcul des totaux', () => {
  it('sous-total, remise, total et reste', () => {
    expect(computeTotals([{ quantite: 1, prixUnitaire: 5000 }, { quantite: 10, prixUnitaire: 350 }], 10, 3000)).toEqual({ sousTotal: 8500, remise: 850, total: 7650, reste: 4650 });
  });
  it('ignore les valeurs vides et borne la remise à 100 %', () => {
    expect(computeTotals([{ quantite: 2, prixUnitaire: 100 }], 150, 0)).toMatchObject({ total: 0, reste: 0 });
    expect(computeTotals([], 0, 0)).toMatchObject({ total: 0 });
  });
});

describe('formulaire de facture', () => {
  const ok = { ...emptyInvoiceForm(), patientId: '1', lignes: [{ description: 'Consultation générale', quantite: '1', prixUnitaire: '5000' }] };
  it('accepte une facture valide', () => expect(invoiceFormSchema.safeParse(ok).success).toBe(true));
  it('exige un dossier patient et une ligne décrite', () => {
    expect(invoiceFormSchema.safeParse({ ...ok, patientId: '' }).success).toBe(false);
    expect(invoiceFormSchema.safeParse({ ...ok, lignes: [{ description: ' ', quantite: '1', prixUnitaire: '100' }] }).success).toBe(false);
  });
  it('refuse une remise supérieure à 100 et un montant reçu supérieur au total', () => {
    expect(invoiceFormSchema.safeParse({ ...ok, remisePct: '120' }).success).toBe(false);
    expect(invoiceFormSchema.safeParse({ ...ok, montantRecu: '6000' }).success).toBe(false);
    expect(invoiceFormSchema.safeParse({ ...ok, montantRecu: '5000' }).success).toBe(true);
  });
});
