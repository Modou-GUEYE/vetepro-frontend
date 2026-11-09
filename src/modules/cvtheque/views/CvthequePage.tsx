import { Contact, Download, Mail, MapPin, MessageCircle, Paperclip, Phone, Search, ShieldCheck } from 'lucide-react';
import { formatFileSize } from '@/core/http/download';
import { formatDate } from '@/core/utils/format';
import { Badge, Button, EmptyState, Input, KpiCard, Modal, Select, Skeleton } from '@/shared/ui';
import { DISPOS, DISPO_LABEL, DISPO_TONE, PROFILS, PROFIL_LABEL, TITRE_PROFIL, Cv, experienceLabel, hasFilters, initials, isRecent, telHref, waHref } from '../models/cv';
import { useCvthequeViewModel } from '../viewmodels/useCvthequeViewModel';

const Avatar = ({ nom, size = 44 }: { nom: string; size?: number }) => (
  <span style={{ width: size, height: size, fontSize: size * 0.34 }} className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2fc3bd] to-brand font-bold text-white">{initials(nom)}</span>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[.8px] text-slate">{children}</p>;

/** Vivier du réseau : profils validés par l'association, visibles des Administrateurs et Vétérinaires des cabinets membres, qui contactent directement le candidat. */
export function CvthequePage() {
  const vm = useCvthequeViewModel();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3.5 rounded-lg2 border border-line bg-gradient-to-r from-brand-pale to-white px-5 py-[18px]">
        <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] bg-brand text-white"><Contact size={24} /></span>
        <div>
          <h3 className="font-serif text-[17px] font-bold text-deep">CVthèque du réseau</h3>
          <p className="max-w-[640px] text-[13px] text-slate">Profils de vétérinaires, assistants et techniciens déposés sur le portail de l'association, puis validés par elle. Contactez directement les candidats qui vous intéressent.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <KpiCard value={vm.stats.visibles} label="Profils visibles" />
        <KpiCard value={vm.stats.veterinaires} label="Vétérinaires" tone="info" />
        <KpiCard value={vm.stats.immediats} label="Disponibles immédiatement" tone="amber" />
        <KpiCard value={vm.stats.nouveaux} label="Nouveaux (30 j)" tone="violet" />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg2 border border-line bg-white px-4 py-3">
        <div className="relative min-w-[220px] flex-[2]">
          <Search size={15} className="pointer-events-none absolute left-3 top-[34px] text-faint" />
          <Input label="Recherche" className="pl-9" placeholder="Nom, compétence, ville…" value={vm.filters.q} onChange={(e) => vm.setFilter('q', e.target.value)} />
        </div>
        <Select wrapperClassName="min-w-[130px] flex-1" label="Profil" value={vm.filters.profil} onChange={(e) => vm.setFilter('profil', e.target.value)}>
          <option value="">Tous</option>
          {PROFILS.map((p) => <option key={p} value={p}>{PROFIL_LABEL[p]}</option>)}
        </Select>
        <Select wrapperClassName="min-w-[130px] flex-1" label="Ville" value={vm.filters.ville} onChange={(e) => vm.setFilter('ville', e.target.value)}>
          <option value="">Toutes</option>
          {vm.villes.map((v) => <option key={v} value={v}>{v}</option>)}
        </Select>
        <Select wrapperClassName="min-w-[130px] flex-1" label="Disponibilité" value={vm.filters.disponibilite} onChange={(e) => vm.setFilter('disponibilite', e.target.value)}>
          <option value="">Toutes</option>
          {DISPOS.map((d) => <option key={d} value={d}>{DISPO_LABEL[d]}</option>)}
        </Select>
        <Select wrapperClassName="min-w-[130px] flex-1" label="Expérience min." value={vm.filters.experience} onChange={(e) => vm.setFilter('experience', e.target.value)}>
          <option value="">Indifférent</option>
          {[1, 3, 5, 8].map((n) => <option key={n} value={n}>{n} an{n > 1 ? 's' : ''}+</option>)}
        </Select>
        <Button variant="secondary" onClick={vm.reset} disabled={!hasFilters(vm.filters)}>Réinitialiser</Button>
      </div>

      <p className="text-xs text-slate" aria-live="polite">{vm.items.length} profil{vm.items.length > 1 ? 's' : ''}</p>

      {vm.loading ? <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)}</div>
        : vm.items.length === 0 ? <div className="rounded-lg2 border border-line bg-white"><EmptyState title="Aucun profil" description={hasFilters(vm.filters) ? 'Aucun profil ne correspond à vos critères.' : 'Le vivier ne contient pas encore de profil validé.'} /></div>
        : (
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {vm.items.map((c) => (
              <button key={c.id} type="button" onClick={() => vm.open(c)} className="flex flex-col gap-2.5 rounded-lg2 border border-line bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(11,42,48,.12)]">
                <div className="flex items-center gap-3">
                  <Avatar nom={c.nom} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-bold">{c.nom}</p>
                    <p className="truncate text-xs text-slate">{TITRE_PROFIL[c.profil]}</p>
                  </div>
                  {isRecent(c.depose_le) && <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Nouveau</span>}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate">
                  <span className="inline-flex items-center gap-1"><MapPin size={12} /> {c.ville}</span>
                  <span>{c.experience} an{c.experience > 1 ? 's' : ''} d'exp.</span>
                  <span>{DISPO_LABEL[c.disponibilite]}</span>
                  {c.fichier && <span className="inline-flex items-center gap-1 font-semibold text-brand-text"><Paperclip size={12} /> CV joint</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">{c.competences.slice(0, 4).map((k) => <span key={k} className="rounded-full bg-brand-pale px-2.5 py-0.5 text-[11px] font-medium text-brand-text">{k}</span>)}</div>
              </button>
            ))}
          </div>
        )}

      <CvDetail cv={vm.selected} onClose={vm.close} onDownload={vm.download} downloading={vm.downloading} />
    </div>
  );
}

