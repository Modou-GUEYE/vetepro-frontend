import { Download, Printer } from 'lucide-react';
import { formatFcfa } from '@/core/utils/format';
import { Button, Input, KpiCard, Panel, Select, toast } from '@/shared/ui';
import { PAYMENT_MODES, modeLabel } from '@/modules/facturation/models/facture';
import { InvoiceDetailModal } from '@/modules/facturation/views/InvoiceDetailModal';
import { ConsultationDetailModal } from '@/modules/consultations/views/ConsultationDetailModal';
import { useServiceChoices } from '@/modules/consultations/viewmodels/useServiceChoices';
import { useArticleChoices } from '@/modules/pharmacie/viewmodels/useArticleChoices';
import { usePatientChoices } from '@/modules/patients/viewmodels/usePatientChoices';
import { useSpeciesChoices } from '@/modules/referentiels/viewmodels/useSpeciesChoices';
import { VACCINS } from '@/modules/vaccinations/models/vaccination';
import { PERIODS, PeriodKey, REPORT_TYPES, reportPrintHtml, tableToCsv } from '../models/report';
import { printHtml, triggerDownload, useReportsViewModel } from '../viewmodels/useReportsViewModel';
import { ChartBlock } from './Charts';
import { DataTable } from './DataTable';

const KPI_TONES = ['info', 'brand', 'amber', 'violet'] as const;

