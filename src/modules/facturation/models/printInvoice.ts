import { formatDate, formatDateTime, formatFcfa } from '@/core/utils/format';
import { InvoiceDetail, STATUS_LABEL } from './facture';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Document imprimable (facture ou reçu) aux couleurs de la charte. Les textes saisis sont échappés. */
export function invoiceHtml(inv: InvoiceDetail, cabinet = 'Clinique Vétérinaire de Dakar'): string {
  const rows = inv.lignes.map((l) => `<tr><td>${esc(l.description)}</td><td class="r">${l.quantite}</td><td class="r">${esc(formatFcfa(l.prixUnitaire))}</td><td class="r">${esc(formatFcfa(l.total))}</td></tr>`).join('');
  const pays = inv.paiements.map((p) => `<tr><td>${esc(formatDateTime(p.date))}</td><td>${esc(p.mode)}</td><td class="r">${esc(formatFcfa(p.montant))}</td></tr>`).join('');
  const credits = inv.avoirs.map((a) => `<tr><td>${esc(a.numero)} (${esc(a.motif)})</td><td class="r">- ${esc(formatFcfa(a.montant))}</td></tr>`).join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(inv.numero)}</title><style>
*{box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;color:#0f1f2b;padding:28px;max-width:720px;margin:auto}
header{background:#0b2a30;color:#fff;padding:18px 22px;border-radius:12px;display:flex;justify-content:space-between}
h1{margin:0;font-size:20px}.muted{color:#5b6b78;font-size:12px}table{width:100%;border-collapse:collapse;margin:14px 0}
th{background:#f3f6f8;text-align:left;font-size:11px;text-transform:uppercase;padding:8px}td{padding:8px;border-bottom:1px solid #e1e8ed;font-size:13px}
.r{text-align:right}.tot td{font-weight:700;border:0}.badge{display:inline-block;background:#e3f5f3;color:#0a6463;border-radius:99px;padding:2px 10px;font-size:12px;font-weight:600}
</style></head><body>
<header><div><h1>${esc(cabinet)}</h1><div class="muted" style="color:#9fc">Facture ${esc(inv.numero)}</div></div><div style="text-align:right"><div>${esc(formatDate(inv.date))}</div><span class="badge">${esc(STATUS_LABEL[inv.statut])}</span></div></header>
<p><b>Client :</b> ${esc(inv.client.nom)}${inv.patient ? `<br><b>Patient :</b> ${esc(inv.patient.nom)}` : ''}</p>
<table><thead><tr><th>Description</th><th class="r">Qté</th><th class="r">P.U.</th><th class="r">Total</th></tr></thead><tbody>${rows}</tbody></table>
<table><tbody>
<tr><td>Sous-total</td><td class="r">${esc(formatFcfa(inv.sousTotal))}</td></tr>
${inv.remisePct ? `<tr><td>Remise (${inv.remisePct} %)</td><td class="r">- ${esc(formatFcfa(inv.remise))}</td></tr>` : ''}
${credits}
<tr class="tot"><td>Total</td><td class="r">${esc(formatFcfa(inv.total))}</td></tr>
<tr><td>Payé</td><td class="r">${esc(formatFcfa(inv.paye))}</td></tr>
<tr class="tot"><td>Reste à payer</td><td class="r">${esc(formatFcfa(inv.reste))}</td></tr></tbody></table>
${pays ? `<h3>Paiements</h3><table><tbody>${pays}</tbody></table>` : ''}
${inv.notes ? `<p class="muted">Notes : ${esc(inv.notes)}</p>` : ''}
</body></html>`;
}

/** Ouvre le document dans une fenêtre d'impression. */
export function printInvoice(inv: InvoiceDetail) {
  const w = window.open('', '_blank', 'width=820,height=900');
  if (!w) return false;
  w.document.write(invoiceHtml(inv));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
  return true;
}
