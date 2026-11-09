import { describe, expect, it } from 'vitest';
import type { InvoiceDetail } from './facture';
import { receiptHtml, receiptMode, receiptNumber, receiptPayment, receiptRef } from './recu';

const cash = { id: 'p1', date: '2026-10-30T10:00:00.000Z', montant: 5000, mode: 'Espèces', par: 'Dr Amadou Sy' };
const wave = { id: 'p2', date: '2026-10-30T11:00:00.000Z', montant: 3000, mode: 'Mobile money', par: 'Wave TX-26-000481' };
const inv = { numero: 'FAC-0003', client: { nom: 'Moussa <Diallo>' }, reste: 2000, paiements: [cash, wave] } as unknown as InvoiceDetail;

describe('reçu de paiement', () => {
  it('numérote le reçu selon le rang du paiement', () => {
    expect(receiptNumber(inv, cash)).toBe('REC-0003-1');
    expect(receiptNumber(inv, wave)).toBe('REC-0003-2');
  });
  it("retrouve le canal et la référence d'un paiement électronique", () => {
    expect(receiptMode(wave)).toBe('Wave');
    expect(receiptRef(wave)).toBe('TX-26-000481');
    expect(receiptMode(cash)).toBe('Espèces');
    expect(receiptRef(cash)).toBe('-');
  });
  it('prend le dernier paiement par défaut', () => {
    expect(receiptPayment(inv)?.id).toBe('p2');
    expect(receiptPayment(inv, 'p1')?.id).toBe('p1');
    expect(receiptPayment({ ...inv, paiements: [] })).toBeUndefined();
  });
  it('échappe les textes saisis dans le document imprimable', () => {
    const html = receiptHtml(inv, wave);
    expect(html).toContain('Moussa &lt;Diallo&gt;');
    expect(html).toContain('REC-0003-2');
  });
});
