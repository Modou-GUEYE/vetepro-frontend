import { Link } from 'react-router-dom';
import { AlertTriangle, LogOut, Pencil, Pill, ReceiptText } from 'lucide-react';
import { formatDate, formatFcfa } from '@/core/utils/format';
import { Badge, Button, Modal, Skeleton } from '@/shared/ui';
import { InvoiceDetailModal } from '@/modules/facturation/views/InvoiceDetailModal';
import { CARE_LABEL, EXIT_LABEL } from '../models/hospi';
import { useHospiDetailViewModel } from '../viewmodels/useHospiDetailViewModel';
import { AdmissionModal } from './AdmissionModal';
import { PrescriptionModal } from './PrescriptionModal';
import { SortieModal } from './SortieModal';

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex gap-3 border-b border-[#eef2f5] py-2 text-[13px] last:border-0"><dt className="w-36 shrink-0 text-slate">{label}</dt><dd className="min-w-0 flex-1 font-medium">{children}</dd></div>
);

export function HospiDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const vm = useHospiDetailViewModel(id);
  const h = vm.hospi;
  const invoiceId = h?.sortie?.facture?.id;

  return (
    <>
      <Modal open onClose={onClose} size="lg" title={h ? `Hospitalisation ${h.numero}` : 'Hospitalisation'}
        footer={h && (
          <>
            {vm.canSeeInvoice && invoiceId && <Button variant="secondary" size="sm" onClick={() => vm.open('invoice')}><ReceiptText size={14} /> Voir la facture {h.sortie?.facture?.numero}</Button>}
            {vm.canEdit && <Button variant="secondary" size="sm" onClick={() => vm.open('edit')}><Pencil size={14} /> Modifier</Button>}
            {vm.canEdit && <Button variant="info" size="sm" onClick={() => vm.open('prescribe')}><Pill size={14} /> Prescrire</Button>}
            {vm.canEdit && <Button size="sm" onClick={() => vm.open('exit')}><LogOut size={14} /> Sortie</Button>}
          </>
        )}>
        {vm.loading || !h ? <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-40" /></div> : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold">{h.patient?.nom} <span className="text-[13px] font-normal text-slate">{h.patient?.espece}</span></p>
                <p className="text-[13px] text-slate">Propriétaire : {h.proprietaire?.nom ?? 'non renseigné'}</p>
              </div>
              <Badge tone={h.statut === 'encours' ? 'blue' : 'green'}>{h.statut === 'encours' ? 'En cours' : 'Sorti'}</Badge>
            </div>
            {h.patient?.provisoire && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-pale px-3 py-2 text-[13px] text-amber-text"><AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>Fiche provisoire. <Link to={`/patients/${h.patient.id}`} className="font-semibold underline">Compléter le dossier</Link>.</span></p>
            )}

            <dl>
              <Row label="Motif">{h.motif}</Row>
              <Row label="Box ou cage">{h.box}</Row>
              <Row label="Vétérinaire">{h.veterinaire?.nom ?? 'Non précisé'}</Row>
              <Row label="Entrée">{formatDate(h.date_entree)}</Row>
              <Row label="Sortie prévue">{h.date_sortie_prevue ? <span className={h.en_retard ? 'text-danger' : ''}>{formatDate(h.date_sortie_prevue)}{h.en_retard ? ' (dépassée)' : ''}</span> : 'Non précisée'}</Row>
              {h.sortie && <Row label="Sortie">{formatDate(h.sortie.date)}, {EXIT_LABEL[h.sortie.etat]}</Row>}
              <Row label="Durée">{h.duree} jour{h.duree > 1 ? 's' : ''}</Row>
              <Row label="Hébergement">{formatFcfa(h.tarif_jour)} par jour</Row>
              {h.tarif_consultation > 0 && <Row label="Consultation initiale">{formatFcfa(h.tarif_consultation)}</Row>}
              <Row label={h.statut === 'encours' ? 'Total à payer' : 'Total facturé'}><span className="font-bold text-brand-text">{formatFcfa(h.total)}</span></Row>
              {h.observations && <Row label="Observations">{h.observations}</Row>}
              {h.compte_rendu && <Row label="Compte rendu de sortie">{h.compte_rendu}</Row>}
            </dl>

            <section>
              <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[1px] text-slate">Soins et médicaments ({h.prescriptions.reduce((n, p) => n + p.lignes.length, 0)})</h4>
              {h.prescriptions.length === 0 ? <p className="text-[13px] text-slate">Aucune prescription pour le moment.</p> : (
                <div className="space-y-2.5">
                  {[...h.prescriptions].sort((a, b) => `${b.date}${b.heure}`.localeCompare(`${a.date}${a.heure}`)).map((p) => (
                    <div key={p.id} className="rounded-lg border border-line">
                      <p className="flex flex-wrap justify-between gap-2 border-b border-line bg-mist px-3 py-1.5 text-xs text-slate"><span>{formatDate(p.date)} à {p.heure}, {p.veterinaire}</span>{p.observations && <i>{p.observations}</i>}</p>
                      <ul className="divide-y divide-[#eef2f5] text-[13px]">
                        {p.lignes.map((l, i) => (
                          <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                            <span><Badge tone={l.type === 'medicament' ? 'blue' : 'slate'} className="mr-2">{CARE_LABEL[l.type]}</Badge><b>{l.type === 'medicament' ? l.nom : l.acte}</b></span>
                            <span className="tabular-nums text-slate">× {l.quantite}, {formatFcfa(l.quantite * l.prix_unitaire)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </Modal>
      {h && vm.dialog === 'edit' && <AdmissionModal open editing={h} onClose={vm.close} onSaved={() => { vm.close(); vm.refresh(); }} />}
      {h && <PrescriptionModal open={vm.dialog === 'prescribe'} hospiId={h.id} entree={h.date_entree} onClose={vm.close} onSaved={() => { vm.close(); vm.refresh(); }} />}
      {h && vm.dialog === 'exit' && <SortieModal open hospi={h} onClose={vm.close} onDone={() => { vm.close(); vm.refresh(); }} />}
      {vm.dialog === 'invoice' && invoiceId && <InvoiceDetailModal id={invoiceId} onClose={vm.close} />}
    </>
  );
}
