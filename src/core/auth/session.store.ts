import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PermissionMap } from './permissions';

export type Role = 'super_admin' | 'admin' | 'veterinaire' | 'assistant';

export interface SessionUser {
  id: string;
  nom: string;
  role: Role;
  profil: string;
  cabinetId: string;
  cabinetNom: string;
}

export type SubscriptionStatus = 'essai' | 'actif' | 'expire';
export interface Subscription {
  statut: SubscriptionStatus;
  joursRestants?: number;
  /** Échéance ISO, pack souscrit et périodicité. */
  fin?: string;
  pack?: { id: string; nom: string };
  periode?: 'mensuel' | 'annuel';
}

/** Ce que le serveur renvoie sur l'utilisateur connecté : relu régulièrement (effet immédiat des droits). */
export interface Access {
  user: SessionUser;
  permissions: PermissionMap;
  modules: string[];
  abonnement: Subscription;
}

interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  permissions: PermissionMap;
  modules: string[];
  abonnement: Subscription | null;
  setSession: (s: Access & { accessToken: string; refreshToken: string }) => void;
  setTokens: (t: { accessToken: string; refreshToken: string }) => void;
  setAccess: (a: Access) => void;
  clear: () => void;
}

const empty = { accessToken: null, refreshToken: null, user: null, permissions: {}, modules: [], abonnement: null };

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...empty,
      setSession: (s) => set(s),
      setTokens: (t) => set(t),
      setAccess: (a) => set(a),
      clear: () => set(empty),
    }),
    { name: 'vetepro-session' },
  ),
);
