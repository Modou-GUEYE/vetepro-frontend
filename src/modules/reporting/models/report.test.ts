import { describe, expect, it } from 'vitest';
import { PeriodKey, Report, emptyFilters, periodError, periodRange, regulatoryToCsv, reportPrintHtml, tableToCsv, toParams } from './report';

const NOW = new Date('2026-10-26T10:00:00');
const range = (k: PeriodKey) => periodRange(k, '', '', NOW);

describe('périodes', () => {
  it('calcule le mois, le mois précédent, le trimestre et l\'année', () => {
    expect(range('mois')).toEqual({ du: '2026-10-01', au: '2026-10-31' });
    expect(range('mois-1')).toEqual({ du: '2026-09-01', au: '2026-09-30' });
    expect(range('trim')).toEqual({ du: '2026-10-01', au: '2026-12-31' });
    expect(range('annee')).toEqual({ du: '2026-01-01', au: '2026-12-31' });
    expect(range('tout')).toEqual({ du: '', au: '' });
    expect(periodRange('perso', '2026-01-05', '2026-02-01', NOW)).toEqual({ du: '2026-01-05', au: '2026-02-01' });
  });
  it('refuse une fin de période avant le début', () => {
    expect(periodError({ ...emptyFilters(), period: 'perso', du: '2026-02-01', au: '2026-01-01' })).toContain('précède');
    expect(periodError({ ...emptyFilters(), period: 'perso', du: '2026-01-01', au: '2026-02-01' })).toBe('');
  });
  it('ne transmet que les filtres renseignés', () => {
    expect(toParams({ ...emptyFilters('factures'), statut: 'payee' })).toEqual({ groupe: 'prestation', statut: 'payee' });
  });
});

describe('exports', () => {
  const table = { colonnes: [{ cle: 'd', libelle: 'Date', type: 'date' as const }, { cle: 'n', libelle: 'Nom', type: 'texte' as const }, { cle: 'm', libelle: 'Total', type: 'fcfa' as const }], lignes: [{ id: null, cells: ['2026-10-01', 'Dr "Sy"', 12500] }] };
  it('CSV Excel : BOM, point-virgule, guillemets doublés, montants bruts', () => {
    const csv = tableToCsv(table);
    expect(csv.startsWith('﻿"Date";"Nom";"Total"')).toBe(true);
    expect(csv).toContain('"01/10/2026";"Dr ""Sy""";"12500"');
  });
  it('PDF : les textes saisis sont échappés', () => {
    const r = { ...table, type: 'factures', kpis: [{ label: 'Factures', valeur: 1, format: 'nombre' }], graphiques: [], synthese: null } as unknown as Report;
    const html = reportPrintHtml({ ...r, lignes: [{ id: null, cells: ['2026-10-01', '<b>x</b>', 100] }] }, 'Rapport', 'Mois en cours');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).not.toContain('<b>x</b>');
  });
  it('rapport réglementaire : en-tête du cabinet puis une synthèse et un détail par section', () => {
    const csv = regulatoryToCsv({ cabinet: { nom: 'Clinique', ordre: 'ODVS-1', adresse: '', telephone: '', email: '' }, du: '2026-01-01', au: '2026-03-31', genereLe: '2026-04-01T00:00:00Z', generePar: 'x', sections: [{ cle: 'consultations', titre: 'Consultations', synthese: table, detail: table }] });
    expect(csv).toContain('"Clinique";"N° d\'ordre";"ODVS-1"');
    expect(csv).toContain('"Consultations, synthèse"');
    expect(csv).toContain('"Consultations, détail"');
  });
});
