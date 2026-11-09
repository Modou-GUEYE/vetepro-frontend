import { Check, Printer, Send, TriangleAlert, X } from 'lucide-react';
import { formatDateTime, formatFcfa } from '@/core/utils/format';
import { Badge, Button, Modal, Skeleton } from '@/shared/ui';
import { METHODE_LABEL, STATUT_LABEL, STATUT_TONE, Transaction } from '../models/paiements';
import { useTransactionViewModel } from '../viewmodels/useTransactionViewModel';
import { ChannelChip, QrCode } from './QrCode';

const FINAL_TEXT = {
  succes: (c: string, hasInvoice: boolean) => `Confirmation reçue de ${c}. ${hasInvoice ? 'La facture a été mise à jour.' : 'Opération enregistrée.'}`,
  refus: (_c: string, _h: boolean, motif = '') => `Motif communiqué par l'opérateur : ${motif || 'refus'}. La facture reste inchangée.`,
  expire: () => 'Le délai de paiement est écoulé. La facture reste inchangée.',
  annule: () => "Aucun montant n'a été débité. La facture reste inchangée.",
} as const;

/** Suivi d'un paiement électronique : QR code ou demande, attente de la confirmation de l'opérateur, relance ou annulation. */
export function TransactionModal({ txId, onReplace, onClose, onRefund, onReceipt }: { txId: string; onReplace: (id: string) => void; onClose: () => void; onRefund?: (tx: Transaction) => void; onReceipt?: (factureId: string) => void }) {
  const vm = useTransactionViewModel(txId, onReplace);
  const tx = vm.tx;

  return (
    <Modal open onClose={onClose} title={tx ? `Paiement ${tx.canal}` : 'Paiement électronique'}
      footer={tx && (tx.statut === 'attente' ? (
        <>
          {vm.canAct && <Button variant="secondary" size="sm" loading={vm.cancelling} onClick={vm.cancel}>Annuler la transaction</Button>}
          {vm.canAct && tx.methode === 'demande' && <Button variant="secondary" size="sm" loading={vm.relaunching} onClick={vm.relaunch}><Send size={14} /> Relancer la demande</Button>}
          <Button size="sm" onClick={onClose}>Fermer, le suivi continue dans Paiements</Button>
        </>
      ) : (
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Fermer</Button>
          {onRefund && vm.canRefund && tx.statut === 'succes' && tx.rembourse < tx.montant && <Button variant="danger" size="sm" onClick={() => onRefund(tx)}>Rembourser</Button>}
          {onReceipt && tx.facture && tx.statut === 'succes' && <Button variant="secondary" size="sm" onClick={() => onReceipt(tx.facture!.id)}><Printer size={14} /> Reçu</Button>}
          {vm.canAct && tx.statut !== 'succes' && <Button size="sm" loading={vm.relaunching} onClick={vm.relaunch}>{tx.statut === 'refus' ? 'Réessayer' : 'Relancer'}</Button>}
        </>
      ))}>
      {vm.loading || !tx ? <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-40" /></div> : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-3xl font-bold tabular-nums">{formatFcfa(tx.montant)}</p>
              <p className="mt-1 text-[13px] text-slate">{tx.facture ? `Facture ${tx.facture.numero}, ` : tx.libelle ? `${tx.libelle}, ` : ''}{tx.payeur}</p>
            </div>
            <Badge tone={STATUT_TONE[tx.statut]}>{STATUT_LABEL[tx.statut]}</Badge>
          </div>

          {tx.statut === 'attente' ? (
            <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
              <div className="flex flex-col items-center gap-2">
                {tx.methode === 'qr'
                  ? <><QrCode value={tx.reference + tx.canal} /><p className="max-w-[168px] text-center text-xs text-slate">Le propriétaire scanne ce code avec l'application {tx.canal}</p></>
                  : <div className="flex h-[168px] w-[168px] flex-col items-center justify-center gap-2 rounded-lg border border-line bg-mist text-center"><Send size={36} className="text-brand" /><p className="px-3 text-xs text-slate">Demande envoyée à<br /><b className="text-ink">{tx.alias}</b></p></div>}
              </div>
              <div className="space-y-2 text-[13px]">
                <p><ChannelChip canal={tx.canal} /> <span className="text-slate">({METHODE_LABEL[tx.methode]})</span></p>
                <p className="text-slate">Référence <b className="text-ink">{tx.reference}</b></p>
                <p>Expire dans <b className="tabular-nums" aria-live="off">{vm.countdown}</b></p>
                <p className="rounded-lg bg-mist px-3 py-2 text-xs text-slate">La facture n'est mise à jour qu'après la confirmation de l'opérateur, jamais sur simple déclaration du client.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-line px-4 py-3 text-[13px]">
              {tx.statut === 'succes' ? <Check size={20} className="mt-0.5 text-brand" /> : tx.statut === 'refus' ? <X size={20} className="mt-0.5 text-danger" /> : <TriangleAlert size={20} className="mt-0.5 text-amber" />}
              <p>{FINAL_TEXT[tx.statut](tx.canal, !!tx.facture, tx.motif)}</p>
            </div>
          )}

          <section>
            <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[1px] text-slate">Historique</h4>
            <ul className="divide-y divide-[#eef2f5] rounded-lg border border-line text-[13px]">
              {tx.historique.map((h, i) => <li key={i} className="flex justify-between px-3 py-2"><span>{STATUT_LABEL[h.statut]}</span><span className="text-slate">{formatDateTime(h.date)}</span></li>)}
            </ul>
          </section>

          {tx.statut === 'attente' && vm.canAct && (
            <section className="space-y-2 rounded-lg border border-dashed border-amber/60 bg-amber-pale/40 p-3">
              <p className="text-xs font-semibold text-amber-text">Simulation de la réponse de l'opérateur (démonstration)</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="success" loading={vm.simulating} onClick={() => vm.simulate('succes')}>Paiement confirmé</Button>
                <Button size="sm" variant="danger" disabled={vm.simulating} onClick={() => vm.simulate('refus')}>Refusé</Button>
              </div>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
