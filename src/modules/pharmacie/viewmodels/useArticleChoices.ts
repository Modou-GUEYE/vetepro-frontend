import { useQuery } from '@tanstack/react-query';
import { pharmacieService } from '../services/pharmacie.service';

/** Liste de choix réutilisable : articles actifs avec stock et prix (vente, consultation). */
export const useArticleChoices = () => useQuery({ queryKey: ['pharmacy', 'choices'], queryFn: pharmacieService.choices, staleTime: 10_000 });
