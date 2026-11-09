import { Link } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import { useInscriptionViewModel } from '../viewmodels/useInscriptionViewModel';
import { InscriptionWizard } from './InscriptionWizard';

/** Inscription via le portail : quatre étapes, essai gratuit, mot de passe généré et envoyé par e-mail. */
export function InscriptionPage() {
  const vm = useInscriptionViewModel();
  return (
    <div className="min-h-screen bg-mist">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-[1000px] items-center justify-between px-5">
          <Link to="/portail" className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2fc3bd] to-brand text-white"><PawPrint size={18} /></span><span className="font-display text-[17px] font-extrabold text-deep">VétéPro <span className="font-semibold text-brand">Réseau</span></span></Link>
          <Link to="/connexion" className="text-[13px] font-semibold text-slate hover:text-ink">Déjà membre ? Se connecter</Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1000px] space-y-6 px-4 py-8 sm:px-6">
        <h1 className="font-display text-[26px] font-extrabold">Inscription</h1>
        <InscriptionWizard vm={vm} />
      </main>
    </div>
  );
}
