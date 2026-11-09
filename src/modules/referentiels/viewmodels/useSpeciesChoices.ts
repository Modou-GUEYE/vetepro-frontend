import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { http } from '@/core/http/client';

const schema = z.object({ items: z.array(z.object({ id: z.string(), nom: z.string(), races: z.array(z.object({ id: z.string(), nom: z.string() })) })) });
export type SpeciesChoice = z.infer<typeof schema>['items'][number];

/** Liste de choix réutilisable : espèces actives et leurs races actives (ajout d'un patient, rendez-vous). */
export const useSpeciesChoices = () =>
  useQuery({ queryKey: ['species-choices'], queryFn: async () => schema.parse((await http.get('/especes/actives')).data).items, staleTime: 60_000 });
