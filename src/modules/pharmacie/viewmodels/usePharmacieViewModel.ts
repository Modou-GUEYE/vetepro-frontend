import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { DEFAULT_PAGE_SIZE } from '@/core/http/pagination';
import { useDebounce } from '@/core/utils/useDebounce';
import { facturationService } from '@/modules/facturation/services/facturation.service';
import { toast } from '@/shared/ui';
import { Article, ArticleForm, RestockForm, SaleForm } from '../models/pharmacie';
import { pharmacieService } from '../services/pharmacie.service';

export type PharmacyTab = 'inventaire' | 'mouvements' | 'ventes';
export type ArticleConfirm = { kind: 'deactivate' | 'delete'; article: Article } | null;

export function usePharmacieViewModel() {
  const queryClient = useQueryClient();
  const can = useCan();
  const tabs = [
    can('pharmacie', 'read') && { key: 'inventaire' as const, label: 'Inventaire' },
    can('stock', 'read') && { key: 'mouvements' as const, label: 'Mouvements' },
    can('ventes', 'read') && { key: 'ventes' as const, label: 'Ventes directes' },
  ].filter(Boolean) as { key: PharmacyTab; label: string }[];
  const [chosenTab, setTab] = useState<PharmacyTab | null>(null);
  const tab = chosenTab && tabs.some((t) => t.key === chosenTab) ? chosenTab : tabs[0]?.key;

  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState('');
  const [niveau, setNiveau] = useState('');
  const [page, setPage] = useState(1);
  const [movType, setMovType] = useState('');
  const [movArticle, setMovArticle] = useState('');
  const [movPage, setMovPage] = useState(1);
  const [salePage, setSalePage] = useState(1);
  const [formTarget, setFormTarget] = useState<'new' | Article | null>(null);
  const [restockOpen, setRestockOpen] = useState<{ articleId: string } | null>(null);
  const [saleOpen, setSaleOpen] = useState<{ articleId: string } | null>(null);
  const [confirm, setConfirm] = useState<ArticleConfirm>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const q = useDebounce(search);

  const list = useQuery({
    queryKey: ['pharmacy', 'articles', { q, categorie, niveau, page }],
    queryFn: () => pharmacieService.list({ page, pageSize: DEFAULT_PAGE_SIZE, q, categorie, niveau }),
    placeholderData: keepPreviousData, enabled: can('pharmacie', 'read'),
  });
  const movements = useQuery({
    queryKey: ['pharmacy', 'movements', { movType, movArticle, movPage }],
    queryFn: () => pharmacieService.movements({ page: movPage, pageSize: DEFAULT_PAGE_SIZE, type: movType, article: movArticle }),
    placeholderData: keepPreviousData, enabled: tab === 'mouvements',
  });
  const sales = useQuery({
    queryKey: ['sales', { salePage }],
    queryFn: () => facturationService.listSales({ page: salePage, pageSize: DEFAULT_PAGE_SIZE }),
    placeholderData: keepPreviousData, enabled: tab === 'ventes',
  });

  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['pharmacy'] }); void queryClient.invalidateQueries({ queryKey: ['sales'] }); void queryClient.invalidateQueries({ queryKey: ['invoices'] }); };

  const save = useMutation({
    mutationFn: async (f: ArticleForm) => {
      if (formTarget && formTarget !== 'new') { await pharmacieService.update(formTarget.id, f); return 'Article modifié'; }
      await pharmacieService.create(f); return 'Article ajouté';
    },
    onSuccess: (m) => { toast.success(m); setFormTarget(null); refresh(); },
  });
  const restock = useMutation({
    mutationFn: (f: RestockForm) => pharmacieService.restock(f.articleId, Number(f.quantite)),
    onSuccess: (_d, f) => { toast.success(`Stock mis à jour (+${f.quantite})`); setRestockOpen(null); refresh(); },
  });
  const toggle = useMutation({
    mutationFn: ({ a, active }: { a: Article; active: boolean }) => pharmacieService.setActive(a.id, active),
    onSuccess: (_d, { a, active }) => { toast.success(`« ${a.nom} » ${active ? 'activé' : 'désactivé'}`); setConfirm(null); refresh(); },
    onError: () => setConfirm(null),
  });
  const remove = useMutation({
    mutationFn: (a: Article) => pharmacieService.remove(a.id),
    onSuccess: (_d, a) => { toast.success(`« ${a.nom} » supprimé`); setConfirm(null); refresh(); },
    onError: () => setConfirm(null),
  });
  const sell = useMutation({
    mutationFn: (f: SaleForm) => pharmacieService.sell(f),
    onSuccess: (inv) => {
      toast.success(`Vente enregistrée, facture ${inv.numero}`);
      setSaleOpen(null); setReceiptId(inv.id); refresh();
    },
  });

  const filter = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return {
    tabs, tab, setTab,
    articles: list.data?.items ?? [], total: list.data?.total ?? 0, stats: list.data?.stats, categories: list.data?.categories ?? [], loading: list.isLoading,
    page, setPage, pageSize: DEFAULT_PAGE_SIZE,
    search, setSearch: filter(setSearch), categorie, setCategorie: filter(setCategorie), niveau, setNiveau: filter(setNiveau),
    canCreate: can('pharmacie', 'create'), canEdit: can('pharmacie', 'update'), canDelete: can('pharmacie', 'delete'), canRestock: can('stock', 'create'), canSell: can('ventes', 'create'),
    formTarget, openForm: setFormTarget, closeForm: () => setFormTarget(null), saving: save.isPending, submitForm: (f: ArticleForm) => save.mutate(f),
    restockOpen, openRestock: (articleId = '') => setRestockOpen({ articleId }), closeRestock: () => setRestockOpen(null), restocking: restock.isPending, submitRestock: (f: RestockForm) => restock.mutate(f),
    saleOpen, openSale: (articleId = '') => setSaleOpen({ articleId }), closeSale: () => setSaleOpen(null), selling: sell.isPending, submitSale: (f: SaleForm) => sell.mutate(f),
    receiptId, closeReceipt: () => setReceiptId(null), openReceipt: setReceiptId,
    confirm, askDeactivate: (article: Article) => setConfirm({ kind: 'deactivate', article }), askDelete: (article: Article) => setConfirm({ kind: 'delete', article }), cancelConfirm: () => setConfirm(null),
    activate: (a: Article) => toggle.mutate({ a, active: true }), confirming: toggle.isPending || remove.isPending,
    runConfirm: () => { if (!confirm) return; if (confirm.kind === 'delete') remove.mutate(confirm.article); else toggle.mutate({ a: confirm.article, active: false }); },
    movements: movements.data?.items ?? [], movTotal: movements.data?.total ?? 0, movLoading: movements.isLoading, movPage, setMovPage,
    movType, setMovType: (v: string) => { setMovType(v); setMovPage(1); }, movArticle, setMovArticle: (v: string) => { setMovArticle(v); setMovPage(1); },
    sales: sales.data?.items ?? [], salesTotal: sales.data?.total ?? 0, salesLoading: sales.isLoading, salePage, setSalePage,
  };
}
