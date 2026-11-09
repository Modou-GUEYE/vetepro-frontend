import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, LifeBuoy } from 'lucide-react';
import { formatDateTime } from '@/core/utils/format';
import { Badge, Button, EmptyState, Input, Modal, Panel, Textarea } from '@/shared/ui';
import { TICKET_LABEL, TICKET_TONE, TicketForm, ticketFormSchema } from '../models/ticket';
import { useSupportViewModel } from '../viewmodels/useSupportViewModel';

/** Réclamation au support : envoi (objet et message) par l'Administrateur et suivi des demandes du cabinet. */
export function SupportPage() {
  const vm = useSupportViewModel();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TicketForm>({ resolver: zodResolver(ticketFormSchema), defaultValues: { objet: '', message: '' } });
  const submit = handleSubmit(async (f) => { await vm.send(f); reset({ objet: '', message: '' }); });

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-lg2 border border-info/20 bg-info-pale px-5 py-4 text-[13px] text-info-text">
        <LifeBuoy size={20} className="mt-0.5 shrink-0" />
        <p>Signalez un incident de la plateforme : une notification est envoyée automatiquement à l'équipe support{vm.adresse ? ` (${vm.adresse})` : ''}. Le suivi de votre demande apparaît ci-dessous.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Panel title="Nouvelle réclamation">
          {vm.canSend ? (
            <form onSubmit={submit} noValidate className="space-y-4 p-5">
              <Input label="Objet *" placeholder="Résumé du problème" error={errors.objet?.message} {...register('objet')} />
              <Textarea label="Message *" rows={6} placeholder="Décrivez l'incident : ce que vous faisiez, ce qui s'est passé…" error={errors.message?.message} {...register('message')} />
              <Button type="submit" loading={vm.sending}>Envoyer au support</Button>
            </form>
          ) : <p className="p-5 text-[13px] text-slate">Seul l'Administrateur du cabinet peut envoyer une réclamation.</p>}
        </Panel>

        <Panel title="Mes demandes" count={`${vm.tickets.length} réclamation${vm.tickets.length > 1 ? 's' : ''}`}>
          {vm.tickets.length === 0 && !vm.loading ? <EmptyState title="Aucune réclamation" description="Les réclamations envoyées apparaîtront ici avec leur statut." /> : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead><tr>{['N°', 'Objet', 'Statut', 'Mis à jour'].map((h) => <th key={h} className="border-b border-line bg-[#f8fafb] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.8px] text-slate">{h}</th>)}</tr></thead>
                <tbody>
                  {vm.tickets.map((t) => (
                    <tr key={t.id} onClick={() => vm.openDetail(t)} className="cursor-pointer border-b border-[#eef2f5] hover:bg-mist">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{t.numero}</td>
                      <td className="px-4 py-3 font-semibold">{t.objet}</td>
                      <td className="px-4 py-3"><Badge tone={TICKET_TONE[t.statut]}>{TICKET_LABEL[t.statut]}</Badge></td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate">{formatDateTime(t.mis_a_jour)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Modal open={!!vm.sent} onClose={vm.clearSent} title="Réclamation envoyée" footer={<Button onClick={vm.clearSent}>Fermer</Button>}>
        <div className="space-y-3 text-center">
          <CheckCircle2 size={40} className="mx-auto text-brand" />
          <p className="text-[15px] font-semibold">Réclamation {vm.sent?.numero} créée</p>
          <p className="text-[13px] text-slate">Une notification a été envoyée à l'équipe support ({vm.sent?.notifie_a}). Son statut est « Ouvert ».</p>
        </div>
      </Modal>

      <Modal open={!!vm.detail} onClose={vm.closeDetail} title={vm.detail ? `${vm.detail.numero}, ${vm.detail.objet}` : 'Réclamation'}>
        {vm.detail && (
          <div className="space-y-4 text-[13px]">
            <div className="flex flex-wrap items-center gap-2"><Badge tone={TICKET_TONE[vm.detail.statut]}>{TICKET_LABEL[vm.detail.statut]}</Badge><span className="text-slate">Envoyée le {formatDateTime(vm.detail.date)} par {vm.detail.auteur}</span></div>
            <p className="whitespace-pre-wrap rounded-lg bg-mist px-4 py-3">{vm.detail.message}</p>
            <p className="text-xs text-slate">Notification envoyée à {vm.detail.notifie_a}. Dernière mise à jour : {formatDateTime(vm.detail.mis_a_jour)}.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
