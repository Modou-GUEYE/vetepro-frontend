import { Eye, FileText, Plus, Printer, ReceiptText, Search } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '@/core/utils/format';
import { Badge, Button, Column, Input, Panel, Table } from '@/shared/ui';
import { InvoiceDetailModal } from '@/modules/facturation/views/InvoiceDetailModal';
import { ConsultationRow } from '../models/consultation';
import { useConsultationsViewModel } from '../viewmodels/useConsultationsViewModel';
import { ConsultationDetailModal } from './ConsultationDetailModal';
import { ConsultationFormModal } from './ConsultationFormModal';

/** Page Consultations (liste complète) et page Ordonnances (même liste, limitée aux consultations avec médicaments). */
export function ConsultationsPage({ mode = 'consultations' }: { mode?: 'consultations' | 'ordonnances' }) {
  const vm = useConsultationsViewModel(mode);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const ordo = mode === 'ordonnances';

  const columns: Column<ConsultationRow>[] = [
    { key: 'date', header: 'Date', className: 'whitespace-nowrap font-semibold', render: (c) => formatDate(c.date) },
    { key: 'patient', header: 'Patient', render: (c) => <div><div className="font-semibold">{c.patient?.nom}</div><div className="text-xs text-faint">{c.patient?.espece}</div></div> },
    { key: 'prop', header: 'Propriétaire', render: (c) => c.proprietaire?.nom ?? '—' },
    { key: 'motif', header: ordo ? 'Diagnostic' : 'Motif', render: (c) => (ordo ? c.diagnostic : c.motif) || <span className="text-faint">—</span> },
    ordo
      ? { key: 'lignes', header: 'Lignes', render: (c) => <Badge tone="violet">{c.nbMedicaments} médicament{c.nbMedicaments > 1 ? 's' : ''}</Badge> }
      : { key: 'vet', header: 'Vétérinaire', render: (c) => c.veterinaire },
    ...(ordo ? [] : [{ key: 'facture', header: 'Facture', render: (c: ConsultationRow) => (c.facture ? <Badge tone="green">{c.facture.numero}</Badge> : <Badge tone="amber">Non facturée</Badge>) }]),
    {
      key: 'actions', header: 'Actions', className: 'whitespace-nowrap',
      render: (c) => (
        <div className="flex gap-1.5">
          <Button size="icon" variant="info" title="Voir" aria-label={`Voir la consultation de ${c.patient?.nom} du ${formatDate(c.date)}`} onClick={() => vm.openDetail(c.id)}><Eye size={14} /></Button>
          {c.nbMedicaments > 0 && <Button size="icon" variant="violet" title="Ordonnance" aria-label={`Ordonnance de ${c.patient?.nom} du ${formatDate(c.date)}`} onClick={() => vm.openDetail(c.id)}>{ordo ? <Printer size={14} /> : <FileText size={14} />}</Button>}
          {!ordo && !c.facture && <Button size="icon" variant="success" title="Facturer" aria-label={`Facturer la consultation de ${c.patient?.nom}`} onClick={() => vm.openDetail(c.id)}><ReceiptText size={14} /></Button>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-[11px] text-faint" />
          <Input aria-label="Rechercher" placeholder={ordo ? 'Rechercher (patient, propriétaire, diagnostic…)' : 'Rechercher (patient, propriétaire, motif…)'} className="pl-9" value={vm.search} onChange={(e) => vm.setSearch(e.target.value)} />
        </div>
        {!ordo && <Input aria-label="Filtrer par date" type="date" wrapperClassName="w-44" value={vm.date} onChange={(e) => vm.setDate(e.target.value)} />}
        {!ordo && vm.canCreate && <Button onClick={vm.openCreate}><Plus size={15} /> Nouvelle consultation</Button>}
      </div>

      <Panel title={ordo ? 'Historique des ordonnances' : 'Toutes les consultations'} count={`${vm.total} ${ordo ? 'ordonnance' : 'consultation'}${vm.total > 1 ? 's' : ''}`}>
        <Table bare columns={columns} rows={vm.rows} rowKey={(c) => c.id} loading={vm.loading} emptyTitle={ordo ? 'Aucune ordonnance' : 'Aucune consultation trouvée'}
          page={vm.page} pageSize={vm.pageSize} total={vm.total} onPageChange={vm.setPage} onRowClick={(c) => vm.openDetail(c.id)} />
      </Panel>

      <ConsultationFormModal open={vm.creating} onClose={vm.closeCreate} onCreated={vm.onCreated} />
      {vm.detailId && <ConsultationDetailModal id={vm.detailId} onClose={vm.closeDetail} onOpenInvoice={setInvoiceId} />}
      {invoiceId && <InvoiceDetailModal id={invoiceId} onClose={() => setInvoiceId(null)} />}
    </div>
  );
}
