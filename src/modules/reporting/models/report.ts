import { z } from 'zod';

export const REPORT_TYPES = [
  { key: 'ventes', label: 'Ventes de médicaments' }, { key: 'factures', label: 'Factures' }, { key: 'consultations', label: 'Consultations' },
  { key: 'vaccins', label: 'Vaccins' }, { key: 'clients', label: 'Clients' },
] as const;
export type ReportType = (typeof REPORT_TYPES)[number]['key'];

const column = z.object({ cle: z.string(), libelle: z.string(), type: z.enum(['texte', 'fcfa', 'nombre', 'date']) });
const table = z.object({ colonnes: z.array(column), lignes: z.array(z.object({ id: z.string().nullable(), cells: z.array(z.union([z.string(), z.number()])) })) });
export const reportDtoSchema = table.extend({
  type: z.enum(['ventes', 'factures', 'consultations', 'vaccins', 'clients']),
  kpis: z.array(z.object({ label: z.string(), valeur: z.number(), format: z.enum(['nombre', 'fcfa']) })),
  graphiques: z.array(z.object({ titre: z.string(), type: z.enum(['barres', 'colonnes']), format: z.enum(['nombre', 'fcfa']), donnees: z.array(z.object({ label: z.string(), valeur: z.number() })) })),
  synthese: table.extend({ titre: z.string() }).nullable(),
});
export type Report = z.infer<typeof reportDtoSchema>;
export type Chart = Report['graphiques'][number];
export type Table = z.infer<typeof table>;
export type Column = z.infer<typeof column>;

export const ACTIVITES = [
  { key: 'consultations', label: 'Consultations' }, { key: 'vaccinations', label: 'Vaccinations' }, { key: 'campagnes', label: 'Campagnes de vaccination' },
  { key: 'inseminations', label: 'Inséminations' }, { key: 'hospitalisations', label: 'Hospitalisations' },
] as const;
export type Activite = (typeof ACTIVITES)[number]['key'];

export const regulatoryDtoSchema = z.object({
  cabinet: z.object({ nom: z.string(), ordre: z.string(), adresse: z.string(), telephone: z.string(), email: z.string() }),
  du: z.string(), au: z.string(), genereLe: z.string(), generePar: z.string(),
  sections: z.array(z.object({ cle: z.string(), titre: z.string(), synthese: table, detail: table })),
});
export type RegulatoryReport = z.infer<typeof regulatoryDtoSchema>;

/* ---------- Période ---------- */

export const PERIODS = [
  { key: 'tout', label: 'Toute la période' }, { key: 'mois', label: 'Mois en cours' }, { key: 'mois-1', label: 'Mois précédent' },
  { key: 'trim', label: 'Trimestre en cours' }, { key: 'annee', label: 'Année en cours' }, { key: 'perso', label: 'Personnalisée' },
] as const;
export type PeriodKey = (typeof PERIODS)[number]['key'];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Bornes (début, fin) d'une période prédéfinie ; vides pour « toute la période ». */
export function periodRange(key: PeriodKey, du = '', au = '', now = new Date()): { du: string; au: string } {
  const y = now.getFullYear(), m = now.getMonth();
  if (key === 'mois') return { du: iso(new Date(y, m, 1)), au: iso(new Date(y, m + 1, 0)) };
  if (key === 'mois-1') return { du: iso(new Date(y, m - 1, 1)), au: iso(new Date(y, m, 0)) };
  if (key === 'trim') { const s = Math.floor(m / 3) * 3; return { du: iso(new Date(y, s, 1)), au: iso(new Date(y, s + 3, 0)) }; }
  if (key === 'annee') return { du: `${y}-01-01`, au: `${y}-12-31` };
  if (key === 'perso') return { du, au };
  return { du: '', au: '' };
}

/* ---------- Filtres propres à chaque rapport ---------- */

export interface ReportFilters {
  type: ReportType; period: PeriodKey; du: string; au: string;
  medicament: string; statut: string; mode: string; prestation: string; groupe: 'prestation' | 'patient';
  patient: string; service: string; vaccin: string; statutRappel: string; espece: string; statutClient: string;
}
export const emptyFilters = (type: ReportType = 'ventes'): ReportFilters => ({
  type, period: 'tout', du: '', au: '', medicament: '', statut: '', mode: '', prestation: '', groupe: 'prestation', patient: '', service: '', vaccin: '', statutRappel: '', espece: '', statutClient: '',
});

export function toParams(f: ReportFilters): Record<string, string> {
  const r = periodRange(f.period, f.du, f.au);
  const p = { du: r.du, au: r.au, medicament: f.medicament, statut: f.statut, mode: f.mode, prestation: f.prestation, groupe: f.groupe, patient: f.patient, service: f.service, vaccin: f.vaccin, statut_rappel: f.statutRappel, espece: f.espece, statut_client: f.statutClient };
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v));
}

