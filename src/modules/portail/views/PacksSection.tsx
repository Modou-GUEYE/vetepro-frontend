import { useState } from 'react';
import clsx from 'clsx';
import { Button } from '@/shared/ui';
import { PERIODE_LABEL, Periode } from '@/modules/abonnement/models/abonnement';
import { PackCard } from '@/modules/abonnement/views/PackCard';
import { Portal, offerText } from '../models/portail';
import { InscriptionModal } from './InscriptionModal';

/** Comparatif des packs : « Le plus choisi » mis en avant, essai et offre de lancement, adhésion rapide. */
export function PacksSection({ portal }: { portal: Portal }) {
  const [periode, setPeriode] = useState<Periode>('mensuel');
  const [packId, setPackId] = useState<string | null>(null);
  return (
    <div>
      <p className="mx-auto mb-5 max-w-[640px] text-center text-[14px] text-slate">{offerText(portal)}</p>
      <div role="radiogroup" aria-label="Périodicité" className="mx-auto mb-9 flex w-fit rounded-[12px] bg-white p-1 shadow-card">
        {(['mensuel', 'annuel'] as Periode[]).map((p) => (
          <button key={p} type="button" role="radio" aria-checked={periode === p} onClick={() => setPeriode(p)} className={clsx('rounded-[9px] px-4 py-2 text-[13px] font-semibold transition', periode === p ? 'bg-brand text-white' : 'text-slate hover:text-ink')}>
            {PERIODE_LABEL[p]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 items-stretch gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        {portal.packs.map((p) => <PackCard key={p.id} pack={p} periode={periode} action={<Button className="w-full" variant={p.star ? 'primary' : 'secondary'} onClick={() => setPackId(p.id)}>Choisir {p.nom}</Button>} />)}
      </div>
      <p className="mt-8 text-center text-[13px] text-slate">Besoin d'une offre sur mesure pour un groupe ? <a href={`mailto:${portal.contenu.contact.email}?subject=Offre%20sur%20mesure`} className="font-semibold text-brand hover:underline">Contactez l'association</a>.</p>
      {packId && <InscriptionModal packId={packId} periode={periode} onClose={() => setPackId(null)} />}
    </div>
  );
}
