import { FileText, Printer, ReceiptText } from 'lucide-react';
import { formatDate, formatFcfa } from '@/core/utils/format';
import { Badge, Button, Modal, Skeleton } from '@/shared/ui';
import { ChannelSend } from '@/modules/notifications/views/ChannelSend';
import { InvoiceFormModal } from '@/modules/facturation/views/InvoiceFormModal';
import { useConsultationDetailViewModel } from '../viewmodels/useConsultationDetailViewModel';

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section><h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[1px] text-slate">{title}</h4>{children}</section>
);

export function ConsultationDetailModal({ id, onClose, onOpenInvoice }: { id: string; onClose: () => void; onOpenInvoice?: (invoiceId: string) => void }) {
  const vm = useConsultationDetailViewModel(id);
  const c = vm.consultation;

  return (
    <>
      <Modal open onClose={onClose} size="lg" title={c ? `Consultation du ${formatDate(c.date)}` : 'Consultation'}
        footer={c && (
          <>
            {vm.hasPrescription && <Button variant="secondary" size="sm" onClick={vm.print}><Printer size={14} /> Imprimer l'ordonnance</Button>}
            {vm.hasPrescription && vm.canSend && <ChannelSend canal={vm.channel.canal} onCanal={vm.channel.setCanal} onSend={vm.channel.send} sending={vm.channel.sending} label="Envoyer l'ordonnance" />}
            {vm.canSeeInvoice && c.facture && <Button variant="secondary" size="sm" onClick={() => onOpenInvoice?.(c.facture!.id)}><ReceiptText size={14} /> Voir la facture {c.facture.numero}</Button>}
            {vm.canInvoice && <Button size="sm" onClick={vm.startInvoice}><FileText size={14} /> Générer la facture</Button>}
          </>
        )}>
        {vm.loading || !c ? <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-32" /></div> : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold">{c.patient?.nom} <span className="text-[13px] font-normal text-slate">{c.patient?.espece}</span></p>
                <p className="text-[13px] text-slate">Propriétaire : {c.proprietaire?.nom ?? 'non renseigné'} (vétérinaire : {c.veterinaire})</p>
              </div>
              <div className="flex flex-wrap gap-1.5"><Badge tone="blue">{c.service}</Badge>{c.facture ? <Badge tone="green">Facturée {c.facture.numero}</Badge> : <Badge tone="amber">Non facturée</Badge>}</div>
            </div>
            {c.motif && <Block title="Motif"><p className="text-[13px]">{c.motif}</p></Block>}
            {c.examen && <Block title="Examen clinique"><p className="text-[13px]">{c.examen}</p></Block>}
            {c.diagnostic && <Block title="Diagnostic"><p className="rounded-lg bg-mist px-3 py-2 text-[13px] font-medium">{c.diagnostic}</p></Block>}

            {c.stock.length > 0 && (
              <Block title="Médicaments dispensés par le cabinet">
                <ul className="divide-y divide-[#eef2f5] rounded-lg border border-line text-[13px]">{c.stock.map((l) => (
                  <li key={l.articleId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span><b>{l.nom}</b> ({l.unite}){l.dosage ? `, ${l.dosage}` : ''}{l.posologie ? `, ${l.posologie}` : ''}</span>
                    <span className="tabular-nums text-slate">× {l.quantite}, {formatFcfa(l.prixUnitaire * l.quantite)}</span>
                  </li>
                ))}</ul>
              </Block>
            )}
            {c.externes.length > 0 && (
              <Block title="Médicaments à obtenir en pharmacie">
                <ul className="divide-y divide-[#eef2f5] rounded-lg border border-line text-[13px]">{c.externes.map((e, i) => (
                  <li key={i} className="px-3 py-2"><b>{e.nom}</b>{e.dosage ? `, ${e.dosage}` : ''}{e.posologie ? `, ${e.posologie}` : ''} <span className="text-slate">× {e.quantite}</span></li>
                ))}</ul>
              </Block>
            )}
            {c.notes && <Block title="Notes et suivi"><p className="text-[13px]">{c.notes}</p></Block>}
          </div>
        )}
      </Modal>
      {c && <InvoiceFormModal open={vm.invoicing} prefill={vm.prefill} onClose={vm.stopInvoice} onCreated={(invoiceId) => { vm.stopInvoice(); onOpenInvoice?.(invoiceId); }} />}
    </>
  );
}
