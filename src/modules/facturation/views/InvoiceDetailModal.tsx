import { useState } from 'react';
import { CreditCard, FileMinus2, Printer } from 'lucide-react';
import { ChannelSend } from '@/modules/notifications/views/ChannelSend';
import { formatDate, formatDateTime, formatFcfa } from '@/core/utils/format';
import { Badge, Button, Input, Modal, Select, Skeleton, Textarea } from '@/shared/ui';
import { CANALS, Canal, Methode, METHODE_LABEL, aliasError as aliasMsg, aliasLabel, aliasOkFor } from '@/modules/paiements/models/paiements';
import { TransactionModal } from '@/modules/paiements/views/TransactionModal';
import { ReceiptModal } from './ReceiptModal';
import { STATUS_LABEL, STATUS_TONE } from '../models/facture';
import { useInvoiceDetailViewModel } from '../viewmodels/useInvoiceDetailViewModel';

interface PaymentFormProps {
  reste: number; telephone: string; busy: boolean; error: string | null;
  onSubmit: (montant: number, mode: string) => void; onElectronic: (canal: Canal, methode: Methode, alias: string, montant: number) => void; onCancel: () => void;
}

/** Wave, Orange Money et PI-SPI passent par le paiement en ligne ; « Mobile money » ne couvre plus que les autres opérateurs. */
const MODE_CHOICES = [
  { value: 'Espèces', label: 'Espèces' }, { value: 'Wave', label: 'Wave' }, { value: 'Orange Money', label: 'Orange Money' }, { value: 'PI-SPI', label: 'PI-SPI' },
  { value: 'Carte', label: 'Carte bancaire' }, { value: 'Chèque', label: 'Chèque' }, { value: 'Virement', label: 'Virement' }, { value: 'Mobile money', label: 'Mobile money (autre)' },
] as const;

function PaymentForm({ reste, telephone, busy, error: serverError, onSubmit, onElectronic, onCancel }: PaymentFormProps) {
  const [montant, setMontant] = useState(String(reste));
  const [mode, setMode] = useState<string>('Espèces');
  const [methode, setMethode] = useState<Methode>('qr');
  const [alias, setAlias] = useState(telephone);
  const n = Number(montant);
  const electronic = (CANALS as readonly string[]).includes(mode);
  const error = !/^\d+$/.test(montant) || n < 1 ? 'Montant : nombre entier positif' : n > reste ? `Le montant dépasse le reste dû (${formatFcfa(reste)})` : undefined;
  const aliasError = electronic && methode === 'demande' && !aliasOkFor(mode, alias) ? aliasMsg(mode) : undefined;
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (error || aliasError) return; if (electronic) onElectronic(mode as Canal, methode, alias, n); else onSubmit(n, mode); }} className="space-y-3 rounded-lg border border-brand/30 bg-brand-pale/40 p-4">
      <h4 className="text-[13px] font-bold">Encaisser un paiement</h4>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Montant reçu (FCFA)" inputMode="numeric" autoFocus value={montant} onChange={(e) => setMontant(e.target.value)} error={error} />
        <Select label="Mode" value={mode} onChange={(e) => setMode(e.target.value)}>
          {MODE_CHOICES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
      </div>
      {electronic && (
        <div className="grid grid-cols-2 gap-3">
          <Select label="Parcours" value={methode} onChange={(e) => setMethode(e.target.value as Methode)}>{(Object.keys(METHODE_LABEL) as Methode[]).map((m) => <option key={m} value={m}>{METHODE_LABEL[m]}</option>)}</Select>
          {methode === 'demande' && <Input label={aliasLabel(mode)} inputMode={mode === 'PI-SPI' ? 'text' : 'tel'} value={alias} onChange={(e) => setAlias(e.target.value)} error={aliasError} />}
          <p className="col-span-2 text-xs text-slate">La facture n'est mise à jour qu'après la confirmation de l'opérateur.</p>
        </div>
      )}
      {serverError && <p role="alert" className="text-xs text-danger">{serverError}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" size="sm" onClick={onCancel}>Annuler</Button><Button type="submit" size="sm" loading={busy} disabled={!!error || !!aliasError}>{electronic ? 'Lancer le paiement' : 'Confirmer'}</Button></div>
    </form>
  );
}

function CreditForm({ max, busy, onSubmit, onCancel }: { max: number; busy: boolean; onSubmit: (montant: number, motif: string) => void; onCancel: () => void }) {
  const [montant, setMontant] = useState(String(max));
  const [motif, setMotif] = useState('');
  const n = Number(montant);
  const error = !/^\d+$/.test(montant) || n < 1 || n > max ? `Entre 1 et ${formatFcfa(max)}` : undefined;
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!error && motif.trim()) onSubmit(n, motif); }} className="space-y-3 rounded-lg border border-danger/30 bg-danger-pale/50 p-4">
      <h4 className="text-[13px] font-bold">Émettre un avoir (note de crédit)</h4>
      <p className="text-xs text-slate">Une facture émise ne se modifie pas : l'avoir en corrige le montant ou l'annule.</p>
      <Input label="Montant de l'avoir (FCFA)" inputMode="numeric" autoFocus value={montant} onChange={(e) => setMontant(e.target.value)} error={error} />
      <Textarea label="Motif *" value={motif} onChange={(e) => setMotif(e.target.value)} />
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" size="sm" onClick={onCancel}>Annuler</Button><Button type="submit" variant="danger" size="sm" loading={busy} disabled={!!error || !motif.trim()}>Émettre l'avoir</Button></div>
    </form>
  );
}

