import { useFormContext } from 'react-hook-form';
import clsx from 'clsx';
import { Input, Select } from '@/shared/ui';
import { useOwnerChoices } from '@/modules/proprietaires/viewmodels/useOwnerChoices';
import { useSpeciesChoices } from '@/modules/referentiels/viewmodels/useSpeciesChoices';
import type { NewPatientForm } from '../models/newPatient';

type Host = { np: NewPatientForm };

/** Champs d'un animal inconnu et de son propriétaire, dans un formulaire parent qui porte le champ « np » (FormProvider). */
export function NewPatientFields() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<Host>();
  const owners = useOwnerChoices();
  const species = useSpeciesChoices();
  const e = errors.np;
  const especeId = watch('np.especeId');
  const ownerMode = watch('np.ownerMode');
  const races = species.data?.find((s) => s.id === especeId)?.races ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl border border-line bg-[#fbfcfd] p-4 sm:grid-cols-2">
      <p className="text-xs text-slate sm:col-span-2">Le dossier sera créé en « à compléter » et pourra être terminé après la consultation.</p>
      <Input label="Nom de l'animal *" error={e?.nom?.message} {...register('np.nom')} />
      <Select label="Espèce *" error={e?.especeId?.message} {...register('np.especeId', { onChange: () => setValue('np.raceId', '') })}>
        <option value="">Choisir…</option>{(species.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
      </Select>
      <Select label="Race" disabled={!especeId} {...register('np.raceId')}>
        <option value="">{especeId ? 'Non précisée' : "Choisir d'abord l'espèce"}</option>{races.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
      </Select>
      <Select label="Sexe" {...register('np.sexe')}><option value="">Non précisé</option><option value="M">Mâle</option><option value="F">Femelle</option></Select>
      <Input label="Date de naissance" type="date" max={new Date().toISOString().slice(0, 10)} error={e?.naissance?.message} {...register('np.naissance')} />

      <div className="sm:col-span-2">
        <div role="tablist" aria-label="Propriétaire" className="mb-3 grid grid-cols-2 overflow-hidden rounded-lg border border-line text-[12.5px] font-semibold">
          {(['existant', 'nouveau'] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={ownerMode === m} onClick={() => setValue('np.ownerMode', m)}
              className={clsx('px-3 py-2 transition', ownerMode === m ? 'bg-brand text-white' : 'bg-mist text-slate hover:bg-white')}>
              {m === 'existant' ? 'Propriétaire existant' : 'Nouveau propriétaire'}
            </button>
          ))}
        </div>
        {ownerMode === 'existant' ? (
          <Select label="Propriétaire *" error={e?.ownerId?.message} {...register('np.ownerId')}>
            <option value="">Choisir…</option>{(owners.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
          </Select>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Prénom *" error={e?.prenom?.message} {...register('np.prenom')} />
            <Input label="Nom *" error={e?.ownerNom?.message} {...register('np.ownerNom')} />
            <Input label="Téléphone *" error={e?.telephone?.message} {...register('np.telephone')} />
            <Input label="E-mail" type="email" error={e?.email?.message} {...register('np.email')} />
          </div>
        )}
      </div>
    </div>
  );
}
