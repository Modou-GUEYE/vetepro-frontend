import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ClipboardList, CreditCard, Menu, PawPrint, Phone, Stethoscope, Star, Syringe, X } from 'lucide-react';
import { Skeleton } from '@/shared/ui';
import { usePortalQuery } from '../viewmodels/usePortalViewModel';
import { AnnoncesSection } from './AnnoncesSection';
import { ApercuCarousel } from './ApercuCarousel';
import { CvSection } from './CvSection';
import { PacksSection } from './PacksSection';

const MENU = [['solution', 'La solution'], ['apercu', 'Aperçu'], ['packs', 'Packs'], ['cvtheque', 'CVthèque'], ['pourquoi', 'Pourquoi adhérer'], ['annonces', 'Annonces']] as const;

/** Cartes de la solution : les deux premières et la dernière suivent le V5 (teal, ambre, menthe, nuit). */
const FEATURES = [
  { Icon: ClipboardList, titre: 'Dossiers centralisés', texte: 'Patients, propriétaires, historiques et ordonnances numériques réunis au même endroit.', card: 'bg-gradient-to-br from-brand to-[#0b4f5a] text-white', icon: 'bg-white/15 text-white', text: 'text-[#cfeeee]' },
  { Icon: CreditCard, titre: 'Facturation et caisse', texte: 'Devis, factures, reçus et paiements mobile money (Wave, Orange Money) intégrés.', card: 'bg-[#fdf4e3]', icon: 'bg-[#fff] text-amber', text: 'text-slate' },
  { Icon: Syringe, titre: 'Vaccinations et rappels', texte: 'Carnets à jour et rappels automatiques pour ne manquer aucune échéance.', card: 'bg-[#e3f5f3]', icon: 'bg-white text-brand', text: 'text-slate' },
  { Icon: Stethoscope, titre: "Gestion de l'insémination", texte: 'Suivi complet des inséminations : actes, diagnostics de gestation, mise-bas et résultats.', card: 'bg-[#0b2a30] text-white', icon: 'bg-white/10 text-[#5eead4]', text: 'text-[#a9c9c9]' },
];

const AVATARS = ['bg-brand-pale text-brand', 'bg-info-pale text-info', 'bg-violet-pale text-violet', 'bg-amber-pale text-amber'];
const initials = (name: string) => name.replace(/^(Dr|Pr)\.?\s+/i, '').split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

/** Met en valeur la fin du titre (« réseau mutualisé » dans le V5) avec le dégradé menthe vers ambre. */
function HeroTitle({ titre }: { titre: string }) {
  const words = titre.trim().split(/\s+/);
  const n = Math.min(2, Math.max(1, words.length - 1));
  return <>{words.slice(0, -n).join(' ')}<br /><em className="bg-gradient-to-r from-[#5eead4] to-[#f5b84b] bg-clip-text not-italic text-transparent">{words.slice(-n).join(' ')}</em></>;
}

const Eyebrow = ({ children, dark }: { children: React.ReactNode; dark?: boolean }) => (
  <p className={`text-[12px] font-bold uppercase tracking-[1.4px] ${dark ? 'text-[#5eead4]' : 'text-brand'}`}>{children}</p>
);

const Section = ({ id, kicker, title, intro, children, className = '' }: { id: string; kicker: string; title: string; intro?: string; children: React.ReactNode; className?: string }) => (
  <section id={id} className={`scroll-mt-16 px-5 py-[70px] sm:px-8 ${className}`}>
    <div className="mx-auto max-w-[1140px]">
      <div className="mx-auto mb-11 max-w-[640px] text-center">
        <Eyebrow>{kicker}</Eyebrow>
        <h2 className="mt-3 font-serif text-[30px] font-bold leading-tight tracking-tight text-deep sm:text-[34px]">{title}</h2>
        {intro && <p className="mt-3 text-[15px] leading-relaxed text-slate">{intro}</p>}
      </div>
      {children}
    </div>
  </section>
);

