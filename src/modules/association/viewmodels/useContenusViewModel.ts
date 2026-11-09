import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Annonce, AnnonceForm, Temoignage, TemoignageForm } from '../models/association';
import { associationService } from '../services/association.service';
import { useAssoMutation } from './useAssoMutation';

export type ContenusTab = 'annonces' | 'temoignages' | 'textes';
const REFRESH = [['asso', 'contenus'], ['asso', 'journal']];

export function useContenusViewModel() {
  const [tab, setTab] = useState<ContenusTab>('annonces');
  const [annonceEdit, setAnnonceEdit] = useState<Annonce | 'new' | null>(null);
  const [annonceDelete, setAnnonceDelete] = useState<Annonce | null>(null);
  const [temoignageEdit, setTemoignageEdit] = useState<Temoignage | 'new' | null>(null);
  const [temoignageDelete, setTemoignageDelete] = useState<Temoignage | null>(null);
  const q = useQuery({ queryKey: ['asso', 'contenus'], queryFn: associationService.contenus });

  const saveAnnonce = useAssoMutation(({ id, f }: { id: string | null; f: AnnonceForm }) => associationService.saveAnnonce(id, f), { invalidate: REFRESH, success: 'Annonce enregistrée', onDone: () => setAnnonceEdit(null) });
  const togglePublish = useAssoMutation((a: Annonce) => associationService.saveAnnonce(a.id, { ...a, publie: !a.publie }), {
    invalidate: REFRESH, success: (a) => (a.publie ? 'Annonce publiée sur le portail' : 'Annonce retirée du portail'),
  });
  const deleteAnnonce = useAssoMutation(associationService.deleteAnnonce, { invalidate: REFRESH, success: 'Annonce supprimée', onDone: () => setAnnonceDelete(null) });
  const saveTemoignage = useAssoMutation(({ id, f }: { id: string | null; f: TemoignageForm }) => associationService.saveTemoignage(id, f), { invalidate: REFRESH, success: 'Témoignage enregistré', onDone: () => setTemoignageEdit(null) });
  const deleteTemoignage = useAssoMutation(associationService.deleteTemoignage, { invalidate: REFRESH, success: 'Témoignage supprimé', onDone: () => setTemoignageDelete(null) });
  const saveContenu = useAssoMutation(associationService.saveContenu, { invalidate: REFRESH, success: 'Textes du site enregistrés' });

  return {
    tab, setTab, data: q.data, loading: q.isLoading,
    annonceEdit, editAnnonce: setAnnonceEdit, saveAnnonce: saveAnnonce.mutate, savingAnnonce: saveAnnonce.isPending, togglePublish: togglePublish.mutate,
    annonceDelete, askDeleteAnnonce: setAnnonceDelete, deleteAnnonce: deleteAnnonce.mutate, deletingAnnonce: deleteAnnonce.isPending,
    temoignageEdit, editTemoignage: setTemoignageEdit, saveTemoignage: saveTemoignage.mutate, savingTemoignage: saveTemoignage.isPending,
    temoignageDelete, askDeleteTemoignage: setTemoignageDelete, deleteTemoignage: deleteTemoignage.mutate, deletingTemoignage: deleteTemoignage.isPending,
    saveContenu: saveContenu.mutate, savingContenu: saveContenu.isPending,
  };
}
export type ContenusVm = ReturnType<typeof useContenusViewModel>;
