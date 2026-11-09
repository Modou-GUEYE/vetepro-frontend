import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useCarousel } from '../viewmodels/useCarousel';

const SHOTS = [
  { src: '/apercu/tableau-de-bord.jpg', titre: "Tableau de bord, vue d'ensemble" },
  { src: '/apercu/consultations.jpg', titre: 'Consultations, tableau détaillé' },
  { src: '/apercu/facturation.jpg', titre: 'Facturation et caisse' },
  { src: '/apercu/vaccinations.jpg', titre: 'Vaccinations, campagnes et rappels' },
  { src: '/apercu/insemination.jpg', titre: "Gestion de l'insémination" },
];

/** Captures d'écran de l'espace membre : défilement automatique, pause au survol, points et balayage. */
export function ApercuCarousel() {
  const c = useCarousel(SHOTS.length, 6000);
  return (
    <div className="mx-auto max-w-[900px]" {...c.hover} {...c.swipe} role="region" aria-roledescription="carrousel" aria-label="Aperçu de la plateforme">
      <div className="relative overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_18px_44px_rgba(11,42,48,.12)]">
        <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${c.index * 100}%)` }}>
          {SHOTS.map((s, i) => (
            <figure key={s.src} className="m-0 w-full shrink-0" aria-hidden={i !== c.index}>
              <img src={s.src} alt={s.titre} className="block w-full" />
              <figcaption className="border-t border-line bg-white px-4 py-2.5 text-center text-[13px] font-semibold text-slate">{s.titre}</figcaption>
            </figure>
          ))}
        </div>
        <button type="button" onClick={c.prev} aria-label="Capture précédente" className="absolute left-3 top-[40%] rounded-full bg-white/90 p-2 shadow-card hover:bg-white"><ChevronLeft size={18} /></button>
        <button type="button" onClick={c.next} aria-label="Capture suivante" className="absolute right-3 top-[40%] rounded-full bg-white/90 p-2 shadow-card hover:bg-white"><ChevronRight size={18} /></button>
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {SHOTS.map((s, i) => <button key={s.src} type="button" onClick={() => c.go(i)} aria-label={`Capture ${i + 1}`} aria-current={i === c.index} className={clsx('h-[9px] rounded-full transition-all', i === c.index ? 'w-6 bg-brand' : 'w-[9px] bg-line')} />)}
      </div>
    </div>
  );
}
