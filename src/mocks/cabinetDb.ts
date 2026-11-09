import type { Failure } from './profilesDb';

/** Identité du cabinet (spécification : inscription, étape 2) et politique de sécurité : double authentification imposée à tous les utilisateurs. */
export interface DemoCabinet { nom: string; ordre: string; adresse: string; telephone: string; email: string; logo: string | null; twofaObligatoire: boolean }

const seed = (): DemoCabinet => ({
  nom: 'Clinique Vétérinaire de Dakar', ordre: 'ODVS-1142', adresse: 'Médina, rue 11, Dakar', telephone: '33 821 00 00', email: 'contact@clinique-dakar.sn', logo: null, twofaObligatoire: false,
});

export let CABINET: DemoCabinet = seed();
export const resetCabinet = () => { CABINET = seed(); };

export type CabinetInput = Omit<DemoCabinet, never>;

/** Le numéro d'ordre est vérifié sur son format (spécification) : ODVS suivi de quatre chiffres. */
export const ORDRE_FORMAT = /^ODVS-\d{4}$/i;
const phoneOk = (t: string) => t.replace(/\D/g, '').length >= 9;

export function updateCabinet(i: CabinetInput): DemoCabinet | Failure {
  if (!i.nom.trim()) return { status: 422, code: 'invalid', message: 'Renseignez le nom du cabinet' };
  if (!ORDRE_FORMAT.test(i.ordre.trim())) return { status: 422, code: 'invalid_ordre', message: "Format du numéro d'ordre attendu : ODVS-0000" };
  if (!i.adresse.trim()) return { status: 422, code: 'invalid', message: "L'adresse est obligatoire" };
  if (!phoneOk(i.telephone)) return { status: 422, code: 'invalid', message: 'Numéro de téléphone invalide' };
  if (!/^\S+@\S+\.\S+$/.test(i.email.trim())) return { status: 422, code: 'invalid', message: 'Adresse e-mail invalide' };
  CABINET = { ...i, nom: i.nom.trim(), ordre: i.ordre.trim().toUpperCase(), adresse: i.adresse.trim(), telephone: i.telephone.trim(), email: i.email.trim().toLowerCase() };
  return CABINET;
}