export const periodError = (f: ReportFilters) => (f.period === 'perso' && f.du && f.au && f.au < f.du ? 'La fin de la période précède son début' : '');

/* ---------- Export ---------- */

const fmtDate = (v: string) => (v ? v.split('-').reverse().join('/') : '');
const fmtNum = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const cellText = (c: Column, v: string | number): string => {
  if (c.type === 'date') return fmtDate(String(v));
  if (c.type === 'fcfa') return `${fmtNum(Number(v))} FCFA`;
  return String(v);
};
const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;
/** CSV lisible par Excel : BOM UTF-8, séparateur point-virgule, nombres bruts pour les montants. */
export const tableToCsv = (t: Table) =>
  `\uFEFF${[t.colonnes.map((c) => c.libelle), ...t.lignes.map((l) => l.cells.map((v, i) => (t.colonnes[i].type === 'fcfa' || t.colonnes[i].type === 'nombre' ? String(v) : cellText(t.colonnes[i], v))))].map((r) => r.map(csvCell).join(';')).join('\r\n')}`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const STYLE = `body{font-family:Inter,system-ui,sans-serif;color:#0f1f2b;padding:24px}h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:18px 0 6px}.m{color:#5b6b78;font-size:12px}
table{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}th{background:#f3f6f8;text-align:left;padding:6px;text-transform:uppercase;font-size:10px}td{padding:6px;border-bottom:1px solid #e1e8ed}.k{display:flex;gap:10px;margin:12px 0}.k div{flex:1;border:1px solid #dde4e9;border-radius:8px;padding:8px 10px}.k b{font-size:15px;display:block}`;
export const tableHtml = (t: Table) => `<table><thead><tr>${t.colonnes.map((c) => `<th>${esc(c.libelle)}</th>`).join('')}</tr></thead><tbody>${t.lignes.map((l) => `<tr>${l.cells.map((v, i) => `<td>${esc(cellText(t.colonnes[i], v))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

export const reportPrintHtml = (r: Report, titre: string, periode: string) =>
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(titre)}</title><style>${STYLE}</style></head><body><h1>${esc(titre)}</h1><div class="m">${esc(periode)}</div>`
  + `<div class="k">${r.kpis.map((k) => `<div><b>${esc(k.format === 'fcfa' ? `${fmtNum(k.valeur)} FCFA` : String(k.valeur))}</b>${esc(k.label)}</div>`).join('')}</div>`
  + (r.synthese ? `<h2>${esc(r.synthese.titre)}</h2>${tableHtml(r.synthese)}` : '') + `<h2>Détail</h2>${tableHtml(r)}</body></html>`;

export const regulatoryPrintHtml = (r: RegulatoryReport) =>
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Rapport réglementaire</title><style>${STYLE}</style></head><body>`
  + `<h1>Rapport réglementaire d'activité vétérinaire</h1><p><b>${esc(r.cabinet.nom)}</b><br>N° d'ordre : ${esc(r.cabinet.ordre)}<br>${esc(r.cabinet.adresse)}, ${esc(r.cabinet.telephone)}, ${esc(r.cabinet.email)}</p>`
  + `<p class="m">Période du ${fmtDate(r.du)} au ${fmtDate(r.au)}. Établi par ${esc(r.generePar)} le ${fmtDate(r.genereLe.slice(0, 10))}.</p>`
  + r.sections.map((s) => `<h2>${esc(s.titre)}, synthèse</h2>${s.synthese.lignes.length ? tableHtml(s.synthese) : '<p class="m">Aucune donnée sur la période.</p>'}<h2>${esc(s.titre)}, détail</h2>${s.detail.lignes.length ? tableHtml(s.detail) : '<p class="m">Aucun acte sur la période.</p>'}`).join('')
  + '</body></html>';

/** Export Excel du rapport réglementaire : un bloc par section (synthèse puis détail), séparés par une ligne vide. */
export const regulatoryToCsv = (r: RegulatoryReport) => {
  const q = (t: Table) => tableToCsv(t).replace('\uFEFF', '');
  return `\uFEFF${[`"${r.cabinet.nom}";"N° d'ordre";"${r.cabinet.ordre}"`, `"Période";"${fmtDate(r.du)}";"${fmtDate(r.au)}"`, '', ...r.sections.flatMap((s) => [`"${s.titre}, synthèse"`, q(s.synthese), '', `"${s.titre}, détail"`, q(s.detail), ''])].join('\r\n')}`;
};
