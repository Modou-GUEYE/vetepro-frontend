import { Receipt, ReceiptText } from 'lucide-react';
import { formatDate, formatFcfa } from '@/core/utils/format';
import { Badge, Button, EmptyState, Skeleton } from '@/shared/ui';
import { RAPPEL_LABEL, RAPPEL_TONE } from '../models/vaccination';
import { usePatientVaccins } from '../viewmodels/useVaccinationsViewModel';
import { BillVaccinationModal } from './BillVaccinationModal';
import { VaccinationDocumentModal } from './VaccinationDocumentModal';

/** Onglet « Vaccins » de la fiche patient : carnet vaccinal complet. */
export function PatientVaccinsTab({ patientId }: { patientId: string }) {
  const vm = usePatientVaccins(patientId);
  if (vm.loading) return <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>;
  if (vm.rows.length === 0) return <EmptyState title="Aucune vaccination" description="Les vaccinations de ce dossier apparaîtront ici." />;
  return (
    <>
      <ul className="space-y-2">
        {vm.rows.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
            <div className="min-w-0">
              <p className="font-semibold">{v.vaccin}, {formatDate(v.date)}</p>
              <p className="text-[13px] text-slate">{[v.lot && `Lot ${v.lot}`, v.notes].filter(Boolean).join(', ') || 'Sans lot ni note'}</p>
              <p className="mt-1 text-[13px]">Rappel : {v.rappel ? formatDate(v.rappel) : '—'} <Badge tone={RAPPEL_TONE[v.statut]}>{RAPPEL_LABEL[v.statut]}</Badge></p>
            </div>
            <div className="flex items-center gap-2">
              {v.facture_id ? <Badge tone="green">{formatFcfa(v.tarif)}</Badge> : <Badge tone="slate">Non facturé</Badge>}
              {v.facture_id
                ? <Button size="sm" variant="secondary" onClick={() => vm.openDocument(v.id)}><ReceiptText size={13} /> Facture</Button>
                : vm.canBill && <Button size="sm" variant="amber" onClick={() => vm.openBilling(v.id)}><Receipt size={13} /> Facturer</Button>}
            </div>
          </li>
        ))}
      </ul>
      {vm.billingId && <BillVaccinationModal id={vm.billingId} onClose={vm.closeBilling} />}
      {vm.documentId && <VaccinationDocumentModal id={vm.documentId} onClose={vm.closeDocument} />}
    </>
  );
}
