import { ReactNode } from 'react';
import { PawPrint } from 'lucide-react';

/** Cadre commun des écrans publics (connexion, double authentification, mot de passe oublié), repris du prototype V5. */
export function AuthLayout({ title, subtitle, back, children }: { title: string; subtitle?: string; back?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-deep via-[#0b3b3d] to-[#173a5e] px-4 py-10">
      <div className="w-full max-w-[440px] rounded-[20px] bg-white px-8 py-8 shadow-pop">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2fc3bd] to-brand text-white shadow-[0_6px_16px_rgba(18,160,157,.38)]"><PawPrint size={22} /></div>
          <div>
            <p className="font-display text-[22px] font-extrabold leading-none text-deep">VétéPro</p>
            <p className="mt-1 text-[11.5px] text-slate">Plateforme mutualisée des cabinets vétérinaires</p>
          </div>
        </div>
        {back && <div className="mb-3">{back}</div>}
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-slate">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
