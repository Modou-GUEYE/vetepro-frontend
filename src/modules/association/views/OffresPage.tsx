import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Megaphone, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { formatDate, formatDateTime, formatFcfa } from '@/core/utils/format';
import { Badge, Button, ConfirmDialog, Input, Panel, Tabs } from '@/shared/ui';
import { HISTORY_PAGE_SIZE, PROMO_STATE_LABEL, PROMO_STATE_TONE, PlatformHistory, PlatformPack, PlatformPromo, TrialForm, portalOfferText, promoState, trialFormSchema } from '../models/offres';
import { OffresTab, OffresVm, useOffresViewModel } from '../viewmodels/useOffresViewModel';
import { AssoColumn, AssoTable } from './AssoTable';
import { PackFormModal } from './PackFormModal';
import { PromoFormModal } from './PromoFormModal';

export function OffresPage() {
  const vm = useOffresViewModel();
  const tabs: { key: OffresTab; label: string }[] = [{ key: 'offres', label: 'Offres' }, { key: 'essai', label: "Période d'essai" }, { key: 'promos', label: 'Codes promotionnels' }, { key: 'historique', label: 'Historique' }];
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-lg2 border border-line bg-white shadow-card"><Tabs<OffresTab> items={tabs} value={vm.tab} onChange={vm.setTab} /></div>
      {vm.tab === 'offres' && <PacksPanel vm={vm} />}
      {vm.tab === 'essai' && <TrialPanel vm={vm} />}
      {vm.tab === 'promos' && <PromosPanel vm={vm} />}
      {vm.tab === 'historique' && <HistoryPanel vm={vm} />}

      <PackFormModal pack={vm.packEdit} modules={vm.modules} onClose={() => vm.editPack(null)} onSubmit={(f) => vm.savePack({ id: vm.packEdit && vm.packEdit !== 'new' ? vm.packEdit.id : null, f })} pending={vm.savingPack} />
      <PromoFormModal promo={vm.promoEdit} packs={vm.packs} onClose={() => vm.editPromo(null)} onSubmit={(f) => vm.savePromo({ id: vm.promoEdit && vm.promoEdit !== 'new' ? vm.promoEdit.id : null, f })} pending={vm.savingPromo} />
      <ConfirmDialog open={!!vm.packDelete} danger title="Supprimer l'offre" message={`L'offre « ${vm.packDelete?.name} » sera supprimée. La suppression est refusée si un abonnement, même en attente ou expiré, utilise ce pack.`} confirmLabel="Supprimer" loading={vm.deletingPack} onCancel={() => vm.askDeletePack(null)} onConfirm={() => vm.packDelete && vm.deletePack(vm.packDelete.id)} />
      <ConfirmDialog open={!!vm.promoDelete} danger title="Supprimer la promotion" message={`Le code ${vm.promoDelete?.code} sera désactivé. Le code et son historique sont conservés.`} confirmLabel="Supprimer" loading={vm.deletingPromo} onCancel={() => vm.askDeletePromo(null)} onConfirm={() => vm.promoDelete && vm.deletePromo(vm.promoDelete.id)} />
    </div>
  );
}

const usersLabel = (limit: number | null) => (limit === null ? 'Utilisateurs illimités' : `Jusqu'à ${limit} utilisateurs`);

