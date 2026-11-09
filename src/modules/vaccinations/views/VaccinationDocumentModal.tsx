import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { formatDate, formatFcfa } from '@/core/utils/format';
import { Badge, Button, Modal, Skeleton, toast } from '@/shared/ui';
import { RAPPEL_LABEL, RAPPEL_TONE } from '../models/vaccination';
import { printVaccination } from '../models/printVaccination';
import { vaccinationService } from '../services/vaccination.service';

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex gap-3 border-b border-[#eef2f5] py-2 text-[13px] last:border-0"><dt className="w-36 shrink-0 text-slate">{label}</dt><dd className="min-w-0 flex-1 font-medium">{children || <span className="text-faint">—</span>}</dd></div>
);

/** Facture de vaccination (VAC-xxxx), imprimable. Les paiements se suivent dans le module Facturation. */
export function VaccinationDocumentModal({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ['vaccination', id], queryFn: () => vaccinationService.document(id) });
  const v = q.data;
  return (
    <Modal open onClose={onClose} title={v?.numero ? `Facture ${v.numero}` : 'Facture de vaccination'}
      footer={v && <Button variant="secondary" size="sm" onClick={() => { if (!printVaccination(v)) toast.warning("Autorisez l'ouverture de fenêtres pour imprimer"); }}><Printer size={14} /> Imprimer</Button>}>
      {q.isLoading || !v ? <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-40" /></div> : (
        <div className="space-y-5">
          <section>
            <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-[1.2px] text-slate">Propriétaire</h4>
            <dl><Row label="Nom">{v.proprietaire?.nom}</Row><Row label="Téléphone">{v.proprietaire?.telephone}</Row><Row label="Adresse">{v.proprietaire?.adresse}</Row></dl>
          </section>
          <section>
            <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-[1.2px] text-slate">Animal</h4>
            <dl>
              <Row label="Nom">{v.animal?.nom}</Row><Row label="Espèce">{v.animal?.espece}</Row><Row label="Race">{v.animal?.race}</Row>
              <Row label="Sexe">{v.animal?.sexe === 'M' ? 'Mâle' : v.animal?.sexe === 'F' ? 'Femelle' : ''}</Row><Row label="N° de puce">{v.animal?.puce}</Row>
            </dl>
          </section>
          <section>
            <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-[1.2px] text-slate">Vaccination</h4>
            <dl>
              <Row label="Vaccin">{v.vaccin}</Row><Row label="Date">{formatDate(v.date)}</Row><Row label="N° de lot">{v.lot}</Row><Row label="Notes">{v.notes}</Row>
              <Row label="Prochain rappel">{v.rappel ? <>{formatDate(v.rappel)} <Badge tone={RAPPEL_TONE[v.statut]}>{RAPPEL_LABEL[v.statut]}</Badge></> : ''}</Row>
              <Row label="Montant"><span className="font-bold text-brand-text">{formatFcfa(v.tarif)}</span></Row>
            </dl>
          </section>
        </div>
      )}
    </Modal>
  );
}
