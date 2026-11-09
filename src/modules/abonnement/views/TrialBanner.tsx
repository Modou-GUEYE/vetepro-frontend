import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useSessionStore } from '@/core/auth/session.store';
import { formatDate } from '@/core/utils/format';

/** Bannière d'abonnement : jours d'essai restants, ou échéance proche d'un abonnement payé (alerte dans l'application avant l'échéance). */
export function TrialBanner() {
  const abonnement = useSessionStore((s) => s.abonnement);
  const role = useSessionStore((s) => s.user?.role);
  if (!abonnement || role === 'super_admin' || abonnement.statut === 'expire' || abonnement.joursRestants === undefined || !abonnement.fin) return null;
  const jours = abonnement.joursRestants;
  const essai = abonnement.statut === 'essai';
  if (!essai && jours > 15) return null;
  const pluriel = jours > 1 ? 's' : '';
  const urgent = jours <= 7;
  return (
    <div role="status" className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2.5 text-[13px] font-semibold sm:px-7 ${urgent ? 'border-danger/20 bg-danger-pale text-danger-text' : 'border-[#f0dcbc] bg-amber-pale text-amber-text'}`}>
      <Star size={15} className="shrink-0" />
      <span>{essai ? `Période d'essai gratuite : il reste ${jours} jour${pluriel} (fin le ${formatDate(abonnement.fin)}).` : `Votre abonnement arrive à échéance dans ${jours} jour${pluriel} (le ${formatDate(abonnement.fin)}).`}</span>
      <Link to="/abonnement" className="underline underline-offset-2 hover:no-underline">{essai ? 'Souscrire un abonnement' : 'Renouveler'}</Link>
    </div>
  );
}
