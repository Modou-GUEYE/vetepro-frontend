import { http } from '@/core/http/client';
import { Registration, registrationSchema, Periode, quoteSchema, MoyenForm, moyenToDto } from '@/modules/abonnement/models/abonnement';
import { z } from 'zod';
import { CvForm, InfosForm, portalSchema } from '../models/portail';

const vivierSchema = z.object({ vivier: z.number() });

export const portailService = {
  async get() { return portalSchema.parse((await http.get('/portail')).data); },
  async quote(pack: string, periode: Periode, code: string) { return quoteSchema.parse((await http.get('/portail/tarif', { params: { pack, periode, code } })).data); },
  async register(i: { packId: string; periode: Periode; codePromo: string; infos: InfosForm; moyen: MoyenForm; cgu: boolean }): Promise<Registration> {
    const f = i.infos;
    return registrationSchema.parse((await http.post('/portail/inscription', {
      pack_id: i.packId, periode: i.periode, code_promo: i.codePromo, nom: f.nom, prenom: f.prenom, email: f.email, identifiant: f.identifiant, ordre: f.ordre, etablissement: f.etablissement, type_etablissement: f.typeEtablissement,
      adresse: f.adresse, ville: f.ville, telephone: f.telephone, double_auth: f.doubleAuth, moyen: moyenToDto(i.moyen), cgu: i.cgu,
    })).data);
  },
  async depositCv(f: CvForm) {
    const data = new FormData();
    Object.entries({ ...f, experience: Number(f.experience) }).forEach(([k, v]) => { if (k !== 'fichier') data.append(k, String(v)); });
    if (f.fichier) data.append('fichier', f.fichier);
    return vivierSchema.parse((await http.post('/portail/cv', data)).data).vivier;
  },
  async withdrawCv(contact: string) { return vivierSchema.parse((await http.post('/portail/cv/retrait', { contact })).data).vivier; },
};
