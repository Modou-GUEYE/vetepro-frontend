import { formatDate, formatFcfa } from '@/core/utils/format';
import { RAPPEL_LABEL, VaccinationDocument } from './vaccination';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Facture de vaccination imprimable (VAC-xxxx) : propriétaire, animal, vaccin, lot, notes, prochain rappel et montant. */
export function vaccinationHtml(v: VaccinationDocument, cabinet = 'Clinique Vétérinaire de Dakar'): string {
  const a = v.animal;
  const row = (k: string, val: string) => `<tr><td class="k">${esc(k)}</td><td>${esc(val || '—')}</td></tr>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(v.numero ?? 'Vaccination')}</title><style>
*{box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;color:#0f1f2b;padding:28px;max-width:720px;margin:auto}
header{background:#0b2a30;color:#fff;padding:18px 22px;border-radius:12px;display:flex;justify-content:space-between}
h1{margin:0;font-size:20px}h3{margin:18px 0 6px;font-size:13px;text-transform:uppercase;color:#5b6b78}table{width:100%;border-collapse:collapse}
td{padding:7px 8px;border-bottom:1px solid #e1e8ed;font-size:13px}.k{width:38%;color:#5b6b78}.tot{font-weight:700;font-size:15px}
</style></head><body>
<header><div><h1>${esc(cabinet)}</h1><div style="color:#9fc;font-size:12px">Facture de vaccination ${esc(v.numero ?? '')}</div></div><div style="text-align:right">${esc(formatDate(v.date))}</div></header>
<h3>Propriétaire</h3><table>${row('Nom', v.proprietaire?.nom ?? '')}${row('Téléphone', v.proprietaire?.telephone ?? '')}${row('Adresse', v.proprietaire?.adresse ?? '')}</table>
<h3>Animal</h3><table>${row('Nom', a?.nom ?? '')}${row('Espèce', a?.espece ?? '')}${row('Race', a?.race ?? '')}${row('Sexe', a?.sexe === 'M' ? 'Mâle' : a?.sexe === 'F' ? 'Femelle' : '')}${row('N° de puce', a?.puce ?? '')}</table>
<h3>Vaccination</h3><table>${row('Vaccin', v.vaccin)}${row('Date', formatDate(v.date))}${row('N° de lot', v.lot)}${row('Notes', v.notes)}${row('Prochain rappel', v.rappel ? `${formatDate(v.rappel)} (${RAPPEL_LABEL[v.statut]})` : '')}
<tr class="tot"><td class="k">Montant</td><td>${esc(formatFcfa(v.tarif))}</td></tr></table>
</body></html>`;
}

export function printVaccination(v: VaccinationDocument) {
  const w = window.open('', '_blank', 'width=820,height=900');
  if (!w) return false;
  w.document.write(vaccinationHtml(v));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
  return true;
}
