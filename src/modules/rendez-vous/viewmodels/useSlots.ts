import { useQuery } from '@tanstack/react-query';
import { rdvService } from '../services/rdv.service';

/** Créneaux libres d'un vétérinaire pour une date et une durée (le rendez-vous modifié ne se bloque pas lui-même). */
export const useSlots = (vetId: string, date: string, duree: number, ignorer?: string, enabled = true) =>
  useQuery({
    queryKey: ['rdv-slots', vetId, date, duree, ignorer],
    queryFn: () => rdvService.slots(vetId, date, duree, ignorer),
    enabled: enabled && !!vetId && !!date,
    staleTime: 0,
  });
