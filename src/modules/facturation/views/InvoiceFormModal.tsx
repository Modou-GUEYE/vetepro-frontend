import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatFcfa } from '@/core/utils/format';
import { Button, Input, Modal, Select, Textarea, toast } from '@/shared/ui';
import { usePatientChoices } from '@/modules/patients/viewmodels/usePatientChoices';
import { PAYMENT_MODES, modeLabel, InvoiceForm, computeTotals, emptyInvoiceForm, invoiceFormSchema } from '../models/facture';
import { facturationService } from '../services/facturation.service';

/** Facture saisie à la main, ou préremplie depuis une consultation (service et médicaments en stock, prix modifiables). */
export interface InvoicePrefill { patientId: string; consultationId: string; lignes: { description: string; quantite: number; prixUnitaire: number }[] }

export function InvoiceFormModal({ open, onClose, onCreated, prefill }: { open: boolean; onClose: () => void; onCreated: (id: string) => void; prefill?: InvoicePrefill }) {
  const queryClient = useQueryClient();
  const patients = usePatientChoices();
  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<InvoiceForm>({ resolver: zodResolver(invoiceFormSchema), defaultValues: emptyInvoiceForm() });
  const { fields, append, remove } = useFieldArray({ control, name: 'lignes' });
  useEffect(() => {
    if (!open) return;
    const f = emptyInvoiceForm();
    if (prefill) { f.patientId = prefill.patientId; f.lignes = prefill.lignes.map((l) => ({ description: l.description, quantite: String(l.quantite), prixUnitaire: String(l.prixUnitaire) })); }
    reset(f);
  }, [open, prefill, reset]);

  const values = watch();
  const owner = patients.data?.find((p) => p.id === values.patientId);
  // Recalculé à chaque rendu : react-hook-form modifie le tableau des lignes sur place.
  const totals = computeTotals(values.lignes.map((l) => ({ quantite: Number(l.quantite), prixUnitaire: Number(l.prixUnitaire) })), Number(values.remisePct || 0), Number(values.montantRecu || 0));

  const create = useMutation({
    mutationFn: (f: InvoiceForm) => facturationService.create(f, owner?.ownerId ?? null, prefill?.consultationId),
    onSuccess: (inv) => {
      toast.success(`Facture ${inv.numero} créée`);
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      void queryClient.invalidateQueries({ queryKey: ['consultations'] });
      onCreated(inv.id);
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={prefill ? "Facturer la consultation" : "Nouvelle facture"} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={create.isPending} onClick={handleSubmit((f) => create.mutate(f))}>Enregistrer</Button></>}>
      <form onSubmit={handleSubmit((f) => create.mutate(f))} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Dossier patient *" disabled={!!prefill} error={errors.patientId?.message} {...register('patientId')}>
            <option value="">Choisir…</option>
            {(patients.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </Select>
          <Input label="Date *" type="date" error={errors.date?.message} {...register('date')} />
          <Input label="Propriétaire" readOnly value={owner?.ownerName ?? ''} placeholder="Rempli avec le dossier" />
        </div>

        <div>
          <h4 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1.2px] text-slate">Lignes de facturation<span className="h-px flex-1 bg-line" /></h4>
          <div className="space-y-2">
            {fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[1fr_70px_110px_auto] items-start gap-2">
                <Input aria-label={`Description ligne ${i + 1}`} placeholder="Consultation vétérinaire" error={errors.lignes?.[i]?.description?.message} {...register(`lignes.${i}.description`)} />
                <Input aria-label={`Quantité ligne ${i + 1}`} inputMode="numeric" error={errors.lignes?.[i]?.quantite?.message} {...register(`lignes.${i}.quantite`)} />
                <Input aria-label={`Prix unitaire ligne ${i + 1}`} inputMode="numeric" placeholder="FCFA" error={errors.lignes?.[i]?.prixUnitaire?.message} {...register(`lignes.${i}.prixUnitaire`)} />
                <Button type="button" size="icon" variant="danger" aria-label={`Retirer la ligne ${i + 1}`} disabled={fields.length === 1} onClick={() => remove(i)}><X size={14} /></Button>
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => append({ description: '', quantite: '1', prixUnitaire: '' })}><Plus size={13} /> Ligne</Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Mode de paiement" {...register('mode')}>{PAYMENT_MODES.map((m) => <option key={m} value={m}>{modeLabel(m)}</option>)}</Select>
          <Input label="Montant reçu (FCFA)" inputMode="numeric" error={errors.montantRecu?.message} {...register('montantRecu')} />
          <Input label="Remise (%)" inputMode="numeric" error={errors.remisePct?.message} {...register('remisePct')} />
          <Textarea label="Notes" placeholder="Assurance, etc." {...register('notes')} />
        </div>

        <dl className="grid grid-cols-3 gap-3 rounded-lg2 bg-deep px-5 py-4 text-center text-white" aria-live="polite">
          <div><dt className="text-[10.5px] uppercase tracking-[1px] text-white/60">Sous-total</dt><dd className="mt-1 font-display text-lg font-bold">{formatFcfa(totals.sousTotal)}</dd></div>
          <div><dt className="text-[10.5px] uppercase tracking-[1px] text-white/60">Total{totals.remise ? ` (remise ${formatFcfa(totals.remise)})` : ''}</dt><dd className="mt-1 font-display text-lg font-bold text-brand-accent">{formatFcfa(totals.total)}</dd></div>
          <div><dt className="text-[10.5px] uppercase tracking-[1px] text-white/60">Reste à payer</dt><dd className="mt-1 font-display text-lg font-bold text-[#f6c453]">{formatFcfa(totals.reste)}</dd></div>
        </dl>
      </form>
    </Modal>
  );
}
