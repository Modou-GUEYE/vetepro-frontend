import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Check, MapPin, MessageSquare, Plus, Search, Stethoscope, ThumbsUp } from 'lucide-react';
import { formatDate } from '@/core/utils/format';
import { Badge, Button, EmptyState, Input, Modal, Select, Skeleton, Textarea } from '@/shared/ui';
import { CAS_CATEGORIES, CAS_CATEGORIE_TONE, Cas, CasForm, avisSchema, casFormSchema, emptyCasForm, hasCasFilters } from '../models/reseau';
import { useCasViewModel } from '../viewmodels/useCasViewModel';

const tone = (c: string) => CAS_CATEGORIE_TONE[c as keyof typeof CAS_CATEGORIE_TONE] ?? 'slate';

/** Cas cliniques partagés : un cas difficile soumis, sans nom de propriétaire, au réseau pour recueillir l'avis des confrères. */
export function CasPartagesPage() {
  const vm = useCasViewModel();
  const filtered = hasCasFilters(vm.filters);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3.5 rounded-lg2 border border-line bg-gradient-to-r from-brand-pale to-white px-5 py-[18px]">
        <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] bg-brand text-white"><Stethoscope size={24} /></span>
        <div className="flex-1">
          <h3 className="font-serif text-[17px] font-bold text-deep">Cas cliniques partagés</h3>
          <p className="max-w-[640px] text-[13px] text-slate">Soumettez un cas difficile au réseau et obtenez l'avis de vos confrères. Les cas sont anonymisés : aucun nom de propriétaire.</p>
        </div>
        {vm.canShare && <Button onClick={vm.openComposer}><Plus size={15} /> Partager un cas</Button>}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg2 border border-line bg-white px-4 py-3">
        <div className="relative min-w-[220px] flex-[2]">
          <Search size={15} className="pointer-events-none absolute left-3 top-[34px] text-faint" />
          <Input label="Recherche" className="pl-9" placeholder="Titre, espèce, catégorie ou description" value={vm.filters.q} onChange={(e) => vm.setFilter('q', e.target.value)} />
        </div>
        <Select wrapperClassName="min-w-[150px] flex-1" label="Espèce" value={vm.filters.espece} onChange={(e) => vm.setFilter('espece', e.target.value)}>
          <option value="">Toutes</option>{vm.especesCas.map((e) => <option key={e} value={e}>{e}</option>)}
        </Select>
        <Select wrapperClassName="min-w-[150px] flex-1" label="Statut" value={vm.filters.statut} onChange={(e) => vm.setFilter('statut', e.target.value as 'ouvert' | 'resolu' | '')}>
          <option value="">Tous</option><option value="ouvert">À résoudre</option><option value="resolu">Résolus</option>
        </Select>
        <Button variant="secondary" onClick={vm.resetFilters} disabled={!filtered}>Réinitialiser</Button>
      </div>

      <p className="text-xs text-slate" aria-live="polite">{vm.cas.length} cas</p>

      {vm.loading ? <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}</div>
        : vm.cas.length === 0 ? <div className="rounded-lg2 border border-line bg-white"><EmptyState title="Aucun cas" description={filtered ? 'Aucun cas ne correspond à vos critères.' : "Aucun cas n'a encore été partagé avec le réseau."} /></div>
        : (
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {vm.cas.map((c) => (
              <button key={c.id} type="button" onClick={() => vm.open(c.id)} className="flex flex-col gap-2.5 rounded-lg2 border border-line bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(11,42,48,.12)]">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={tone(c.categorie)}>{c.categorie}</Badge>
                  <span className="text-xs font-semibold text-slate">{c.espece}</span>
                  {c.resolu ? <Badge tone="green" className="ml-auto"><Check size={12} /> Résolu</Badge> : <span className="ml-auto text-xs font-bold text-amber">À résoudre</span>}
                </div>
                <h4 className="text-[14.5px] font-bold leading-snug">{c.titre}</h4>
                <p className="line-clamp-3 text-[13px] text-slate">{c.description}</p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-slate">
                  <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={12} className="shrink-0" /><span className="truncate">{c.auteur.nom}, {c.ville}</span></span>
                  <span className="shrink-0">{c.avis.length} avis, {c.nb_votes} vote{c.nb_votes > 1 ? 's' : ''}</span>
                </div>
              </button>
            ))}
          </div>
        )}

      <CasComposer open={vm.composing} especes={vm.especes} busy={vm.sharing} error={vm.formError} onClose={vm.closeComposer} onSubmit={vm.share} />
      <CasDetail cas={vm.selected} onClose={vm.closeDetail} canReply={vm.canShare} replying={vm.replying} resolving={vm.resolving} onVote={vm.toggleVote} onResolve={vm.resolve} onReply={vm.reply} />
    </div>
  );
}

