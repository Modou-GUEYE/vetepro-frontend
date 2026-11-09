import { CreditCard, Eye, Plus, Search } from 'lucide-react';
import { formatDate, formatFcfa } from '@/core/utils/format';
import { Badge, Button, Column, Input, KpiCard, Panel, Select, Table } from '@/shared/ui';
import { InvoiceRow, STATUS_LABEL, STATUS_TONE } from '../models/facture';
import { useInvoicesViewModel } from '../viewmodels/useInvoicesViewModel';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { InvoiceFormModal } from './InvoiceFormModal';

export function FacturationPage() {
  const vm = useInvoicesViewModel();

  const columns: Column<InvoiceRow>[] = [
    { key: 'numero', header: 'N°', className: 'whitespace-nowrap font-bold', render: (i) => i.numero },
    { key: 'client', header: 'Propriétaire', render: (i) => i.client.nom },
    { key: 'patient', header: 'Animal', render: (i) => i.patient?.nom ?? <span className="text-faint">{i.source === 'vente' ? 'Vente comptoir' : '—'}</span> },
    { key: 'date', header: 'Date', className: 'whitespace-nowrap', render: (i) => formatDate(i.date) },
    { key: 'total', header: 'Total', className: 'whitespace-nowrap font-bold tabular-nums', render: (i) => formatFcfa(i.total) },
    { key: 'paye', header: 'Payé', className: 'whitespace-nowrap tabular-nums text-brand-text', render: (i) => formatFcfa(i.paye) },
    { key: 'reste', header: 'Reste', className: 'whitespace-nowrap tabular-nums', render: (i) => <span className={i.reste > 0 ? 'font-semibold text-danger' : 'text-slate'}>{formatFcfa(i.reste)}</span> },
    { key: 'statut', header: 'Statut', render: (i) => <Badge tone={STATUS_TONE[i.statut]}>{STATUS_LABEL[i.statut]}</Badge> },
    {
      key: 'actions', header: 'Actions', className: 'whitespace-nowrap',
      render: (i) => (
        <div className="flex gap-1.5">
          <Button size="icon" variant="secondary" title="Voir la facture" aria-label={`Voir la facture ${i.numero}`} onClick={() => vm.openDetail(i.id)}><Eye size={14} /></Button>
          {vm.canPay && i.reste > 0 && i.statut !== 'annulee' && <Button size="icon" variant="success" title="Encaisser" aria-label={`Encaisser la facture ${i.numero}`} onClick={() => vm.openDetail(i.id)}><CreditCard size={14} /></Button>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {vm.stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard value={formatFcfa(vm.stats.chiffreAffaires)} label="Chiffre d'affaires" />
          <KpiCard value={formatFcfa(vm.stats.encaisse)} label="Encaissé" />
          <KpiCard value={<span className="text-danger">{formatFcfa(vm.stats.creances)}</span>} label="Créances" tone="amber" />
          <KpiCard value={vm.stats.nonSoldees} label="Non soldées" tone="amber" />
          <KpiCard value={vm.stats.ventesPharmacie} label="Ventes pharmacie" tone="info" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-[11px] text-faint" />
          <Input aria-label="Rechercher une facture" placeholder="Rechercher (n° de facture, propriétaire, animal)" className="pl-9" value={vm.search} onChange={(e) => vm.setSearch(e.target.value)} />
        </div>
        <Select aria-label="Filtrer par statut" wrapperClassName="w-44" value={vm.statut} onChange={(e) => vm.setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {(['impayee', 'partielle', 'payee', 'annulee'] as const).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </Select>
        <Input aria-label="Du" type="date" wrapperClassName="w-40" value={vm.du} onChange={(e) => vm.setDu(e.target.value)} />
        <Input aria-label="Au" type="date" wrapperClassName="w-40" value={vm.au} onChange={(e) => vm.setAu(e.target.value)} />
        {vm.canCreate && <Button onClick={vm.openCreate}><Plus size={15} /> Nouvelle facture</Button>}
      </div>

      <Panel title="Factures" count={vm.total}>
        <Table bare columns={columns} rows={vm.invoices} rowKey={(i) => i.id} loading={vm.loading} emptyTitle="Aucune facture trouvée"
          page={vm.page} pageSize={vm.pageSize} total={vm.total} onPageChange={vm.setPage} onRowClick={(i) => vm.openDetail(i.id)} />
      </Panel>

      <InvoiceFormModal open={vm.creating} onClose={vm.closeCreate} onCreated={vm.onCreated} />
      {vm.detailId && <InvoiceDetailModal id={vm.detailId} onClose={vm.closeDetail} />}
    </div>
  );
}
