import { AlertTriangle, Plus, Search } from 'lucide-react';
import { formatDate, formatDateTime, formatFcfa } from '@/core/utils/format';
import { Badge, Button, KpiCard, Panel, Tabs } from '@/shared/ui';
import { Cabinet } from '@/modules/abonnement/services/abonnement.service';
import { STATUT_ABO_LABEL, STATUT_ABO_TONE, SOURCE_LABEL, JournalEntry } from '../models/association';
import { ReseauTab, useReseauViewModel } from '../viewmodels/useReseauViewModel';
import { AssoColumn, AssoTable } from './AssoTable';
import { CabinetDetailModal } from './CabinetDetailModal';
import { CredentialsModal } from './CredentialsModal';
import { SurMesureModal } from './SurMesureModal';

const FILTERS = [{ key: '', label: 'Tous' }, { key: 'essai', label: 'Essai' }, { key: 'actif', label: 'Actifs' }, { key: 'expire', label: 'Expirés' }];

const cabinetColumns: AssoColumn<Cabinet>[] = [
  { key: 'nom', header: 'Établissement', render: (c) => <div><b>{c.nom}</b><div className="text-xs text-slate">{c.ville || c.email}</div></div> },
  { key: 'resp', header: 'Responsable', render: (c) => c.responsable },
  { key: 'entite', header: 'Entité', render: (c) => c.entite_label },
  { key: 'pack', header: 'Pack', render: (c) => c.pack.nom },
  { key: 'statut', header: 'Statut', render: (c) => <Badge tone={STATUT_ABO_TONE[c.statut]}>{STATUT_ABO_LABEL[c.statut]}</Badge> },
  { key: 'fin', header: 'Échéance', className: 'whitespace-nowrap', render: (c) => <>{formatDate(c.fin)}<div className="text-xs text-slate">{c.statut === 'expire' ? 'Expiré' : `${c.jours_restants} jour${c.jours_restants > 1 ? 's' : ''}`}</div></> },
  { key: 'source', header: 'Origine', render: (c) => SOURCE_LABEL[c.source] ?? c.source },
];
const journalColumns: AssoColumn<JournalEntry>[] = [
  { key: 'date', header: 'Date', className: 'whitespace-nowrap text-slate', render: (e) => formatDateTime(e.date) },
  { key: 'par', header: 'Par', render: (e) => e.par },
  { key: 'action', header: 'Action', render: (e) => <b>{e.action}</b> },
  { key: 'cible', header: 'Cible', render: (e) => e.cible },
];

/** Tableau de bord du réseau : abonnements des cabinets, échéances proches, entités sur mesure et journal des actions de l'association. */
export function ReseauPage() {
  const vm = useReseauViewModel();
  const s = vm.stats;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard value={s?.cabinets ?? '-'} label="Établissements inscrits" />
        <KpiCard value={s?.essai ?? '-'} label="En essai gratuit" tone="info" />
        <KpiCard value={s?.actifs ?? '-'} label="Abonnements actifs" />
        <KpiCard value={s?.expires ?? '-'} label="Abonnements expirés" tone="amber" />
        <KpiCard value={s ? formatFcfa(s.mrr) : '-'} label="Revenu mensuel récurrent" tone="violet" />
        <KpiCard value={s?.cvNouveaux ?? '-'} label="CV à valider" tone="info" />
        <KpiCard value={s?.cvValides ?? '-'} label="Profils CVthèque partagés" />
        <KpiCard value={s?.reclamationsOuvertes ?? '-'} label="Réclamations ouvertes" tone="amber" />
      </div>

      {s && s.echeances.length > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg2 border border-[#f0dcbc] bg-amber-pale px-5 py-3 text-[13px] text-amber-text">
          <span className="flex items-center gap-2 font-bold"><AlertTriangle size={16} /> Échéances dans les 7 jours</span>
          {s.echeances.map((e) => <span key={e.id}>{e.nom} ({e.jours} jour{e.jours > 1 ? 's' : ''})</span>)}
        </div>
      )}

      <Panel title="Inscriptions et abonnements" actions={<Button size="sm" onClick={vm.openCreate}><Plus size={14} /> Offre sur mesure</Button>} count={vm.tab === 'cabinets' ? `${vm.cabinets.length} cabinet${vm.cabinets.length > 1 ? 's' : ''}` : undefined}>
        <Tabs<ReseauTab> items={[{ key: 'cabinets', label: 'Établissements' }, { key: 'journal', label: 'Journal des actions' }]} value={vm.tab} onChange={vm.setTab} />
        {vm.tab === 'cabinets' ? (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
              <div className="relative min-w-[220px] flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <input aria-label="Rechercher un établissement" value={vm.q} onChange={(e) => vm.setQ(e.target.value)} placeholder="Rechercher (établissement, responsable, e-mail, ville)" className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-[13px] outline-none focus:border-brand focus:shadow-ring" />
              </div>
              <div role="group" aria-label="Statut" className="flex gap-1.5">
                {FILTERS.map((f) => <button key={f.key} type="button" aria-pressed={vm.statut === f.key} onClick={() => vm.setStatut(f.key)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${vm.statut === f.key ? 'border-brand bg-brand-pale text-brand-text' : 'border-line bg-white text-slate hover:bg-mist'}`}>{f.label}</button>)}
              </div>
            </div>
            <AssoTable columns={cabinetColumns} rows={vm.cabinets} rowKey={(c) => c.id} onRowClick={vm.openDetail} loading={vm.loading} emptyTitle="Aucun établissement ne correspond" />
          </>
        ) : <AssoTable columns={journalColumns} rows={vm.journal} rowKey={(e) => e.id} loading={vm.journalLoading} emptyTitle="Aucune action enregistrée" />}
      </Panel>

      <CabinetDetailModal cabinet={vm.detail} onClose={vm.closeDetail} onExtend={(jours) => vm.detail && vm.extend({ id: vm.detail.id, jours })} extending={vm.extending} />
      <SurMesureModal open={vm.creating} onClose={vm.closeCreate} onSubmit={vm.create} pending={vm.creatingPending} />
      <CredentialsModal result={vm.created} onClose={vm.closeCreated} />
    </div>
  );
}
