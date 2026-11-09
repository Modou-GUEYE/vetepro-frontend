import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Modal, Select } from '@/shared/ui';
import { Article, ArticleForm, articleFormSchema, emptyArticleForm } from '../models/pharmacie';

interface Props { target: 'new' | Article | null; categories: string[]; saving: boolean; onSubmit: (f: ArticleForm) => void; onClose: () => void }

export function ArticleFormModal({ target, categories, saving, onSubmit, onClose }: Props) {
  const editing = target && target !== 'new' ? target : null;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ArticleForm>({ resolver: zodResolver(articleFormSchema), defaultValues: emptyArticleForm });
  useEffect(() => {
    if (!target) return;
    reset(editing ? { nom: editing.nom, categorie: editing.categorie, unite: editing.unite, quantite: String(editing.quantite), seuil: String(editing.seuil), peremption: editing.peremption ?? '', prix: String(editing.prix) } : emptyArticleForm);
  }, [target, editing, reset]);

  return (
    <Modal open={!!target} onClose={onClose} title={editing ? `Modifier ${editing.code}` : 'Nouveau médicament'}
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={saving} onClick={handleSubmit(onSubmit)}>{editing ? 'Enregistrer' : 'Ajouter'}</Button></>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input wrapperClassName="sm:col-span-2" label="Nom de l'article *" placeholder="Amoxicilline vét. 250mg" autoFocus error={errors.nom?.message} {...register('nom')} />
        <Select label="Catégorie *" error={errors.categorie?.message} {...register('categorie')}>
          <option value="">Choisir…</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input label="Unité *" placeholder="Comprimés, flacon 250ml…" error={errors.unite?.message} {...register('unite')} />
        <Input label="Quantité" inputMode="numeric" disabled={!!editing} hint={editing ? 'La quantité change par réapprovisionnement ou sortie de stock.' : undefined} error={errors.quantite?.message} {...register('quantite')} />
        <Input label="Seuil d'alerte *" inputMode="numeric" error={errors.seuil?.message} {...register('seuil')} />
        <Input label="Date de péremption" type="date" {...register('peremption')} />
        <Input label="Prix unitaire (FCFA) *" inputMode="numeric" error={errors.prix?.message} {...register('prix')} />
        {!editing && <p className="rounded-lg bg-mist px-3 py-2 text-xs text-slate sm:col-span-2">Le code article est généré automatiquement. Un article sous son seuil d'alerte déclenche une alerte de stock.</p>}
      </form>
    </Modal>
  );
}
