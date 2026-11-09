import { ArrowLeftRight, Send, Star, Trash2 } from 'lucide-react';
import { formatDate, formatDateTime, formatFcfa } from '@/core/utils/format';
import { Badge, Button, ConfirmDialog, Column, EmptyState, Panel, Table, Tabs } from '@/shared/ui';
import { Alias, AVANCEMENT_LABEL, AVANCEMENT_TONE, Operation, PaymentRequest, Transfer } from '../models/comptes';
import { useComptesViewModel } from '../viewmodels/useComptesViewModel';
import { AliasModal } from './AliasModal';
import { RequestDetailModal, RequestFormModal } from './RequestModals';
import { TransferModal } from './TransferModal';

const noPaging = { page: 1, pageSize: 1000, onPageChange: () => undefined };
const ACCENT: Record<string, string> = { Wave: 'from-[#1d9bf0] to-[#1479bd]', 'Orange Money': 'from-[#f97316] to-[#c2570c]', 'PI-SPI': 'from-[#0f766e] to-[#0b4f4a]' };

export function ComptesPage() {
  const vm = useComptesViewModel();
  const wallets = vm.accounts.filter((a) => a.type === 'Wallet');

  const opColumns: Column<Operation>[] = [
    { key: 'date', header: 'Date', className: 'whitespace-nowrap', render: (o) => formatDateTime(o.date) },
    { key: 'libelle', header: 'Opération', render: (o) => o.libelle },
    { key: 'compte', header: 'Compte', render: (o) => o.compte || '-' },
    { key: 'montant', header: 'Montant', className: 'whitespace-nowrap font-bold tabular-nums', render: (o) => <span className={o.montant > 0 ? 'text-brand-text' : 'text-danger'}>{o.montant > 0 ? '+' : '-'} {formatFcfa(Math.abs(o.montant))}</span> },
    { key: 'statut', header: 'Statut', render: (o) => <Badge tone={o.statut === 'succes' ? 'green' : 'amber'}>{o.statut === 'succes' ? 'Effectué' : 'En attente'}</Badge> },
  ];
  const aliasColumns: Column<Alias>[] = [
    { key: 'valeur', header: 'Alias', render: (a) => <span className={a.actif ? '' : 'text-faint line-through'}><b>{a.valeur}</b>{a.defaut && <Badge tone="violet" className="ml-2">Par défaut</Badge>}</span> },
    { key: 'type', header: 'Type', render: (a) => a.type },
    { key: 'compte', header: 'Compte rattaché', render: (a) => a.compte },
    { key: 'date', header: 'Créé le', className: 'whitespace-nowrap', render: (a) => formatDate(a.date) },
    { key: 'statut', header: 'Statut', render: (a) => <Badge tone={a.actif ? 'green' : 'slate'}>{a.actif ? 'Actif' : 'Désactivé'}</Badge> },
    {
      key: 'actions', header: 'Actions', className: 'whitespace-nowrap',
      render: (a) => (
        <div className="flex gap-1.5">
          {vm.canUpdate && a.actif && !a.defaut && <Button size="icon" variant="secondary" title="Définir par défaut" aria-label={`Définir ${a.valeur} par défaut`} onClick={() => vm.setDefault(a.id)}><Star size={14} /></Button>}
          {vm.canUpdate && !a.defaut && <Button size="sm" variant="secondary" onClick={() => vm.toggleAlias(a.id)}>{a.actif ? 'Désactiver' : 'Activer'}</Button>}
          {vm.canDelete && !a.defaut && <Button size="icon" variant="danger" title="Supprimer" aria-label={`Supprimer l'alias ${a.valeur}`} onClick={() => vm.askDelete(a)}><Trash2 size={14} /></Button>}
        </div>
      ),
    },
  ];
  const transferColumns: Column<Transfer>[] = [
    { key: 'ref', header: 'Référence', className: 'whitespace-nowrap font-bold', render: (t) => t.reference },
    { key: 'date', header: 'Date', className: 'whitespace-nowrap', render: (t) => formatDateTime(t.date) },
    { key: 'type', header: 'Type', render: (t) => <Badge tone={t.type === 'Multiple' ? 'violet' : t.type === 'Intercomptes' ? 'blue' : 'slate'}>{t.type}</Badge> },
    { key: 'de', header: 'Depuis', render: (t) => t.depuis },
    { key: 'benef', header: 'Bénéficiaires', render: (t) => t.beneficiaires.map((b) => b.nom).join(', ') },
    { key: 'montant', header: 'Montant', className: 'whitespace-nowrap font-bold tabular-nums', render: (t) => formatFcfa(t.montant) },
    { key: 'motif', header: 'Motif', render: (t) => t.motif },
    { key: 'statut', header: 'Statut', render: (t) => <Badge tone={t.statut === 'succes' ? 'green' : 'amber'}>{t.statut === 'succes' ? 'Effectué' : 'En attente'}</Badge> },
  ];
  const requestColumns: Column<PaymentRequest>[] = [
    { key: 'ref', header: 'Référence', className: 'whitespace-nowrap font-bold', render: (d) => d.reference },
    { key: 'date', header: 'Date', className: 'whitespace-nowrap', render: (d) => formatDateTime(d.date) },
    { key: 'type', header: 'Type', render: (d) => d.type },
    { key: 'motif', header: 'Motif', render: (d) => d.motif },
    { key: 'dest', header: 'Destinataires', render: (d) => `${d.destinataires.filter((r) => r.statut === 'paye').length} payé sur ${d.destinataires.length}` },
    { key: 'montant', header: 'Montant total', className: 'whitespace-nowrap font-bold tabular-nums', render: (d) => formatFcfa(d.montant) },
    { key: 'echeance', header: 'Échéance', className: 'whitespace-nowrap', render: (d) => formatDate(d.echeance) },
    { key: 'statut', header: 'Avancement', render: (d) => <Badge tone={AVANCEMENT_TONE[d.avancement]}>{AVANCEMENT_LABEL[d.avancement]}</Badge> },
  ];

  const detail = vm.dialog?.kind === 'request-detail' ? vm.dialog : null;

  return (
    <div className="space-y-5">
      <Panel title="Gestion de compte" actions={<p className="text-[13px] text-slate">Solde consolidé <b className="tabular-nums text-ink">{formatFcfa(vm.totalBalance)}</b></p>}>
        <Tabs value={vm.tab} onChange={vm.setTab} items={[{ key: 'comptes', label: 'Comptes et soldes' }, { key: 'alias', label: 'Alias' }, { key: 'transferts', label: 'Transferts' }, { key: 'demandes', label: 'Demandes de paiement' }]} />

        {vm.tab === 'comptes' && (
          <div className="space-y-5 p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vm.accounts.map((a) => (
                <div key={a.id} className={`rounded-lg2 bg-gradient-to-br p-4 text-white shadow-card ${a.canal ? ACCENT[a.canal] : 'from-[#0f5f66] to-[#0b2a30]'}`}>
                  <div className="flex items-start justify-between gap-2"><p className="text-xs opacity-80">{a.type}, {a.institution}</p>{a.principal && <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase">Principal</span>}</div>
                  <p className="mt-1 font-bold">{a.nom}</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums">{formatFcfa(a.solde)}</p>
                  <p className="mt-1 text-xs opacity-80">{a.numero}</p>
                  {vm.canCreate && <Button size="sm" variant="secondary" className="mt-3" onClick={() => vm.openDialog({ kind: 'transfer', type: 'inter', from: a.id })}><ArrowLeftRight size={14} /> Transférer</Button>}
                </div>
              ))}
            </div>
            <div><h3 className="mb-2 text-[13px] font-bold">Dernières opérations</h3>
              <Table bare columns={opColumns} rows={vm.operations} rowKey={(o) => o.date + o.libelle} loading={vm.loadingAccounts} emptyTitle="Aucune opération" total={vm.operations.length} {...noPaging} /></div>
          </div>
        )}

        {vm.tab === 'alias' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="max-w-xl text-xs text-slate">Les alias permettent à vos clients de vous payer sans connaître vos coordonnées. L'alias par défaut est utilisé sur les QR codes et les demandes de paiement.</p>
              {vm.canCreate && <Button onClick={() => vm.openDialog({ kind: 'alias' })}>Nouvel alias</Button>}
            </div>
            <Table bare columns={aliasColumns} rows={vm.aliases} rowKey={(a) => a.id} emptyTitle="Aucun alias" total={vm.aliases.length} {...noPaging} />
          </>
        )}

        {vm.tab === 'transferts' && (
          <>
            <div className="flex flex-wrap gap-2 p-4">
              {vm.canCreate
                ? <>
                  <Button onClick={() => vm.openDialog({ kind: 'transfer', type: 'inter' })}><ArrowLeftRight size={14} /> Transfert intercomptes</Button>
                  <Button variant="secondary" onClick={() => vm.openDialog({ kind: 'transfer', type: 'simple' })}>Transfert simple</Button>
                  <Button variant="secondary" onClick={() => vm.openDialog({ kind: 'transfer', type: 'multiple' })}>Transfert multiple</Button>
                </>
                : <p className="text-xs text-faint">Consultation seule</p>}
            </div>
            <Table bare columns={transferColumns} rows={vm.transfers} rowKey={(t) => t.id} emptyTitle="Aucun transfert" total={vm.transfers.length} {...noPaging} />
          </>
        )}

        {vm.tab === 'demandes' && (
          <>
            {vm.canCreate && <div className="flex flex-wrap gap-2 p-4"><Button onClick={() => vm.openDialog({ kind: 'request', multiple: false })}><Send size={14} /> Demande simple</Button><Button variant="secondary" onClick={() => vm.openDialog({ kind: 'request', multiple: true })}>Demande multiple</Button></div>}
            {vm.requests.length === 0 ? <EmptyState title="Aucune demande de paiement" /> : <Table bare columns={requestColumns} rows={vm.requests} rowKey={(d) => d.id} emptyTitle="Aucune demande" total={vm.requests.length} {...noPaging} onRowClick={(d) => vm.openDialog({ kind: 'request-detail', id: d.id })} />}
          </>
        )}
      </Panel>

      {vm.dialog?.kind === 'transfer' && <TransferModal type={vm.dialog.type} from={vm.dialog.from} accounts={vm.accounts} error={vm.error} busy={vm.transferring} sendingCode={vm.requestingCode} onRequestCode={vm.requestCode} onSubmit={vm.submitTransfer} onClose={vm.closeDialog} />}
      {vm.dialog?.kind === 'alias' && <AliasModal wallets={wallets} error={vm.error} busy={vm.addingAlias} onSubmit={vm.addAlias} onClose={vm.closeDialog} />}
      {vm.dialog?.kind === 'request' && <RequestFormModal multiple={vm.dialog.multiple} clients={vm.clients} error={vm.error} busy={vm.requesting} onSubmit={vm.submitRequest} onClose={vm.closeDialog} />}
      {detail && <RequestDetailModal request={vm.requests.find((d) => d.id === detail.id)} canUpdate={vm.canUpdate} busy={vm.acting} onAct={(i, a) => vm.act(detail.id, i, a)} onClose={vm.closeDialog} />}
      <ConfirmDialog open={!!vm.toDelete} danger title="Supprimer l'alias" message={`Les clients ne pourront plus vous payer avec ${vm.toDelete?.valeur ?? ''}.`} confirmLabel="Supprimer" loading={vm.deleting} onConfirm={vm.confirmDelete} onCancel={() => vm.askDelete(null)} />
    </div>
  );
}
