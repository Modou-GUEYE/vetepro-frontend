import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowLeft, Check, CheckCircle2, Mail, Tag, X } from 'lucide-react';
import { formatDate, formatFcfa } from '@/core/utils/format';
import { Button, Input, Panel, Select, Skeleton } from '@/shared/ui';
import { PERIODE_LABEL, Periode, Registration, periodSuffix } from '@/modules/abonnement/models/abonnement';
import { PackCard } from '@/modules/abonnement/views/PackCard';
import { PaymentFields } from '@/modules/abonnement/views/PaymentFields';
import { CGU_TEXT, TYPES_ETABLISSEMENT } from '../models/portail';
import { useInscriptionViewModel } from '../viewmodels/useInscriptionViewModel';

export type InscriptionVm = ReturnType<typeof useInscriptionViewModel>;

const STEPS = ['Offre', 'Informations', 'Paiement et CGU', 'Confirmation'];

const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between gap-4 py-1.5"><dt className="text-slate">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>;

/** Encadré montrant l'e-mail de bienvenue : en production le mot de passe temporaire part par e-mail et n'est pas affiché. */
export function EmailSimule({ r }: { r: Registration }) {
  return (
    <div className="rounded-lg border border-dashed border-amber/50 bg-amber-pale px-4 py-3 text-left text-[13px] text-amber-text">
      <p className="mb-1 flex items-center gap-1.5 font-bold"><Mail size={14} /> Simulation de l'e-mail envoyé</p>
      <p>À : {r.email_simule.destinataire}</p>
      <p>Objet : {r.email_simule.objet}</p>
      <p>Mot de passe temporaire : <b className="select-all font-mono">{r.email_simule.mot_de_passe}</b></p>
    </div>
  );
}

