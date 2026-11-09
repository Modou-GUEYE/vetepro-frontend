import { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Action, ModuleKey, useCan } from '@/core/auth/permissions';
import { Role, useSessionStore } from '@/core/auth/session.store';

/** Page réservée aux utilisateurs connectés ; un abonnement expiré ne laisse accéder qu'à la page de renouvellement. */
export function AuthGuard({ allowExpired = false }: { allowExpired?: boolean }) {
  const { accessToken, abonnement } = useSessionStore();
  const location = useLocation();
  // Avant toute connexion, on arrive sur le site public de l'association (spécification).
  if (!accessToken) return <Navigate to={location.pathname === '/' ? '/portail' : '/connexion'} replace state={{ from: location.pathname }} />;
  if (!allowExpired && abonnement?.statut === 'expire') return <Navigate to="/abonnement" replace />;
  return <Outlet />;
}

/** Garde d'habilitation : le droit effectif vient du serveur (profil + exceptions par utilisateur). */
export function PermissionGuard({ module, action = 'read', children }: { module: ModuleKey; action?: Action; children: ReactNode }) {
  const can = useCan();
  return can(module, action) ? <>{children}</> : <Navigate to="/403" replace />;
}

/** Écrans réservés à un profil de base (back-office du Super-admin) : refusés aux autres profils, y compris l'Administrateur d'un cabinet. */
export function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const current = useSessionStore((s) => s.user?.role);
  return current === role ? <>{children}</> : <Navigate to="/403" replace />;
}

/** Page d'accueil après connexion : tableau de bord du cabinet, ou back-office pour le Super-admin. */
export function HomeRoute({ children }: { children: ReactNode }) {
  const role = useSessionStore((s) => s.user?.role);
  return role === 'super_admin' ? <Navigate to="/association" replace /> : <>{children}</>;
}
