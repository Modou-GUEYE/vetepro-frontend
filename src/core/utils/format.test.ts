import { describe, expect, it } from 'vitest';
import { ageLabel, formatFcfa } from './format';

const now = new Date('2026-10-22T12:00:00Z');

describe('ageLabel', () => {
  it('affiche des années, des mois ou des jours', () => {
    expect(ageLabel('2020-05-10', now)).toBe('6 ans');
    expect(ageLabel('2025-10-23', now)).toBe('11 mois');
    expect(ageLabel('2026-10-01', now)).toBe('21 jours');
    expect(ageLabel('2025-10-22', now)).toBe('1 an');
  });
  it('est vide sans date ou avec une date future', () => {
    expect(ageLabel(null, now)).toBe('');
    expect(ageLabel('2999-01-01', now)).toBe('');
  });
});

describe('formatFcfa', () => {
  it('sépare les milliers', () => expect(formatFcfa(12500)).toBe('12 500 FCFA'));
});
