import { Download, Eye, Printer } from 'lucide-react';
import { formatDate } from '@/core/utils/format';
import { Button, Input, Panel, Select, toast } from '@/shared/ui';
import { ACTIVITES, PERIODS, PeriodKey, regulatoryPrintHtml, regulatoryToCsv } from '../models/report';
import { printHtml, triggerDownload } from '../viewmodels/useReportsViewModel';
import { useRegulatoryViewModel } from '../viewmodels/useRegulatoryViewModel';
import { DataTable } from './DataTable';

/** Rapport réglementaire : choix des activités et de la période, aperçu (synthèse puis détail), téléchargement PDF et Excel. */
export function RegulatoryReportView({ canExport }: { canExport: boolean }) {
  const vm = useRegulatoryViewModel();
  const r = vm.report;
  return (
    <div className="space-y-5">
      <Panel title="Rapport réglementaire">
        <div className="space-y-4 p-5">
          <p className="text-[13px] text-slate">Choisissez les activités à inclure et la période. L'en-tête reprend le nom du cabinet et son numéro d'ordre.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select label="Période" value={vm.period} onChange={(e) => vm.setPeriod(e.target.value as Exclude<PeriodKey, 'tout'>)}>{PERIODS.filter((p) => p.key !== 'tout').map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</Select>
            {vm.period === 'perso' && <><Input label="Du" type="date" value={vm.du} onChange={(e) => vm.setDu(e.target.value)} /><Input label="Au" type="date" value={vm.au} onChange={(e) => vm.setAu(e.target.value)} /></>}
          </div>
          <fieldset>
            <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[.7px] text-slate">Activités incluses</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ACTIVITES.map((a) => (
                <label key={a.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px] hover:bg-mist">
                  <input type="checkbox" checked={vm.activites.includes(a.key)} onChange={() => vm.toggle(a.key)} className="h-4 w-4 accent-brand" /> {a.label}
                </label>
              ))}
            </div>
          </fieldset>
          {vm.error && <p role="alert" className="text-xs text-danger">{vm.error}</p>}
          <Button onClick={vm.preview} disabled={!!vm.error} loading={vm.loading}><Eye size={14} /> Aperçu du rapport</Button>
        </div>
      </Panel>

      {r && (
        <Panel title="Aperçu" actions={canExport && (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => triggerDownload('rapport-reglementaire.csv', regulatoryToCsv(r), 'text/csv;charset=utf-8')}><Download size={13} /> Excel</Button>
            <Button size="sm" variant="secondary" onClick={() => { if (!printHtml(regulatoryPrintHtml(r))) toast.warning("Autorisez l'ouverture de fenêtres pour imprimer"); }}><Printer size={13} /> PDF</Button>
          </div>
        )}>
          <div className="space-y-6 p-5">
            <header className="rounded-lg bg-mist px-4 py-3 text-[13px]">
              <p className="font-display text-base font-bold">{r.cabinet.nom}</p>
              <p>N° d'ordre : <b>{r.cabinet.ordre}</b></p>
              <p className="text-slate">{r.cabinet.adresse}, {r.cabinet.telephone}, {r.cabinet.email}</p>
              <p className="mt-1 text-slate">Période du {formatDate(r.du)} au {formatDate(r.au)}. Établi par {r.generePar}.</p>
            </header>
            {r.sections.map((s) => (
              <section key={s.cle} className="space-y-3">
                <h3 className="text-[15px] font-bold">{s.titre}</h3>
                <div className="overflow-hidden rounded-lg border border-line"><p className="border-b border-line bg-[#f8fafb] px-4 py-2 text-[11px] font-semibold uppercase tracking-[.8px] text-slate">Synthèse</p><DataTable table={s.synthese} empty="Aucune donnée sur la période" /></div>
                <div className="overflow-hidden rounded-lg border border-line"><p className="border-b border-line bg-[#f8fafb] px-4 py-2 text-[11px] font-semibold uppercase tracking-[.8px] text-slate">Détail ({s.detail.lignes.length})</p><DataTable table={s.detail} empty="Aucun acte sur la période" /></div>
              </section>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
