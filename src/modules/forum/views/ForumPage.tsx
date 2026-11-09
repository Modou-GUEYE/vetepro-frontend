import { useState } from 'react';
import clsx from 'clsx';
import { MessageSquare, Plus, Search } from 'lucide-react';
import { Button, ConfirmDialog, EmptyState, Input, KpiCard, Modal, Skeleton } from '@/shared/ui';
import { CATEGORIES, FILTRES, FILTRE_LABEL, Filtre, Person, Post } from '../models/forum';
import { useForumViewModel } from '../viewmodels/useForumViewModel';
import { MentionTextarea } from './MentionTextarea';
import { PostCard } from './PostCard';
import { PostComposer } from './PostComposer';

/** Forum du réseau : publications partagées entre confrères, avec mentions, commentaires, réactions et repartages. */
export function ForumPage() {
  const vm = useForumViewModel();
  const c = vm.counters;
  const filterCount = (f: Filtre) => c?.[f] ?? 0;
  const filtered = vm.filters.filtre !== 'toutes' || vm.filters.categorie !== '' || vm.filters.q !== '';
  const item = 'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition hover:bg-mist';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3.5 rounded-lg2 border border-line bg-gradient-to-r from-brand-pale to-white px-5 py-[18px]">
        <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] bg-brand text-white"><MessageSquare size={24} /></span>
        <div className="flex-1">
          <h3 className="font-serif text-[17px] font-bold text-deep">Forum vétérinaire</h3>
          <p className="max-w-[640px] text-[13px] text-slate">Partagez une information, réagissez aux publications et collaborez entre confrères. Mentionnez une personne avec @ pour la notifier.</p>
        </div>
        {vm.canPost && <Button onClick={vm.openComposer}><Plus size={15} /> Nouvelle publication</Button>}
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <KpiCard value={filterCount('toutes')} label="Publications" />
        <KpiCard value={filterCount('non_lues')} label="Non lues" tone="amber" />
        <KpiCard value={filterCount('mentions')} label="Mes mentions" tone="info" />
        <KpiCard value={filterCount('miennes')} label="Mes publications" tone="violet" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="h-fit space-y-4 rounded-lg2 border border-line bg-white p-3 shadow-card">
          <nav aria-label="Filtres du forum" className="space-y-0.5">
            {FILTRES.map((f) => (
              <button key={f} type="button" onClick={() => vm.setFilter('filtre', f)} aria-current={vm.filters.filtre === f} className={clsx(item, vm.filters.filtre === f ? 'bg-brand-pale font-semibold text-brand-text' : 'text-ink')}>
                <span>{FILTRE_LABEL[f]}</span>
                <span className={clsx('rounded-full px-2 text-[11px] font-bold', f === 'non_lues' && filterCount(f) > 0 ? 'bg-danger text-white' : 'bg-slate-soft text-slate-text')}>{filterCount(f)}</span>
              </button>
            ))}
          </nav>
          <div>
            <p className="mb-1 px-3 text-[10.5px] font-bold uppercase tracking-[1.2px] text-slate">Catégories</p>
            <nav aria-label="Catégories" className="space-y-0.5">
              {CATEGORIES.map((k) => (
                <button key={k} type="button" onClick={() => vm.setFilter('categorie', vm.filters.categorie === k ? '' : k)} aria-current={vm.filters.categorie === k} className={clsx(item, vm.filters.categorie === k ? 'bg-brand-pale font-semibold text-brand-text' : 'text-ink')}>
                  <span>{k}</span><span className="text-xs text-slate">{c?.categories[k] ?? 0}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-3.5">
          <div className="flex flex-wrap items-end gap-3 rounded-lg2 border border-line bg-white px-4 py-3">
            <div className="relative min-w-[200px] flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-[34px] text-faint" />
              <Input label="Recherche" className="pl-9" placeholder="Titre, texte, auteur ou catégorie" value={vm.filters.q} onChange={(e) => vm.setFilter('q', e.target.value)} />
            </div>
            <div role="group" aria-label="Tri" className="flex overflow-hidden rounded-lg border border-line text-[12.5px] font-semibold">
              {(['recentes', 'populaires'] as const).map((t) => <button key={t} type="button" aria-pressed={vm.filters.tri === t} onClick={() => vm.setFilter('tri', t)} className={clsx('px-3 py-2', vm.filters.tri === t ? 'bg-brand text-white' : 'bg-white text-slate hover:bg-mist')}>{t === 'recentes' ? 'Récentes' : 'Populaires'}</button>)}
            </div>
            <Button variant="secondary" onClick={vm.markAllRead} disabled={filterCount('non_lues') === 0}>Tout marquer comme lu</Button>
            {filtered && <Button variant="ghost" onClick={() => { vm.setFilter('filtre', 'toutes'); vm.setFilter('categorie', ''); vm.setFilter('q', ''); }}>Réinitialiser</Button>}
          </div>

          <p className="text-xs text-slate" aria-live="polite">{vm.posts.length} publication{vm.posts.length > 1 ? 's' : ''}</p>

          {vm.loading ? <div className="space-y-3.5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)}</div>
            : vm.posts.length === 0 ? (
              <div className="rounded-lg2 border border-line bg-white"><EmptyState title="Aucune publication" description={filtered ? 'Aucune publication ne correspond à vos critères.' : 'Soyez le premier à publier sur le forum.'} /></div>
            ) : vm.posts.map((p) => (
              <PostCard key={p.id} post={p} people={vm.people} suggestions={vm.suggestions} highlighted={vm.highlight === p.id} commentsOpen={!!vm.opened[p.id]} canReact={vm.canPost}
                onOpen={() => vm.open(p)} onToggleComments={() => vm.toggleComments(p)} onReact={(t) => vm.react(p, t)} onRepost={() => vm.askRepost(p)} onDelete={() => vm.askDelete(p)}
                onComment={(texte) => vm.comment(p, texte)} onDownload={(i) => vm.download(p, i)} />
            ))}
        </div>
      </div>

      <PostComposer open={vm.composing} people={vm.suggestions} busy={vm.publishing} onClose={vm.closeComposer} onSubmit={vm.publish} />
      <RepostDialog post={vm.reposting} people={vm.suggestions} busy={vm.repostingBusy} onClose={() => vm.askRepost(null)} onConfirm={vm.doRepost} />
      <ConfirmDialog open={!!vm.deleting} danger title="Supprimer la publication" message="La publication, ses commentaires et ses repartages seront retirés du forum." confirmLabel="Supprimer" loading={vm.deletingBusy} onConfirm={vm.confirmDelete} onCancel={() => vm.askDelete(null)} />
    </div>
  );
}

function RepostDialog({ post, people, busy, onClose, onConfirm }: { post: Post | null; people: Person[]; busy: boolean; onClose: () => void; onConfirm: (commentaire: string) => void }) {
  const [texte, setTexte] = useState('');
  const close = () => { setTexte(''); onClose(); };
  return (
    <Modal open={!!post} onClose={close} title="Repartager la publication" footer={<><Button variant="secondary" onClick={close}>Annuler</Button><Button loading={busy} onClick={() => onConfirm(texte)}>Repartager</Button></>}>
      {post && (
        <div className="space-y-4">
          <MentionTextarea label="Commentaire (facultatif)" rows={3} value={texte} onChange={setTexte} people={people} placeholder="Pourquoi partagez-vous cette publication ?" />
          <div className="rounded-xl border border-line bg-mist/60 p-3.5 text-[13px]">
            <p><b>{post.auteur.nom}</b> <span className="text-slate">{post.auteur.profil}</span></p>
            {post.titre && <p className="mt-1 font-semibold">{post.titre}</p>}
            <p className="mt-1 line-clamp-3 text-slate">{post.contenu}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