function CvDetail({ cv, onClose, onDownload, downloading }: { cv: Cv | null; onClose: () => void; onDownload: (cv: Cv) => void; downloading: boolean }) {
  const btn = 'inline-flex items-center gap-1.5 rounded-[10px] border border-line bg-white px-[15px] py-2 text-[13px] font-semibold hover:bg-mist';
  return (
    <Modal
      open={!!cv} onClose={onClose} title="Fiche candidat"
      footer={cv && (
        <>
          {cv.fichier && <button type="button" disabled={downloading} onClick={() => onDownload(cv)} className={`${btn} disabled:opacity-60`}><Download size={14} /> CV (PDF, {formatFileSize(cv.fichier.taille)})</button>}
          <a href={waHref(cv.telephone)} target="_blank" rel="noopener noreferrer" className={btn}><MessageCircle size={14} /> WhatsApp</a>
          {cv.email
            ? <a href={`mailto:${cv.email}`} className={btn}><Mail size={14} /> E-mail</a>
            : <span className={`${btn} cursor-not-allowed text-faint hover:bg-white`} title="Aucune adresse e-mail renseignée"><Mail size={14} /> E-mail</span>}
          <a href={telHref(cv.telephone)} className="inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-to-b from-brand-light to-brand px-[15px] py-2 text-[13px] font-semibold text-white"><Phone size={14} /> Appeler</a>
        </>
      )}
    >
      {cv && (
        <div className="space-y-4 text-[13px]">
          <div className="flex items-center gap-3.5">
            <Avatar nom={cv.nom} size={58} />
            <div>
              <h3 className="text-[18px] font-bold">{cv.nom}</h3>
              <p className="text-slate">{TITRE_PROFIL[cv.profil]}, {cv.ville}</p>
              <p className="text-xs text-slate">Profil déposé le {formatDate(cv.depose_le)}, source : portail</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg2 border border-line px-3 py-2.5"><p className="text-xs text-slate">Expérience</p><b>{experienceLabel(cv.experience)}</b></div>
            <div className="rounded-lg2 border border-line px-3 py-2.5"><p className="text-xs text-slate">Disponibilité</p><b><Badge tone={DISPO_TONE[cv.disponibilite]}>{DISPO_LABEL[cv.disponibilite]}</Badge></b></div>
            <div className="rounded-lg2 border border-line px-3 py-2.5"><p className="text-xs text-slate">Profil</p><b>{PROFIL_LABEL[cv.profil]}</b></div>
          </div>
          <div>
            <SectionTitle>Compétences</SectionTitle>
            <div className="flex flex-wrap gap-1.5">{cv.competences.length ? cv.competences.map((k) => <span key={k} className="rounded-full bg-brand-pale px-2.5 py-0.5 text-xs font-medium text-brand-text">{k}</span>) : <span className="text-slate">Non renseignées</span>}</div>
          </div>
          <div>
            <SectionTitle>Présentation</SectionTitle>
            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{cv.presentation || 'Aucune présentation.'}</p>
          </div>
          <div>
            <SectionTitle>Coordonnées</SectionTitle>
            <dl className="divide-y divide-line rounded-lg2 bg-mist px-4 py-1">
              <div className="flex justify-between gap-3 py-2"><dt className="text-slate">Téléphone</dt><dd className="font-semibold">{cv.telephone}</dd></div>
              <div className="flex justify-between gap-3 py-2"><dt className="text-slate">E-mail</dt><dd className="font-semibold">{cv.email || 'Non renseigné'}</dd></div>
            </dl>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg2 border border-brand/20 bg-brand-pale px-3.5 py-2.5 text-brand-text">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            <p><b>Consentement au partage des données.</b> Le candidat a consenti à la diffusion de son profil aux cabinets membres. Profil validé par l'association.</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
