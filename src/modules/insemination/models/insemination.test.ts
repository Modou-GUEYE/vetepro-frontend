import { describe, expect, it } from 'vitest';
import { diagnosticSchemaFor, emptyInsem, emptyMiseBas, insemFormSchema, miseBasSchemaFor, toCsv, Acte, tarifLocked } from './insemination';

const msgs = (r: { success: boolean; error?: { issues: { message: string }[] } }) => (r.success ? [] : r.error!.issues.map((i) => i.message));
const base = (o = {}) => emptyInsem({ patientId: '5', ...o });
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

describe('formulaire d\'acte', () => {
  it('exige un patient', () => { expect(msgs(insemFormSchema.safeParse(emptyInsem()))).toContain('Choisissez un patient'); });
  it('n\'accepte une date future que pour un acte planifié', () => {
    expect(insemFormSchema.safeParse(base({ date: inDays(5), statut: 'planifie' })).success).toBe(true);
    expect(msgs(insemFormSchema.safeParse(base({ date: inDays(5), statut: 'realise', nomGeniteur: 'T' })))[0]).toContain('planifié');
  });
  it('une IA réalisée exige le lot ou le géniteur', () => {
    expect(msgs(insemFormSchema.safeParse(base({ statut: 'realise', methode: 'ia_congelee', date: inDays(-1) })))[0]).toContain('lot ou le nom du géniteur');
    expect(insemFormSchema.safeParse(base({ statut: 'realise', methode: 'ia_congelee', date: inDays(-1), lot: 'L1' })).success).toBe(true);
    expect(insemFormSchema.safeParse(base({ statut: 'realise', methode: 'naturelle', date: inDays(-1) })).success).toBe(true);
  });
  it('le tarif est un entier', () => { expect(insemFormSchema.safeParse(base({ tarif: '25,5' })).success).toBe(false); });
});

describe('diagnostic et mise-bas', () => {
  it('le diagnostic ne précède pas l\'acte', () => {
    const s = diagnosticSchemaFor('2026-05-10');
    expect(msgs(s.safeParse({ date: '2026-05-01', methode: '', resultat: 'positif', miseBasPrevue: '' }))[0]).toContain("précéder la date de l'acte");
    expect(s.safeParse({ date: '2026-06-01', methode: 'echographie', resultat: 'positif', miseBasPrevue: '' }).success).toBe(true);
  });
  it('la mise-bas réelle ne précède pas l\'acte', () => {
    const s = miseBasSchemaFor('2026-05-10');
    expect(s.safeParse({ ...emptyMiseBas(), date: '2026-05-01' }).success).toBe(false);
    expect(s.safeParse({ ...emptyMiseBas(), date: '2026-05-20' }).success).toBe(true);
  });
});

describe('export et tarif verrouillé', () => {
  const acte = { numero: 'INS-1', patient: { nom: 'Vaillante', espece: 'Bovin' }, proprietaire: { nom: 'Diallo' }, methode: 'ia', statut: 'realise', semence: { race_geniteur: 'Gobra', nom_geniteur: 'T1', lot: 'L1' }, date: '2026-01-02', veterinaire: null, diagnostic: null, resultat: 'attente', mise_bas_prevue: null, mise_bas: null, facture: { id: '1', numero: 'FAC-1', total: 100, reste: 40, statut: 'partielle' }, tarif: 100 } as unknown as Acte;
  it('CSV Excel : BOM, séparateur point-virgule, guillemets doublés', () => {
    const csv = toCsv([acte]);
    expect(csv.startsWith('﻿"N°";"Patient"')).toBe(true);
    expect(csv).toContain('"INS-1";"Vaillante"');
    expect(csv).toContain('"02/01/2026"');
  });
  it('le tarif est verrouillé dès qu\'un paiement a été reçu', () => {
    expect(tarifLocked(acte)).toBe(true);
    expect(tarifLocked({ ...acte, facture: { ...acte.facture!, reste: 100 } })).toBe(false);
    expect(tarifLocked(undefined)).toBe(false);
  });
});
