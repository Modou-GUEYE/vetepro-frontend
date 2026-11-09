import { describe, expect, it } from 'vitest';
import { clock, phoneOk, qrPattern, secondsLeft } from './paiements';

describe('paiements : modèle', () => {
  it('valide un numéro sénégalais avec ou sans indicatif', () => {
    expect(phoneOk('77 123 45 67')).toBe(true);
    expect(phoneOk('+221771234567')).toBe(true);
    expect(phoneOk('12 34')).toBe(false);
  });
  it('compte à rebours sans valeur négative', () => {
    const t0 = new Date('2026-10-29T10:00:00Z').getTime();
    expect(secondsLeft('2026-10-29T10:05:00Z', t0)).toBe(300);
    expect(secondsLeft('2026-10-29T10:05:00Z', t0 + 600000)).toBe(0);
    expect(clock(300)).toBe('05:00');
    expect(clock(65)).toBe('01:05');
  });
  it('motif de démonstration stable pour une même référence', () => {
    expect(qrPattern('TX-1')).toEqual(qrPattern('TX-1'));
    expect(qrPattern('TX-1')).not.toEqual(qrPattern('TX-2'));
    expect(qrPattern('TX-1')[0][0]).toBe(true);
  });
});
