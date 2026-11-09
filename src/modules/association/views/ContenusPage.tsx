import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatDate } from '@/core/utils/format';
import { Badge, Button, ConfirmDialog, Input, Modal, Panel, Select, Tabs, Textarea } from '@/shared/ui';
import {
  Annonce, AnnonceForm, ContenuForm, Temoignage, TemoignageForm, annonceFormSchema, contenuFormSchema, contenuToForm, emptyAnnonce, temoignageFormSchema,
} from '../models/association';
import { ContenusTab, ContenusVm, useContenusViewModel } from '../viewmodels/useContenusViewModel';
import { AssoColumn, AssoTable } from './AssoTable';

export function ContenusPage() {
  const vm = useContenusViewModel();
  const tabs: { key: ContenusTab; label: string }[] = [{ key: 'annonces', label: 'Annonces' }, { key: 'temoignages', label: 'Témoignages' }, { key: 'textes', label: 'Textes du site' }];
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-lg2 border border-line bg-white shadow-card"><Tabs<ContenusTab> items={tabs} value={vm.tab} onChange={vm.setTab} /></div>
      {vm.tab === 'annonces' && <AnnoncesPanel vm={vm} />}
      {vm.tab === 'temoignages' && <TemoignagesPanel vm={vm} />}
      {vm.tab === 'textes' && vm.data && <TextesPanel vm={vm} />}

      <AnnonceModal vm={vm} />
      <TemoignageModal vm={vm} />
      <ConfirmDialog open={!!vm.annonceDelete} danger title="Supprimer l'annonce" message={`L'annonce « ${vm.annonceDelete?.titre} » sera définitivement supprimée.`} confirmLabel="Supprimer" loading={vm.deletingAnnonce} onCancel={() => vm.askDeleteAnnonce(null)} onConfirm={() => vm.annonceDelete && vm.deleteAnnonce(vm.annonceDelete.id)} />
      <ConfirmDialog open={!!vm.temoignageDelete} danger title="Supprimer le témoignage" message={`Le témoignage de ${vm.temoignageDelete?.auteur} sera définitivement supprimé.`} confirmLabel="Supprimer" loading={vm.deletingTemoignage} onCancel={() => vm.askDeleteTemoignage(null)} onConfirm={() => vm.temoignageDelete && vm.deleteTemoignage(vm.temoignageDelete.id)} />
    </div>
  );
}

function AnnoncesPanel({ vm }: { vm: ContenusVm }) {
  const label = (k: string) => vm.data?.categories.find((c) => c.key === k)?.label ?? k;
  const columns: AssoColumn<Annonce>[] = [
    { key: 'titre', header: 'Annonce', render: (a) => <div className="max-w-[420px]"><b>{a.titre}</b><div className="truncate text-xs text-slate">{a.resume}</div></div> },
    { key: 'cat', header: 'Catégorie', render: (a) => <Badge tone="blue">{label(a.categorie)}</Badge> },
    { key: 'date', header: 'Date', className: 'whitespace-nowrap', render: (a) => formatDate(a.date) },
    { key: 'zone', header: 'Zone ou public', render: (a) => a.zone },
    { key: 'pub', header: 'Statut', render: (a) => <Badge tone={a.publie ? 'green' : 'slate'}>{a.publie ? 'Publiée' : 'Retirée'}</Badge> },
    { key: 'act', header: '', className: 'whitespace-nowrap', render: (a) => (
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="secondary" onClick={() => vm.togglePublish(a)}>{a.publie ? <><EyeOff size={13} /> Retirer</> : <><Eye size={13} /> Publier</>}</Button>
        <Button size="sm" variant="secondary" aria-label={`Modifier ${a.titre}`} onClick={() => vm.editAnnonce(a)}><Pencil size={13} /></Button>
        <Button size="sm" variant="danger" aria-label={`Supprimer ${a.titre}`} onClick={() => vm.askDeleteAnnonce(a)}><Trash2 size={13} /></Button>
      </div>
    ) },
  ];
  return (
    <Panel title="Annonces et informations" count={`${vm.data?.annonces.length ?? 0} annonces`} actions={<Button size="sm" onClick={() => vm.editAnnonce('new')}><Plus size={14} /> Nouvelle annonce</Button>}>
      <AssoTable columns={columns} rows={vm.data?.annonces ?? []} rowKey={(a) => a.id} loading={vm.loading} emptyTitle="Aucune annonce" />
    </Panel>
  );
}

