import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { formatFcfa } from '@/core/utils/format';
import { PAYMENT_MODES, modeLabel } from '@/modules/facturation/models/facture';
import { Button, Input, Modal, Select, Textarea, toast } from '@/shared/ui';
import { EXIT_LABEL, EXIT_STATES, ExitForm, HospiDetail, emptyExit, exitFormSchema, exitTotals } from '../models/hospi';
import { hospiService } from '../services/hospi.service';

interface Props { open: boolean; hospi: HospiDetail; onClose: () => void; onDone: (invoiceId: string | undefined) => void }

/** Sortie : état, compte rendu, facture du séjour (lignes automatiques et lignes ajoutées), remise, paiement. */
export function SortieModal({ open, hospi, onClose, onDone }: Props) {
  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<ExitForm>({ resolver: zodResolver(exitFormSchema), defaultValues: emptyExit(hospi) });
  const { fields, append, remove } = useFieldArray({ control, name: 'lignes' });
  useEffect(() => { if (open) reset(emptyExit(hospi)); }, [open, hospi, reset]);
  const v = watch();
  const preview = useQuery({ queryKey: ['hospi-exit', hospi.id, v.dateSortie, hospi.total], queryFn: () => hospiService.exitPreview(hospi.id, v.dateSortie), enabled: open && !!v.dateSortie && v.dateSortie >= hospi.date_entree });
  const auto = preview.data?.lignes ?? [];
  const t = exitTotals(auto, v.lignes, Number(v.remisePct || 0), Number(v.montantRecu || 0));

  const save = useMutation({
    mutationFn: (f: ExitForm) => hospiService.discharge(hospi.id, f),
    onSuccess: (h) => { toast.success(`Patient sorti, facture ${h.facture?.numero ?? ''} générée`); onDone(h.facture?.id); },
  });

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Sortie et facturation"
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={save.isPending} onClick={handleSubmit((f) => save.mutate(f))}>Sortir et générer la facture</Button></>}>
      <form onSubmit={handleSubmit((f) => save.mutate(f))} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Date de sortie *" type="date" min={hospi.date_entree} max={new Date().toISOString().slice(0, 10)} error={errors.dateSortie?.message} {...register('dateSortie')} />
          <Select label="État à la sortie *" error={errors.etat?.message} {...register('etat')}>{EXIT_STATES.map((s) => <option key={s} value={s}>{EXIT_LABEL[s]}</option>)}</Select>
          <Textarea wrapperClassName="sm:col-span-2" label="Compte rendu de sortie" placeholder="Résumé, recommandations après l'hospitalisation…" {...register('compteRendu')} />
        </div>

        <div>
          <h4 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1.2px] text-slate">Facture de sortie<span className="h-px flex-1 bg-line" /></h4>
          <ul className="space-y-1.5" aria-label="Lignes automatiques">
            {auto.map((l, i) => (
              <li key={i} className="grid grid-cols-[1fr_50px_100px_100px] gap-2 rounded-lg border border-line bg-mist px-3 py-2 text-[12.5px]">
                <span className="font-medium">{l.description}</span><span className="text-center">× {l.quantite}</span>
                <span className="text-right text-slate">{formatFcfa(l.prix_unitaire)}</span><b className="text-right text-brand-text">{formatFcfa(l.quantite * l.prix_unitaire)}</b>
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-2">
            {fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[1fr_70px_110px_auto] items-start gap-2">
                <Input aria-label={`Description ligne ajoutée ${i + 1}`} placeholder="Ligne supplémentaire" error={errors.lignes?.[i]?.description?.message} {...register(`lignes.${i}.description`)} />
                <Input aria-label={`Quantité ligne ajoutée ${i + 1}`} inputMode="numeric" error={errors.lignes?.[i]?.quantite?.message} {...register(`lignes.${i}.quantite`)} />
                <Input aria-label={`Prix ligne ajoutée ${i + 1}`} inputMode="numeric" placeholder="FCFA" error={errors.lignes?.[i]?.prixUnitaire?.message} {...register(`lignes.${i}.prixUnitaire`)} />
                <Button type="button" size="icon" variant="danger" aria-label={`Retirer la ligne ajoutée ${i + 1}`} onClick={() => remove(i)}><X size={14} /></Button>
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => append({ description: '', quantite: '1', prixUnitaire: '' })}><Plus size={13} /> Ligne supplémentaire</Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Remise (%)" inputMode="numeric" error={errors.remisePct?.message} {...register('remisePct')} />
          <Select label="Mode de paiement" {...register('mode')}>{PAYMENT_MODES.map((m) => <option key={m} value={m}>{modeLabel(m)}</option>)}</Select>
          <Input label="Montant reçu (FCFA)" inputMode="numeric" error={errors.montantRecu?.message} {...register('montantRecu')} />
        </div>

        <dl className="grid grid-cols-3 gap-3 rounded-lg2 bg-deep px-5 py-4 text-center text-white" aria-live="polite">
          <div><dt className="text-[10.5px] uppercase tracking-[1px] text-white/60">Sous-total</dt><dd className="mt-1 font-display text-lg font-bold">{formatFcfa(t.sous)}</dd></div>
          <div><dt className="text-[10.5px] uppercase tracking-[1px] text-white/60">Total à payer</dt><dd className="mt-1 font-display text-lg font-bold text-brand-accent">{formatFcfa(t.total)}</dd></div>
          <div><dt className="text-[10.5px] uppercase tracking-[1px] text-white/60">Reste dû</dt><dd className="mt-1 font-display text-lg font-bold text-[#f6c453]">{formatFcfa(t.reste)}</dd></div>
        </dl>
      </form>
    </Modal>
  );
}
