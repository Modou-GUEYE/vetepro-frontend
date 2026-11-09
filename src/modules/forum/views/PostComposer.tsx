import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Paperclip, X } from 'lucide-react';
import { formatFileSize } from '@/core/http/download';
import { Button, Input, Modal, Select } from '@/shared/ui';
import { CATEGORIES, FICHIERS_MAX, FICHIER_MAX_OCTETS, Person, PostForm, emptyPostForm, mentionedIn, postFormSchema } from '../models/forum';
import { MentionTextarea } from './MentionTextarea';

interface Props { open: boolean; people: Person[]; busy: boolean; onClose: () => void; onSubmit: (f: PostForm) => Promise<unknown> }

/** Nouvelle publication : titre, catégorie, description avec mentions, fichiers joints. */
export function PostComposer({ open, people, busy, onClose, onSubmit }: Props) {
  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<PostForm>({ resolver: zodResolver(postFormSchema), defaultValues: emptyPostForm() });
  const fileRef = useRef<HTMLInputElement>(null);
  const contenu = watch('contenu');
  const fichiers = watch('fichiers');
  const mentioned = mentionedIn(contenu, people);
  const close = () => { reset(emptyPostForm()); onClose(); };
  const submit = handleSubmit(async (f) => { await onSubmit(f); reset(emptyPostForm()); });
  const addFiles = (list: FileList | null) => { if (list) setValue('fichiers', [...fichiers, ...Array.from(list)].slice(0, FICHIERS_MAX + 1), { shouldValidate: true }); if (fileRef.current) fileRef.current.value = ''; };

  return (
    <Modal open={open} onClose={close} title="Nouvelle publication" footer={<><Button variant="secondary" onClick={close}>Annuler</Button><Button loading={busy} onClick={submit}>Publier</Button></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Input label="Titre *" placeholder="Sujet de votre publication" error={errors.titre?.message} {...register('titre')} />
        <Select label="Catégorie" {...register('categorie')}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
        <Controller control={control} name="contenu" render={({ field }) => (
          <MentionTextarea label="Description *" rows={5} value={field.value} onChange={field.onChange} people={people} error={errors.contenu?.message} onSubmit={() => void submit()}
            placeholder="Partagez une information, un cas, une question. Tapez @ pour mentionner un confrère." />
        )} />
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.7px] text-slate">Personnes mentionnées (notifiées sur la plateforme)</p>
          <div className="flex flex-wrap gap-1.5" aria-live="polite">
            {mentioned.length === 0 ? <span className="text-xs text-faint">Aucune, utilisez @ dans la description</span>
              : mentioned.map((p) => <span key={p.id} className="rounded-full bg-info-pale px-2.5 py-0.5 text-xs font-semibold text-info-text">@{p.nom}</span>)}
          </div>
        </div>
        <div>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} aria-label="Joindre des fichiers" />
          <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}><Paperclip size={14} /> Joindre des fichiers</Button>
          <span className="ml-2 text-xs text-faint">{FICHIERS_MAX} fichiers au plus, {formatFileSize(FICHIER_MAX_OCTETS)} chacun</span>
          {fichiers.length > 0 && (
            <ul className="mt-2 space-y-1">
              {fichiers.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-lg bg-mist px-3 py-1.5 text-[12.5px]">
                  <span className="truncate"><Paperclip size={12} className="mr-1.5 inline" />{f.name} <span className="text-faint">{formatFileSize(f.size)}</span></span>
                  <button type="button" aria-label={`Retirer ${f.name}`} onClick={() => setValue('fichiers', fichiers.filter((_, k) => k !== i), { shouldValidate: true })} className="rounded p-1 text-slate hover:bg-white"><X size={13} /></button>
                </li>
              ))}
            </ul>
          )}
          {errors.fichiers && <p className="mt-1 text-xs text-danger">{(errors.fichiers as { message?: string }).message}</p>}
        </div>
      </form>
    </Modal>
  );
}
