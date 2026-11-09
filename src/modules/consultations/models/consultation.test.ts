import { describe, expect, it } from 'vitest';
import { consultationFormSchema, emptyConsultationForm, stockOverruns } from './consultation';

const ok = { ...emptyConsultationForm('1'), serviceId: '1' };

describe('formulaire de consultation', () => {
  it('accepte un dossier, un type de service et une date, sans médicament', () => expect(consultationFormSchema.safeParse(ok).success).toBe(true));
  it('exige le dossier patient et le type de service', () => {
    expect(consultationFormSchema.safeParse({ ...ok, patientId: '' }).success).toBe(false);
    expect(consultationFormSchema.safeParse({ ...ok, serviceId: '' }).success).toBe(false);
  });
  it('refuse une date dans le futur', () => expect(consultationFormSchema.safeParse({ ...ok, date: '2999-01-01' }).success).toBe(false));
  it('plusieurs médicaments en stock et externes, avec quantité entière positive', () => {
    const lignes = { stock: [{ articleId: '1', quantite: '5', dosage: '', posologie: '' }, { articleId: '2', quantite: '2', dosage: '', posologie: '' }], externes: [{ nom: 'Sirop', quantite: '1', dosage: '', posologie: '' }] };
    expect(consultationFormSchema.safeParse({ ...ok, ...lignes }).success).toBe(true);
    expect(consultationFormSchema.safeParse({ ...ok, stock: [{ articleId: '1', quantite: '0', dosage: '', posologie: '' }] }).success).toBe(false);
    expect(consultationFormSchema.safeParse({ ...ok, stock: [{ articleId: '', quantite: '1', dosage: '', posologie: '' }] }).success).toBe(false);
    expect(consultationFormSchema.safeParse({ ...ok, externes: [{ nom: ' ', quantite: '1', dosage: '', posologie: '' }] }).success).toBe(false);
  });
});

describe('contrôle du stock en direct', () => {
  const choices = [{ id: '1', quantite: 10 }, { id: '2', quantite: 3 }];
  it('repère un médicament demandé au-delà du stock, lignes additionnées', () => {
    expect(stockOverruns([{ articleId: '1', quantite: '5' }], choices)).toEqual([]);
    expect(stockOverruns([{ articleId: '2', quantite: '2' }, { articleId: '2', quantite: '2' }], choices)).toEqual(['2']);
    expect(stockOverruns([{ articleId: '', quantite: '99' }], choices)).toEqual([]);
  });
});
