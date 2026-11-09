import { LifeBuoy } from 'lucide-react';
import { formatDateTime } from '@/core/utils/format';
import { Badge, Button, Modal, Panel } from '@/shared/ui';
import { TICKET_LABEL, TICKET_STATUTS, TICKET_TONE } from '@/modules/support/models/ticket';
import { Reclamation } from '../models/association';
import { useReclamationsViewModel } from '../viewmodels/useReclamationsViewModel';
import { AssoColumn, AssoTable } from './AssoTable';

/** Réclamations envoyées par les Administrateurs des cabinets à l'équipe support. */
export function ReclamationsPage() {
  const vm = useReclamationsViewModel();
  const columns: AssoColumn<Reclamation>[] = [
    { key: 'num', header: 'N°', className: 'whitespace-nowrap font-mono text-xs', render: (t) => t.numero },
    { key: 'cab', header: 'Cabinet', render: (t) => t.cabinet },
    { key: 'aut', header: 'Auteur', render: (t) => t.auteur },
    { key: 'obj', header: 'Objet', render: (t) => <b>{t.objet}</b> },
    { key: 'st', header: 'Statut', render: (t) => <Badge tone={TICKET_TONE[t.statut]}>{TICKET_LABEL[t.statut]}</Badge> },
    { key: 'date', header: 'Reçue le', className: 'whitespace-nowrap text-xs text-slate', render: (t) => formatDateTime(t.date) },
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-lg2 border border-info/20 bg-info-pale px-5 py-4 text-[13px] text-info-text">
        <LifeBuoy size={20} className="mt-0.5 shrink-0" />
        <p>Les réclamations des cabinets arrivent ici et sont aussi notifiées à l'équipe support{vm.adresse ? ` (${vm.adresse})` : ''}. Le statut que vous choisissez est visible par le cabinet.</p>
      </div>
      <Panel title="Réclamations reçues" count={`${vm.items.length} réclamation${vm.items.length > 1 ? 's' : ''}`}>
        <AssoTable columns={columns} rows={vm.items} rowKey={(t) => t.id} onRowClick={vm.openDetail} loading={vm.loading} emptyTitle="Aucune réclamation reçue" />
      </Panel>
      <Modal open={!!vm.detail} onClose={vm.closeDetail} title={vm.detail ? `${vm.detail.numero}, ${vm.detail.objet}` : 'Réclamation'} footer={<Button variant="secondary" onClick={vm.closeDetail}>Fermer</Button>}>
        {vm.detail && (
          <div className="space-y-4 text-[13px]">
            <p className="text-slate">Envoyée le {formatDateTime(vm.detail.date)} par {vm.detail.auteur}, {vm.detail.cabinet}.</p>
            <p className="whitespace-pre-wrap rounded-lg bg-mist px-4 py-3">{vm.detail.message}</p>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[.8px] text-slate">Statut</p>
              <div role="group" aria-label="Statut de la réclamation" className="flex flex-wrap gap-2">
                {TICKET_STATUTS.map((s) => (
                  <Button key={s} size="sm" variant={vm.detail!.statut === s ? 'primary' : 'secondary'} aria-pressed={vm.detail!.statut === s} disabled={vm.updating} onClick={() => vm.setStatut(vm.detail!.id, s)}>{TICKET_LABEL[s]}</Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
