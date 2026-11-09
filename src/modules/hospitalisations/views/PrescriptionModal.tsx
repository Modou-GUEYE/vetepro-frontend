import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { formatFcfa } from '@/core/utils/format';
import { Button, Input, Modal, Select, Textarea, toast } from '@/shared/ui';
import { stockOverruns } from '@/modules/consultations/models/consultation';
import { useArticleChoices } from '@/modules/pharmacie/viewmodels/useArticleChoices';
import { useVeterinaireChoices } from '@/modules/rendez-vous/viewmodels/useVeterinaireChoices';
import { CARE_LABEL, CARE_TYPES, PrescriptionForm, emptyLine, emptyPrescription, prescriptionFormSchema, prescriptionTotal } from '../models/hospi';
import { hospiService } from '../services/hospi.service';

interface Props { open: boolean; hospiId: string; entree: string; onClose: () => void; onSaved: () => void }

/** Prescriptions et soins d'un séjour : plusieurs lignes, prix des médicaments pris sur l'article, stock contrôlé en direct. */
export function PrescriptionModal({ open, hospiId, entree, onClose, onSaved }: Props) {
  const articles = useArticleChoices();
  const vets = useVeterinaireChoices();
  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<PrescriptionForm>({ resolver: zodResolver(prescriptionFormSchema), defaultValues: emptyPrescription() });
  const { fields, append, remove } = useFieldArray({ control, name: 'lignes' });
  useEffect(() => { if (open) reset(emptyPrescription()); }, [open, reset]);
  const v = watch();
  const priceOf = (id: string) => articles.data?.find((a) => a.id === id)?.prix ?? 0;
  const total = prescriptionTotal(v.lignes, priceOf);
  const over = stockOverruns(v.lignes.filter((l) => l.type === 'medicament'), articles.data ?? []);

  const save = useMutation({
    mutationFn: (f: PrescriptionForm) => hospiService.prescribe(hospiId, f),
    onSuccess: () => { toast.success('Prescription enregistrée, total mis à jour'); onSaved(); },
  });

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Prescriptions et soins"
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={save.isPending} disabled={over.length > 0} onClick={handleSubmit((f) => save.mutate(f))}>Enregistrer</Button></>}>
      <form onSubmit={handleSubmit((f) => save.mutate(f))} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Date *" type="date" min={entree} max={new Date().toISOString().slice(0, 10)} error={errors.date?.message} {...register('date')} />
          <Input label="Heure *" type="time" error={errors.heure?.message} {...register('heure')} />
          <Select label="Vétérinaire" {...register('vetId')}><option value="">Non précisé</option>{(vets.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}</Select>
          <Textarea wrapperClassName="sm:col-span-3" label="Observations générales" placeholder="Évolution, remarques sur le séjour…" {...register('observations')} />
        </div>

        <div>
          <h4 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1.2px] text-slate">Lignes de prescription<span className="h-px flex-1 bg-line" /></h4>
          <div className="space-y-2.5">
            {fields.map((f, i) => {
              const l = v.lignes[i];
              const med = l?.type === 'medicament';
              const choice = articles.data?.find((a) => a.id === l?.articleId);
              const e = errors.lignes?.[i];
              return (
                <div key={f.id} className="grid grid-cols-[110px_1.6fr_70px_110px_auto] items-start gap-2">
                  <Select aria-label={`Type ligne ${i + 1}`} {...register(`lignes.${i}.type`)}>{CARE_TYPES.map((t) => <option key={t} value={t}>{CARE_LABEL[t]}</option>)}</Select>
                  {med ? (
                    <div key="med">
                      <Select aria-label={`Médicament ligne ${i + 1}`} error={e?.articleId?.message} {...register(`lignes.${i}.articleId`)}>
                        <option value="">Médicament…</option>
                        {(articles.data ?? []).map((a) => <option key={a.id} value={a.id} disabled={a.quantite <= 0}>{a.nom}, {a.quantite > 0 ? `${a.quantite} en stock` : 'épuisé'}</option>)}
                      </Select>
                      {choice && over.includes(choice.id) && <p className="mt-1 text-xs text-danger">Stock insuffisant : {choice.quantite} disponible(s)</p>}
                    </div>
                  ) : <Input key="acte" aria-label={`Acte ligne ${i + 1}`} placeholder="Acte ou description" error={e?.acte?.message} {...register(`lignes.${i}.acte`)} />}
                  <Input aria-label={`Quantité ligne ${i + 1}`} inputMode="numeric" error={e?.quantite?.message} {...register(`lignes.${i}.quantite`)} />
                  {med
                    ? <Input key="prix-auto" aria-label={`Prix unitaire ligne ${i + 1}`} readOnly value={choice ? String(choice.prix) : ''} placeholder="Prix automatique" />
                    : <Input key="prix-saisi" aria-label={`Prix unitaire ligne ${i + 1}`} inputMode="numeric" placeholder="FCFA" error={e?.prixUnitaire?.message} {...register(`lignes.${i}.prixUnitaire`)} />}
                  <Button type="button" size="icon" variant="danger" aria-label={`Retirer la ligne ${i + 1}`} disabled={fields.length === 1} onClick={() => remove(i)}><X size={14} /></Button>
                </div>
              );
            })}
          </div>
          <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => append(emptyLine())}><Plus size={13} /> Ajouter une ligne</Button>
          <p aria-live="polite" className="mt-3 text-right text-[14px] font-bold text-brand-text">Total de la prescription : {formatFcfa(total)}</p>
        </div>
      </form>
    </Modal>
  );
}
