import { Check, PawPrint, Pencil, Plus, Search, Trash2, TriangleAlert, X } from 'lucide-react';
import { Badge, Button, Column, ConfirmDialog, Input, Modal, Panel, Select, Table } from '@/shared/ui';
import { Owner, ownerFullName } from '../models/proprietaire';
import { useOwnersViewModel } from '../viewmodels/useOwnersViewModel';
import { OwnerFormModal } from './OwnerFormModal';

export function OwnersPage() {
  const vm = useOwnersViewModel();

  const columns: Column<Owner>[] = [
    { key: 'nom', header: 'Nom', render: (o) => <div><div className="font-bold">{ownerFullName(o)}</div>{o.adresse && <div className="text-xs text-faint">{o.adresse}</div>}</div> },
    { key: 'tel', header: 'Téléphone', className: 'whitespace-nowrap', render: (o) => o.telephone || <span className="text-faint">—</span> },
    { key: 'email', header: 'E-mail', render: (o) => o.email || <span className="text-faint">—</span> },
    { key: 'animaux', header: 'Animaux', render: (o) => <Badge tone="green">{o.nbPatients}</Badge> },
    { key: 'statut', header: 'Statut', render: (o) => <Badge tone={o.actif ? 'green' : 'red'}>{o.actif ? 'Actif' : 'Inactif'}</Badge> },
    {
      key: 'actions', header: 'Actions', className: 'whitespace-nowrap',
      render: (o) => (
        <div className="flex items-center gap-1.5">
          {vm.canSeePatients && <Button size="sm" variant="secondary" aria-label={`Voir les animaux de ${ownerFullName(o)}`} onClick={() => vm.seePatients(o)}><PawPrint size={13} /> Voir animaux</Button>}
          {vm.canEdit && <Button size="icon" variant="secondary" title="Modifier" aria-label={`Modifier ${ownerFullName(o)}`} onClick={() => vm.openForm(o)}><Pencil size={14} /></Button>}
          {vm.canEdit && (o.actif
            ? <Button size="icon" variant="amber" title="Désactiver" aria-label={`Désactiver ${ownerFullName(o)}`} onClick={() => vm.askDeactivate(o)}><X size={14} /></Button>
            : <Button size="icon" variant="success" title="Activer" aria-label={`Activer ${ownerFullName(o)}`} onClick={() => vm.activate(o)}><Check size={14} /></Button>)}
          {vm.canDelete && <Button size="icon" variant="danger" title="Supprimer" aria-label={`Supprimer ${ownerFullName(o)}`} onClick={() => vm.askDelete(o)}><Trash2 size={14} /></Button>}
        </div>
      ),
    },
  ];

  const deleting = vm.confirm?.kind === 'delete';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-[11px] text-faint" />
          <Input aria-label="Rechercher un propriétaire" placeholder="Rechercher (nom, téléphone, e-mail…)" className="pl-9" value={vm.search} onChange={(e) => vm.setSearch(e.target.value)} />
        </div>
        <Select aria-label="Filtrer par statut" wrapperClassName="w-40" value={vm.statut} onChange={(e) => vm.setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="actif">Actifs</option>
          <option value="inactif">Inactifs</option>
        </Select>
      </div>

      <Panel title="Propriétaires" count={`${vm.total} propriétaire${vm.total > 1 ? 's' : ''}`}
        actions={vm.canCreate ? <Button size="sm" onClick={() => vm.openForm('new')}><Plus size={13} /> Ajouter</Button> : undefined}>
        <Table bare columns={columns} rows={vm.owners} rowKey={(o) => o.id} loading={vm.loading} emptyTitle="Aucun propriétaire trouvé"
          page={vm.page} pageSize={vm.pageSize} total={vm.total} onPageChange={vm.setPage} />
      </Panel>

      <OwnerFormModal target={vm.formTarget} saving={vm.saving} onSubmit={vm.submitForm} onClose={vm.closeForm} />

      <ConfirmDialog
        open={!!vm.confirm} danger loading={vm.confirming}
        title={deleting ? 'Supprimer le propriétaire' : 'Désactiver le propriétaire'}
        message={vm.confirm ? (deleting
          ? `Confirmez-vous la suppression de ${ownerFullName(vm.confirm.owner)} ?`
          : `${ownerFullName(vm.confirm.owner)} ne sera plus proposé pour un nouveau dossier. Ses animaux et troupeaux sont conservés.`) : ''}
        confirmLabel={deleting ? 'Supprimer' : 'Désactiver'} onConfirm={vm.runConfirm} onCancel={vm.cancelConfirm}
      />

      <Modal open={!!vm.blocked} onClose={vm.closeBlocked} title="Suppression impossible" footer={<Button onClick={vm.closeBlocked}>Compris</Button>}>
        <p className="flex items-start gap-3 text-sm"><TriangleAlert size={20} className="mt-0.5 shrink-0 text-amber" />{vm.blocked}</p>
      </Modal>
    </div>
  );
}
