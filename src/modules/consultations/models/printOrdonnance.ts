import { formatDate } from '@/core/utils/format';
import { ConsultationDetail } from './consultation';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Ordonnance imprimable : médicaments dispensés par le cabinet, puis médicaments à obtenir en pharmacie (spécification). */
export function ordonnanceHtml(c: ConsultationDetail, cabinet = 'Clinique Vétérinaire de Dakar'): string {
  const li = (n: number, nom: string, detail: string) => `<li><span class="n">${n}</span><div><b>${esc(nom)}</b><div class="m">${esc(detail)}</div></div></li>`;
  const stock = c.stock.map((l, i) => li(i + 1, `${l.nom} (${l.unite})`, [`Quantité : ${l.quantite}`, l.dosage && `Dosage : ${l.dosage}`, l.posologie && `Posologie : ${l.posologie}`].filter(Boolean).join(', '))).join('');
  const ext = c.externes.map((e, i) => li(i + 1, e.nom, [`Quantité : ${e.quantite}`, e.dosage && `Dosage : ${e.dosage}`, e.posologie && `Posologie : ${e.posologie}`].filter(Boolean).join(', '))).join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(c.ordonnanceNumero)}</title><style>
*{box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;color:#0f1f2b;padding:28px;max-width:720px;margin:auto}
header{background:#0b2a30;color:#fff;padding:18px 22px;border-radius:12px;display:flex;justify-content:space-between}h1{margin:0;font-size:20px}
h3{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#5b6b78;margin:22px 0 8px}ul{list-style:none;padding:0;margin:0}
li{display:flex;gap:12px;padding:8px 0;border-bottom:1px dashed #e1e8ed}.n{width:22px;height:22px;border-radius:50%;background:#0e7c7b;color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.m{color:#5b6b78;font-size:12px}.box{background:#f3f6f8;border-radius:8px;padding:10px 14px;font-size:13px}
</style></head><body>
<header><div><h1>${esc(cabinet)}</h1><div style="color:#9fc;font-size:12px">Ordonnance ${esc(c.ordonnanceNumero)}</div></div><div style="text-align:right">${esc(formatDate(c.date))}<br>${esc(c.veterinaire)}</div></header>
<p><b>Patient :</b> ${esc(c.patient?.nom ?? '')} (${esc(c.patient?.espece ?? '')})<br><b>Propriétaire :</b> ${esc(c.proprietaire?.nom ?? '')}</p>
${c.diagnostic ? `<div class="box"><b>Diagnostic :</b> ${esc(c.diagnostic)}</div>` : ''}
${stock ? `<h3>Médicaments dispensés par le cabinet</h3><ul>${stock}</ul>` : ''}
${ext ? `<h3>Médicaments à obtenir en pharmacie</h3><ul>${ext}</ul>` : ''}
${c.notes ? `<h3>Recommandations</h3><div class="box">${esc(c.notes)}</div>` : ''}
</body></html>`;
}

export function printOrdonnance(c: ConsultationDetail) {
  const w = window.open('', '_blank', 'width=820,height=900');
  if (!w) return false;
  w.document.write(ordonnanceHtml(c));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
  return true;
}
