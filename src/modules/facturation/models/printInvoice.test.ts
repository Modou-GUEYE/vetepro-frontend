import { describe, expect, it } from 'vitest';
import { InvoiceDetail } from './facture';
import { invoiceHtml } from './printInvoice';

const inv: InvoiceDetail = {
  id: '9', numero: 'FAC-0009', date: '2026-10-23', source: 'manuel', client: { id: '1', nom: 'Moussa <b>Diallo</b>', telephone: '', email: '' }, patient: { id: '1', nom: 'Rex' },
  total: 7650, paye: 3000, reste: 4650, statut: 'partielle', consultationId: null, notes: '<script>alert(1)</script>', remisePct: 10, sousTotal: 8500, remise: 850,
  lignes: [{ description: 'Consultation générale', quantite: 1, prixUnitaire: 5000, total: 5000 }], paiements: [{ id: 'p', date: '2026-10-23T10:00:00.000Z', montant: 3000, mode: 'Espèces', par: 'x' }], avoirs: [],
};

describe('document imprimable', () => {
  it('affiche numéro, client, totaux et reste à payer', () => {
    const html = invoiceHtml(inv);
    expect(html).toContain('FAC-0009');
    expect(html).toContain('4 650 FCFA');
    expect(html).toContain('Partielle');
  });
  it('échappe les textes saisis', () => {
    const html = invoiceHtml(inv);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>Diallo</b>');
    expect(html).toContain('&lt;script&gt;');
  });
});
