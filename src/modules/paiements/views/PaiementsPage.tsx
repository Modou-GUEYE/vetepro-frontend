import { useState } from 'react';
import { Eye, RotateCcw, Search, Undo2, X } from 'lucide-react';
import { formatDate, formatDateTime, formatFcfa } from '@/core/utils/format';
import { Badge, Button, Column, Input, KpiCard, Modal, Panel, Select, Table, Tabs } from '@/shared/ui';
import { CANALS, Canal, METHODE_LABEL, Methode, OpenInvoice, REFUND_REASONS, aliasError as aliasMsg, aliasLabel, aliasOkFor, Refund, refundMotif, STATUT_LABEL, STATUT_TONE, Suspens, Transaction, TxStatut } from '../models/paiements';
import { ReceiptModal } from '@/modules/facturation/views/ReceiptModal';
import { usePaiementsViewModel } from '../viewmodels/usePaiementsViewModel';
import { ChannelChip } from './QrCode';
import { TransactionModal } from './TransactionModal';

function RefundModal({ tx, error, busy, onSubmit, onClose }: { tx: Transaction; error: string | null; busy: boolean; onSubmit: (montant: number, motif: string, canal: string, avoir: boolean) => void; onClose: () => void }) {
  const max = tx.montant - tx.rembourse;
  const [step, setStep] = useState<'saisie' | 'confirmation'>('saisie');
  const [montant, setMontant] = useState(String(max));
  const [canal, setCanal] = useState<string>(tx.canal);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [avoir, setAvoir] = useState(true);
  const [sure, setSure] = useState(false);
  const n = Number(montant);
  const bad = !/^\d+$/.test(montant) || n < 1 || n > max ? `Entre 1 et ${formatFcfa(max)}` : undefined;
  return (
    <Modal open onClose={onClose} title={`Rembourser ${tx.reference}`}
      footer={step === 'saisie'
        ? <><Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button><Button size="sm" disabled={!!bad || !reason} onClick={() => setStep('confirmation')}>Continuer</Button></>
        : <><Button variant="secondary" size="sm" onClick={() => { setStep('saisie'); setSure(false); }}>Retour</Button><Button variant="danger" size="sm" loading={busy} disabled={!sure} onClick={() => onSubmit(n, refundMotif(reason, comment), canal, avoir)}>Rembourser</Button></>}>
      {step === 'saisie' ? (
        <div className="space-y-3">
          <p className="text-xs text-slate">Le remboursement est réservé à l'Administrateur. Montant remboursable : <b>{formatFcfa(max)}</b>.</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Montant à rembourser (FCFA)" inputMode="numeric" autoFocus value={montant} onChange={(e) => setMontant(e.target.value)} error={bad} />
            <Select label="Canal de remboursement" value={canal} onChange={(e) => setCanal(e.target.value)}>{[tx.canal, 'Espèces', 'Virement'].map((c) => <option key={c}>{c}</option>)}</Select>
          </div>
          <Select label="Motif *" value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Choisir un motif</option>{REFUND_REASONS.map((r) => <option key={r}>{r}</option>)}</Select>
          <Input label="Commentaire" value={comment} onChange={(e) => setComment(e.target.value)} />
          {tx.facture && <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" className="accent-brand" checked={avoir} onChange={(e) => setAvoir(e.target.checked)} /> Émettre un avoir du même montant sur la facture {tx.facture.numero}</label>}
          {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <p role="alert" className="rounded-lg bg-amber-pale px-3 py-2 text-[13px] text-amber-text">Vous allez rembourser <b>{formatFcfa(n)}</b> par <b>{canal}</b> à <b>{tx.payeur}</b>{tx.alias !== '-' ? ` (${tx.alias})` : ''}. Cette opération est irréversible.</p>
          <dl className="space-y-1.5 rounded-lg border border-line p-3 text-[13px]">
            <div className="flex justify-between"><dt className="text-slate">Motif</dt><dd className="font-semibold">{refundMotif(reason, comment)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate">Avoir</dt><dd className="font-semibold">{tx.facture ? (avoir ? `Émis sur ${tx.facture.numero}` : 'Non') : 'Sans objet'}</dd></div>
          </dl>
          <label className="flex items-center gap-2 text-[13px] font-semibold"><input type="checkbox" className="accent-brand" checked={sure} onChange={(e) => setSure(e.target.checked)} /> Je confirme le remboursement</label>
          {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

function NewPaymentModal({ invoices, error, busy, onSubmit, onClose }: { invoices: OpenInvoice[]; error: string | null; busy: boolean; onSubmit: (b: { facture_id: string | null; canal: Canal; methode: Methode; alias: string; montant: number; libelle: string }) => void; onClose: () => void }) {
  const [factureId, setFactureId] = useState('');
  const [montant, setMontant] = useState('');
  const [libelle, setLibelle] = useState('');
  const [canal, setCanal] = useState<Canal>(CANALS[0]);
  const [methode, setMethode] = useState<Methode>('qr');
  const [alias, setAlias] = useState('');
  const facture = invoices.find((i) => i.id === factureId);
  const n = Number(montant);
  const amountError = !/^\d+$/.test(montant) || n < 1 ? 'Montant : nombre entier positif' : facture && n > facture.reste ? `Le montant dépasse le reste dû (${formatFcfa(facture.reste)})` : undefined;
  const aliasError = methode === 'demande' && !aliasOkFor(canal, alias) ? aliasMsg(canal) : undefined;
  const pick = (id: string) => { setFactureId(id); const f = invoices.find((i) => i.id === id); setMontant(f ? String(f.reste) : ''); };
  return (
    <Modal open onClose={onClose} title="Nouveau paiement électronique"
      footer={<><Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button><Button size="sm" loading={busy} disabled={!!amountError || !!aliasError}
        onClick={() => onSubmit({ facture_id: factureId || null, canal, methode, alias, montant: n, libelle })}>Lancer le paiement</Button></>}>
      <div className="space-y-4">
        <Select label="Facture à régler" value={factureId} onChange={(e) => pick(e.target.value)}>
          <option value="">Paiement libre, sans facture</option>
          {invoices.map((i) => <option key={i.id} value={i.id}>{i.numero}, {i.client}, reste {formatFcfa(i.reste)}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Montant (FCFA)" inputMode="numeric" value={montant} onChange={(e) => setMontant(e.target.value)} error={montant ? amountError : undefined} />
          {!factureId && <Input label="Libellé" placeholder="Acompte, vente comptoir" value={libelle} onChange={(e) => setLibelle(e.target.value)} />}
          <Select label="Canal" value={canal} onChange={(e) => setCanal(e.target.value as Canal)}>{CANALS.map((c) => <option key={c}>{c}</option>)}</Select>
          <Select label="Parcours" value={methode} onChange={(e) => setMethode(e.target.value as Methode)}>{(Object.keys(METHODE_LABEL) as Methode[]).map((m) => <option key={m} value={m}>{METHODE_LABEL[m]}</option>)}</Select>
          {methode === 'demande' && <Input label={aliasLabel(canal)} inputMode={canal === 'PI-SPI' ? 'text' : 'tel'} value={alias} onChange={(e) => setAlias(e.target.value)} error={alias ? aliasError : undefined} />}
        </div>
        <p className="text-xs text-slate">La facture n'est mise à jour qu'après la confirmation de l'opérateur. Un paiement libre est enregistré sans facture.</p>
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

function SuspensModal({ item, invoices, canRefund, error, busy, onAttach, onRefund, onClose }: { item: Suspens; invoices: OpenInvoice[]; canRefund: boolean; error: string | null; busy: boolean; onAttach: (factureId: string) => void; onRefund: (motif: string) => void; onClose: () => void }) {
  const suggested = invoices.find((i) => i.suggere)?.id ?? '';
  const [choice, setChoice] = useState<string | null>(null);
  const factureId = choice ?? suggested;
  const [motif, setMotif] = useState('Paiement sans facture identifiable');
  return (
    <Modal open onClose={onClose} title={`Paiement ${item.reference}`}>
      <div className="space-y-4">
        <p className="text-[13px]"><b>{formatFcfa(item.montant)}</b> reçus de {item.payeur} ({item.alias}) par {item.canal}, le {formatDate(item.date)}. Aucune facture n'a pu être identifiée.</p>
        <div className="space-y-2 rounded-lg border border-line p-3">
          <Select label="Rattacher à une facture" value={factureId} onChange={(e) => setChoice(e.target.value)}>
            <option value="">Choisir une facture</option>
            {invoices.map((i) => <option key={i.id} value={i.id}>{i.numero}, {i.client}, reste {formatFcfa(i.reste)}{i.suggere ? ' (suggérée)' : ''}</option>)}
          </Select>
          <div className="flex justify-end"><Button size="sm" loading={busy} disabled={!factureId} onClick={() => onAttach(factureId)}>Rattacher</Button></div>
        </div>
        {canRefund && (
          <div className="space-y-2 rounded-lg border border-line p-3">
            <Input label={`Rembourser ${formatFcfa(item.montant)} à ${item.payeur}, motif *`} value={motif} onChange={(e) => setMotif(e.target.value)} />
            <div className="flex justify-end"><Button size="sm" variant="danger" disabled={busy || !motif.trim()} onClick={() => onRefund(motif)}>Rembourser</Button></div>
          </div>
        )}
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

export function PaiementsPage() {
  const vm = usePaiementsViewModel();
  const [minutes, setMinutes] = useState<string | null>(null);
  const [receiptFor, setReceiptFor] = useState<string | null>(null);
  const shown = minutes ?? String(vm.expirationMin);

  const txColumns: Column<Transaction>[] = [
    { key: 'ref', header: 'Référence', className: 'whitespace-nowrap font-bold', render: (t) => t.reference },
    { key: 'date', header: 'Date', className: 'whitespace-nowrap', render: (t) => formatDateTime(t.date) },
    { key: 'facture', header: 'Facture', className: 'whitespace-nowrap', render: (t) => t.facture?.numero ?? <span className="text-faint">{t.libelle || 'Hors facture'}</span> },
    { key: 'payeur', header: 'Payeur', render: (t) => <>{t.payeur}<div className="text-xs text-faint">{t.alias}</div></> },
    { key: 'canal', header: 'Canal', render: (t) => <ChannelChip canal={t.canal} /> },
    { key: 'methode', header: 'Parcours', className: 'whitespace-nowrap', render: (t) => METHODE_LABEL[t.methode] },
    { key: 'montant', header: 'Montant', className: 'whitespace-nowrap font-bold tabular-nums', render: (t) => <>{formatFcfa(t.montant)}{t.rembourse > 0 && <div className="text-xs font-normal text-violet-text">remboursé {formatFcfa(t.rembourse)}</div>}</> },
    { key: 'statut', header: 'Statut', render: (t) => <><Badge tone={STATUT_TONE[t.statut as TxStatut]}>{STATUT_LABEL[t.statut as TxStatut]}</Badge>{t.statut === 'refus' && t.motif && <div className="mt-1 text-xs text-faint">{t.motif}</div>}</> },
    {
      key: 'actions', header: 'Actions', className: 'whitespace-nowrap',
      render: (t) => (
        <div className="flex gap-1.5">
          {vm.canAct && t.statut === 'attente' && <Button size="icon" variant="danger" title="Annuler" aria-label={`Annuler la transaction ${t.reference}`} disabled={vm.rowBusy} onClick={(e) => { e.stopPropagation(); vm.cancelTx(t.id); }}><X size={14} /></Button>}
          {vm.canAct && ['expire', 'refus', 'annule'].includes(t.statut) && (!t.facture || t.facture.reste > 0) && <Button size="icon" variant="info" title="Relancer" aria-label={`Relancer la transaction ${t.reference}`} disabled={vm.rowBusy} onClick={(e) => { e.stopPropagation(); vm.relaunchTx(t.id); }}><RotateCcw size={14} /></Button>}
          <Button size="icon" variant="secondary" title="Suivre la transaction" aria-label={`Suivre la transaction ${t.reference}`} onClick={(e) => { e.stopPropagation(); vm.openDetail(t.id); }}><Eye size={14} /></Button>
          {vm.canRefund && t.statut === 'succes' && t.rembourse < t.montant && <Button size="icon" variant="violet" title="Rembourser" aria-label={`Rembourser ${t.reference}`} onClick={(e) => { e.stopPropagation(); vm.openRefund(t); }}><Undo2 size={14} /></Button>}
        </div>
      ),
    },
  ];
  const refundColumns: Column<Refund>[] = [
    { key: 'ref', header: 'Référence', className: 'whitespace-nowrap font-bold', render: (r) => r.reference },
    { key: 'date', header: 'Date', className: 'whitespace-nowrap', render: (r) => formatDateTime(r.date) },
    { key: 'origine', header: 'Transaction ou origine', render: (r) => r.origine },
    { key: 'benef', header: 'Bénéficiaire', render: (r) => r.beneficiaire },
    { key: 'canal', header: 'Canal', render: (r) => <ChannelChip canal={r.canal} /> },
    { key: 'montant', header: 'Montant', className: 'whitespace-nowrap font-bold tabular-nums text-violet-text', render: (r) => formatFcfa(r.montant) },
    { key: 'motif', header: 'Motif', render: (r) => r.motif },
    { key: 'avoir', header: 'Avoir', render: (r) => r.avoir || '-' },
    { key: 'par', header: 'Par', render: (r) => r.par },
  ];
  const suspensColumns: Column<Suspens>[] = [
    { key: 'ref', header: 'Référence', className: 'font-bold', render: (s) => s.reference },
    { key: 'date', header: 'Reçu le', className: 'whitespace-nowrap', render: (s) => formatDate(s.date) },
    { key: 'canal', header: 'Canal', render: (s) => <ChannelChip canal={s.canal} /> },
    { key: 'payeur', header: 'Payeur', render: (s) => <>{s.payeur}<div className="text-xs text-faint">{s.alias}</div></> },
    { key: 'libelle', header: 'Libellé', render: (s) => s.libelle || '-' },
    { key: 'montant', header: 'Montant', className: 'whitespace-nowrap font-bold tabular-nums', render: (s) => formatFcfa(s.montant) },
    { key: 'statut', header: 'Statut', render: (s) => s.statut === 'suspens' ? <Badge tone="amber">En suspens</Badge> : s.statut === 'rattache' ? <Badge tone="green">Rattaché à {s.facture}</Badge> : <Badge tone="violet">Remboursé</Badge> },
    { key: 'actions', header: 'Actions', render: (s) => vm.canManage && s.statut === 'suspens' ? <Button size="sm" variant="secondary" onClick={() => vm.openProcess(s)}>Traiter</Button> : null },
  ];
  const noPaging = { page: 1, pageSize: 1000, onPageChange: () => undefined };

  return (
    <div className="space-y-5">
      {vm.stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard value={formatFcfa(vm.stats.encaisse)} label={`Encaissé en ligne (${vm.stats.nb_encaisse})`} />
          <KpiCard value={formatFcfa(vm.stats.en_attente)} label={`En attente (${vm.stats.nb_attente})`} tone="amber" />
          <KpiCard value={vm.stats.echecs} label="Refusées ou expirées" tone="amber" />
          <KpiCard value={formatFcfa(vm.stats.rembourse)} label={`Remboursé (${vm.stats.nb_rembourse})`} tone="info" />
        </div>
      )}

      <Panel title="Paiements électroniques" actions={vm.canManage && (
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); vm.setExpiration(Number(shown)); setMinutes(null); }}>
          <Input label="Expiration (min)" inputMode="numeric" wrapperClassName="w-32" value={shown} onChange={(e) => setMinutes(e.target.value)} />
          <Button type="submit" size="sm" variant="secondary" loading={vm.savingExpiration} disabled={!/^\d+$/.test(shown) || Number(shown) === vm.expirationMin}>Enregistrer</Button>
        </form>
      )}>
        <Tabs value={vm.tab} onChange={vm.setTab} items={[
          { key: 'transactions', label: `Transactions (${vm.stats?.nb_transactions ?? 0})` }, { key: 'remboursements', label: `Remboursements (${vm.stats?.nb_rembourse ?? 0})` },
          { key: 'non-identifies', label: `Paiements en suspens (${vm.stats?.non_identifies ?? 0})` },
        ]} />

        {vm.tab === 'transactions' && (
          <>
            <div className="flex flex-wrap items-center gap-3 p-4">
              <div className="relative min-w-[220px] flex-1">
                <Search size={15} className="pointer-events-none absolute left-3 top-[11px] text-faint" />
                <Input aria-label="Rechercher une transaction" placeholder="Référence, payeur ou numéro" className="pl-9" value={vm.filters.q} onChange={(e) => vm.setFilters({ q: e.target.value })} />
              </div>
              <Select aria-label="Filtrer par statut" wrapperClassName="w-40" value={vm.filters.statut} onChange={(e) => vm.setFilters({ statut: e.target.value })}>
                <option value="">Tous les statuts</option>
                {(Object.keys(STATUT_LABEL) as TxStatut[]).map((s) => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
              </Select>
              <Select aria-label="Filtrer par canal" wrapperClassName="w-40" value={vm.filters.canal} onChange={(e) => vm.setFilters({ canal: e.target.value })}>
                <option value="">Tous les canaux</option>{CANALS.map((c) => <option key={c}>{c}</option>)}
              </Select>
              <Input aria-label="Du" type="date" wrapperClassName="w-40" value={vm.filters.du} onChange={(e) => vm.setFilters({ du: e.target.value })} />
              <Input aria-label="Au" type="date" wrapperClassName="w-40" value={vm.filters.au} onChange={(e) => vm.setFilters({ au: e.target.value })} />
              <Button variant="secondary" size="sm" onClick={vm.resetFilters}>Réinitialiser</Button>
              {vm.canCreate && <Button size="sm" onClick={vm.openCreate}>+ Paiement / QR</Button>}
            </div>
            <Table bare columns={txColumns} rows={vm.transactions} rowKey={(t) => t.id} loading={vm.loading} emptyTitle="Aucune transaction" total={vm.transactions.length} {...noPaging} onRowClick={(t) => vm.openDetail(t.id)} />
          </>
        )}
        {vm.tab === 'remboursements' && <><p className="m-4 rounded-lg bg-mist px-3 py-2 text-xs text-slate">Le remboursement d'un paiement est réservé à l'Administrateur, avec motif obligatoire et émission d'un avoir sur la facture.</p><Table bare columns={refundColumns} rows={vm.refunds} rowKey={(r) => r.id} emptyTitle="Aucun remboursement" total={vm.refunds.length} {...noPaging} /></>}
        {vm.tab === 'non-identifies' && <><p className="m-4 rounded-lg bg-amber-pale px-3 py-2 text-xs text-amber-text">Paiements reçus sans facture identifiable : ils restent en suspens jusqu'à leur rattachement à une facture ou leur remboursement.</p><Table bare columns={suspensColumns} rows={vm.suspens} rowKey={(s) => s.id} emptyTitle="Aucun paiement en suspens" total={vm.suspens.length} {...noPaging} /></>}
      </Panel>

      {vm.creating && <NewPaymentModal invoices={vm.openInvoices} error={vm.error} busy={vm.startingPayment} onSubmit={vm.startPayment} onClose={vm.closeCreate} />}
      {vm.detailId && <TransactionModal txId={vm.detailId} onReplace={vm.openDetail} onClose={vm.closeDetail} onRefund={(t) => { vm.closeDetail(); vm.openRefund(t); }} onReceipt={(f) => { vm.closeDetail(); setReceiptFor(f); }} />}
      {receiptFor && <ReceiptModal factureId={receiptFor} onClose={() => setReceiptFor(null)} />}
      {vm.refunding && <RefundModal tx={vm.refunding} error={vm.error} busy={vm.refundBusy} onSubmit={(m, motif, canal, avoir) => vm.submitRefund(vm.refunding!.id, m, motif, canal, avoir)} onClose={vm.closeRefund} />}
      {vm.processing && <SuspensModal item={vm.processing} invoices={vm.openInvoices} canRefund={vm.canRefund} error={vm.error} busy={vm.attaching || vm.refundingSuspens} onAttach={(f) => vm.submitAttach(vm.processing!.id, f)} onRefund={(m) => vm.submitRefundSuspens(vm.processing!.id, m)} onClose={vm.closeProcess} />}
    </div>
  );
}
