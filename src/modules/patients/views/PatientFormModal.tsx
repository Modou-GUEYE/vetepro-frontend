import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { Button, Input, Modal, Select, Textarea } from '@/shared/ui';
import { useOwnerChoices } from '@/modules/proprietaires/viewmodels/useOwnerChoices';
import { useSpeciesChoices } from '@/modules/referentiels/viewmodels/useSpeciesChoices';
import { PatientDetail, PatientForm, PatientType, emptyPatientForm, formFromDetail, patientFormSchema } from '../models/patient';

interface Props {
  target: { mode: 'new'; type: PatientType } | { mode: 'edit' } | null;
  patient?: PatientDetail;
  saving: boolean;
  onSubmit: (f: PatientForm) => void;
  onClose: () => void;
}

export function PatientFormModal({ target, patient, saving, onSubmit, onClose }: Props) {
  const owners = useOwnerChoices();
  const species = useSpeciesChoices();
  const editing = target?.mode === 'edit' ? patient : undefined;
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<PatientForm>({ resolver: zodResolver(patientFormSchema), defaultValues: emptyPatientForm() });
  const type = watch('type');
  const especeId = watch('especeId');

  useEffect(() => {
    if (!target) return;
    reset(editing ? formFromDetail(editing) : emptyPatientForm(target.mode === 'new' ? target.type : 'animal'));
  }, [target, editing, reset]);

  // Les listes de choix ne proposent que les actifs ; un dossier existant garde son propriétaire, son espèce et sa race même s'ils ont été désactivés depuis.
  const ownerOptions = [...(owners.data ?? [])];
  if (editing?.proprietaire && !ownerOptions.some((o) => o.id === editing.proprietaire!.id)) ownerOptions.push({ id: editing.proprietaire.id, nom: `${editing.proprietaire.nom} (désactivé)`, telephone: '' });
  const speciesOptions = [...(species.data ?? [])];
  if (editing && !speciesOptions.some((s) => s.id === editing.espece.id)) speciesOptions.push({ id: editing.espece.id, nom: `${editing.espece.nom} (désactivée)`, races: editing.race ? [{ id: editing.race.id, nom: editing.race.nom }] : [] });
  const races = speciesOptions.find((s) => s.id === especeId)?.races ?? [];
  if (editing?.race && editing.espece.id === especeId && !races.some((r) => r.id === editing.race!.id)) races.push({ id: editing.race.id, nom: `${editing.race.nom} (désactivée)` });

  const isAnimal = type === 'animal';
  const title = editing ? `Modifier le dossier ${editing.matricule}` : `Nouveau dossier patient : ${isAnimal ? 'Animal' : 'Troupeau'}`;

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={title}
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={saving} onClick={handleSubmit(onSubmit)}>Enregistrer</Button></>}
    >
      {!editing && (
        <div role="tablist" className="mb-5 grid grid-cols-2 overflow-hidden rounded-lg border border-line text-[13px] font-semibold">
          {(['animal', 'troupeau'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={type === t} onClick={() => setValue('type', t)}
              className={clsx('px-4 py-2.5 transition', type === t ? 'bg-brand text-white' : 'bg-mist text-slate hover:bg-white')}>
              {t === 'animal' ? 'Animal individuel' : 'Troupeau'}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select wrapperClassName="sm:col-span-2" label="Propriétaire *" error={errors.proprietaireId?.message} {...register('proprietaireId')}>
          <option value="">Choisir…</option>
          {ownerOptions.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
        </Select>
        <Input label={isAnimal ? "Nom de l'animal *" : 'Nom du troupeau *'} placeholder={isAnimal ? 'Rex, Mimi…' : 'Troupeau Diallo Bovins'} error={errors.nom?.message} {...register('nom')} />
        <Select label="Espèce *" error={errors.especeId?.message} {...register('especeId', { onChange: () => setValue('raceId', '') })}>
          <option value="">Choisir…</option>
          {speciesOptions.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </Select>
        <Select label="Race" disabled={!especeId} {...register('raceId')}>
          <option value="">{especeId ? 'Non précisée' : "Choisir d'abord l'espèce"}</option>
          {races.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
        </Select>

        {isAnimal ? (
          <>
            <Select label="Sexe" {...register('sexe')}>
              <option value="">Non précisé</option>
              <option value="M">Mâle</option>
              <option value="F">Femelle</option>
            </Select>
            <Input label="Date de naissance" type="date" max={new Date().toISOString().slice(0, 10)} error={errors.naissance?.message} {...register('naissance')} />
            <Select label="Statut reproducteur" {...register('statutRepro')}>
              <option value="">Non précisé</option>
              <option value="entier">Entier(e)</option>
              <option value="sterilise">Stérilisé(e)</option>
              <option value="inconnu">Inconnu</option>
            </Select>
            <Textarea wrapperClassName="sm:col-span-2" label="Antécédents / allergies" placeholder="Allergies, maladies…" {...register('antecedents')} />
          </>
        ) : (
          <>
            <Input label="Effectif total *" inputMode="numeric" error={errors.effectif?.message} {...register('effectif')} />
            <Input label="Dont femelles" inputMode="numeric" error={errors.femelles?.message} {...register('femelles')} />
            <Input label="Dont mâles" inputMode="numeric" error={errors.males?.message} {...register('males')} />
            <Input label="Dont jeunes (moins d'un an)" inputMode="numeric" error={errors.jeunes?.message} {...register('jeunes')} />
            <Input label="Localisation / site" {...register('localisation')} />
            <Input label="Date de recensement" type="date" max={new Date().toISOString().slice(0, 10)} {...register('recensement')} />
            <Textarea wrapperClassName="sm:col-span-2" label="Note" {...register('note')} />
          </>
        )}
      </form>
    </Modal>
  );
}