/** Site public de l'association : présentation de la plateforme, packs et adhésion, CVthèque, annonces. */
export function PortalPage() {
  const { data: portal, isLoading, isError } = usePortalQuery();
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    root.style.scrollBehavior = 'smooth';
    return () => { root.style.scrollBehavior = ''; };
  }, []);

  return (
    <div className="min-h-screen bg-[#fbfdfe]">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#06222a]/90 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-[1140px] items-center gap-3 sm:gap-6 px-5 sm:px-8">
          <a href="#accueil" className="flex shrink-0 items-center gap-2.5 font-serif text-[19px] font-bold text-white sm:text-[21px]">
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-gradient-to-br from-[#2fc3bd] to-brand text-white"><PawPrint size={20} /></span>
            <span>VétéPro <small className="ml-0.5 hidden rounded-md bg-white/10 px-1.5 py-0.5 font-sans text-[11px] font-bold tracking-wide text-[#5eead4] sm:inline">Réseau</small></span>
          </a>
          <nav aria-label="Menu du site" className="ml-3 hidden items-center gap-6 lg:flex">
            {MENU.map(([id, label]) => <a key={id} href={`#${id}`} className="text-[14.5px] font-medium text-[#cfe9e8] transition hover:text-[#5eead4]">{label}</a>)}
          </nav>
          <Link to="/connexion" className="ml-auto inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-[#5eead4] px-4 py-2.5 text-[13px] sm:px-5 sm:text-[14px] font-semibold text-[#06222a] shadow-[0_12px_40px_rgba(94,234,212,.35)] transition hover:-translate-y-0.5">Espace membre <ArrowRight size={16} /></Link>
          <button type="button" aria-label={menu ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={menu} onClick={() => setMenu(!menu)} className="rounded-lg p-2 text-[#cfe9e8] hover:bg-white/10 lg:hidden">{menu ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
        {menu && <nav aria-label="Menu du site" className="grid border-t border-white/10 bg-[#06222a] px-5 py-2 lg:hidden">{MENU.map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setMenu(false)} className="rounded-lg px-3 py-2.5 text-[14px] font-medium text-[#cfe9e8] hover:bg-white/10">{label}</a>)}</nav>}
      </header>

      {isLoading && <div className="mx-auto max-w-[1100px] space-y-4 p-8"><Skeleton className="h-64" /><Skeleton className="h-40" /></div>}
      {isError && <p role="alert" className="p-12 text-center text-danger">Impossible de charger le site. Réessayez dans un instant.</p>}

      {portal && (
        <main>
          <section id="accueil" className="relative scroll-mt-16 overflow-hidden bg-[#06222a] text-white [background-image:radial-gradient(1000px_520px_at_85%_-10%,rgba(18,160,157,.38),transparent_60%),radial-gradient(700px_400px_at_-5%_40%,rgba(245,184,75,.16),transparent_60%)]">
            <div className="relative z-10 mx-auto grid max-w-[1140px] items-center gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr]">
              <div>
                <span className="inline-block rounded-full bg-[#5eead4]/10 px-4 py-2 text-[12px] font-bold uppercase tracking-[.5px] text-[#5eead4]">Association des vétérinaires du Sénégal</span>
                <h1 className="mt-4 font-serif text-[40px] font-bold leading-[1.05] tracking-tight text-white sm:text-[52px]"><HeroTitle titre={portal.contenu.titre} /></h1>
                <p className="mt-5 max-w-[470px] text-[16.5px] leading-relaxed text-[#b9d6d6]">{portal.contenu.sous_titre}</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <a href="#packs" className="inline-flex items-center rounded-full bg-[#5eead4] px-7 py-3.5 text-[15px] font-semibold text-[#06222a] shadow-[0_12px_40px_rgba(94,234,212,.35)] transition hover:-translate-y-0.5">Choisir mon pack</a>
                  <a href="#cvtheque" className="inline-flex items-center rounded-full border-[1.5px] border-white/40 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/10">Déposer mon CV</a>
                </div>
                <dl className="mt-9 flex gap-8">
                  {[[portal.chiffres.cabinets, 'cabinets membres', false], [portal.chiffres.veterinaires, 'vétérinaires', false], [1, 'plateforme mutualisée', true]].map(([n, l, amber]) => (
                    <div key={String(l)}><dd className={`font-serif text-[26px] font-bold tabular-nums ${amber ? 'text-[#f5b84b]' : 'text-white'}`}>{n}</dd><dt className="text-[12.5px] text-[#8fb8b8]">{l}</dt></div>
                  ))}
                </dl>
              </div>
              <div className="relative mx-auto w-full max-w-[460px]">
                <img src="/portail/hero.jpg" alt="Équipe vétérinaire soignant une chèvre en milieu rural" width={1024} height={1536} className="block w-full rounded-[36px] shadow-[0_40px_90px_rgba(0,0,0,.5)]" />
                <div aria-hidden className="absolute -bottom-6 left-2 z-10 w-[70%] rounded-[20px] border border-white/20 bg-[#0d3a43]/90 p-3.5 shadow-[0_24px_60px_rgba(0,0,0,.45)] backdrop-blur sm:-left-7 sm:w-[62%]">
                  <div className="flex gap-2">
                    {[["RDV aujourd'hui", 'bg-[#5eead4]', '70%'], ['Rappels vaccins', 'bg-[#f5b84b]', '45%'], ['Alertes pharmacie', 'bg-[#ff8a8a]', '25%']].map(([l, c, w]) => (
                      <div key={l} className="flex-1 rounded-xl bg-white/[.08] p-2.5 text-[10px] text-[#8fb8b8]">{l}<i className={`mt-2 block h-1.5 rounded-full ${c}`} style={{ width: w }} /></div>
                    ))}
                  </div>
                  <div className="mt-2.5 flex h-[62px] items-end gap-[7px]">
                    {[40, 65, 50, 85, 60, 100, 72].map((h, i) => <i key={i} className={`flex-1 rounded-md ${i === 3 ? 'bg-[#5eead4]' : i === 5 ? 'bg-[#f5b84b]' : 'bg-[#12a09d]'}`} style={{ height: `${h}%` }} />)}
                  </div>
                </div>
                <div aria-hidden className="absolute -left-6 top-[8%] hidden items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-[0_16px_40px_rgba(27,46,26,.14)] sm:flex">
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-brand-pale text-brand"><Check size={18} /></span>
                  <div><b className="block text-[13px] text-ink">Mutualisation</b><small className="text-[11px] text-slate">Outils partagés</small></div>
                </div>
                <div aria-hidden className="absolute -top-4 right-[-14px] hidden items-center gap-2.5 rounded-2xl bg-[#f5b84b] px-3.5 py-2.5 shadow-[0_16px_40px_rgba(27,46,26,.14)] sm:flex">
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-info-pale text-info"><Stethoscope size={18} /></span>
                  <div><b className="block text-[13px] text-[#06222a]">Entraide</b><small className="text-[11px] text-[#06222a]">Cas cliniques partagés</small></div>
                </div>
              </div>
            </div>
          </section>

          <Section id="solution" kicker="Ce que la plateforme vous apporte" title="Un seul outil pour tout gérer" intro="Des fonctionnalités pensées pour le quotidien des cabinets, mutualisées à l'échelle du réseau.">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ Icon, titre, texte, card, icon, text }) => (
                <article key={titre} className={`rounded-3xl p-6 transition hover:-translate-y-1.5 hover:shadow-[0_22px_50px_rgba(11,42,48,.14)] ${card}`}>
                  <span className={`flex h-[54px] w-[54px] items-center justify-center rounded-2xl ${icon}`}><Icon size={26} /></span>
                  <h3 className="mt-4 font-serif text-[18px] font-bold">{titre}</h3>
                  <p className={`mt-2 text-[14px] leading-relaxed ${text}`}>{texte}</p>
                </article>
              ))}
            </div>
          </Section>

          <Section id="apercu" kicker="Aperçu de la plateforme" title="Découvrez l'espace membre" className="!py-14"><ApercuCarousel /></Section>
          <Section id="packs" kicker="Adhésion" title="Choisissez votre pack"><PacksSection portal={portal} /></Section>

          <section id="cvtheque" className="scroll-mt-16 bg-gradient-to-b from-[#fbfdfe] to-[#eaf7f6] px-5 py-[76px] sm:px-8">
            <div className="mx-auto max-w-[1140px]"><CvSection vivier={portal.vivier} cabinets={portal.chiffres.cabinets} /></div>
          </section>

          <section id="pourquoi" className="scroll-mt-16 bg-[#06222a] px-5 py-[76px] text-white sm:px-8">
            <div className="mx-auto grid max-w-[1140px] items-center gap-[52px] lg:grid-cols-[.95fr_1.05fr]">
              <div className="relative mx-auto w-full max-w-[460px]">
                <span aria-hidden className="absolute -left-6 -top-6 h-[120px] w-[120px] rounded-full bg-[#12a09d]/30" />
                <span aria-hidden className="absolute -bottom-4 right-8 h-20 w-20 rounded-full bg-[#f5b84b]/30" />
                <img src="/portail/pourquoi.jpg" alt="Éleveur et bétail en milieu rural africain" loading="lazy" className="relative aspect-[4/4.2] w-full rounded-[36px] object-cover shadow-[0_24px_60px_rgba(0,0,0,.4)]" />
              </div>
              <div>
                <Eyebrow dark>Pourquoi adhérer</Eyebrow>
                <h2 className="mt-3 font-serif text-[30px] font-bold leading-tight tracking-tight text-white sm:text-[34px]">La mutualisation, un cercle vertueux</h2>
                <ul className="mt-6 flex flex-col gap-4">
                  {portal.contenu.pourquoi.map((p) => (
                    <li key={p.titre} className="flex items-start gap-3 text-[15px] leading-relaxed text-[#a9c9c9]">
                      <span className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-[#5eead4]/15 text-[#5eead4]"><Check size={15} /></span>
                      <span><b className="text-white">{p.titre}.</b> {p.texte}</span>
                    </li>
                  ))}
                </ul>
                <a href="#packs" className="mt-7 inline-flex items-center rounded-full bg-[#5eead4] px-6 py-3 text-[14px] font-semibold text-[#06222a] transition hover:-translate-y-0.5">Adhérer au réseau</a>
              </div>
            </div>
          </section>

          <Section id="annonces" kicker="Annonces et informations" title="L'actualité du secteur vétérinaire" intro="Alertes épidémiologiques, campagnes de vaccination, communiqués et événements : l'information essentielle, diffusée à tout le réseau.">
            <AnnoncesSection annonces={portal.annonces} />
          </Section>

          {portal.temoignages.length > 0 && (
            <Section id="temoignages" kicker="Ils ont rejoint le réseau" title="La parole aux membres">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {portal.temoignages.map((t, i) => (
                  <figure key={t.id} className="m-0 rounded-3xl border border-line bg-white p-6 shadow-[0_10px_40px_rgba(11,42,48,.1)]">
                    <div className="mb-3.5 flex gap-0.5 text-amber" aria-hidden>{[0, 1, 2, 3, 4].map((k) => <Star key={k} size={16} fill="currentColor" />)}</div>
                    <blockquote className="m-0 font-serif text-[15px] font-semibold leading-relaxed text-ink">« {t.texte} »</blockquote>
                    <figcaption className="mt-[18px] flex items-center gap-3">
                      <span className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-[14px] font-bold ${AVATARS[i % AVATARS.length]}`}>{initials(t.auteur)}</span>
                      <div><b className="block text-[14px]">{t.auteur}</b><small className="text-[12px] text-slate">{t.role}</small></div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Section>
          )}

          <section id="contact" className="scroll-mt-16 px-5 sm:px-8">
            <div className="relative mx-auto max-w-[1140px] overflow-hidden rounded-[34px] bg-gradient-to-br from-brand to-[#06222a] px-6 py-16 text-center">
              <span aria-hidden className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.14),transparent_70%)]" />
              <div className="relative">
                <h2 className="font-serif text-[30px] font-bold text-white sm:text-[36px]">Rejoignez le réseau mutualisé</h2>
                <p className="mx-auto mb-7 mt-3 max-w-[520px] text-[16px] text-white/80">Choisissez votre pack ou contactez l'association pour une offre sur mesure.</p>
                <div className="flex flex-wrap justify-center gap-3.5">
                  <a href="#packs" className="inline-flex items-center rounded-full bg-white px-7 py-3.5 text-[15px] font-semibold text-deep transition hover:-translate-y-0.5">Choisir mon pack</a>
                  <a href={`tel:${portal.contenu.contact.telephone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 rounded-full bg-[#f5b84b] px-7 py-3.5 text-[15px] font-semibold text-[#06222a] transition hover:-translate-y-0.5"><Phone size={16} /> {portal.contenu.contact.telephone}</a>
                </div>
              </div>
            </div>
          </section>

          <footer className="px-5 pb-10 pt-12 text-center">
            <div className="flex items-center justify-center gap-2.5 font-serif text-[21px] font-bold text-deep">
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-gradient-to-br from-[#2fc3bd] to-brand text-white"><PawPrint size={20} /></span>VétéPro Réseau
            </div>
            <p className="mt-2.5 text-[13.5px] text-slate">{portal.contenu.contact.adresse}, <a href={`mailto:${portal.contenu.contact.email}`} className="hover:text-ink">{portal.contenu.contact.email}</a></p>
            <small className="text-[12px] text-slate/70">© {new Date().getFullYear()} VétéPro, plateforme mutualisée</small>
          </footer>
        </main>
      )}
    </div>
  );
}
