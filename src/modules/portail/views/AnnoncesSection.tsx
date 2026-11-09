import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, ArrowRight, CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { formatDate } from '@/core/utils/format';
import { ANNONCE_FILTERS, AnnonceFilter, Annonce, CATEGORIE_LABEL, filterAnnonces } from '../models/portail';
import { useCarousel } from '../viewmodels/useCarousel';

/** Visuel de la colonne de gauche : photo pour l'actualité, la vaccination et les communiqués, pictogramme sur fond coloré pour les alertes et les événements. */
const PHOTOS: Record<string, string[]> = {
  actualite: ['/portail/annonce-actu.jpg'], vaccination: ['/portail/annonce-vaccin.jpg', '/portail/annonce-antirabique.jpg'], communique: ['/portail/annonce-com.jpg'],
};
const BG: Record<string, string> = {
  alerte: 'from-[#c23a3a] to-[#6e1a1a]', evenement: 'from-[#e0a02b] to-[#a8610f]', communique: 'from-[#1a5fa8] to-[#0b2f57]',
};
const photoOf = (a: Annonce, i: number) => { const l = PHOTOS[a.categorie]; return l ? l[i % l.length] : null; };

/** Annonces de l'association : défilement toutes les 8 secondes, pause au survol, points, balayage, filtres et texte complet dépliable. */
export function AnnoncesSection({ annonces }: { annonces: Annonce[] }) {
  const [filter, setFilter] = useState<AnnonceFilter>('all');
  const [open, setOpen] = useState<string | null>(null);
  const items = filterAnnonces(annonces, filter);
  const c = useCarousel(items.length, 8000);
  useEffect(() => { c.go(0); setOpen(null); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div role="group" aria-label="Filtrer les annonces" className="mb-9 flex flex-wrap justify-center gap-2.5">
        {ANNONCE_FILTERS.map((f) => (
          <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}
            className={clsx('rounded-full border px-5 py-2.5 text-[14.5px] transition sm:px-6', filter === f.key ? 'border-deep bg-deep font-semibold text-white' : 'border-line bg-white font-medium text-slate hover:border-deep hover:text-deep')}>{f.label}</button>
        ))}
      </div>
      {items.length === 0 ? <p className="py-10 text-center text-slate">Aucune annonce dans cette catégorie.</p> : (
        <div className="relative" {...c.hover} {...c.swipe} role="region" aria-roledescription="carrousel" aria-label="Annonces">
          <div className="overflow-hidden rounded-[34px] border border-line bg-white shadow-[0_24px_60px_rgba(11,42,48,.1)]">
            <div className="flex items-start transition-transform duration-500" style={{ transform: `translateX(-${c.index * 100}%)` }}>
              {items.map((a, i) => {
                const photo = photoOf(a, i);
                const alerte = a.categorie === 'alerte';
                return (
                  <article key={a.id} className="grid w-full shrink-0 bg-white md:min-h-[480px] md:grid-cols-[1.05fr_1fr]" aria-hidden={i !== c.index}>
                    <div className={clsx('relative min-h-[260px] overflow-hidden bg-gradient-to-br', BG[a.categorie] ?? 'from-[#0d3a43] to-brand')}>
                      {photo ? <img src={photo} alt={a.titre} loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : (
                        <span aria-hidden className="absolute inset-0 flex items-center justify-center text-white/90">{alerte ? <AlertTriangle size={130} strokeWidth={1.3} /> : <CalendarCheck size={130} strokeWidth={1.3} />}</span>
                      )}
                      <span className={clsx('absolute left-4 top-4 rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[.07em] shadow-[0_6px_18px_rgba(0,0,0,.14)] sm:left-6 sm:top-6 sm:px-5 sm:py-2.5 sm:text-[13px]', alerte ? 'bg-danger text-white' : 'bg-white text-deep')}>{CATEGORIE_LABEL[a.categorie] ?? a.categorie}</span>
                    </div>
                    <div className="flex flex-col justify-center gap-4 px-6 py-7 sm:px-10 md:px-[52px] md:py-11">
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[14px] text-slate sm:text-[15.5px]">
                        <span className="inline-flex items-center gap-2"><CalendarDays size={18} />{formatDate(a.date)}</span>
                        {a.zone && <span className="inline-flex items-center gap-2"><MapPin size={18} />{a.zone}</span>}
                      </div>
                      <h3 className="font-serif text-[25px] font-bold leading-[1.18] tracking-tight text-deep md:text-[34px]">{a.titre}</h3>
                      <p className="text-[16px] leading-[1.7] text-slate md:text-[18px]">{a.resume}</p>
                      {open === a.id && <p className="border-l-[3px] border-brand pl-3.5 text-[16px] leading-[1.7] text-slate">{a.texte}</p>}
                      <button type="button" tabIndex={i === c.index ? 0 : -1} aria-expanded={open === a.id} onClick={() => setOpen(open === a.id ? null : a.id)}
                        className="mt-1 inline-flex items-center gap-3 self-start rounded-full bg-gradient-to-br from-brand to-[#0b8c89] px-7 py-3.5 text-[16px] font-semibold text-white shadow-[0_12px_28px_rgba(14,124,123,.28)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(14,124,123,.36)]">
                        <b className="font-semibold">{open === a.id ? 'Réduire' : "Lire l'annonce"}</b>
                        <ArrowRight size={20} className={clsx('transition-transform', open === a.id && 'rotate-90')} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
          {items.length > 1 && (
            <>
              <button type="button" onClick={c.prev} aria-label="Annonce précédente" className="absolute left-1.5 top-[130px] flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-deep shadow-[0_10px_28px_rgba(11,42,48,.16)] transition hover:bg-deep hover:text-white md:-left-[27px] md:top-1/2 md:h-[54px] md:w-[54px] md:-translate-y-1/2"><ChevronLeft size={22} /></button>
              <button type="button" onClick={c.next} aria-label="Annonce suivante" className="absolute right-1.5 top-[130px] flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-deep shadow-[0_10px_28px_rgba(11,42,48,.16)] transition hover:bg-deep hover:text-white md:-right-[27px] md:top-1/2 md:h-[54px] md:w-[54px] md:-translate-y-1/2"><ChevronRight size={22} /></button>
            </>
          )}
          <div className="mt-6 flex justify-center gap-2">
            {items.map((a, i) => <button key={a.id} type="button" onClick={() => c.go(i)} aria-label={`Annonce ${i + 1}`} aria-current={i === c.index} className={clsx('h-[9px] rounded-full transition-all', i === c.index ? 'w-6 bg-brand' : 'w-[9px] bg-line')} />)}
          </div>
        </div>
      )}
    </div>
  );
}
