import { describe, expect, it } from 'vitest';
import { addDays, endTime, monthGrid, rangeOf, weekStart } from './rdv';

describe('planning : dates', () => {
  it('trouve le lundi de la semaine', () => {
    expect(weekStart('2026-10-23')).toBe('2026-10-19');
    expect(weekStart('2026-10-25')).toBe('2026-10-19');
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
  });
  it('construit un mois en semaines complètes de lundi à dimanche', () => {
    const g = monthGrid('2026-10-15');
    expect(g[0]).toBe('2026-09-28');
    expect(g[g.length - 1]).toBe('2026-11-01');
    expect(g.length % 7).toBe(0);
  });
  it('calcule les plages de chaque vue', () => {
    expect(rangeOf('semaine', '2026-10-23')).toEqual({ du: '2026-10-19', au: '2026-10-25' });
    expect(rangeOf('mois', '2026-10-23')).toEqual({ du: '2026-09-28', au: '2026-11-01' });
    expect(rangeOf('liste', '2026-10-23').du).toBe('2026-10-01');
  });
  it('ajoute des jours à travers un changement de mois', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it("donne l'heure de fin", () => {
    expect(endTime('09:45', 30)).toBe('10:15');
    expect(endTime('16:30', 90)).toBe('18:00');
  });
});