function PacksPanel({ vm }: { vm: OffresVm }) {
  const packs = vm.packs;
  return (
    <Panel title="Offres et tarifs" count={`${packs.length} offre${packs.length > 1 ? 's' : ''}`} actions={<Button size="sm" onClick={() => vm.editPack('new')}><Plus size={14} /> Nouvelle offre</Button>}>
      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        {packs.map((p: PlatformPack) => (
          <article key={p.id} className={`flex flex-col rounded-lg2 border p-5 ${p.is_published ? 'border-line bg-white' : 'border-line bg-mist opacity-80'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-extrabold">{p.name}</h3>
              {p.is_featured && <Badge tone="green"><Star size={12} /> Le plus choisi</Badge>}
              {p.is_custom && <Badge tone="violet">Sur mesure</Badge>}
              {!p.is_published && <Badge tone="slate">Inactive</Badge>}
            </div>
            {p.target && <p className="text-xs text-slate">{p.target}</p>}
            <p className="mt-3 font-display text-2xl font-extrabold tabular-nums text-brand-text">{formatFcfa(Number(p.monthly_price))}<span className="text-[13px] font-semibold text-slate"> / mois</span></p>
            <p className="text-xs text-slate">{formatFcfa(Number(p.annual_price))} par an. {usersLabel(p.user_limit)}. {p.subscriber_count} cabinet{p.subscriber_count > 1 ? 's' : ''}.</p>
            <ul className="mt-3 list-disc space-y-1 pl-4 text-[13px]">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            {p.module_codes.length > 0 && <p className="mt-3 text-xs text-slate"><b>Modules :</b> {p.module_codes.map((c) => vm.modules.find((m) => m.code === c)?.label ?? c).join(', ')}.</p>}
            <div className="mt-auto flex gap-2 pt-4">
              <Button size="sm" variant="secondary" onClick={() => vm.editPack(p)}><Pencil size={13} /> Modifier</Button>
              <Button size="sm" variant="danger" onClick={() => vm.askDeletePack(p)}><Trash2 size={13} /> Supprimer</Button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function TrialPanel({ vm }: { vm: OffresVm }) {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<TrialForm>({ resolver: zodResolver(trialFormSchema), defaultValues: { trial_days: '' } });
  useEffect(() => { if (vm.trialDays !== undefined) reset({ trial_days: String(vm.trialDays) }); }, [vm.trialDays, reset]);
  const auto = vm.promos.find((p) => p.is_automatic && promoState(p) === 'actif');
  const days = Number(watch('trial_days'));
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Panel title="Période d'essai">
        <form onSubmit={handleSubmit((f) => vm.saveTrial(f))} noValidate className="space-y-4 p-5">
          <Input label="Durée de l'essai gratuit (jours)" inputMode="numeric" hint="Entre 0 et 90 jours." error={errors.trial_days?.message} {...register('trial_days')} />
          <Button type="submit" loading={vm.savingTrial}>Enregistrer</Button>
        </form>
      </Panel>
      <Panel title="Aperçu sur le portail">
        <div className="flex items-start gap-3 p-5 text-[13px]"><Megaphone size={20} className="mt-0.5 shrink-0 text-brand" /><p>{Number.isFinite(days) && vm.trialDays !== undefined ? portalOfferText(days, auto) : ''}</p></div>
      </Panel>
    </div>
  );
}

function PromosPanel({ vm }: { vm: OffresVm }) {
  const packName = (id: string) => vm.packs.find((p) => p.id === id)?.name ?? id;
  const columns: AssoColumn<PlatformPromo>[] = [
    { key: 'code', header: 'Code', render: (p) => <div className="flex flex-wrap items-center gap-1.5"><b className="font-mono">{p.code}</b>{p.is_automatic && <Badge tone="blue">Lancement automatique</Badge>}</div> },
    { key: 'pct', header: 'Remise', className: 'whitespace-nowrap', render: (p) => `-${p.discount_percent} % pendant ${p.duration_months} mois` },
    { key: 'use', header: 'Cabinets', className: 'whitespace-nowrap', render: (p) => `${p.used_count} sur ${p.usage_limit}` },
    { key: 'per', header: 'Période', className: 'whitespace-nowrap', render: (p) => `${formatDate(p.starts_on)} au ${formatDate(p.ends_on)}` },
    { key: 'packs', header: 'Packs', render: (p) => (p.pack_ids.length ? p.pack_ids.map(packName).join(', ') : 'Tous') },
    { key: 'etat', header: 'État', render: (p) => { const s = promoState(p); return <Badge tone={PROMO_STATE_TONE[s]}>{PROMO_STATE_LABEL[s]}</Badge>; } },
    { key: 'act', header: '', className: 'whitespace-nowrap text-right', render: (p) => (
      <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="secondary" aria-label={`Modifier ${p.code}`} onClick={() => vm.editPromo(p)}><Pencil size={13} /></Button>
        <Button size="sm" variant="danger" aria-label={`Supprimer ${p.code}`} onClick={() => vm.askDeletePromo(p)}><Trash2 size={13} /></Button>
      </div>
    ) },
  ];
  return (
    <Panel title="Codes promotionnels" actions={<Button size="sm" onClick={() => vm.editPromo('new')}><Plus size={14} /> Nouvelle promotion</Button>}>
      <AssoTable columns={columns} rows={vm.promos} rowKey={(p) => p.id} loading={vm.loading} emptyTitle="Aucune promotion" />
    </Panel>
  );
}

const json = (v: Record<string, unknown> | null) => (v === null ? '-' : JSON.stringify(v, null, 2));

function HistoryPanel({ vm }: { vm: OffresVm }) {
  const rows = vm.history?.items ?? [];
  const total = vm.history?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const columns: AssoColumn<PlatformHistory>[] = [
    { key: 'date', header: 'Date', className: 'whitespace-nowrap', render: (h) => formatDateTime(h.created_at) },
    { key: 'actor', header: 'Auteur', render: (h) => h.actor },
    { key: 'action', header: 'Action', render: (h) => h.action },
    { key: 'res', header: 'Ressource', render: (h) => <span><b>{h.resource_type}</b> <span className="font-mono text-xs text-slate">{h.resource_id}</span></span> },
    { key: 'detail', header: 'Détail', render: (h) => (h.before === null && h.after === null ? '-' : (
      <details><summary className="cursor-pointer text-brand">Avant et après</summary>
        <pre className="mt-1 max-w-[420px] overflow-x-auto whitespace-pre-wrap text-xs">Avant : {json(h.before)}{'\n'}Après : {json(h.after)}</pre></details>
    )) },
  ];
  return (
    <Panel title="Historique des modifications commerciales" count={`${total} entrée${total > 1 ? 's' : ''}`}
      actions={<form onSubmit={(e) => { e.preventDefault(); vm.searchHistory(String(new FormData(e.currentTarget).get('q') ?? '').trim()); }} className="flex gap-2"><input name="q" defaultValue={vm.histQ} placeholder="Rechercher" aria-label="Rechercher dans l'historique" className="rounded-lg border border-line px-3 py-1.5 text-[13px]" /><Button size="sm" variant="secondary" type="submit">Rechercher</Button></form>}>
      <AssoTable columns={columns} rows={rows} rowKey={(h) => h.id} loading={vm.historyLoading} emptyTitle="Aucune modification enregistrée" />
      {pages > 1 && (
        <div className="flex items-center justify-end gap-3 border-t border-line px-5 py-3 text-[13px]">
          <Button size="sm" variant="secondary" disabled={vm.histPage <= 1} onClick={() => vm.setHistPage(vm.histPage - 1)}>Précédent</Button>
          <span>Page {vm.histPage} sur {pages}</span>
          <Button size="sm" variant="secondary" disabled={vm.histPage >= pages} onClick={() => vm.setHistPage(vm.histPage + 1)}>Suivant</Button>
        </div>
      )}
    </Panel>
  );
}
