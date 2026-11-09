import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarClock, Pencil, RotateCw, Stethoscope, X } from 'lucide-react';
import { formatDateTime } from '@/core/utils/format';
import { Badge, Button, ConfirmDialog, Modal, Skeleton } from '@/shared/ui';
import { ConsultationFormModal } from '@/modules/consultations/views/ConsultationFormModal';
import { CANAL_LABEL } from '@/modules/notifications/models/notification';
import { DURATION_LABEL, STATUS_LABEL, STATUS_TONE, dayLabel, endTime } from '../models/rdv';
import { useRdvDetailViewModel } from '../viewmodels/useRdvDetailViewModel';

interface Props { id: string; onClose: () => void; onEdit: (id: string) => void }

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex gap-3 border-b border-[#eef2f5] py-2 text-[13px] last:border-0"><dt className="w-32 shrink-0 text-slate">{label}</dt><dd className="min-w-0 flex-1 font-medium">{children}</dd></div>
);

export function RdvDetailModal({ id, onClose, onEdit }: Props) {
  const vm = useRdvDetailViewModel(id);
  const r = vm.rdv;
  return (
    <>
      <Modal open onClose={onClose} title="Rendez-vous"
        footer={r && (
          <>
            {vm.canCancel && <Button variant="danger" size="sm" onClick={vm.askCancel}><X size={14} /> Annuler le rendez-vous</Button>}
            {vm.canEdit && <Button variant="secondary" size="sm" onClick={() => onEdit(r.id)}><Pencil size={14} /> Modifier</Button>}
            {vm.canStart && <Button size="sm" onClick={vm.startConsultation}><Stethoscope size={14} /> Démarrer la consultation</Button>}
          </>
        )}>
        {vm.loading || !r ? <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-32" /></div> : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold">{r.patient?.nom} <span className="text-[13px] font-normal text-slate">{r.patient?.espece}</span></p>
                <p className="text-[13px] text-slate">{dayLabel(r.date)}, {r.heure} à {endTime(r.heure, r.duree)}</p>
              </div>
              <Badge tone={STATUS_TONE[r.statut]}>{STATUS_LABEL[r.statut]}</Badge>
            </div>

            {r.patient?.provisoire && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-pale px-3 py-2 text-[13px] text-amber-text">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>Nouvel animal : la fiche est provisoire. <Link to={`/patients/${r.patient.id}`} className="font-semibold underline">Compléter le dossier</Link> après la consultation.</span>
              </p>
            )}

            <dl>
              <Row label="Propriétaire">{r.proprietaire ? `${r.proprietaire.nom}${r.proprietaire.telephone ? `, ${r.proprietaire.telephone}` : ''}` : 'Non renseigné'}</Row>
              <Row label="Vétérinaire">{r.veterinaire.nom}</Row>
              <Row label="Durée">{DURATION_LABEL(r.duree)}</Row>
              <Row label="Motif">{r.motif || 'Non précisé'}</Row>
              <Row label="Notification">{CANAL_LABEL[r.canal]}</Row>
              {r.notes && <Row label="Notes">{r.notes}</Row>}
            </dl>

            <section>
              <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[1px] text-slate">Messages au propriétaire</h4>
              {r.envois.length === 0 ? <p className="text-[13px] text-slate">Aucun message envoyé.</p> : (
                <ul className="divide-y divide-[#eef2f5] rounded-lg border border-line text-[13px]">
                  {r.envois.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <span className="min-w-0">{e.sujet}<span className="block text-xs text-slate">{CANAL_LABEL[e.canal]}{e.destinataire ? ` à ${e.destinataire}` : ''}, {formatDateTime(e.date)}</span></span>
                      {e.statut === 'envoye' ? <Badge tone="green">Envoyé</Badge> : <Badge tone="red" className="max-w-[260px] whitespace-normal">Échec : {e.erreur}</Badge>}
                    </li>
                  ))}
                </ul>
              )}
              {vm.canResend && r.statut !== 'termine' && r.envois[0]?.statut === 'echec' && (
                <Button className="mt-2" size="sm" variant="secondary" loading={vm.resending} onClick={vm.resend}><RotateCw size={13} /> Renvoyer le message</Button>
              )}
            </section>

            <section>
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[1px] text-slate"><CalendarClock size={12} /> Historique</h4>
              <ul className="space-y-1.5 text-[13px]">
                {r.historique.map((h, i) => <li key={i}><span className="text-xs text-faint">{formatDateTime(h.at)}</span> {h.by}, {h.detail}</li>)}
              </ul>
            </section>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={vm.confirmCancel} danger title="Annuler ce rendez-vous ?" confirmLabel="Annuler le rendez-vous" loading={vm.cancelling}
        message="Le créneau est libéré et le propriétaire reçoit un message d'annulation. Le rendez-vous reste dans l'historique." onConfirm={vm.cancel} onCancel={vm.dismissCancel} />
      {r?.patient && <ConsultationFormModal open={vm.consulting} patientId={r.patient.id} motif={r.motif} onClose={vm.stopConsultation} onCreated={vm.onConsulted} />}
    </>
  );
}
