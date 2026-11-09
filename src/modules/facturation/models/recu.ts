import { formatDateTime, formatFcfa } from '@/core/utils/format';
import type { InvoiceDetail } from './facture';
import { esc } from './printInvoice';

export type InvoicePayment = InvoiceDetail['paiements'][number];

/** Un paiement électronique est enregistré par « Canal TX-26-000481 » : le canal et la référence de transaction s'y retrouvent. */
const ELECTRONIC = /^(Wave|Orange Money|PI-SPI) (\S+)$/;

export const receiptNumber = (inv: InvoiceDetail, p: InvoicePayment) => `REC-${inv.numero.replace(/^FAC-?/i, '')}-${inv.paiements.indexOf(p) + 1}`;
export const receiptMode = (p: InvoicePayment) => ELECTRONIC.exec(p.par)?.[1] ?? p.mode;
export const receiptRef = (p: InvoicePayment) => ELECTRONIC.exec(p.par)?.[2] ?? '-';
/** Reçu du paiement indiqué, ou du dernier paiement de la facture. */
export const receiptPayment = (inv: InvoiceDetail, paymentId?: string) => (paymentId ? inv.paiements.find((p) => p.id === paymentId) : inv.paiements[inv.paiements.length - 1]);

/** Reçu imprimable d'un paiement, aux couleurs de la charte. */
export function receiptHtml(inv: InvoiceDetail, p: InvoicePayment, cabinet = 'Clinique Vétérinaire de Dakar'): string {
  const rows: [string, string][] = [['Facture', inv.numero], ['Client', inv.client.nom], ['Mode', receiptMode(p)], ['Référence', receiptRef(p)], ['Reste dû', formatFcfa(inv.reste)]];
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(receiptNumber(inv, p))}</title><style>
*{box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;color:#0f1f2b;padding:28px;max-width:480px;margin:auto}
header{background:#0b2a30;color:#fff;padding:18px 22px;border-radius:12px}h1{margin:0;font-size:18px}.muted{color:#5b6b78;font-size:12px}
.amt{font-size:30px;font-weight:700;text-align:center;margin:18px 0 2px}.c{text-align:center}
table{width:100%;border:1px dashed #c9d5dc;border-radius:12px;padding:8px 14px;margin-top:16px;border-collapse:separate}td{padding:6px 0;border-bottom:1px dotted #c9d5dc;font-size:13px}tr:last-child td{border:0}.r{text-align:right;font-weight:600}
</style></head><body>
<header><h1>${esc(cabinet)}</h1><div class="muted" style="color:#9fc">Reçu de paiement</div></header>
<div class="amt">${esc(formatFcfa(p.montant))}</div><div class="c muted">${esc(receiptNumber(inv, p))}, ${esc(formatDateTime(p.date))}</div>
<table><tbody>${rows.map(([k, v]) => `<tr><td>${k}</td><td class="r">${esc(v)}</td></tr>`).join('')}</tbody></table>
</body></html>`;
}

export function printReceipt(inv: InvoiceDetail, p: InvoicePayment): boolean {
  const w = window.open('', '_blank', 'width=640,height=800');
  if (!w) return false;
  w.document.write(receiptHtml(inv, p));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
  return true;
}
