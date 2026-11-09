import { useState } from 'react';
import clsx from 'clsx';
import { AtSign, FileText, Image as ImageIcon, MessageCircle, Paperclip, Repeat2, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { formatFileSize } from '@/core/http/download';
import { Badge, Button } from '@/shared/ui';
import { since } from '@/modules/notifications/models/notification';
import { Person, Post, PostOrigin, initials, segments } from '../models/forum';
import { MentionTextarea } from './MentionTextarea';

export const Avatar = ({ nom, size = 38 }: { nom: string; size?: number }) => (
  <span style={{ width: size, height: size, fontSize: size * 0.34 }} className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2fc3bd] to-brand font-bold text-white">{initials(nom)}</span>
);

/** Texte d'un post ou d'un commentaire, avec les « @Prénom Nom » mis en évidence. */
export function RichText({ texte, people }: { texte: string; people: Person[] }) {
  return <>{segments(texte, people).map((s, i) => s.mention ? <span key={i} className="rounded bg-info-pale px-1 font-semibold text-info-text">{s.texte}</span> : <span key={i}>{s.texte}</span>)}</>;
}

function Header({ p, unread, onDelete }: { p: Post | PostOrigin; unread?: boolean; onDelete?: () => void }) {
  return (
    <div className="flex items-start gap-3">
      <Avatar nom={p.auteur.nom} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5"><b className="text-[14px]">{p.auteur.nom}</b><Badge tone="slate">{p.auteur.profil}</Badge></p>
        <p className="text-xs text-slate">{p.auteur.cabinet ? `${p.auteur.cabinet}, ` : ''}{since(p.date)}</p>
      </div>
      {unread && <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Nouveau</span>}
      <Badge tone="blue">{p.categorie}</Badge>
      {onDelete && <button type="button" onClick={onDelete} aria-label="Supprimer la publication" title="Supprimer" className="rounded-lg p-1.5 text-slate transition hover:bg-danger-pale hover:text-danger"><Trash2 size={15} /></button>}
    </div>
  );
}

function Body({ p, people, onDownload }: { p: Post | PostOrigin; people: Person[]; onDownload: (index: number) => void }) {
  return (
    <>
      {p.titre && <h4 className="mt-3 text-[15.5px] font-bold">{p.titre}</h4>}
      {p.contenu && <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed"><RichText texte={p.contenu} people={people} /></p>}
      {p.pieces.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {p.pieces.map((f, i) => (
            <li key={`${f.nom}-${i}`}>
              <button type="button" onClick={() => onDownload(i)} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-mist px-2.5 py-1.5 text-xs font-medium hover:bg-white" title={`Télécharger ${f.nom}`}>
                {f.type === 'image' ? <ImageIcon size={13} /> : f.type === 'pdf' ? <FileText size={13} /> : <Paperclip size={13} />}
                {f.nom} <span className="text-faint">{formatFileSize(f.taille)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

interface Props {
  post: Post; people: Person[]; suggestions: Person[]; highlighted: boolean; commentsOpen: boolean; canReact: boolean;
  onOpen: () => void; onToggleComments: () => void; onReact: (t: 'like' | 'dislike') => void; onRepost: () => void; onDelete: () => void;
  onComment: (texte: string) => Promise<unknown>; onDownload: (index: number) => void;
}

export function PostCard({ post: p, people, suggestions, highlighted, commentsOpen, canReact, onOpen, onToggleComments, onReact, onRepost, onDelete, onComment, onDownload }: Props) {
  const [texte, setTexte] = useState('');
  const [sending, setSending] = useState(false);
  const send = async () => { if (!texte.trim() || sending) return; setSending(true); try { await onComment(texte); setTexte(''); } finally { setSending(false); } };
  const btn = 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-slate transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-50';
  const isRepost = !!p.repartage_de;

  return (
    <article id={`post-${p.id}`} onClick={onOpen} className={clsx('rounded-lg2 border bg-white p-4 shadow-card transition', p.lu ? 'border-line' : 'border-brand/40 bg-brand-pale/20', highlighted && 'ring-2 ring-brand')}>
      <Header p={p} unread={!p.lu} onDelete={p.supprimable ? onDelete : undefined} />
      {isRepost ? (
        <>
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate"><Repeat2 size={14} /> {p.auteur.nom} a repartagé</p>
          {p.contenu && <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed"><RichText texte={p.contenu} people={people} /></p>}
          <div className="mt-3 rounded-xl border border-line bg-mist/60 p-3.5">
            {p.origine ? (<><Header p={p.origine} /><Body p={p.origine} people={people} onDownload={onDownload} /></>) : <span className="text-[13px] text-slate">La publication d'origine a été supprimée.</span>}
          </div>
        </>
      ) : <Body p={p} people={people} onDownload={onDownload} />}

      {!isRepost && (
        <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-[#eef2f5] pt-2.5" onClick={(e) => e.stopPropagation()}>
          <button type="button" disabled={!canReact} onClick={() => onReact('like')} aria-pressed={p.aime} className={clsx(btn, p.aime && 'bg-brand-pale text-brand-text')}><ThumbsUp size={14} /> J'aime {p.nb_likes}</button>
          <button type="button" disabled={!canReact} onClick={() => onReact('dislike')} aria-pressed={p.naime_pas} aria-label={`Je n'aime pas, ${p.nb_dislikes}`} className={clsx(btn, p.naime_pas && 'bg-danger-pale text-danger')}><ThumbsDown size={14} /> {p.nb_dislikes}</button>
          <button type="button" onClick={onToggleComments} aria-expanded={commentsOpen} className={btn}><MessageCircle size={14} /> Commenter {p.commentaires.length}</button>
          <button type="button" disabled={!canReact || p.repartage} onClick={onRepost} className={clsx(btn, p.repartage && 'bg-brand-pale text-brand-text')}><Repeat2 size={14} /> {p.repartage ? 'Repartagé' : 'Repartager'} {p.nb_repartages}</button>
          {p.mentions.length > 0 && <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate"><AtSign size={12} /> {p.mentions.length} personne{p.mentions.length > 1 ? 's' : ''} mentionnée{p.mentions.length > 1 ? 's' : ''}</span>}
        </div>
      )}

      {!isRepost && commentsOpen && (
        <div className="mt-3 space-y-3 border-t border-[#eef2f5] pt-3" onClick={(e) => e.stopPropagation()}>
          {p.commentaires.length === 0 && <p className="text-[13px] text-slate">Aucun commentaire pour le moment.</p>}
          {p.commentaires.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar nom={c.auteur.nom} size={30} />
              <div className="min-w-0 flex-1 rounded-xl bg-mist px-3 py-2">
                <p className="text-[12.5px]"><b>{c.auteur.nom}</b> <span className="text-slate">{c.auteur.profil}, {since(c.date)}</span></p>
                <p className="whitespace-pre-wrap text-[13px]"><RichText texte={c.texte} people={people} /></p>
              </div>
            </div>
          ))}
          {canReact && (
            <div className="flex items-start gap-2">
              <div className="flex-1"><MentionTextarea id={`comment-${p.id}`} rows={2} value={texte} onChange={setTexte} people={suggestions} onSubmit={() => void send()} placeholder="Votre commentaire, @ pour mentionner" /></div>
              <Button size="sm" loading={sending} disabled={!texte.trim()} onClick={() => void send()}>Publier</Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
