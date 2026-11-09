import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unprocessableMessage } from '@/core/http/errors';
import { Button, Input, Modal, Select, toast } from '@/shared/ui';
import { Acte, DIAG_LABEL, DIAG_METHODES, DiagnosticForm, RESULTATS, RESULTAT_LABEL, diagnosticSchemaFor, emptyDiagnostic } from '../models/insemination';
import { inseminationService } from '../services/insemination.service';

/** Diagnostic de gestation d'un acte réalisé. Les champs de mise-bas n'apparaissent que si le résultat est positif. */
export function DiagnosticModal({ acte, onClose }: { acte: Acte; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<DiagnosticForm>({ resolver: zodResolver(diagnosticSchemaFor(acte.date)), defaultValues: emptyDiagnostic(acte) });
  useEffect(() => reset(emptyDiagnostic(acte)), [acte, reset]);
  const resultat = watch('resultat');
  const save = useMutation({
    mutationFn: (f: DiagnosticForm) => inseminationService.diagnose(acte.id, f),
    onError: (e) => { const m = unprocessableMessage(e); if (m) toast.error(m); },
    onSuccess: (a) => {
      toast.success(a.resultat === 'positif' ? 'Gestation confirmée, ajoutée au suivi' : a.resultat === 'negatif' ? 'Acte clos : diagnostic négatif' : 'Diagnostic enregistré');
      for (const k of ['inseminations', 'gestations']) void queryClient.invalidateQueries({ queryKey: [k] });
      onClose();
    },
  });
  return (
    <Modal open onClose={onClose} title={`Diagnostic de gestation, ${acte.patient?.nom ?? ''}`}
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={save.isPending} onClick={handleSubmit((f) => save.mutate(f))}>Enregistrer</Button></>}>
      <form onSubmit={handleSubmit((f) => save.mutate(f))} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Date du diagnostic *" type="date" min={acte.date} max={new Date().toISOString().slice(0, 10)} error={errors.date?.message} {...register('date')} />
        <Select label="Méthode" {...register('methode')}><option value="">Non précisée</option>{DIAG_METHODES.map((m) => <option key={m} value={m}>{DIAG_LABEL[m]}</option>)}</Select>
        <Select wrapperClassName="sm:col-span-2" label="Résultat *" error={errors.resultat?.message} {...register('resultat')}>{RESULTATS.map((r) => <option key={r} value={r}>{RESULTAT_LABEL[r]}</option>)}</Select>
        {resultat === 'positif' && <Input wrapperClassName="sm:col-span-2" label="Mise-bas prévue" type="date" hint="Laissez vide pour la calculer avec la durée de gestation de l'espèce." {...register('miseBasPrevue')} />}
        {resultat === 'negatif' && <p className="rounded-lg bg-mist px-3 py-2 text-[13px] sm:col-span-2">Le diagnostic négatif clôt l'acte en échec. Vous pourrez planifier un nouvel acte pour cette femelle.</p>}
      </form>
    </Modal>
  );
}
