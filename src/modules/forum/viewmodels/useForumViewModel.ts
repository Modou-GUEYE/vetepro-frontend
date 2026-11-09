import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useCan } from '@/core/auth/permissions';
import { useSessionStore } from '@/core/auth/session.store';
import { unprocessableMessage } from '@/core/http/errors';
import { toast } from '@/shared/ui';
import { ForumFilters, Post, PostForm, emptyFilters } from '../models/forum';
import { forumService } from '../services/forum.service';

const KEY = ['forum'];

/** Pastille du menu : nombre de publications non lues, relu chaque minute. */
export function useForumUnread() {
  const can = useCan();
  const q = useQuery({ queryKey: ['forum-unread'], queryFn: forumService.unread, refetchInterval: 60_000, staleTime: 15_000, enabled: can('reseau') });
  return q.data ?? 0;
}

export function useForumViewModel() {
  const can = useCan();
  const me = useSessionStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<ForumFilters>(emptyFilters());
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [composing, setComposing] = useState(false);
  const [reposting, setReposting] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState<Post | null>(null);
  const [highlight, setHighlight] = useState('');

  const list = useQuery({ queryKey: [...KEY, filters], queryFn: () => forumService.list(filters) });
  const people = useQuery({ queryKey: ['forum-people'], queryFn: forumService.people, staleTime: 5 * 60_000 });
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: KEY }); void queryClient.invalidateQueries({ queryKey: ['forum-unread'] }); };
  const onError = (e: unknown) => { const m = unprocessableMessage(e); if (m) toast.error(m); };

  const read = useMutation({ mutationFn: forumService.markRead, onSuccess: refresh });
  const readAll = useMutation({ mutationFn: forumService.markAllRead, onSuccess: refresh });
  const create = useMutation({
    mutationFn: forumService.create,
    onSuccess: (p) => { setComposing(false); setFilters(emptyFilters()); toast.success(p.mentions.length ? `Publication en ligne, ${p.mentions.length} personne${p.mentions.length > 1 ? 's' : ''} notifiée${p.mentions.length > 1 ? 's' : ''}` : 'Publication en ligne'); refresh(); },
    onError,
  });
  const react = useMutation({ mutationFn: (v: { id: string; type: 'like' | 'dislike' }) => forumService.react(v.id, v.type), onSuccess: refresh, onError });
  const comment = useMutation({ mutationFn: (v: { id: string; texte: string }) => forumService.comment(v.id, v.texte), onSuccess: () => { toast.success('Commentaire publié'); refresh(); }, onError });
  const repost = useMutation({ mutationFn: (v: { id: string; commentaire: string }) => forumService.repost(v.id, v.commentaire), onSuccess: () => { setReposting(null); toast.success('Publication repartagée'); refresh(); }, onError });
  const remove = useMutation({ mutationFn: (id: string) => forumService.remove(id), onSuccess: () => { setDeleting(null); toast.success('Publication supprimée'); refresh(); }, onError });
  const download = useMutation({ mutationFn: (v: { id: string; index: number; nom: string }) => forumService.download(v.id, v.index, v.nom), onError });

  /** Lien d'une notification (/forum?post=12) : le post s'ouvre, est marqué lu et mis en évidence. */
  const target = params.get('post');
  useEffect(() => {
    if (!target || !list.data) return;
    const p = list.data.items.find((x) => x.id === target);
    if (!p) return;
    setOpened((o) => ({ ...o, [target]: true }));
    setHighlight(target);
    if (!p.lu) read.mutate(target);
    setParams({}, { replace: true });
    setTimeout(() => document.getElementById(`post-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    const t = setTimeout(() => setHighlight(''), 2500);
    return () => clearTimeout(t);
  }, [target, list.data]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    posts: list.data?.items ?? [], counters: list.data?.compteurs, loading: list.isLoading, people: people.data ?? [], suggestions: (people.data ?? []).filter((p) => p.id !== me),
    filters, setFilter: <K extends keyof ForumFilters>(k: K, v: ForumFilters[K]) => setFilters((f) => ({ ...f, [k]: v })),
    canPost: can('reseau', 'create'), highlight,
    opened, toggleComments: (p: Post) => { setOpened((o) => ({ ...o, [p.id]: !o[p.id] })); if (!p.lu) read.mutate(p.id); },
    open: (p: Post) => { if (!p.lu) read.mutate(p.id); },
    markAllRead: () => readAll.mutate(),
    composing, openComposer: () => setComposing(true), closeComposer: () => setComposing(false),
    publish: (f: PostForm) => create.mutateAsync(f), publishing: create.isPending,
    react: (p: Post, type: 'like' | 'dislike') => react.mutate({ id: p.id, type }),
    comment: (p: Post, texte: string) => comment.mutateAsync({ id: p.id, texte }),
    reposting, askRepost: setReposting, doRepost: (commentaire: string) => reposting && repost.mutate({ id: reposting.id, commentaire }), repostingBusy: repost.isPending,
    deleting, askDelete: setDeleting, confirmDelete: () => deleting && remove.mutate(deleting.id), deletingBusy: remove.isPending,
    download: (p: Post, index: number) => download.mutate({ id: p.id, index, nom: p.pieces[index].nom }),
  };
}
