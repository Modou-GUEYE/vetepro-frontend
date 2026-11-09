import { Plus, Search, Syringe } from 'lucide-react';
import { formatDate } from '@/core/utils/format';
import { Badge, Button, Input, KpiCard, Panel } from '@/shared/ui';
import { CAMPAGNE_LABEL, CAMPAGNE_TONE, RAPPEL_LABEL, RAPPEL_TONE } from '../models/vaccination';
import { useVaccinationsViewModel } from '../viewmodels/useVaccinationsViewModel';
import { CampagneDetailModal } from './CampagneDetailModal';
import { CampagneFormModal } from './CampagneFormModal';
import { ProgressBar } from './ProgressBar';
import { VaccinationDocumentModal } from './VaccinationDocumentModal';
import { VaccinationFormModal } from './VaccinationFormModal';

const TH = ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap border-b border-line bg-[#f8fafb] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.8px] text-slate">{children}</th>;

export function VaccinationsPage() {
  const vm = useVaccinationsViewModel();
  return (
    <div className="space-y-5">
      {vm.stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard value={vm.stats.total} label="Total" tone="info" />
          <KpiCard value={vm.stats.a_jour} label="À jour" />
          <KpiCard value={vm.stats.bientot} label="Rappel bientôt" tone="amber" />
          <KpiCard value={vm.stats.en_retard} label="En retard" tone="violet" />
        </div>
      )}

      <Panel title="Campagnes de vaccination" actions={vm.canCreate && <Button size="sm" onClick={vm.openProgram}><Plus size={14} /> Programmer une campagne</Button>}>
        {vm.campagnes.length === 0 && !vm.campagnesLoading ? <p className="p-6 text-center text-[13px] text-slate">Aucune campagne programmée.</p> : (
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {vm.campagnes.map((c) => (
              <button key={c.id} type="button" onClick={() => vm.openCampagne(c.id)} className="rounded-xl border border-line p-4 text-left transition hover:border-brand/50 hover:shadow-card">
                <div className="flex items-start justify-between gap-2"><b className="text-[14px]">{c.nom}</b><Badge tone={CAMPAGNE_TONE[c.statut]}>{CAMPAGNE_LABEL[c.statut]}</Badge></div>
                <p className="mt-1 text-xs text-slate">{c.espece.nom}, {c.zone}</p>
                <p className="mt-3 text-[13px] font-semibold">{c.vaccines} / {c.vises ?? '?'} vaccinés{c.vises ? ` (${c.progression} %)` : ''}</p>
                <div className="mt-1.5"><ProgressBar value={c.progression} /></div>
                <p className="mt-2 text-xs text-faint">{formatDate(c.date)}{c.vaccin ? `, ${c.vaccin}` : ''}</p>
              </button>
            ))}
          </div>
        )}
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-[11px] text-faint" />
          <Input aria-label="Rechercher une vaccination" placeholder="Rechercher (animal, propriétaire, vaccin)" className="pl-9" value={vm.search} onChange={(e) => vm.setSearch(e.target.value)} />
        </div>
        {vm.canCreate && <Button onClick={vm.openAdd}><Plus size={15} /> Ajouter</Button>}
      </div>

      <Panel title="Registre vaccinal" count={`${vm.rows.length} vaccination${vm.rows.length > 1 ? 's' : ''}`}>
        {vm.rows.length === 0 && !vm.loading ? <p className="p-10 text-center text-[13px] text-slate">Aucune vaccination</p> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead><tr><TH>Animal</TH><TH>Propriétaire</TH><TH>Vaccin</TH><TH>Administré</TH><TH>Rappel</TH><TH>Statut</TH></tr></thead>
              <tbody>
                {vm.rows.map((v) => (
                  <tr key={v.id} className="border-b border-[#eef2f5] hover:bg-mist">
                    <td className="px-4 py-3"><span className="flex items-center gap-2"><Syringe size={14} className="text-violet" /><b>{v.patient?.nom}</b><span className="text-xs text-slate">{v.patient?.espece}</span></span></td>
                    <td className="px-4 py-3">{v.proprietaire?.nom ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold">{v.vaccin}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(v.date)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{v.rappel ? formatDate(v.rappel) : '—'}</td>
                    <td className="px-4 py-3"><Badge tone={RAPPEL_TONE[v.statut]}>{RAPPEL_LABEL[v.statut]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <VaccinationFormModal open={vm.adding} onClose={vm.closeAdd} />
      <CampagneFormModal open={vm.programming} onClose={vm.closeProgram} />
      {vm.campagneId && <CampagneDetailModal id={vm.campagneId} onClose={vm.closeCampagne} />}
      {vm.documentId && <VaccinationDocumentModal id={vm.documentId} onClose={vm.closeDocument} />}
    </div>
  );
}
