import { Link } from 'react-router-dom';
import { CalendarX2, CheckCircle2, LogOut, PawPrint, Tag, X } from 'lucide-react';
import { useSessionStore } from '@/core/auth/session.store';
import { formatDate, formatFcfa } from '@/core/utils/format';
import { Badge, Button, Input, Panel, Skeleton } from '@/shared/ui';
import { useLogout } from '@/modules/auth/viewmodels/useLogout';
import { PERIODE_LABEL, Periode, periodSuffix } from '../models/abonnement';
import { useRenewalViewModel } from '../viewmodels/useRenewalViewModel';
import { PackCard } from './PackCard';
import { PaymentFields } from './PaymentFields';

/** Page de renouvellement : seul écran accessible quand l'abonnement a expiré ; elle sert aussi à passer d'un essai à un abonnement payé ou à changer de pack. */
export function RenewalPage() {
  const vm = useRenewalViewModel();
  const logout = useLogout();
  const abonnement = useSessionStore((s) => s.abonnement);
  const expired = abonnement?.statut === 'expire';
  const info = vm.info;

  return (
    <div className="min-h-screen bg-mist">
      <header className="flex items-center justify-between border-b border-line bg-white px-5 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2fc3bd] to-brand text-white"><PawPrint size={18} /></span>
          <span className="font-display text-lg font-extrabold text-deep">Véte<span className="text-brand">Pro</span></span>
        </div>
        <div className="flex items-center gap-2">
          {!expired && <Link to="/" className="rounded-lg px-3 py-2 text-[13px] font-semibold text-slate hover:bg-mist">Retour à l'application</Link>}
          <Button variant="secondary" size="sm" onClick={logout}><LogOut size={14} /> Se déconnecter</Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1060px] space-y-5 px-4 py-8 sm:px-6">
        {!info ? <Skeleton className="h-64" /> : (
          <>
            <section className={`flex items-start gap-3 rounded-lg2 border px-5 py-4 text-[13px] ${expired ? 'border-danger/25 bg-danger-pale text-danger-text' : 'border-info/20 bg-info-pale text-info-text'}`}>
              {expired ? <CalendarX2 size={22} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={22} className="mt-0.5 shrink-0" />}
              <div>
                <p className="text-[15px] font-bold">{expired ? 'Abonnement expiré' : abonnement?.statut === 'essai' ? "Période d'essai en cours" : 'Abonnement actif'}</p>
                <p className="mt-1">
                  {expired
                    ? `L'abonnement de ${info.cabinet.nom} a pris fin le ${formatDate(info.cabinet.fin)}. L'accès à la plateforme est suspendu pour tous les profils du cabinet jusqu'au renouvellement du package.`
                    : `${info.cabinet.nom}, pack ${info.cabinet.pack.nom} : échéance le ${formatDate(info.cabinet.fin)} (${info.cabinet.jours_restants} jour${info.cabinet.jours_restants > 1 ? 's' : ''}).`}
                </p>
              </div>
            </section>

            {!info.peut_renouveler ? (
              <Panel title="Renouvellement"><p className="p-5 text-[13px] text-slate">Seul l'Administrateur du cabinet peut renouveler l'abonnement. Contactez-le pour rétablir l'accès.</p></Panel>
            ) : (
              <>
                <Panel title="1. Choisissez votre pack" actions={
                  <div role="radiogroup" aria-label="Périodicité" className="flex rounded-[10px] bg-mist p-1">
                    {(['mensuel', 'annuel'] as Periode[]).map((p) => (
                      <button key={p} type="button" role="radio" aria-checked={vm.periode === p} onClick={() => vm.setPeriode(p)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${vm.periode === p ? 'bg-white text-brand shadow-card' : 'text-slate'}`}>
                        {PERIODE_LABEL[p]}
                      </button>
                    ))}
                  </div>
                }>
                  <div role="radiogroup" aria-label="Pack" className="grid grid-cols-1 gap-5 p-5 pt-7 sm:grid-cols-2 lg:grid-cols-4">
                    {info.packs.map((p) => <PackCard key={p.id} pack={p} periode={vm.periode} selected={vm.selected === p.id} onSelect={() => vm.selectPack(p.id)} />)}
                  </div>
                </Panel>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <Panel title="2. Code promotionnel et récapitulatif">
                    <div className="space-y-4 p-5">
                      <div className="flex items-end gap-2">
                        <Input wrapperClassName="flex-1" label="Code promotionnel" placeholder="Facultatif" value={vm.code} onChange={(e) => vm.setCode(e.target.value.toUpperCase())} error={vm.quoteError ?? undefined} />
                        {vm.appliedCode ? <Button variant="secondary" onClick={vm.clearCode}><X size={14} /> Retirer</Button> : <Button variant="secondary" onClick={vm.applyCode} disabled={!vm.code.trim()}><Tag size={14} /> Appliquer</Button>}
                      </div>
                      {vm.quote && (
                        <dl className="space-y-2 rounded-lg bg-mist px-4 py-3 text-[13px]">
                          <div className="flex justify-between"><dt>Pack {info.packs.find((p) => p.id === vm.selected)?.nom} ({PERIODE_LABEL[vm.periode].toLowerCase()})</dt><dd className="tabular-nums">{formatFcfa(vm.quote.base)}</dd></div>
                          {vm.quote.promo && <div className="flex justify-between text-brand-text"><dt>Remise {vm.quote.promo.code} (-{vm.quote.promo.pct} % pendant {vm.quote.promo.mois} mois)</dt><dd className="tabular-nums">-{formatFcfa(vm.quote.remise)}</dd></div>}
                          <div className="flex justify-between border-t border-line pt-2 text-[15px] font-bold"><dt>À payer</dt><dd className="tabular-nums">{formatFcfa(vm.quote.net)} / {periodSuffix(vm.periode)}</dd></div>
                        </dl>
                      )}
                      {info.cabinet.promo && <Badge tone="green">Offre en cours : {info.cabinet.promo}</Badge>}
                    </div>
                  </Panel>

                  <Panel title="3. Paiement">
                    <div className="space-y-4 p-5">
                      <PaymentFields value={vm.moyen} onChange={vm.setMoyen} operateurs={info.operateurs} error={vm.moyenErr ?? vm.error} />
                      <Button className="w-full py-2.5" loading={vm.paying} onClick={vm.submit}>{expired ? 'Payer et rétablir l\'accès' : 'Payer et souscrire'}</Button>
                      <p className="text-center text-xs text-faint">Paiement simulé. Aucune somme n'est prélevée.</p>
                    </div>
                  </Panel>
                </div>
              </>
            )}

            {info.cabinet.paiements.length > 0 && (
              <Panel title="Paiements du cabinet">
                <ul className="divide-y divide-[#eef2f5] text-[13px]">
                  {info.cabinet.paiements.map((p) => <li key={p.date} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"><span>{p.libelle}</span><span className="text-slate">{formatDate(p.date)}, {p.moyen}, <b className="text-ink">{formatFcfa(p.montant)}</b></span></li>)}
                </ul>
              </Panel>
            )}
          </>
        )}
      </main>
    </div>
  );
}
