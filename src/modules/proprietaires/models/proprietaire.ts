import { z } from 'zod';

const ownerDtoSchema = z.object({
  id: z.string(), prenom: z.string(), nom: z.string(), telephone: z.string(), email: z.string(), adresse: z.string(), actif: z.boolean(), nb_patients: z.number(),
});
export const ownerPageDtoSchema = z.object({ items: z.array(ownerDtoSchema), total: z.number(), page: z.number(), page_size: z.number() });
export const ownerChoicesDtoSchema = z.object({ items: z.array(z.object({ id: z.string(), nom: z.string(), telephone: z.string() })) });

export interface Owner { id: string; prenom: string; nom: string; telephone: string; email: string; adresse: string; actif: boolean; nbPatients: number }
export interface OwnerChoice { id: string; nom: string; telephone: string }
export const toOwner = (d: z.infer<typeof ownerDtoSchema>): Owner => ({ id: d.id, prenom: d.prenom, nom: d.nom, telephone: d.telephone, email: d.email, adresse: d.adresse, actif: d.actif, nbPatients: d.nb_patients });
export const ownerFullName = (o: Pick<Owner, 'prenom' | 'nom'>) => `${o.prenom} ${o.nom}`;

export const ownerFormSchema = z.object({
  prenom: z.string().trim().min(1, 'Le prénom est obligatoire'),
  nom: z.string().trim().min(1, 'Le nom est obligatoire'),
  telephone: z.string().trim().regex(/^(\+?[\d\s]{9,16})?$/, 'Numéro de téléphone invalide'),
  email: z.string().trim().refine((v) => v === '' || /^\S+@\S+\.\S+$/.test(v), 'Adresse e-mail invalide'),
  adresse: z.string().trim(),
});
export type OwnerForm = z.infer<typeof ownerFormSchema>;
export const emptyOwnerForm: OwnerForm = { prenom: '', nom: '', telephone: '', email: '', adresse: '' };
