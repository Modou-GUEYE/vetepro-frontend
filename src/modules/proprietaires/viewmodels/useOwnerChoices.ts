import { useQuery } from '@tanstack/react-query';
import { proprietairesService } from '../services/proprietaires.service';

/** Liste de choix réutilisable : propriétaires actifs. */
export const useOwnerChoices = () => useQuery({ queryKey: ['owner-choices'], queryFn: proprietairesService.choices, staleTime: 60_000 });
