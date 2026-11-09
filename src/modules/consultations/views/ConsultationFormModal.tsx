import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pill, Plus, Stethoscope, X } from 'lucide-react';
import { Button, Input, Modal, Select, Textarea, toast } from '@/shared/ui';
import { usePatientChoices } from '@/modules/patients/viewmodels/usePatientChoices';
import { useArticleChoices } from '@/modules/pharmacie/viewmodels/useArticleChoices';
import { ConsultationForm, consultationFormSchema, emptyConsultationForm, stockOverruns } from '../models/consultation';
import { consultationsService } from '../services/consultations.service';
import { useServiceChoices } from '../viewmodels/useServiceChoices';

interface Props { open: boolean; patientId?: string; motif?: string; onClose: () => void; onCreated: (id: string) => void }

const Section = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <h4 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1.2px] text-slate">{icon}{children}<span className="h-px flex-1 bg-line" /></h4>
);

export function ConsultationFormModal({ open, patientId = '', motif = '', onClose, onCreated }: Props) {
  const queryClient = useQueryClient();
  const patients = usePatientChoices();
  const articles = useArticleChoices();
  const services = useServiceChoices();
  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<ConsultationForm>({ resolver: zodResolver(consultationFormSchema), defaultValues: emptyConsultationForm() });
  const stock = useFieldArray({ control, name: 'stock' });
  const externes = useFieldArray({ control, name: 'externes' });
  useEffect(() => { if (open) reset({ ...emptyConsultationForm(patientId), motif }); }, [open, patientId, motif, reset]);

  const values = watch();
  const owner = patients.data?.find((p) => p.id === values.patientId)?.ownerName ?? '';
  const over = stockOverruns(values.stock, articles.data ?? []);

  const create = useMutation({
    mutationFn: consultationsService.create,
    onSuccess: (c) => {
      toast.success('Consultation enregistrée, stock mis à jour');
      for (const key of ['consultations', 'pharmacy', 'ordonnances']) void queryClient.invalidateQueries({ queryKey: [key] });
      onCreated(c.id);
    },
  });

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Nouvelle consultation"
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={create.isPending} disabled={over.length > 0} onClick={handleSubmit((f) => create.mutate(f))}>Enregistrer et ordonnance</Button></>}>
      <form onSubmit={handleSubmit((f) => create.mutate(f))} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Dossier patient *" disabled={!!patientId} error={errors.patientId?.message} {...register('patientId')}>
            <option value="">Choisir…</option>{(patients.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </Select>
          <Input label="Date *" type="date" max={new Date().toISOString().slice(0, 10)} error={errors.date?.message} {...register('date')} />
          <Input label="Propriétaire" readOnly value={owner} placeholder="Rempli avec le dossier" />
          <Select label="Type de service *" error={errors.serviceId?.message} {...register('serviceId')}>
            <option value="">Choisir…</option>{(services.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
          </Select>
          <Input wrapperClassName="sm:col-span-2" label="Motif / symptômes" placeholder="Vomissements, perte d'appétit…" {...register('motif')} />
          <Textarea wrapperClassName="sm:col-span-2" label="Examen clinique" placeholder="Poids, température, fréquence cardiaque, auscultation…" {...register('examen')} />
          <Input wrapperClassName="sm:col-span-2" label="Diagnostic" placeholder="Gastro-entérite, fracture…" {...register('diagnostic')} />
        </div>

        <div>
          <Section icon={<Pill size={13} />}>Traitements en stock</Section>
          <div className="space-y-2">
            {stock.fields.map((f, i) => {
              const choice = articles.data?.find((a) => a.id === values.stock[i]?.articleId);
              return (
                <div key={f.id} className="grid grid-cols-[1fr_70px_1fr_1.4fr_auto] items-start gap-2">
                  <div>
                    <Select aria-label={`Médicament ${i + 1}`} error={errors.stock?.[i]?.articleId?.message} {...register(`stock.${i}.articleId`)}>
                      <option value="">Médicament…</option>
                      {(articles.data ?? []).map((a) => <option key={a.id} value={a.id} disabled={a.quantite <= 0}>{a.nom}, {a.quantite > 0 ? `${a.quantite} en stock` : 'épuisé'}</option>)}
                    </Select>
                    {choice && over.includes(choice.id) && <p className="mt-1 text-xs text-danger">Stock insuffisant : {choice.quantite} disponible(s)</p>}
                  </div>
                  <Input aria-label={`Quantité médicament ${i + 1}`} inputMode="numeric" error={errors.stock?.[i]?.quantite?.message} {...register(`stock.${i}.quantite`)} />
                  <Input aria-label={`Dosage médicament ${i + 1}`} placeholder="Dosage" {...register(`stock.${i}.dosage`)} />
                  <Input aria-label={`Posologie médicament ${i + 1}`} placeholder="Posologie" {...register(`stock.${i}.posologie`)} />
                  <Button type="button" size="icon" variant="danger" aria-label={`Retirer le médicament ${i + 1}`} onClick={() => stock.remove(i)}><X size={14} /></Button>
                </div>
              );
            })}
          </div>
          <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => stock.append({ articleId: '', quantite: '1', dosage: '', posologie: '' })}><Plus size={13} /> Du stock</Button>
        </div>

        <div>
          <Section icon={<Stethoscope size={13} />}>Médicaments externes (à obtenir en pharmacie)</Section>
          <div className="space-y-2">
            {externes.fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[1.4fr_70px_1fr_1.4fr_auto] items-start gap-2">
                <Input aria-label={`Nom médicament externe ${i + 1}`} placeholder="Nom du médicament" error={errors.externes?.[i]?.nom?.message} {...register(`externes.${i}.nom`)} />
                <Input aria-label={`Quantité externe ${i + 1}`} inputMode="numeric" error={errors.externes?.[i]?.quantite?.message} {...register(`externes.${i}.quantite`)} />
                <Input aria-label={`Dosage externe ${i + 1}`} placeholder="Dosage" {...register(`externes.${i}.dosage`)} />
                <Input aria-label={`Posologie externe ${i + 1}`} placeholder="Posologie" {...register(`externes.${i}.posologie`)} />
                <Button type="button" size="icon" variant="danger" aria-label={`Retirer le médicament externe ${i + 1}`} onClick={() => externes.remove(i)}><X size={14} /></Button>
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="amber" className="mt-2" onClick={() => externes.append({ nom: '', quantite: '1', dosage: '', posologie: '' })}><Plus size={13} /> Médicament externe</Button>
        </div>

        <Textarea label="Notes / suivi" placeholder="Recommandations…" {...register('notes')} />
      </form>
    </Modal>
  );
}
