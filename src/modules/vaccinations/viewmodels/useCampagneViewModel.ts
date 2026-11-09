import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { toast } from '@/shared/ui';
import { vaccinationService } from '../services/vaccination.service';
import { TerrainForm } from '../models/vaccination';

/** Détail d'une campagne : changement de statut et saisie terrain (le tableau se met à jour à chaque saisie). */
export function useCampagneViewModel(id: string) {
  const can = useCan();
  const queryClient = useQueryClient();
  const [saisie, setSaisie] = useState(false);
  const list = useQuery({ queryKey: ['campagnes'], queryFn: vaccinationService.campagnes });
  const campagne = list.data?.find((c) => c.id === id);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['campagnes'] });

  const status = useMutation({
    mutationFn: (a: 'lancer' | 'cloturer') => vaccinationService.changeStatus(id, a),
    onSuccess: (_c, a) => { toast.success(a === 'lancer' ? 'Campagne lancée' : 'Campagne clôturée'); void refresh(); },
  });
  const add = useMutation({
    mutationFn: (f: TerrainForm) => vaccinationService.addAnimal(id, f),
    onSuccess: () => { toast.success('Animal enregistré'); void refresh(); },
  });
  const remove = useMutation({ mutationFn: (animalId: string) => vaccinationService.removeAnimal(id, animalId), onSuccess: () => void refresh() });

  return {
    campagne, loading: list.isLoading, canUpdate: can('vaccinations', 'update'),
    saisie, toggleSaisie: () => setSaisie((s) => !s), openSaisie: () => setSaisie(true),
    changeStatus: status.mutate, statusBusy: status.isPending, addAnimal: add.mutateAsync, adding: add.isPending, removeAnimal: remove.mutate,
  };
}