function CasComposer({ open, especes, busy, error, onClose, onSubmit }: { open: boolean; especes: string[]; busy: boolean; error: string; onClose: () => void; onSubmit: (f: CasForm) => Promise<unknown> }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CasForm>({ resolver: zodResolver(casFormSchema), defaultValues: emptyCasForm() });
  useEffect(() => { if (open) reset(emptyCasForm(especes[0] ?? '')); }, [open, especes]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = handleSubmit(async (f) => { await onSubmit(f); });
  return (
    <Modal open={open} onClose={onClose} title="Partager un cas clinique" footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={busy} onClick={submit}>Partager avec le réseau</Button></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Input label="Titre du cas *" placeholder="Ex. Boiterie persistante sur bovin" error={errors.titre?.message} {...register('titre')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Espèce *" error={errors.espece?.message} {...register('espece')}>{especes.map((e) => <option key={e} value={e}>{e}</option>)}</Select>
          <Select label="Catégorie" {...register('categorie')}>{CAS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
        </div>
        <Textarea label="Description du cas, anonymisée *" rows={5} placeholder="Symptômes, examens, traitements déjà tentés. Ne mettez pas le nom du propriétaire." error={errors.description?.message} {...register('description')} />
        {error && <p role="alert" className="rounded-lg bg-danger-pale px-3 py-2 text-[13px] text-danger-text">{error}</p>}
        <p className="text-xs text-faint">Votre cas sera visible par tous les vétérinaires du réseau.</p>
      </form>
    </Modal>
  );
}

interface DetailProps { cas: Cas | null; onClose: () => void; canReply: boolean; replying: boolean; resolving: boolean; onVote: (id: string) => void; onResolve: (id: string) => void; onReply: (id: string, texte: string) => Promise<unknown> }

function CasDetail({ cas, onClose, canReply, replying, resolving, onVote, onResolve, onReply }: DetailProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ texte: string }>({ resolver: zodResolver(avisSchema), defaultValues: { texte: '' } });
  useEffect(() => { reset({ texte: '' }); }, [cas?.id, reset]);
  const submit = handleSubmit(async (f) => { if (cas) { await onReply(cas.id, f.texte); reset({ texte: '' }); } });
  return (
    <Modal open={!!cas} onClose={onClose} title={cas ? `Cas : ${cas.titre}` : 'Cas'}>
      {cas && (
        <div className="space-y-4 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone(cas.categorie)}>{cas.categorie}</Badge><Badge tone="green">{cas.espece}</Badge>{cas.resolu && <Badge tone="green"><Check size={12} /> Résolu</Badge>}
          </div>
          <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{cas.description}</p>
          <p className="text-xs text-slate">Soumis par <b>{cas.auteur.nom}</b>, {cas.clinique}, {cas.ville}, le {formatDate(cas.date)}</p>
          <div className="flex flex-wrap items-center gap-2">
            {canReply && <Button variant={cas.a_vote ? 'success' : 'secondary'} size="sm" aria-pressed={cas.a_vote} onClick={() => onVote(cas.id)}><ThumbsUp size={13} /> Utile ({cas.nb_votes})</Button>}
            {!cas.resolu && (cas.peut_cloturer
              ? <Button variant="secondary" size="sm" loading={resolving} onClick={() => onResolve(cas.id)}><Check size={13} /> Marquer résolu</Button>
              : <span className="text-xs text-faint">Seul l'auteur peut clôturer ce cas</span>)}
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[.8px] text-slate"><MessageSquare size={13} /> Avis des confrères ({cas.avis.length})</p>
            {cas.avis.length === 0 ? <p className="rounded-lg bg-mist px-4 py-3 text-slate">Aucun avis pour le moment. Soyez le premier à répondre.</p> : (
              <ul className="space-y-2">
                {cas.avis.map((a) => (
                  <li key={a.id} className="rounded-xl bg-mist px-3.5 py-2.5">
                    <p className="text-[12.5px]"><b>{a.auteur.nom}</b> <span className="text-slate">{a.ville ? `${a.ville}, ` : ''}{formatDate(a.date)}</span></p>
                    <p className="whitespace-pre-wrap">{a.texte}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {canReply && (
            <form onSubmit={submit} noValidate className="space-y-2">
              <Textarea aria-label="Votre avis" rows={3} placeholder="Ajouter votre avis" error={errors.texte?.message} {...register('texte')} />
              <Button type="submit" size="sm" loading={replying}>Publier mon avis</Button>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}