const PromoField = ({ vm, className }: { vm: InscriptionVm; className?: string }) => (
  <div className={className}>
    <div className="flex items-end gap-2">
      <Input wrapperClassName="flex-1" label="Code promotionnel" placeholder="Facultatif" value={vm.code} onChange={(e) => vm.setCode(e.target.value.toUpperCase())} error={vm.quoteError ?? undefined} />
      {vm.appliedCode ? <Button variant="secondary" onClick={vm.clearCode}><X size={14} /> Retirer</Button> : <Button variant="secondary" onClick={vm.applyCode} disabled={!vm.code.trim()}><Tag size={14} /> Appliquer</Button>}
    </div>
    {vm.quoteUnavailable && <p className="mt-1 text-xs text-slate">Le tarif n'a pas pu être calculé pour le moment. Réessayez dans un instant.</p>}
  </div>
);

/** Bloc d'une étape : une carte sur la page d'inscription, un simple titre dans la fenêtre du portail. */
function Block({ embedded, title, actions, children }: { embedded?: boolean; title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  if (!embedded) return <Panel title={title} actions={actions}>{children}</Panel>;
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-[15px] font-bold">{title}</h3>{actions}</div>
      {children}
    </section>
  );
}

/** Parcours d'inscription en quatre étapes (offre, informations, paiement et CGU, confirmation), commun à la page dédiée et à la fenêtre du portail. */
export function InscriptionWizard({ vm, embedded = false }: { vm: InscriptionVm; embedded?: boolean }) {
  const { register, formState: { errors } } = vm.form;
  const [cguOpen, setCguOpen] = useState(false);
  const essai = vm.portal?.essai_jours ?? 30;
  const v = vm.form.getValues();
  const num = (n: number) => (vm.skipOffer ? n - 1 : n);

  return (
    <div className="space-y-6">
        <div>
          <ol aria-label="Étapes de l'inscription" className="flex items-center gap-2">
            {STEPS.map((label, i) => ({ label, n: i + 1 })).filter(({ n }) => !(vm.skipOffer && n === 1)).map(({ label, n }, i, all) => {
              const done = vm.step > n;
              return (
                <li key={label} aria-current={vm.step === n ? 'step' : undefined} className="flex flex-1 items-center gap-2">
                  <span className={clsx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', done ? 'bg-brand text-white' : vm.step === n ? 'bg-deep text-white' : 'bg-white text-slate ring-1 ring-line')}>{done ? <Check size={14} /> : i + 1}</span>
                  <span className={clsx('hidden text-[13px] font-semibold sm:inline', vm.step === n ? 'text-ink' : 'text-slate')}>{label}</span>
                  {i < all.length - 1 && <span className={clsx('h-0.5 flex-1 rounded', done ? 'bg-brand' : 'bg-line')} />}
                </li>
              );
            })}
          </ol>
        </div>


        {vm.loading && <Skeleton className="h-72" />}

        {vm.portal && vm.step === 1 && (
          <Block embedded={embedded} title="1. Choix du package" actions={
            <div role="radiogroup" aria-label="Périodicité" className="flex rounded-[10px] bg-mist p-1">
              {(['mensuel', 'annuel'] as Periode[]).map((p) => (
                <button key={p} type="button" role="radio" aria-checked={vm.periode === p} onClick={() => vm.setPeriode(p)} className={clsx('rounded-lg px-3 py-1.5 text-xs font-semibold', vm.periode === p ? 'bg-white text-brand shadow-card' : 'text-slate')}>
                  {PERIODE_LABEL[p]}
                </button>
              ))}
            </div>
          }>
            <div className="space-y-5 p-5 pt-7">
              <div role="radiogroup" aria-label="Package" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {vm.portal.packs.map((p) => <PackCard key={p.id} pack={p} periode={vm.periode} selected={vm.packId === p.id} onSelect={() => vm.selectPack(p.id)} />)}
              </div>
              {vm.packError && <p role="alert" className="text-sm text-danger">{vm.packError}</p>}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <PromoField vm={vm} />
                {vm.pack && vm.quote && (
                  <dl className="rounded-lg bg-mist px-4 py-3 text-[13px]">
                    <Row k={`Pack ${vm.pack.nom} (${PERIODE_LABEL[vm.periode].toLowerCase()})`} v={formatFcfa(vm.quote.base)} />
                    {vm.quote.promo && <Row k={`Remise ${vm.quote.promo.code} (-${vm.quote.promo.pct} % pendant ${vm.quote.promo.mois} mois)`} v={`-${formatFcfa(vm.quote.remise)}`} />}
                    <div className="mt-1 border-t border-line pt-1"><Row k={`À payer après l'essai de ${essai} jours`} v={`${formatFcfa(vm.quote.net)} / ${periodSuffix(vm.periode)}`} /></div>
                  </dl>
                )}
              </div>
              <div className="flex justify-end"><Button onClick={vm.toInfos}>Continuer</Button></div>
            </div>
          </Block>
        )}

        {vm.portal && vm.step === 2 && (
          <Block embedded={embedded} title={`${num(2)}. Informations professionnelles`}>
            <form onSubmit={vm.toFinal} noValidate className="space-y-4 p-5">
              {vm.error && <p role="alert" className="rounded-lg bg-danger-pale px-3 py-2 text-[13px] text-danger-text">{vm.error}</p>}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Nom *" autoComplete="family-name" error={errors.nom?.message} {...register('nom')} />
                <Input label="Prénom *" autoComplete="given-name" error={errors.prenom?.message} {...register('prenom')} />
                <Input label="Adresse e-mail *" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
                <Input label="Nom d'utilisateur de l'administrateur *" autoComplete="username" hint="Proposé à partir du prénom et du nom, modifiable" error={errors.identifiant?.message} {...register('identifiant')} />
                <Input label="Numéro d'ordre vétérinaire *" placeholder="ODVS-0000" error={errors.ordre?.message} {...register('ordre')} />
                <Input label="Téléphone *" inputMode="tel" autoComplete="tel" placeholder="77 123 45 67" error={errors.telephone?.message} {...register('telephone')} />
                <Select label="Type d'établissement *" {...register('typeEtablissement')}>{TYPES_ETABLISSEMENT.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</Select>
                <Input label="Nom de l'établissement *" error={errors.etablissement?.message} {...register('etablissement')} />
                <Input label="Adresse *" error={errors.adresse?.message} {...register('adresse')} />
                <Input label="Ville *" error={errors.ville?.message} {...register('ville')} />
              </div>
              <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" className="mt-0.5" {...register('doubleAuth')} /> <span>Exiger la double authentification pour mon établissement</span></label>
              <p className="rounded-lg bg-info-pale px-3 py-2 text-xs text-info-text">Votre mot de passe est généré automatiquement et vous est envoyé par e-mail une fois l'inscription terminée.</p>
              <div className="flex justify-between">{vm.skipOffer ? <span /> : <Button variant="secondary" type="button" onClick={() => vm.setStep(1)}><ArrowLeft size={14} /> Précédent</Button>}<Button type="submit">Continuer</Button></div>
            </form>
          </Block>
        )}

        {vm.portal && vm.step === 3 && vm.pack && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Block embedded={embedded} title={`${num(3)}. Récapitulatif`}>
              <dl className="divide-y divide-[#eef2f5] px-5 py-3 text-[13px]">
                <Row k="Établissement" v={`${v.etablissement} (${TYPES_ETABLISSEMENT.find((t) => t.key === v.typeEtablissement)?.label.toLowerCase() ?? ''})`} /><Row k="Responsable" v={`Dr ${v.prenom} ${v.nom}`} /><Row k="N° d'ordre" v={v.ordre.toUpperCase()} />
                <Row k="Adresse" v={`${v.adresse}, ${v.ville}`} /><Row k="E-mail" v={v.email} /><Row k="Identifiant" v={v.identifiant} />
                <Row k="Pack" v={`${vm.pack.nom}, ${PERIODE_LABEL[vm.periode].toLowerCase()}`} />
                {vm.quote?.promo && <Row k={`Remise ${vm.quote.promo.code}`} v={`-${vm.quote.promo.pct} % pendant ${vm.quote.promo.mois} mois`} />}
                <Row k="Tarif après l'essai" v={vm.quote ? `${formatFcfa(vm.quote.net)} / ${periodSuffix(vm.periode)}` : ''} />
                <Row k="Essai gratuit" v={`${essai} jours`} />
                {v.doubleAuth && <Row k="Double authentification" v="Exigée" />}
              </dl>
              <PromoField vm={vm} className="border-t border-line px-5 pb-4 pt-4" />
            </Block>
            <Block embedded={embedded} title="Paiement et conditions">
              <div className="space-y-4 p-5">
                {vm.error && <p role="alert" className="rounded-lg bg-danger-pale px-3 py-2 text-[13px] text-danger-text">{vm.error}</p>}
                <PaymentFields value={vm.moyen} onChange={vm.setMoyen} operateurs={vm.portal.operateurs} error={vm.moyenErr} />
                <p className="rounded-lg bg-brand-pale px-3 py-2 text-xs text-brand-text">Aucun prélèvement pendant l'essai de {essai} jours. Le moyen de paiement est enregistré pour la suite.</p>
                <div>
                  <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" className="mt-0.5" checked={vm.cgu} onChange={(e) => vm.setCgu(e.target.checked)} /> <span>J'ai lu et j'accepte les <button type="button" onClick={() => setCguOpen(!cguOpen)} className="font-semibold text-brand underline">conditions générales d'utilisation</button> de la plateforme.</span></label>
                  {cguOpen && <p className="mt-2 max-h-36 overflow-auto rounded-lg bg-mist px-3 py-2 text-xs leading-relaxed">{CGU_TEXT}</p>}
                  {vm.cguError && <p role="alert" className="mt-1 text-xs text-danger">{vm.cguError}</p>}
                </div>
                <div className="flex justify-between gap-2"><Button variant="secondary" onClick={() => vm.setStep(2)}><ArrowLeft size={14} /> Précédent</Button><Button loading={vm.submitting} onClick={vm.submit}>Finaliser mon inscription</Button></div>
              </div>
            </Block>
          </div>
        )}

        {vm.step === 4 && vm.result && (
          <Block embedded={embedded} title={`${num(4)}. Accès à la plateforme`}>
            <div className="space-y-5 p-6 text-center">
              <CheckCircle2 size={48} className="mx-auto text-brand" />
              <div><h2 className="text-xl font-bold">Inscription confirmée</h2><p className="mt-1 text-[14px] text-slate"><b>{vm.result.cabinet.nom}</b> est inscrit avec le pack <b>{vm.result.pack.nom}</b>. Votre essai gratuit court jusqu'au {formatDate(vm.result.essai_fin)}.</p></div>
              <dl className="mx-auto max-w-[460px] divide-y divide-line rounded-lg bg-mist px-4 py-2 text-left text-[13px]">
                <Row k="Adresse d'accès" v={vm.result.url_acces} /><Row k="Lien valable jusqu'au" v={formatDate(vm.result.lien_expire)} /><Row k="Identifiant" v={vm.result.identifiant} />
              </dl>
              <div className="mx-auto max-w-[460px]"><EmailSimule r={vm.result} /></div>
              <Link to="/connexion" className="inline-block"><Button className="px-6 py-2.5">Accéder à la plateforme</Button></Link>
            </div>
          </Block>
        )}
    </div>
  );
}