function AnnonceModal({ vm }: { vm: ContenusVm }) {
  const open = vm.annonceEdit;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AnnonceForm>({ resolver: zodResolver(annonceFormSchema), defaultValues: emptyAnnonce() });
  useEffect(() => { if (open) reset(open === 'new' ? emptyAnnonce() : { categorie: open.categorie, titre: open.titre, resume: open.resume, texte: open.texte, zone: open.zone, date: open.date, publie: open.publie }); }, [open, reset]);
  const submit = (f: AnnonceForm) => vm.saveAnnonce({ id: open && open !== 'new' ? open.id : null, f });
  return (
    <Modal open={!!open} onClose={() => vm.editAnnonce(null)} size="lg" title={open === 'new' ? 'Nouvelle annonce' : "Modifier l'annonce"}
      footer={<><Button variant="secondary" onClick={() => vm.editAnnonce(null)}>Annuler</Button><Button loading={vm.savingAnnonce} onClick={handleSubmit(submit)}>Enregistrer</Button></>}>
      <form onSubmit={handleSubmit(submit)} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Catégorie *" error={errors.categorie?.message} {...register('categorie')}>{(vm.data?.categories ?? []).map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</Select>
        <Input label="Date de publication *" type="date" error={errors.date?.message} {...register('date')} />
        <Input wrapperClassName="sm:col-span-2" label="Titre *" error={errors.titre?.message} {...register('titre')} />
        <Input wrapperClassName="sm:col-span-2" label="Zone ou public concerné" placeholder="Petits ruminants" {...register('zone')} />
        <Textarea wrapperClassName="sm:col-span-2" label="Résumé *" rows={2} error={errors.resume?.message} {...register('resume')} />
        <Textarea wrapperClassName="sm:col-span-2" label="Texte complet" rows={5} hint="Affiché par « Lire l'annonce ». Vide : le résumé est repris." {...register('texte')} />
        <label className="flex items-center gap-2 text-[13px] font-medium"><input type="checkbox" className="accent-brand" {...register('publie')} /> Publier sur le portail</label>
      </form>
    </Modal>
  );
}

function TemoignagesPanel({ vm }: { vm: ContenusVm }) {
  const columns: AssoColumn<Temoignage>[] = [
    { key: 'auteur', header: 'Auteur', render: (t) => <div><b>{t.auteur}</b><div className="text-xs text-slate">{t.role}</div></div> },
    { key: 'texte', header: 'Témoignage', render: (t) => <p className="max-w-[520px]">{t.texte}</p> },
    { key: 'pub', header: 'Statut', render: (t) => <Badge tone={t.publie ? 'green' : 'slate'}>{t.publie ? 'Publié' : 'Masqué'}</Badge> },
    { key: 'act', header: '', className: 'whitespace-nowrap', render: (t) => (
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="secondary" aria-label={`Modifier ${t.auteur}`} onClick={() => vm.editTemoignage(t)}><Pencil size={13} /></Button>
        <Button size="sm" variant="danger" aria-label={`Supprimer ${t.auteur}`} onClick={() => vm.askDeleteTemoignage(t)}><Trash2 size={13} /></Button>
      </div>
    ) },
  ];
  return (
    <Panel title="Témoignages des membres" actions={<Button size="sm" onClick={() => vm.editTemoignage('new')}><Plus size={14} /> Nouveau témoignage</Button>}>
      <AssoTable columns={columns} rows={vm.data?.temoignages ?? []} rowKey={(t) => t.id} loading={vm.loading} emptyTitle="Aucun témoignage" />
    </Panel>
  );
}

