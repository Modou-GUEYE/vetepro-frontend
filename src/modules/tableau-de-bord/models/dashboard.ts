import { z } from 'zod';

export const dashboardDtoSchema = z.object({
  indicateurs: z.object({ animaux: z.number().nullable(), rdv_jour: z.number().nullable(), creances: z.number().nullable(), alertes_stock: z.number().nullable() }),
  rdv_jour: z.array(z.object({ id: z.string(), heure: z.string(), animal: z.string(), proprietaire: z.string(), motif: z.string(), statut: z.enum(['confirme', 'termine', 'annule']), veterinaire: z.string() })).nullable(),
  rappels_vaccins: z.array(z.object({ id: z.string(), animal: z.string(), vaccin: z.string(), rappel: z.string().nullable(), statut: z.enum(['a_jour', 'bientot', 'en_retard', 'non_defini']) })).nullable(),
  alertes_pharmacie: z.array(z.object({ id: z.string(), nom: z.string(), quantite: z.number(), seuil: z.number(), niveau: z.enum(['ok', 'faible', 'rupture']), unite: z.string() })).nullable(),
  activite_recente: z.array(z.object({ type: z.enum(['consultation', 'rdv', 'facture']), titre: z.string(), detail: z.string(), date: z.string(), lien: z.string() })),
  creances_en_cours: z.array(z.object({ id: z.string(), numero: z.string(), client: z.string(), reste: z.number(), total: z.number(), date: z.string() })).nullable(),
  mises_bas_depassees: z.array(z.object({ id: z.string(), patient: z.string(), prevue: z.string().nullable(), jours: z.number() })).nullable(),
});
export type Dashboard = z.infer<typeof dashboardDtoSchema>;
