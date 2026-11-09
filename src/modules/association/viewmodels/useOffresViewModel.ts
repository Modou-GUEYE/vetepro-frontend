import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { PlatformPack, PlatformPromo } from '../models/offres';
import { associationService } from '../services/association.service';
import { useAssoMutation } from './useAssoMutation';

export type OffresTab = 'offres' | 'essai' | 'promos' | 'historique';
const REFRESH = [['asso', 'packs'], ['asso', 'promotions'], ['asso', 'commercial-settings'], ['asso', 'commercial-history'], ['asso', 'journal'], ['asso', 'reseau']];

export function useOffresViewModel() {
  const [tab, setTab] = useState<OffresTab>('offres');
  const [packEdit, setPackEdit] = useState<PlatformPack | 'new' | null>(null);
  const [promoEdit, setPromoEdit] = useState<PlatformPromo | 'new' | null>(null);
  const [packDelete, setPackDelete] = useState<PlatformPack | null>(null);
  const [promoDelete, setPromoDelete] = useState<PlatformPromo | null>(null);
  const packs = useQuery({ queryKey: ['asso', 'packs'], queryFn: associationService.packs });
  const promos = useQuery({ queryKey: ['asso', 'promotions'], queryFn: associationService.promotions });
  const [histPage, setHistPage] = useState(1);
  const [histQ, setHistQ] = useState('');
  const history = useQuery({
    queryKey: ['asso', 'commercial-history', histPage, histQ], queryFn: () => associationService.commercialHistory({ page: histPage, q: histQ }),
    enabled: tab === 'historique', placeholderData: keepPreviousData,
  });
  const modules = useQuery({ queryKey: ['asso', 'platform-modules'], queryFn: associationService.modules });
  const settings = useQuery({ queryKey: ['asso', 'commercial-settings'], queryFn: associationService.commercialSettings });

  const savePack = useAssoMutation(({ id, f }: { id: string | null; f: Parameters<typeof associationService.savePack>[1] }) => associationService.savePack(id, f), {
    invalidate: REFRESH, success: 'Offre enregistrée', onDone: () => setPackEdit(null),
  });
  const deletePack = useAssoMutation(associationService.deletePack, { invalidate: REFRESH, success: 'Offre supprimée', onDone: () => setPackDelete(null) });
  const saveTrial = useAssoMutation(associationService.saveTrial, { invalidate: REFRESH, success: "Durée d'essai enregistrée" });
  const savePromo = useAssoMutation(({ id, f }: { id: string | null; f: Parameters<typeof associationService.savePromo>[1] }) => associationService.savePromo(id, f), {
    invalidate: REFRESH, success: 'Promotion enregistrée', onDone: () => setPromoEdit(null),
  });
  const deletePromo = useAssoMutation(associationService.deletePromo, { invalidate: REFRESH, success: 'Promotion supprimée', onDone: () => setPromoDelete(null) });

  return {
    tab, setTab, history: history.data, historyLoading: history.isLoading, histPage, setHistPage, histQ, searchHistory: (q: string) => { setHistQ(q); setHistPage(1); },
    modules: modules.data ?? [], packs: packs.data ?? [], promos: promos.data ?? [], trialDays: settings.data?.trial_days, loading: packs.isLoading || promos.isLoading || settings.isLoading,
    packEdit, editPack: setPackEdit, savePack: savePack.mutate, savingPack: savePack.isPending,
    packDelete, askDeletePack: setPackDelete, deletePack: deletePack.mutate, deletingPack: deletePack.isPending,
    saveTrial: saveTrial.mutate, savingTrial: saveTrial.isPending,
    promoEdit, editPromo: setPromoEdit, savePromo: savePromo.mutate, savingPromo: savePromo.isPending,
    promoDelete, askDeletePromo: setPromoDelete, deletePromo: deletePromo.mutate, deletingPromo: deletePromo.isPending,
  };
}
export type OffresVm = ReturnType<typeof useOffresViewModel>;
