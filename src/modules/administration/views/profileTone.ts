import type { BadgeTone } from '@/shared/ui';

/** Couleur du badge de profil, reprise de V4 (Administrateur rouge, Vétérinaire vert, Assistant bleu). */
export const PROFILE_TONE: Record<string, BadgeTone> = { admin: 'red', veterinaire: 'green', assistant: 'blue' };
