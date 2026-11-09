import { Eye, Plus, Search } from 'lucide-react';
import { formatDate, formatFcfa } from '@/core/utils/format';
import { Badge, Button, Input, KpiCard, Panel, Tabs } from '@/shared/ui';
import { EXIT_LABEL, HospiRow } from '../models/hospi';
import { useHospisViewModel } from '../viewmodels/useHospisViewModel';
import { AdmissionModal } from './AdmissionModal';
import { HospiDetailModal } from './HospiDetailModal';

const TH = ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap border-b border-line bg-[#f8fafb] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.8px] text-slate">{children}</th>;

export function HospitalisationsPage() {
  const vm = useHospisViewModel();
  const archived = vm.tab === 'sorti';

  const Row = ({ h }: { h: HospiRow }) => (
    <tr onClick={() => vm.openDetail(h.id)} className="cursor-pointer border-b border-[#eef2f5] hover:bg-mist">
      <td className="px-4 py-3"><b className="block">{h.patient?.nom}</b><span className="text-xs text-slate">{[h.patient?.espece, h.proprietaire?.nom].filter(Boolean).join(', ')}</span>{h.patient?.provisoire && <Badge tone="amber" className="ml-2">À compléter</Badge>}</td>
      <td className="px-4 py-3">{h.motif}</td>
      {!archived && <td className="whitespace-nowrap px-4 py-3">{h.box}</td>}
      <td className="whitespace-nowrap px-4 py-3">{formatDate(h.date_entree)}</td>
      {archived ? <td className="whitespace-nowrap px-4 py-3">{h.sortie ? formatDate(h.sortie.date) : ''}</td>
        : <td className="whitespace-nowrap px-4 py-3">{h.date_sortie_prevue ? <span className={h.en_retard ? 'font-semibold text-danger' : ''}>{formatDate(h.date_sortie_prevue)}{h.en_retard ? ' (dépassée)' : ''}</span> : <span className="text-faint">Non précisée</span>}</td>}
      <td className="px-4 py-3"><Badge tone="blue">{h.duree} j</Badge></td>
      {archived && <td className="px-4 py-3">{h.sortie ? EXIT_LABEL[h.sortie.etat] : ''}</td>}
      <td className="whitespace-nowrap px-4 py-3 font-bold tabular-nums text-brand-text">{formatFcfa(h.total)}</td>
      {archived && <td className="px-4 py-3">{h.sortie?.facture?.numero ?? ''}</td>}
      <td className="px-4 py-3"><Button size="icon" variant="secondary" aria-label={`Voir l'hospitalisation de ${h.patient?.nom}`} onClick={(e) => { e.stopPropagation(); vm.openDetail(h.id); }}><Eye size={14} /></Button></td>
    </tr>
  );

  return (
    <div className="space-y-5">
      {vm.stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard value={vm.stats.en_cours} label="En cours" tone="info" />
          <KpiCard value={vm.stats.sorties} label="Sorties" />
          <KpiCard value={vm.stats.soins_aujourdhui} label="Prescriptions aujourd'hui" tone="amber" />
          <KpiCard value={formatFcfa(vm.stats.ca_hospitalisation)} label="CA hospitalisation" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-[11px] text-faint" />
          <Input aria-label="Rechercher une hospitalisation" placeholder="Rechercher (animal, propriétaire, motif, box)" className="pl-9" value={vm.search} onChange={(e) => vm.setSearch(e.target.value)} />
        </div>
        {vm.canCreate && <Button onClick={vm.openAdmit}><Plus size={15} /> Nouvelle admission</Button>}
      </div>

      <Panel title={archived ? 'Sorties archivées' : 'Patients hospitalisés'} count={`${vm.rows.length} patient${vm.rows.length > 1 ? 's' : ''}`}>
        <Tabs items={[{ key: 'encours', label: 'En cours' }, { key: 'sorti', label: 'Sorties archivées' }]} value={vm.tab} onChange={vm.setTab} />
        {vm.rows.length === 0 && !vm.loading ? (
          <p className="p-10 text-center text-[13px] text-slate">{archived ? 'Aucune sortie archivée' : 'Aucun patient hospitalisé en ce moment'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead><tr>
                <TH>Patient</TH><TH>Motif</TH>{!archived && <TH>Box</TH>}<TH>Entrée</TH><TH>{archived ? 'Sortie' : 'Sortie prévue'}</TH><TH>Durée</TH>{archived && <TH>État à la sortie</TH>}<TH>{archived ? 'Total facturé' : 'Total à payer'}</TH>{archived && <TH>Facture</TH>}<TH />
              </tr></thead>
              <tbody>{vm.rows.map((h) => <Row key={h.id} h={h} />)}</tbody>
            </table>
          </div>
        )}
      </Panel>

      <AdmissionModal open={vm.admitting} onClose={vm.closeAdmit} onSaved={(id) => { vm.closeAdmit(); vm.openDetail(id); }} />
      {vm.detailId && <HospiDetailModal id={vm.detailId} onClose={vm.closeDetail} />}
    </div>
  );
}