function TemoignageModal({ vm }: { vm: ContenusVm }) {
  const open = vm.temoignageEdit;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TemoignageForm>({ resolver: zodResolver(temoignageFormSchema), defaultValues: { auteur: '', role: '', texte: '', publie: true } });
  useEffect(() => { if (open) reset(open === 'new' ? { auteur: '', role: '', texte: '', publie: true } : { auteur: open.auteur, role: open.role, texte: open.texte, publie: open.publie }); }, [open, reset]);
  const submit = (f: TemoignageForm) => vm.saveTemoignage({ id: open && open !== 'new' ? open.id : null, f });
  return (
    <Modal open={!!open} onClose={() => vm.editTemoignage(null)} title={open === 'new' ? 'Nouveau témoignage' : 'Modifier le témoignage'}
      footer={<><Button variant="secondary" onClick={() => vm.editTemoignage(null)}>Annuler</Button><Button loading={vm.savingTemoignage} onClick={handleSubmit(submit)}>Enregistrer</Button></>}>
      <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
        <Input label="Auteur *" placeholder="Dr Aïssatou Mbaye" error={errors.auteur?.message} {...register('auteur')} />
        <Input label="Fonction et lieu" placeholder="Cabinet membre, Dakar" {...register('role')} />
        <Textarea label="Témoignage *" rows={4} error={errors.texte?.message} {...register('texte')} />
        <label className="flex items-center gap-2 text-[13px] font-medium"><input type="checkbox" className="accent-brand" {...register('publie')} /> Publier sur le portail</label>
      </form>
    </Modal>
  );
}

function TextesPanel({ vm }: { vm: ContenusVm }) {
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<ContenuForm>({ resolver: zodResolver(contenuFormSchema), defaultValues: contenuToForm(vm.data!.contenu) });
  const { fields, append, remove } = useFieldArray({ control, name: 'pourquoi' });
  useEffect(() => { reset(contenuToForm(vm.data!.contenu)); }, [vm.data, reset]);
  return (
    <form onSubmit={handleSubmit((f) => vm.saveContenu(f))} noValidate className="space-y-5">
      <Panel title="Bandeau d'accueil">
        <div className="space-y-4 p-5">
          <Input label="Titre *" error={errors.titre?.message} {...register('titre')} />
          <Textarea label="Message d'accueil *" rows={3} error={errors.sousTitre?.message} {...register('sousTitre')} />
        </div>
      </Panel>
      <Panel title="Contact">
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
          <Input label="Téléphone" {...register('telephone')} />
          <Input label="E-mail *" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Adresse" {...register('adresse')} />
        </div>
      </Panel>
      <Panel title="Pourquoi adhérer" actions={<Button type="button" size="sm" variant="secondary" onClick={() => append({ titre: '', texte: '' })}><Plus size={14} /> Ajouter un bloc</Button>}>
        <div className="space-y-4 p-5">
          {fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-1 gap-3 rounded-lg border border-line p-4 sm:grid-cols-[1fr_2fr_auto]">
              <Input label="Titre" {...register(`pourquoi.${i}.titre`)} />
              <Input label="Texte" {...register(`pourquoi.${i}.texte`)} />
              <Button type="button" variant="danger" size="sm" className="self-end" aria-label={`Supprimer le bloc ${i + 1}`} onClick={() => remove(i)}><Trash2 size={13} /></Button>
            </div>
          ))}
          {fields.length === 0 && <p className="text-[13px] text-slate">Aucun bloc : la section ne s'affichera pas sur le portail.</p>}
        </div>
      </Panel>
      <div className="flex justify-end"><Button type="submit" loading={vm.savingContenu}>Enregistrer les textes</Button></div>
    </form>
  );
}
