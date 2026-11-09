import { useQuery } from '@tanstack/react-query';
import { patientsService } from '../services/patients.service';

/** Liste de choix réutilisable : dossiers patients (animaux et troupeaux) avec leur propriétaire. */
export const usePatientChoices = () =>
  useQuery({
    queryKey: ['patient-choices'],
    queryFn: async () => (await patientsService.list({ page: 1, pageSize: 200 })).items.map((p) => ({
      id: p.id, matricule: p.matricule, nom: p.nom, type: p.type, sexe: p.sexe, espece: p.espece.nom, ownerId: p.proprietaire?.id ?? null, ownerName: p.proprietaire?.nom ?? '',
      label: `${p.nom} (${p.espece.nom}), ${p.proprietaire?.nom ?? 'sans propriétaire'}`,
    })),
    staleTime: 30_000,
  });
