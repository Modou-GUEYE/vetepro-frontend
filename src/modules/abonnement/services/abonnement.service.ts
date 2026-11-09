import { z } from 'zod';
import { http } from '@/core/http/client';
import { accessDtoSchema, toAccess } from '@/modules/auth/models/auth';
import { MoyenForm, Periode, moyenToDto, packSchema, quoteSchema } from '../models/abonnement';

const paiementSchema = z.object({ date: z.string(), montant: z.number(), libelle: z.string(), moyen: z.string() });
export const cabinetSchema = z.object({
  id: z.string(), nom: z.string(), ordre: z.string(), adresse: z.string(), ville: z.string(), telephone: z.string(), email: z.string(), responsable: z.string(), entite: z.string(), entite_label: z.string(),
  pack: z.object({ id: z.string(), nom: z.string() }), periode: z.enum(['mensuel', 'annuel']), statut: z.enum(['essai', 'actif', 'expire']), jours_restants: z.number(), debut: z.string(), fin: z.string(),
  promo: z.string(), source: z.string(), url: z.string(), veterinaires: z.number(), paiements: z.array(paiementSchema),
});
const abonnementSchema = z.object({
  cabinet: cabinetSchema, acces: accessDtoSchema.shape.abonnement, essai_jours: z.number(), annee_mois_offerts: z.number(), operateurs: z.array(z.string()), packs: z.array(packSchema), peut_renouveler: z.boolean(),
});
export type Cabinet = z.infer<typeof cabinetSchema>;
export type AbonnementInfo = z.infer<typeof abonnementSchema>;

export interface RenewInput { packId: string; periode: Periode; codePromo: string; moyen: MoyenForm }

export const abonnementService = {
  async get(): Promise<AbonnementInfo> { return abonnementSchema.parse((await http.get('/abonnement')).data); },
  async quote(pack: string, periode: Periode, code: string) { return quoteSchema.parse((await http.get('/portail/tarif', { params: { pack, periode, code } })).data); },
  async renew(i: RenewInput) {
    const d = z.object({ cabinet: cabinetSchema, acces: accessDtoSchema }).parse((await http.post('/abonnement/renouveler', { pack_id: i.packId, periode: i.periode, code_promo: i.codePromo, moyen: moyenToDto(i.moyen) })).data);
    return { cabinet: d.cabinet, access: toAccess(d.acces) };
  },
};
