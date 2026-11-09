import { useQuery } from '@tanstack/react-query';
import { rdvService } from '../services/rdv.service';

/** Liste de choix réutilisable : vétérinaires actifs (rendez-vous, hospitalisations). */
export const useVeterinaireChoices = () => useQuery({ queryKey: ['veterinaires'], queryFn: rdvService.vets, staleTime: 60_000 });
