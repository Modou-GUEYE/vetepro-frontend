import { Eye } from 'lucide-react';
import { formatDate } from '@/core/utils/format';
import { Badge, Button, EmptyState, Skeleton } from '@/shared/ui';
import { usePatientConsultations } from '../viewmodels/useConsultationsViewModel';

/** Onglet « Consultations » de la fiche patient : historique du dossier. */
export function PatientConsultationsTab({ patientId, onOpen }: { patientId: string; onOpen: (consultationId: string) => void }) {
  const q = usePatientConsultations(patientId);
  if (q.isLoading) return <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>;
  const rows = q.data?.items ?? [];
  if (rows.length === 0) return <EmptyState title="Aucune consultation" description="Les consultations de ce dossier apparaîtront ici." />;
  return (
    <ul className="space-y-2">
      {rows.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 transition hover:border-brand/50">
          <div className="min-w-0">
            <p className="font-semibold">{formatDate(c.date)}, {c.service}</p>
            <p className="truncate text-[13px] text-slate">{[c.motif, c.diagnostic].filter(Boolean).join(', ') || 'Sans motif renseigné'} ({c.veterinaire})</p>
          </div>
          <div className="flex items-center gap-2">
            {c.nbMedicaments > 0 && <Badge tone="violet">{c.nbMedicaments} médicament{c.nbMedicaments > 1 ? 's' : ''}</Badge>}
            {c.facture ? <Badge tone="green">{c.facture.numero}</Badge> : <Badge tone="amber">Non facturée</Badge>}
            <Button size="icon" variant="info" aria-label={`Voir la consultation du ${formatDate(c.date)}`} onClick={() => onOpen(c.id)}><Eye size={14} /></Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
