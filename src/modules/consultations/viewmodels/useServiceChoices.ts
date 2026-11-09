import { useQuery } from '@tanstack/react-query';
import { consultationsService } from '../services/consultations.service';

/** Liste de choix réutilisable : services actifs du catalogue (type de consultation, facturation). */
export const useServiceChoices = () => useQuery({ queryKey: ['service-choices'], queryFn: consultationsService.serviceChoices, staleTime: 30_000 });
