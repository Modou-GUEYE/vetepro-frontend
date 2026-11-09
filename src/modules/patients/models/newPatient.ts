import { RefinementCtx, z } from 'zod';

/** Animal inconnu du cabinet, saisi dans un rendez-vous ou une admission : le dossier est complété après la consultation. */
export const newPatientSchema = z.object({
  nom: z.string().trim().min(1, "Le nom de l'animal est obligatoire"),
  especeId: z.string().min(1, "Choisissez l'espèce"),
  raceId: z.string(), sexe: z.string(),
  naissance: z.string().refine((v) => !v || v <= new Date().toISOString().slice(0, 10), 'La date ne peut pas être dans le futur'),
  ownerMode: z.enum(['existant', 'nouveau']),
  ownerId: z.string(),
  prenom: z.string(), ownerNom: z.string(), telephone: z.string(), email: z.string().refine((v) => !v.trim() || /^\S+@\S+\.\S+$/.test(v.trim()), 'Adresse e-mail invalide'),
});
export type NewPatientForm = z.infer<typeof newPatientSchema>;

export const emptyNewPatient = (): NewPatientForm => ({
  nom: '', especeId: '', raceId: '', sexe: '', naissance: '', ownerMode: 'existant', ownerId: '', prenom: '', ownerNom: '', telephone: '', email: '',
});

/** Valide le sous-formulaire « nouvel animal » avec les chemins d'erreur du formulaire parent (champ np). */
export function validateNewPatient(np: NewPatientForm, ctx: RefinementCtx) {
  const r = newPatientSchema.safeParse(np);
  if (!r.success) for (const i of r.error.issues) ctx.addIssue({ ...i, path: ['np', ...i.path] });
  if (np.ownerMode === 'existant' && !np.ownerId) ctx.addIssue({ code: 'custom', path: ['np', 'ownerId'], message: 'Choisissez le propriétaire' });
  if (np.ownerMode === 'nouveau') {
    if (!np.prenom.trim()) ctx.addIssue({ code: 'custom', path: ['np', 'prenom'], message: 'Le prénom est obligatoire' });
    if (!np.ownerNom.trim()) ctx.addIssue({ code: 'custom', path: ['np', 'ownerNom'], message: 'Le nom est obligatoire' });
    if (!np.telephone.trim()) ctx.addIssue({ code: 'custom', path: ['np', 'telephone'], message: 'Le numéro de téléphone est obligatoire' });
  }
}

export const toNewPatientDto = (np: NewPatientForm) => ({
  nom: np.nom.trim(), espece_id: np.especeId, race_id: np.raceId || null, sexe: np.sexe || null, naissance: np.naissance || null,
  proprietaire_id: np.ownerMode === 'existant' ? np.ownerId : null,
  proprietaire: np.ownerMode === 'nouveau' ? { prenom: np.prenom.trim(), nom: np.ownerNom.trim(), telephone: np.telephone.trim(), email: np.email.trim() } : null,
});
