import { AlertTriangle, CalendarDays, CreditCard, Pill, Plus, Stethoscope, Syringe } from 'lucide-react';
import { formatDate, formatDateTime, formatFcfa } from '@/core/utils/format';
import { Badge, Button, EmptyState, KpiCard, Panel, Skeleton } from '@/shared/ui';
import { ConsultationFormModal } from '@/modules/consultations/views/ConsultationFormModal';
import { RdvFormModal } from '@/modules/rendez-vous/views/RdvFormModal';
import { STATUS_LABEL, STATUS_TONE } from '@/modules/rendez-vous/models/rdv';
import { RAPPEL_LABEL, RAPPEL_TONE } from '@/modules/vaccinations/models/vaccination';
import { useDashboardViewModel } from '../viewmodels/useDashboardViewModel';

const Empty = ({ children }: { children: string }) => <p className="px-5 py-6 text-center text-[13px] text-slate">{children}</p>;
const Row = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
  <li className={`flex items-center gap-3 border-b border-[#eef2f5] px-5 py-3 last:border-0 ${onClick ? 'cursor-pointer hover:bg-mist' : ''}`} onClick={onClick}>{children}</li>
);
const ACTIVITY_ICON = { consultation: Stethoscope, rdv: CalendarDays, facture: CreditCard } as const;

export function DashboardPage() {
  const vm = useDashboardViewModel();
  const d = vm.data;
  if (vm.loading) return <div className="space-y-4"><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-64" /></div>;
  if (vm.error || !d) return <EmptyState title="Tableau de bord indisponible" description="Les indicateurs n'ont pas pu être chargés." action={<Button variant="secondary" onClick={() => void vm.refetch()}>Réessayer</Button>} />;
  const k = d.indicateurs;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-slate">Vue d'ensemble de l'activité du cabinet.</p>
        <div className="flex gap-2">
          {vm.canRdv && <Button size="sm" onClick={vm.openRdv}><Plus size={14} /> RDV</Button>}
          {vm.canConsult && <Button size="sm" variant="secondary" onClick={vm.openConsult}><Plus size={14} /> Consultation</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {k.animaux !== null && <KpiCard value={k.animaux} label="Animaux enregistrés" tone="info" />}
        {k.rdv_jour !== null && <KpiCard value={k.rdv_jour} label="RDV aujourd'hui" />}
        {k.creances !== null && <KpiCard value={formatFcfa(k.creances)} label="Créances en cours" tone="amber" />}
        {k.alertes_stock !== null && <KpiCard value={k.alertes_stock} label="Alertes stock" tone={k.alertes_stock > 0 ? 'violet' : 'brand'} />}
      </div>

      {d.mises_bas_depassees && d.mises_bas_depassees.length > 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-pale px-4 py-3 text-[13px] text-danger-text">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div><b>Mise-bas dépassée</b> : {d.mises_bas_depassees.map((m) => `${m.patient} (${m.jours} j de retard)`).join(', ')}. <button className="font-semibold underline" onClick={() => vm.go('/insemination?onglet=suivi')}>Voir le suivi</button></div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {d.rdv_jour && (
          <Panel title="RDV aujourd'hui" actions={<CalendarDays size={16} className="text-slate" />}>
            {d.rdv_jour.length === 0 ? <Empty>Aucun RDV aujourd'hui</Empty> : (
              <ul>{d.rdv_jour.map((r) => (
                <Row key={r.id} onClick={() => vm.go(`/rendez-vous?id=${r.id}`)}>
                  <span className="w-12 shrink-0 font-display font-bold tabular-nums">{r.heure}</span>
                  <div className="min-w-0 flex-1"><b className="block truncate">{r.animal}</b><span className="block truncate text-xs text-slate">{r.proprietaire}, {r.motif}</span></div>
                  <Badge tone={STATUS_TONE[r.statut]}>{STATUS_LABEL[r.statut]}</Badge>
                </Row>
              ))}</ul>
            )}
          </Panel>
        )}

        {d.rappels_vaccins && (
          <Panel title="Rappels vaccins (30 j)" actions={<Syringe size={16} className="text-slate" />}>
            {d.rappels_vaccins.length === 0 ? <Empty>Tous les vaccins sont à jour</Empty> : (
              <ul>{d.rappels_vaccins.map((v) => (
                <Row key={v.id} onClick={() => vm.go('/vaccinations')}>
                  <div className="min-w-0 flex-1"><b className="block truncate">{v.animal}</b><span className="block truncate text-xs text-slate">{v.vaccin}, rappel {v.rappel ? formatDate(v.rappel) : '—'}</span></div>
                  <Badge tone={RAPPEL_TONE[v.statut]}>{v.statut === 'bientot' ? 'Bientôt' : RAPPEL_LABEL[v.statut]}</Badge>
                </Row>
              ))}</ul>
            )}
          </Panel>
        )}

        {d.alertes_pharmacie && (
          <Panel title="Alertes pharmacie" actions={<Pill size={16} className="text-slate" />}>
            {d.alertes_pharmacie.length === 0 ? <Empty>Stock OK</Empty> : (
              <ul>{d.alertes_pharmacie.map((a) => (
                <Row key={a.id} onClick={() => vm.go('/pharmacie')}>
                  <div className="min-w-0 flex-1"><b className="block truncate">{a.nom}</b><span className="block text-xs text-slate">{a.quantite} / {a.seuil} {a.unite}</span></div>
                  <Badge tone={a.niveau === 'rupture' ? 'red' : 'amber'}>{a.niveau === 'rupture' ? 'Rupture' : 'Faible'}</Badge>
                </Row>
              ))}</ul>
            )}
          </Panel>
        )}

        <Panel title="Activité récente" className="lg:col-span-2 xl:col-span-2">
          {d.activite_recente.length === 0 ? <Empty>Aucune activité récente</Empty> : (
            <ul>{d.activite_recente.map((e, i) => {
              const Icon = ACTIVITY_ICON[e.type];
              return (
                <Row key={`${e.type}-${i}`} onClick={() => vm.go(e.lien)}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mist text-slate"><Icon size={15} /></span>
                  <div className="min-w-0 flex-1"><b className="block truncate">{e.titre}</b><span className="block truncate text-xs text-slate">{e.detail}</span></div>
                  <span className="shrink-0 text-xs text-faint">{formatDateTime(e.date)}</span>
                </Row>
              );
            })}</ul>
          )}
        </Panel>

        {d.creances_en_cours && (
          <Panel title="Créances en cours" actions={<CreditCard size={16} className="text-slate" />}>
            {d.creances_en_cours.length === 0 ? <Empty>Aucune créance en cours</Empty> : (
              <ul>{d.creances_en_cours.map((c) => (
                <Row key={c.id} onClick={() => vm.go('/facturation')}>
                  <div className="min-w-0 flex-1"><b className="block truncate">{c.numero}</b><span className="block truncate text-xs text-slate">{c.client}, {formatDate(c.date)}</span></div>
                  <b className="shrink-0 tabular-nums text-danger">{formatFcfa(c.reste)}</b>
                </Row>
              ))}</ul>
            )}
          </Panel>
        )}
      </div>

      <RdvFormModal open={vm.rdvOpen} onClose={vm.closeRdv} onSaved={(id) => { vm.closeRdv(); vm.go(`/rendez-vous?id=${id}`); }} />
      <ConsultationFormModal open={vm.consultOpen} onClose={vm.closeConsult} onCreated={() => { vm.closeConsult(); vm.go('/consultations'); }} />
    </div>
  );
}
