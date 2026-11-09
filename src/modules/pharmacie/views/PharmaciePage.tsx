import clsx from 'clsx';
import { ArrowDownToLine, Eye, Pencil, Plus, Power, PowerOff, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { formatDate, formatDateTime, formatFcfa } from '@/core/utils/format';
import { Badge, Button, Column, ConfirmDialog, Input, KpiCard, Panel, Select, Table, Tabs } from '@/shared/ui';
import { InvoiceDetailModal } from '@/modules/facturation/views/InvoiceDetailModal';
import { STATUS_LABEL, STATUS_TONE } from '@/modules/facturation/models/facture';
import { Article, LEVEL_LABEL, LEVEL_TONE, MOVEMENT_LABEL, Movement, expiryAlert, levelRatio } from '../models/pharmacie';
import { useArticleChoices } from '../viewmodels/useArticleChoices';
import { usePharmacieViewModel } from '../viewmodels/usePharmacieViewModel';
import { ArticleFormModal } from './ArticleFormModal';
import { RestockModal } from './RestockModal';
import { SaleModal } from './SaleModal';

const BAR = { ok: 'bg-brand', faible: 'bg-amber', rupture: 'bg-danger' } as const;
const MOVEMENT_TYPES = ['entree', 'consultation', 'vente', 'hospitalisation', 'ajustement'] as const;

export function PharmaciePage() {
  const vm = usePharmacieViewModel();
  const articleChoices = useArticleChoices();

  const columns: Column<Article>[] = [
    {
      key: 'nom', header: 'Médicament',
      render: (a) => (
        <div>
          <div className={clsx('font-semibold', !a.actif && 'text-faint line-through')}>{a.nom}</div>
          <div className="text-xs text-faint">{a.unite}, <span className="font-mono">{a.code}</span></div>
        </div>
      ),
    },
    { key: 'categorie', header: 'Catégorie', render: (a) => <Badge tone="green">{a.categorie}</Badge> },
    { key: 'stock', header: 'Stock', className: 'whitespace-nowrap', render: (a) => <div><div className="font-bold tabular-nums">{a.quantite}</div><div className="text-xs text-faint">seuil {a.seuil}</div></div> },
    { key: 'prix', header: 'Prix unit.', className: 'whitespace-nowrap font-semibold text-brand-text tabular-nums', render: (a) => formatFcfa(a.prix) },
    {
      key: 'perempt', header: 'Péremption', className: 'whitespace-nowrap',
      render: (a) => { const alert = expiryAlert(a.joursAvantPeremption); return a.peremption ? <div><div className="text-[13px]">{formatDate(a.peremption)}</div>{alert && <Badge tone={alert.tone}>{alert.label}</Badge>}</div> : <span className="text-faint">—</span>; },
    },
    {
      key: 'niveau', header: 'Niveau',
      render: (a) => (
        <div className="w-24">
          <Badge tone={a.actif ? LEVEL_TONE[a.niveau] : 'slate'}>{a.actif ? LEVEL_LABEL[a.niveau] : 'Inactif'}</Badge>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-soft"><div className={clsx('h-full rounded-full', BAR[a.niveau])} style={{ width: `${levelRatio(a) * 100}%` }} /></div>
        </div>
      ),
    },
    {
      key: 'actions', header: 'Actions', className: 'whitespace-nowrap',
      render: (a) => (
        <div className="flex flex-nowrap gap-1">
          {vm.canSell && a.actif && a.quantite > 0 && <Button size="icon" variant="success" title="Vendre" aria-label={`Vendre ${a.nom}`} onClick={() => vm.openSale(a.id)}><ShoppingCart size={14} /></Button>}
          {vm.canRestock && a.actif && <Button size="icon" variant="amber" title="Réapprovisionner" aria-label={`Réapprovisionner ${a.nom}`} onClick={() => vm.openRestock(a.id)}><Plus size={14} /></Button>}
          {vm.canEdit && <Button size="icon" variant="secondary" title="Modifier" aria-label={`Modifier ${a.nom}`} onClick={() => vm.openForm(a)}><Pencil size={14} /></Button>}
          {vm.canEdit && (a.actif
            ? <Button size="icon" variant="danger" title="Désactiver" aria-label={`Désactiver ${a.nom}`} onClick={() => vm.askDeactivate(a)}><PowerOff size={14} /></Button>
            : <Button size="icon" variant="success" title="Activer" aria-label={`Activer ${a.nom}`} onClick={() => vm.activate(a)}><Power size={14} /></Button>)}
          {vm.canDelete && <Button size="icon" variant="secondary" title="Supprimer" aria-label={`Supprimer ${a.nom}`} onClick={() => vm.askDelete(a)}><Trash2 size={14} /></Button>}
        </div>
      ),
    },
  ];

  const movementColumns: Column<Movement>[] = [
    { key: 'date', header: 'Date', className: 'whitespace-nowrap', render: (m) => formatDateTime(m.date) },
    { key: 'article', header: 'Médicament', className: 'font-semibold', render: (m) => m.article.nom },
    { key: 'type', header: 'Type', render: (m) => <Badge tone={m.type === 'entree' ? 'green' : m.type === 'ajustement' ? 'violet' : 'blue'}>{MOVEMENT_LABEL[m.type]}</Badge> },
    { key: 'qte', header: 'Quantité', className: 'font-bold tabular-nums', render: (m) => <span className={m.quantite > 0 ? 'text-brand-text' : 'text-danger'}>{m.quantite > 0 ? `+${m.quantite}` : m.quantite}</span> },
    { key: 'ref', header: 'Référence', render: (m) => m.reference },
    { key: 'par', header: 'Par', render: (m) => m.par },
  ];

  const deleting = vm.confirm?.kind === 'delete';
  const s = vm.stats;

  return (
    <div className="space-y-5">
      {s && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          <KpiCard value={s.references} label="Références" />
          <KpiCard value={s.ok} label="Stock OK" />
          <KpiCard value={<span className="text-amber">{s.faible}</span>} label="Faible" tone="amber" />
          <KpiCard value={<span className="text-danger">{s.rupture}</span>} label="Rupture" tone="amber" />
          <KpiCard value={<span className="text-info">{s.ventesMois}</span>} label="Ventes (mois)" tone="info" />
          <KpiCard value={formatFcfa(s.caPharmacie)} label="CA pharmacie" />
        </div>
      )}

      {vm.tabs.length > 0 && <div className="overflow-hidden rounded-lg2 border border-line"><Tabs items={vm.tabs} value={vm.tab!} onChange={vm.setTab} /></div>}

      {vm.tab === 'inventaire' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-[11px] text-faint" />
              <Input aria-label="Rechercher un médicament" placeholder="Rechercher un médicament (nom, catégorie, code…)" className="pl-9" value={vm.search} onChange={(e) => vm.setSearch(e.target.value)} />
            </div>
            <Select aria-label="Filtrer par catégorie" wrapperClassName="w-48" value={vm.categorie} onChange={(e) => vm.setCategorie(e.target.value)}>
              <option value="">Toutes catégories</option>{vm.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select aria-label="Filtrer par niveau" wrapperClassName="w-40" value={vm.niveau} onChange={(e) => vm.setNiveau(e.target.value)}>
              <option value="">Tous niveaux</option><option value="ok">OK</option><option value="faible">Faible</option><option value="rupture">Rupture</option>
            </Select>
            {vm.canCreate && <Button variant="secondary" onClick={() => vm.openForm('new')}><Plus size={15} /> Médicament</Button>}
            {vm.canRestock && <Button variant="secondary" onClick={() => vm.openRestock()}><ArrowDownToLine size={15} /> Réappro</Button>}
            {vm.canSell && <Button onClick={() => vm.openSale()}><ShoppingCart size={15} /> Vente directe</Button>}
          </div>
          <Panel title="Médicaments et produits" count={`${vm.total} référence${vm.total > 1 ? 's' : ''}`}>
            <Table bare columns={columns} rows={vm.articles} rowKey={(a) => a.id} loading={vm.loading} emptyTitle="Aucun médicament trouvé" page={vm.page} pageSize={vm.pageSize} total={vm.total} onPageChange={vm.setPage} />
          </Panel>
        </>
      )}

      {vm.tab === 'mouvements' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Select aria-label="Filtrer par médicament" wrapperClassName="w-64" value={vm.movArticle} onChange={(e) => vm.setMovArticle(e.target.value)}>
              <option value="">Tous les médicaments</option>{(articleChoices.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
            </Select>
            <Select aria-label="Filtrer par type" wrapperClassName="w-56" value={vm.movType} onChange={(e) => vm.setMovType(e.target.value)}>
              <option value="">Tous les types</option>{MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{MOVEMENT_LABEL[t]}</option>)}
            </Select>
          </div>
          <Panel title="Mouvements de stock" count={vm.movTotal}>
            <Table bare columns={movementColumns} rows={vm.movements} rowKey={(m) => m.id} loading={vm.movLoading} emptyTitle="Aucun mouvement" page={vm.movPage} pageSize={vm.pageSize} total={vm.movTotal} onPageChange={vm.setMovPage} />
          </Panel>
        </>
      )}

      {vm.tab === 'ventes' && (
        <Panel title="Historique des ventes directes" count={vm.salesTotal} actions={vm.canSell ? <Button size="sm" onClick={() => vm.openSale()}><ShoppingCart size={13} /> Nouvelle vente</Button> : undefined}>
          <Table
            bare rows={vm.sales} rowKey={(v) => v.id} loading={vm.salesLoading} emptyTitle="Aucune vente directe enregistrée"
            page={vm.salePage} pageSize={vm.pageSize} total={vm.salesTotal} onPageChange={vm.setSalePage} onRowClick={(v) => vm.openReceipt(v.id)}
            columns={[
              { key: 'n', header: 'N°', className: 'font-bold', render: (v) => v.numero },
              { key: 'date', header: 'Date', className: 'whitespace-nowrap', render: (v) => formatDate(v.date) },
              { key: 'client', header: 'Client', render: (v) => v.client.nom },
              { key: 'articles', header: 'Articles', render: (v) => <span className="text-[13px] text-slate">{v.articles.join(', ')}</span> },
              { key: 'total', header: 'Total', className: 'whitespace-nowrap font-bold tabular-nums', render: (v) => formatFcfa(v.total) },
              { key: 'statut', header: 'Statut', render: (v) => <Badge tone={STATUS_TONE[v.statut]}>{STATUS_LABEL[v.statut]}</Badge> },
              { key: 'a', header: '', render: (v) => <Button size="icon" variant="secondary" aria-label={`Voir le reçu ${v.numero}`} onClick={() => vm.openReceipt(v.id)}><Eye size={14} /></Button> },
            ]}
          />
        </Panel>
      )}

      <ArticleFormModal target={vm.formTarget} categories={vm.categories} saving={vm.saving} onSubmit={vm.submitForm} onClose={vm.closeForm} />
      <RestockModal target={vm.restockOpen} saving={vm.restocking} onSubmit={vm.submitRestock} onClose={vm.closeRestock} />
      <SaleModal target={vm.saleOpen} saving={vm.selling} onSubmit={vm.submitSale} onClose={vm.closeSale} />
      {vm.receiptId && <InvoiceDetailModal id={vm.receiptId} onClose={vm.closeReceipt} />}

      <ConfirmDialog
        open={!!vm.confirm} danger loading={vm.confirming} title={deleting ? "Supprimer l'article" : "Désactiver l'article"}
        message={vm.confirm ? (deleting ? `« ${vm.confirm.article.nom} » sera supprimé de l'inventaire. Les mouvements passés restent consultables.` : `« ${vm.confirm.article.nom} » ne sera plus proposé en vente ni en consultation tant qu'il n'est pas réactivé.`) : ''}
        confirmLabel={deleting ? 'Supprimer' : 'Désactiver'} onConfirm={vm.runConfirm} onCancel={vm.cancelConfirm}
      />
    </div>
  );
}