export function InvoiceDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const vm = useInvoiceDetailViewModel(id);
  const inv = vm.invoice;
  const credited = inv ? inv.avoirs.reduce((n, a) => n + a.montant, 0) : 0;

  return (
    <>
    <Modal open onClose={onClose} size="lg" title={inv ? `Facture ${inv.numero}` : 'Facture'}
      footer={inv && (
        <>
          <Button variant="secondary" size="sm" onClick={vm.print}><Printer size={14} /> Imprimer</Button>
          <ChannelSend canal={vm.channel.canal} onCanal={vm.channel.setCanal} onSend={vm.channel.send} sending={vm.channel.sending} label="Envoyer le reçu" />
          {vm.canCredit && <Button variant="danger" size="sm" onClick={() => vm.setPanel('credit')}><FileMinus2 size={14} /> Avoir</Button>}
          {vm.canPay && <Button size="sm" onClick={() => vm.setPanel('pay')}><CreditCard size={14} /> Encaisser</Button>}
        </>
      )}>
      {vm.loading || !inv ? <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-32" /></div> : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{inv.client.nom}</p>
              {inv.patient && <p className="text-[13px] text-slate">Patient : {inv.patient.nom}</p>}
              <p className="text-xs text-faint">{formatDate(inv.date)}{inv.source === 'vente' ? ', vente au comptoir' : inv.source === 'hospitalisation' ? ', hospitalisation' : inv.source === 'vaccination' ? ', vaccination' : inv.source === 'insemination' ? ', insémination' : ''}</p>
            </div>
            <Badge tone={STATUS_TONE[inv.statut]}>{STATUS_LABEL[inv.statut]}</Badge>
          </div>

          <table className="w-full border-collapse text-[13px]">
            <thead><tr className="bg-[#f8fafb] text-[11px] uppercase tracking-[.8px] text-slate">
              <th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Qté</th><th className="px-3 py-2 text-right">P.U.</th><th className="px-3 py-2 text-right">Total</th>
            </tr></thead>
            <tbody>{inv.lignes.map((l, i) => (
              <tr key={i} className="border-b border-[#eef2f5]"><td className="px-3 py-2">{l.description}</td><td className="px-3 py-2 text-right tabular-nums">{l.quantite}</td><td className="px-3 py-2 text-right tabular-nums">{formatFcfa(l.prixUnitaire)}</td><td className="px-3 py-2 text-right font-medium tabular-nums">{formatFcfa(l.total)}</td></tr>
            ))}</tbody>
          </table>

          <dl className="ml-auto w-full max-w-xs space-y-1 text-[13px] tabular-nums">
            <div className="flex justify-between"><dt className="text-slate">Sous-total</dt><dd>{formatFcfa(inv.sousTotal)}</dd></div>
            {inv.remisePct > 0 && <div className="flex justify-between"><dt className="text-slate">Remise ({inv.remisePct} %)</dt><dd>- {formatFcfa(inv.remise)}</dd></div>}
            <div className="flex justify-between border-t border-line pt-1 font-bold"><dt>Total facturé</dt><dd>{formatFcfa(inv.total)}</dd></div>
            {credited > 0 && <div className="flex justify-between"><dt className="text-slate">Avoirs</dt><dd>- {formatFcfa(credited)}</dd></div>}
            {credited > 0 && <div className="flex justify-between font-bold"><dt>Net après avoirs</dt><dd>{formatFcfa(inv.total - credited)}</dd></div>}
            <div className="flex justify-between text-brand-text"><dt>Payé</dt><dd>{formatFcfa(inv.paye)}</dd></div>
            <div className="flex justify-between font-bold text-danger"><dt>Reste à payer</dt><dd>{formatFcfa(inv.reste)}</dd></div>
          </dl>

          {inv.paiements.length > 0 && (
            <section><h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[1px] text-slate">Paiements</h4>
              <ul className="divide-y divide-[#eef2f5] rounded-lg border border-line text-[13px]">{inv.paiements.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"><span>{formatDateTime(p.date)}, {p.mode}, par {p.par}</span><b className="tabular-nums">{formatFcfa(p.montant)}</b></li>
              ))}</ul></section>
          )}
          {inv.avoirs.length > 0 && (
            <section><h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[1px] text-slate">Avoirs</h4>
              <ul className="divide-y divide-[#eef2f5] rounded-lg border border-line text-[13px]">{inv.avoirs.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"><span>{a.numero}, {a.motif} (par {a.par})</span><b className="tabular-nums">- {formatFcfa(a.montant)}</b></li>
              ))}</ul></section>
          )}
          {inv.notes && <p className="rounded-lg bg-mist px-3 py-2 text-xs text-slate">Notes : {inv.notes}</p>}

          {vm.panel === 'pay' && <PaymentForm reste={inv.reste} telephone={inv.client.telephone} busy={vm.paying || vm.startingElectronic} error={vm.electronicError} onSubmit={vm.submitPayment} onElectronic={vm.submitElectronic} onCancel={() => vm.setPanel(null)} />}
          {vm.panel === 'credit' && <CreditForm max={inv.total - credited} busy={vm.crediting} onSubmit={vm.submitCredit} onCancel={() => vm.setPanel(null)} />}
        </div>
      )}
    </Modal>
    {vm.txId && <TransactionModal txId={vm.txId} onReplace={vm.setTxId} onClose={() => vm.setTxId(null)} onReceipt={() => { vm.setTxId(null); vm.setReceipt(true); }} />}
    {vm.receipt && <ReceiptModal factureId={id} onClose={() => vm.setReceipt(false)} />}
    </>
  );
}
