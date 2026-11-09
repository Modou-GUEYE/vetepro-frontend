import { Check, Mail, MessageCircle, Printer, Smartphone } from 'lucide-react';
import { formatDateTime, formatFcfa } from '@/core/utils/format';
import { Button, Modal, Skeleton } from '@/shared/ui';
import type { Canal } from '@/modules/notifications/models/notification';
import { receiptMode, receiptNumber, receiptRef } from '../models/recu';
import { useReceiptViewModel } from '../viewmodels/useReceiptViewModel';

const SHARE: { canal: Canal; label: string; icon: typeof Mail }[] = [
  { canal: 'sms', label: 'SMS', icon: Smartphone }, { canal: 'whatsapp', label: 'WhatsApp', icon: MessageCircle }, { canal: 'email', label: 'E-mail', icon: Mail },
];

/** Reçu de paiement affiché après un encaissement : récapitulatif, partage au propriétaire (SMS, WhatsApp, e-mail) et impression. */
export function ReceiptModal({ factureId, paymentId, onClose }: { factureId: string; paymentId?: string; onClose: () => void }) {
  const vm = useReceiptViewModel(factureId, paymentId);
  const { invoice: inv, payment: p } = vm;

  return (
    <Modal open onClose={onClose} title="Reçu de paiement" footer={<Button size="sm" onClick={onClose}>Terminer</Button>}>
      {vm.loading || !inv || !p ? <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-32" /></div> : (
        <div className="space-y-4">
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-pale text-brand"><Check size={26} /></span>
            <p className="mt-2 text-3xl font-bold tabular-nums">{formatFcfa(p.montant)}</p>
            <p className="text-xs text-slate">{receiptNumber(inv, p)}, {formatDateTime(p.date)}</p>
          </div>
          <dl className="divide-y divide-dotted divide-line rounded-xl border border-dashed border-line px-4 py-1 text-[13px]">
            {([['Facture', inv.numero], ['Client', inv.client.nom], ['Mode', receiptMode(p)], ['Référence', receiptRef(p)]] as const).map(([k, v]) => (
              <div key={k} className="flex justify-between py-2"><dt className="text-slate">{k}</dt><dd className="font-semibold">{v}</dd></div>
            ))}
            <div className="flex justify-between py-2"><dt className="text-slate">Reste dû</dt><dd className={`font-semibold ${inv.reste ? 'text-danger' : 'text-brand'}`}>{formatFcfa(inv.reste)}</dd></div>
          </dl>
          <section>
            <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[1px] text-slate">Partager le reçu au propriétaire</h4>
            <div className="flex flex-wrap gap-2">
              {SHARE.map(({ canal, label, icon: Icon }) => <Button key={canal} variant="secondary" size="sm" disabled={vm.sharing} onClick={() => vm.share(canal)}><Icon size={14} /> {label}</Button>)}
              <Button variant="secondary" size="sm" onClick={vm.print}><Printer size={14} /> Imprimer</Button>
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}
