import { Activity, Bandage, BedDouble, FlaskConical, Pencil, Plus, Scissors, Search, Sparkles, Stethoscope, Syringe, Tag, Trash2, TriangleAlert, LucideIcon } from 'lucide-react';
import { formatFcfa } from '@/core/utils/format';
import { Badge, BadgeTone, Button, Column, ConfirmDialog, Input, KpiCard, Panel, Select, Table } from '@/shared/ui';
import { Service } from '../models/referentiels';
import { useServicesViewModel } from '../viewmodels/useServicesViewModel';
import { ServiceFormModal } from './ServiceFormModal';

const CATEGORY: Record<string, { tone: BadgeTone; icon: LucideIcon }> = {
  Consultation: { tone: 'green', icon: Stethoscope }, Chirurgie: { tone: 'red', icon: Scissors }, Vaccination: { tone: 'violet', icon: Syringe },
  Diagnostic: { tone: 'blue', icon: Activity }, Soins: { tone: 'amber', icon: Bandage }, Toilettage: { tone: 'slate', icon: Sparkles },
  Urgence: { tone: 'red', icon: TriangleAlert }, Hospitalisation: { tone: 'amber', icon: BedDouble }, Laboratoire: { tone: 'blue', icon: FlaskConical }, Autre: { tone: 'slate', icon: Tag },
};

export function ServicesPage() {
  const vm = useServicesViewModel();

  const columns: Column<Service>[] = [
    {
      key: 'libelle', header: 'Service',
      render: (s) => {
        const Icon = (CATEGORY[s.categorie] ?? CATEGORY.Autre).icon;
        return (
          <div className="flex items-start gap-2.5">
            <Icon size={16} className="mt-0.5 shrink-0 text-slate" />
            <div className="min-w-0"><div className="font-semibold">{s.libelle}</div>{s.description && <div className="max-w-md truncate text-xs text-faint">{s.description}</div>}</div>
          </div>
        );
      },
    },
    { key: 'categorie', header: 'Catégorie', render: (s) => <Badge tone={(CATEGORY[s.categorie] ?? CATEGORY.Autre).tone}>{s.categorie}</Badge> },
    { key: 'prix', header: 'Tarif', className: 'whitespace-nowrap font-bold text-brand-text', render: (s) => formatFcfa(s.prix) },
    { key: 'statut', header: 'Statut', render: (s) => <Badge tone={s.actif ? 'green' : 'red'}>{s.actif ? 'Actif' : 'Inactif'}</Badge> },
    {
      key: 'actions', header: 'Actions', className: 'whitespace-nowrap',
      render: (s) => (
        <div className="flex items-center gap-1.5">
          {vm.canEdit && <Button size="icon" variant="secondary" title="Modifier" aria-label={`Modifier ${s.libelle}`} onClick={() => vm.openForm(s)}><Pencil size={14} /></Button>}
          {vm.canEdit && (s.actif
            ? <Button size="sm" variant="danger" aria-label={`Désactiver ${s.libelle}`} onClick={() => vm.askDeactivate(s)}>Désact.</Button>
            : <Button size="sm" variant="success" aria-label={`Activer ${s.libelle}`} onClick={() => vm.activate(s)}>Activer</Button>)}
          {vm.canDelete && <Button size="icon" variant="secondary" title="Supprimer" aria-label={`Supprimer ${s.libelle}`} onClick={() => vm.askDelete(s)}><Trash2 size={14} /></Button>}
        </div>
      ),
    },
  ];

  const deleting = vm.confirm?.kind === 'delete';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {vm.canCreate && <Button onClick={() => vm.openForm('new')}><Plus size={15} /> Nouveau service</Button>}
        <Select aria-label="Filtrer par catégorie" wrapperClassName="w-48" value={vm.categorie} onChange={(e) => vm.setCategorie(e.target.value)}>
          <option value="">Toutes catégories</option>
          {vm.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select aria-label="Filtrer par statut" wrapperClassName="w-40" value={vm.statut} onChange={(e) => vm.setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="actif">Actifs</option>
          <option value="inactif">Inactifs</option>
        </Select>
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-[11px] text-faint" />
          <Input aria-label="Rechercher un service" placeholder="Rechercher…" className="pl-9" value={vm.search} onChange={(e) => vm.setSearch(e.target.value)} />
        </div>
      </div>

      {vm.stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard value={vm.stats.total} label="Total services" />
          <KpiCard value={vm.stats.actifs} label="Actifs" tone="brand" />
          <KpiCard value={vm.stats.categories} label="Catégories" tone="info" />
          <KpiCard value={<span className="text-amber">{formatFcfa(vm.stats.tarifMoyen)}</span>} label="Tarif moyen" tone="amber" />
        </div>
      )}

      <Panel title="Catalogue des services" count={vm.total}>
        <Table bare columns={columns} rows={vm.services} rowKey={(s) => s.id} loading={vm.loading} emptyTitle="Aucun service trouvé"
          page={vm.page} pageSize={vm.pageSize} total={vm.total} onPageChange={vm.setPage} />
      </Panel>

      <ServiceFormModal target={vm.formTarget} categories={vm.categories} saving={vm.saving} onSubmit={vm.submitForm} onClose={vm.closeForm} />

      <ConfirmDialog
        open={!!vm.confirm} danger loading={vm.confirming}
        title={deleting ? 'Supprimer le service' : 'Désactiver le service'}
        message={vm.confirm ? (deleting
          ? `« ${vm.confirm.service.libelle} » sera supprimé et ne sera plus proposé lors des traitements.`
          : `« ${vm.confirm.service.libelle} » ne sera plus disponible lors d'un traitement tant qu'il n'est pas réactivé.`) : ''}
        confirmLabel={deleting ? 'Supprimer' : 'Désactiver'} onConfirm={vm.runConfirm} onCancel={vm.cancelConfirm}
      />
    </div>
  );
}
