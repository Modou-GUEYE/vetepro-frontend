import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
import { ageLabel } from '@/core/utils/format';
import { pageCount } from '@/core/http/pagination';
import { Badge, Button, EmptyState, Input, Skeleton } from '@/shared/ui';
import { PatientRow } from '../models/patient';
import { usePatientsViewModel } from '../viewmodels/usePatientsViewModel';
import { useState } from 'react';
import { useCan } from '@/core/auth/permissions';
import { ConsultationDetailModal } from '@/modules/consultations/views/ConsultationDetailModal';
import { ConsultationFormModal } from '@/modules/consultations/views/ConsultationFormModal';
import { VaccinationFormModal } from '@/modules/vaccinations/views/VaccinationFormModal';
import { InvoiceDetailModal } from '@/modules/facturation/views/InvoiceDetailModal';
import { PatientDetailPanel } from './PatientDetailPanel';
import { PatientFormModal } from './PatientFormModal';

const CHIPS = [['', 'Tous'], ['animal', 'Animaux'], ['troupeau', 'Troupeaux']] as const;

function Row({ p, selected, onClick }: { p: PatientRow; selected: boolean; onClick: () => void }) {
  const animal = p.type === 'animal';
  const detail = animal
    ? [p.espece.nom, p.sexe ? (p.sexe === 'M' ? '♂' : '♀') : '', ageLabel(p.naissance), p.proprietaire?.nom].filter(Boolean).join(', ')
    : [p.espece.nom, p.race?.nom, p.proprietaire?.nom].filter(Boolean).join(', ');
  return (
    <button onClick={onClick} aria-current={selected} className={clsx('mb-1.5 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition', selected ? 'border-brand/50 bg-brand-pale shadow-[inset_3px_0_0_#0e7c7b]' : 'border-transparent hover:bg-mist')}>
      <span className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white', animal ? 'bg-gradient-to-br from-brand-light to-brand' : 'bg-gradient-to-br from-[#d98a1c] to-amber')}>{p.nom[0]}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold">{p.nom}{animal && p.race && <span className="ml-1.5 text-xs font-normal text-slate">{p.race.nom}</span>}</span>
        <span className="block truncate text-xs text-slate">{detail}</span>
        <span className="font-mono text-[10.5px] text-faint">{p.matricule}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <Badge tone={animal ? 'slate' : 'amber'}>{animal ? 'Animal' : 'Troupeau'}</Badge>
        {p.provisoire && <Badge tone="amber">À compléter</Badge>}
        {!animal && p.effectif ? <span className="text-[11px] text-slate">{p.effectif} anim.</span> : null}
      </span>
    </button>
  );
}

export function PatientsPage() {
  const vm = usePatientsViewModel();
  const can = useCan();
  const [newConsult, setNewConsult] = useState(false);
  const [newVaccine, setNewVaccine] = useState(false);
  const [consultId, setConsultId] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const pages = pageCount(vm.total, vm.pageSize);

  return (
    <div className="grid gap-5 lg:h-[calc(100vh-120px)] lg:grid-cols-[360px_1fr]">
      <section className="flex min-h-[420px] flex-col overflow-hidden rounded-lg2 border border-line bg-white shadow-card">
        <header className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <h3 className="text-[15px] font-bold">Dossiers ({vm.total})</h3>
          {vm.canCreate && <Button size="icon" variant="secondary" aria-label="Nouveau dossier" title="Nouveau dossier" onClick={() => vm.openNew()}><Plus size={15} /></Button>}
        </header>
        <div className="space-y-2.5 border-b border-line p-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-[11px] text-faint" />
            <Input aria-label="Rechercher un dossier" placeholder="Matricule, nom, espèce, propriétaire…" className="pl-9" value={vm.search} onChange={(e) => vm.setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CHIPS.map(([k, label]) => (
              <button key={k} onClick={() => vm.setType(k)} aria-pressed={vm.type === k}
                className={clsx('rounded-full border px-3 py-1 text-xs font-semibold', vm.type === k ? 'border-brand bg-brand text-white' : 'border-line bg-white text-slate hover:border-brand')}>{label}</button>
            ))}
          </div>
          {vm.ownerFilter && (
            <button onClick={vm.clearOwnerFilter} className="flex items-center gap-1.5 rounded-full bg-violet-pale px-3 py-1 text-xs font-semibold text-violet-text">
              Propriétaire : {vm.ownerFilterName ?? vm.ownerFilter} <X size={12} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {vm.loading && Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="mb-2 h-[62px]" />)}
          {!vm.loading && vm.patients.map((p) => <Row key={p.id} p={p} selected={p.id === vm.selectedId} onClick={() => vm.select(p.id)} />)}
          {!vm.loading && vm.patients.length === 0 && <EmptyState title="Aucun dossier trouvé" description="Modifiez la recherche ou les filtres." />}
        </div>

        {pages > 1 && (
          <footer className="flex items-center justify-between border-t border-line px-3 py-2 text-xs text-slate">
            <Button size="icon" variant="secondary" aria-label="Page précédente" disabled={vm.page <= 1} onClick={() => vm.setPage(vm.page - 1)}><ChevronLeft size={14} /></Button>
            Page {vm.page} / {pages}
            <Button size="icon" variant="secondary" aria-label="Page suivante" disabled={vm.page >= pages} onClick={() => vm.setPage(vm.page + 1)}><ChevronRight size={14} /></Button>
          </footer>
        )}
      </section>

      <section className="min-h-[420px] overflow-hidden rounded-lg2 border border-line bg-white shadow-card">
        <PatientDetailPanel patient={vm.detail} loading={vm.detailLoading} error={vm.detailError} tab={vm.tab} onTab={vm.setTab} canEdit={vm.canEdit} onEdit={vm.openEdit}
          canConsult={can('consultations', 'create')} onNewConsult={() => setNewConsult(true)} onOpenConsult={setConsultId}
          canVaccinate={can('vaccinations', 'create')} onNewVaccine={() => setNewVaccine(true)} />
      </section>

      <VaccinationFormModal open={newVaccine} patientId={vm.selectedId ?? undefined} onClose={() => { setNewVaccine(false); vm.setTab('vaccins'); }} />
      <ConsultationFormModal open={newConsult} patientId={vm.selectedId} onClose={() => setNewConsult(false)} onCreated={(id) => { setNewConsult(false); setConsultId(id); vm.setTab('consultations'); }} />
      {consultId && <ConsultationDetailModal id={consultId} onClose={() => setConsultId(null)} onOpenInvoice={setInvoiceId} />}
      {invoiceId && <InvoiceDetailModal id={invoiceId} onClose={() => setInvoiceId(null)} />}
      <PatientFormModal target={vm.formTarget} patient={vm.detail} saving={vm.saving} onSubmit={vm.submitForm} onClose={vm.closeForm} />
    </div>
  );
}
