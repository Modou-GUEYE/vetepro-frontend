import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Send } from 'lucide-react';
import { formatDate } from '@/core/utils/format';
import { Badge, Button, EmptyState, toast } from '@/shared/ui';
import { RAPPEL_STATUT_LABEL, RAPPEL_STATUT_TONE, RAPPEL_TYPE_LABEL, Rappel } from '../models/insemination';
import { inseminationService } from '../services/insemination.service';

const TH = ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap border-b border-line bg-[#f8fafb] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.8px] text-slate">{children}</th>;

interface Props { items: Rappel[]; delaiDiagnostic: number; delaiMiseBas: number; canSend: boolean }

/** Rappels programmés : diagnostic de gestation à faire et mise-bas imminente, avec envoi manuel pour ceux en retard. */
export function RappelsTable({ items, delaiDiagnostic, delaiMiseBas, canSend }: Props) {
  const queryClient = useQueryClient();
  const send = useMutation({
    mutationFn: inseminationService.sendRappel,
    onSuccess: (r) => {
      if (r.ok) toast.success(`Rappel envoyé : ${r.message}`); else toast.error(`Rappel non envoyé : ${r.message}`);
      for (const k of ['inseminations', 'notifications']) void queryClient.invalidateQueries({ queryKey: [k] });
    },
  });
  return (
    <>
      <p className="m-4 flex items-start gap-2 rounded-lg bg-info-pale px-4 py-3 text-[13px] text-info-text">
        <Bell size={15} className="mt-0.5 shrink-0" />
        <span>Rappels envoyés à l'éleveur par SMS et au vétérinaire dans l'application : <b>diagnostic de gestation</b> {delaiDiagnostic} jours après l'acte réalisé, et <b>mise-bas imminente</b> {delaiMiseBas} jours avant la date prévue. Un rappel dont la date est passée sans envoi est « en retard » : envoyez-le à la main.</span>
      </p>
      {items.length === 0 ? <EmptyState title="Aucun rappel programmé" description="Les actes réalisés sans diagnostic et les gestations en cours génèrent des rappels." /> : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr><TH>Date d'envoi</TH><TH>Type</TH><TH>Patient</TH><TH>Destinataire</TH><TH>Canaux</TH><TH>Statut</TH><TH /></tr></thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-[#eef2f5] hover:bg-mist">
                  <td className="whitespace-nowrap px-4 py-3">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 font-semibold">{RAPPEL_TYPE_LABEL[r.type]}</td>
                  <td className="px-4 py-3"><b className="block">{r.patient?.nom}</b><span className="text-xs text-slate">{r.acte.numero}, {r.texte}</span></td>
                  <td className="px-4 py-3">{r.proprietaire ? <>{r.proprietaire.nom}<span className="block text-xs text-slate">{r.proprietaire.telephone || 'Aucun numéro'}</span></> : '—'}</td>
                  <td className="px-4 py-3">{r.canaux.join(', ')}</td>
                  <td className="px-4 py-3"><Badge tone={RAPPEL_STATUT_TONE[r.statut]}>{RAPPEL_STATUT_LABEL[r.statut]}</Badge>{r.envoye && <span className="block text-xs text-slate">le {formatDate(r.envoye)}</span>}</td>
                  <td className="px-4 py-3 text-right">
                    {canSend && r.statut !== 'envoye' && <Button size="sm" variant="secondary" loading={send.isPending && send.variables === r.id} onClick={() => send.mutate(r.id)}><Send size={13} /> Envoyer maintenant</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
