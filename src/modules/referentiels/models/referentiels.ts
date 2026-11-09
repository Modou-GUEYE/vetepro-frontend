import { z } from 'zod';

const serviceDtoSchema = z.object({ id: z.string(), libelle: z.string(), categorie: z.string(), description: z.string(), prix: z.number(), actif: z.boolean() });
export const servicePageDtoSchema = z.object({ items: z.array(serviceDtoSchema), total: z.number(), page: z.number(), page_size: z.number(), categories: z.array(z.string()), stats: z.object({ total: z.number(), actifs: z.number(), categories: z.number(), tarif_moyen: z.number() }) });
export const serviceOnlyDtoSchema = serviceDtoSchema;

export interface Service { id: string; libelle: string; categorie: string; description: string; prix: number; actif: boolean }
export interface ServiceStats { total: number; actifs: number; categories: number; tarifMoyen: number }
export interface ServicePage { items: Service[]; total: number; categories: string[]; stats: ServiceStats }

export const serviceFormSchema = z.object({
  libelle: z.string().trim().min(1, 'Le libellé est obligatoire'),
  categorie: z.string().min(1, 'Choisissez une catégorie'),
  prix: z.string().trim().regex(/^\d+$/, 'Prix invalide : nombre entier en FCFA'),
  description: z.string().trim(),
});
export type ServiceForm = z.infer<typeof serviceFormSchema>;
export const emptyServiceForm: ServiceForm = { libelle: '', categorie: '', prix: '', description: '' };

const raceSchema = z.object({ id: z.string(), nom: z.string(), actif: z.boolean() });
const especeSchema = z.object({ id: z.string(), nom: z.string(), description: z.string(), vaccins: z.string(), actif: z.boolean(), gestation_jours: z.number().nullable(), races: z.array(raceSchema) });
export const especeListDtoSchema = z.object({ items: z.array(especeSchema) });

export interface Race { id: string; nom: string; actif: boolean }
export interface Espece { id: string; nom: string; description: string; vaccins: string; actif: boolean; gestationJours: number | null; races: Race[] }
export const toEspece = (d: z.infer<typeof especeSchema>): Espece => ({ id: d.id, nom: d.nom, description: d.description, vaccins: d.vaccins, actif: d.actif, gestationJours: d.gestation_jours, races: d.races });

/** Durée de gestation saisie : vide = non applicable, sinon nombre entier de jours entre 1 et 999. */
export function parseGestation(value: string): { ok: true; jours: number | null } | { ok: false; message: string } {
  const v = value.trim();
  if (v === '') return { ok: true, jours: null };
  if (!/^\d+$/.test(v) || Number(v) < 1 || Number(v) > 999) return { ok: false, message: 'Entre 1 et 999 jours' };
  return { ok: true, jours: Number(v) };
}