/** Rapports détaillés (ventes, factures, consultations, vaccins, clients) : filtres, indicateurs, graphiques, tableau en lecture seule, exports. */
export function DetailedReports({ vm }: { vm: ReturnType<typeof useReportsViewModel> }) {
  const f = vm.filters;
  const articles = useArticleChoices();
  const patients = usePatientChoices();
  const services = useServiceChoices();
  const species = useSpeciesChoices();
  const r = vm.report;
  const title = REPORT_TYPES.find((t) => t.key === f.type)!.label;
  const periodLabel = PERIODS.find((p) => p.key === f.period)!.label + (vm.range.du || vm.range.au ? ` (${vm.range.du.split('-').reverse().join('/') || '…'} au ${vm.range.au.split('-').reverse().join('/') || '…'})` : '');

  const exportExcel = () => { if (r) triggerDownload(`rapport-${f.type}.csv`, tableToCsv(r), 'text/csv;charset=utf-8'); };
  const exportPdf = () => { if (r && !printHtml(reportPrintHtml(r, `Rapport : ${title}`, periodLabel))) toast.warning("Autorisez l'ouverture de fenêtres pour imprimer"); };
  const click = f.type === 'factures' ? vm.openInvoice : f.type === 'consultations' ? vm.openConsultation : f.type === 'ventes' ? vm.openInvoice : undefined;

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Type de rapport" className="flex flex-wrap gap-2">
        {REPORT_TYPES.map((t) => (
          <button key={t.key} role="tab" aria-selected={f.type === t.key} onClick={() => vm.chooseType(t.key)}
            className={`rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition ${f.type === t.key ? 'border-brand bg-brand-pale text-brand-text' : 'border-line bg-white text-slate hover:bg-mist'}`}>{t.label}</button>
        ))}
      </div>

      <div className="rounded-lg2 border border-line bg-white p-4 shadow-card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Période" value={f.period} onChange={(e) => vm.set('period', e.target.value as PeriodKey)}>{PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</Select>
          {f.period === 'perso' && <><Input label="Date de début" type="date" value={f.du} onChange={(e) => vm.set('du', e.target.value)} /><Input label="Date de fin" type="date" value={f.au} error={vm.periodError} onChange={(e) => vm.set('au', e.target.value)} /></>}
          {f.type === 'ventes' && <Select label="Médicament" value={f.medicament} onChange={(e) => vm.set('medicament', e.target.value)}><option value="">Tous</option>{(articles.data ?? []).map((a) => <option key={a.id} value={a.nom}>{a.nom}</option>)}</Select>}
          {f.type === 'factures' && (
            <>
              <Select label="Statut" value={f.statut} onChange={(e) => vm.set('statut', e.target.value)}><option value="">Tous</option><option value="payee">Payée</option><option value="impayee">En attente</option><option value="partielle">Partielle</option><option value="annulee">Annulée</option></Select>
              <Select label="Mode de paiement" value={f.mode} onChange={(e) => vm.set('mode', e.target.value)}><option value="">Tous</option>{PAYMENT_MODES.map((m) => <option key={m} value={m}>{modeLabel(m)}</option>)}</Select>
              <Select label="Prestation" value={f.prestation} onChange={(e) => vm.set('prestation', e.target.value)}><option value="">Toutes</option><option value="consultation">Consultation</option><option value="vente">Vente directe</option><option value="hospitalisation">Hospitalisation</option><option value="vaccination">Vaccination</option><option value="insemination">Insémination</option></Select>
            </>
          )}
          {f.type === 'consultations' && (
            <>
              <Select label="Patient" value={f.patient} onChange={(e) => vm.set('patient', e.target.value)}><option value="">Tous</option>{(patients.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nom} ({p.espece})</option>)}</Select>
              <Select label="Type" value={f.service} onChange={(e) => vm.set('service', e.target.value)}><option value="">Tous</option>{(services.data ?? []).map((s) => <option key={s.id} value={s.libelle}>{s.libelle}</option>)}</Select>
            </>
          )}
          {f.type === 'vaccins' && (
            <>
              <Select label="Vaccin" value={f.vaccin} onChange={(e) => vm.set('vaccin', e.target.value)}><option value="">Tous</option>{VACCINS.map((v) => <option key={v}>{v}</option>)}</Select>
              <Select label="Statut du rappel" value={f.statutRappel} onChange={(e) => vm.set('statutRappel', e.target.value)}><option value="">Tous</option><option value="a_jour">À jour</option><option value="bientot">Rappel bientôt</option><option value="en_retard">En retard</option><option value="non_defini">Non défini</option></Select>
              <Select label="Espèce" value={f.espece} onChange={(e) => vm.set('espece', e.target.value)}><option value="">Toutes</option>{(species.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</Select>
            </>
          )}
          {f.type === 'clients' && <Select label="Statut client" value={f.statutClient} onChange={(e) => vm.set('statutClient', e.target.value)}><option value="">Tous</option><option value="actif">Actifs</option><option value="inactif">Désactivés</option></Select>}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate">Données en lecture seule.</p>
          {vm.canExport && <div className="flex gap-2"><Button size="sm" variant="secondary" disabled={!r} onClick={exportExcel}><Download size={13} /> Export Excel</Button><Button size="sm" variant="secondary" disabled={!r} onClick={exportPdf}><Printer size={13} /> Export PDF</Button></div>}
        </div>
      </div>

      {r && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{r.kpis.map((k, i) => <KpiCard key={k.label} value={k.format === 'fcfa' ? formatFcfa(k.valeur) : k.valeur} label={k.label} tone={KPI_TONES[i % 4]} />)}</div>
          {r.lignes.length > 0 && (
            <div className="grid grid-cols-1 gap-6 rounded-lg2 border border-line bg-white p-5 shadow-card md:grid-cols-2">{r.graphiques.map((g) => <ChartBlock key={g.titre} chart={g} />)}</div>
          )}
          {r.synthese && r.synthese.lignes.length > 0 && (
            <Panel title={r.synthese.titre}>
              {f.type === 'factures' && (
                <div className="flex gap-2 border-b border-line px-5 py-3">
                  {(['prestation', 'patient'] as const).map((g) => <button key={g} aria-pressed={f.groupe === g} onClick={() => vm.set('groupe', g)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${f.groupe === g ? 'border-brand bg-brand-pale text-brand-text' : 'border-line text-slate hover:bg-mist'}`}>Par {g}</button>)}
                </div>
              )}
              <DataTable table={r.synthese} />
            </Panel>
          )}
          <Panel title={`Détail, ${title.toLowerCase()}`} count={`${r.lignes.length} ligne${r.lignes.length > 1 ? 's' : ''}, lecture seule`}>
            <DataTable table={r} onRow={click} />
          </Panel>
        </>
      )}
      {vm.invoiceId && <InvoiceDetailModal id={vm.invoiceId} onClose={vm.closeInvoice} />}
      {vm.consultationId && <ConsultationDetailModal id={vm.consultationId} onClose={vm.closeConsultation} onOpenInvoice={vm.openInvoice} />}
    </div>
  );
}
