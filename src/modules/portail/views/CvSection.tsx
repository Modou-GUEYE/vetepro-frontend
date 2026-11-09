import { useState } from 'react';
import { useRef } from 'react';
import { Check, CheckCircle2, FileText, Paperclip, X } from 'lucide-react';
import { formatFileSize } from '@/core/http/download';
import { Button, Input, Modal, Select, Textarea } from '@/shared/ui';
import { DISPOS, PROFILS, cvMissing } from '../models/portail';
import { useCvViewModel } from '../viewmodels/usePortalViewModel';

/** Dépôt d'un CV par un candidat sans compte, et retrait à sa demande. */
export function CvSection({ vivier, cabinets }: { vivier: number; cabinets: number }) {
  const vm = useCvViewModel(vivier);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [contact, setContact] = useState('');
  const { register, watch, setValue, formState: { errors } } = vm.form;
  const fichier = watch('fichier');
  const picker = useRef<HTMLInputElement>(null);
  const missing = cvMissing(errors);

  return (
    <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
      <div>
        <p className="text-[12px] font-bold uppercase tracking-[1.4px] text-brand">CVthèque du réseau</p>
        <h2 className="mt-3 font-serif text-[30px] font-bold leading-tight tracking-tight text-deep sm:text-[34px]">Rejoignez le vivier de talents</h2>
        <p className="mt-4 text-[15.5px] leading-relaxed text-slate">Vétérinaires, assistants, techniciens : déposez votre profil. Après validation par l'association, il devient visible par les cabinets membres du réseau, qui vous contactent directement.</p>
        <ul className="mt-5 flex flex-col gap-3.5 text-[15px] text-slate">
          {[`Visible par les ${cabinets} cabinets du réseau`, 'Contacté directement par les recruteurs intéressés', 'Gratuit pour les candidats'].map((t) => (
            <li key={t} className="flex items-start gap-3"><span className="mt-px flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-brand-pale text-brand"><Check size={15} /></span>{t}</li>
          ))}
        </ul>
        <p className="mt-5 text-[14px] text-slate" aria-live="polite"><b className="font-serif text-[22px] text-brand">{vm.vivier}</b> profil{vm.vivier > 1 ? 's' : ''} déjà dans le vivier du réseau</p>
        <button type="button" onClick={() => { vm.resetWithdraw(); setContact(''); setWithdrawOpen(true); }} className="mt-4 text-[13px] font-semibold text-slate underline underline-offset-2 hover:text-ink">Retirer mon CV</button>
      </div>

      <form onSubmit={vm.submit} noValidate className="space-y-3.5 rounded-3xl border border-line bg-white p-7 shadow-[0_20px_50px_rgba(11,42,48,.1)]" aria-label="Déposer mon CV">
        <h3 className="font-serif text-[20px] font-bold text-deep">Déposer mon CV</h3>
        {vm.sent && (
          <div role="status" className="flex items-start gap-3 rounded-lg bg-brand-pale px-4 py-3 text-[13px] text-brand-text">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            <div><p className="font-bold">Candidature envoyée !</p><p>Votre profil a bien été transmis au réseau et sera partagé, après validation par l'association, avec les cabinets membres à la recherche de profils. Les cabinets intéressés vous contacteront au numéro indiqué.</p></div>
          </div>
        )}
        <Input label="Prénom et nom *" autoComplete="name" placeholder="Ex. Awa Diop" error={missing ? undefined : errors.nom?.message} {...register('nom')} />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Select label="Profil" {...register('profil')}>{PROFILS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</Select>
          <Input label="Ville *" placeholder="Ex. Dakar" error={missing ? undefined : errors.ville?.message} {...register('ville')} />
          <Input label="Années d'expérience" type="number" min={0} placeholder="Ex. 4" error={errors.experience?.message} {...register('experience')} />
          <Select label="Disponibilité" {...register('disponibilite')}>{DISPOS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</Select>
        </div>
        <Input label="Téléphone *" inputMode="tel" autoComplete="tel" placeholder="77 000 00 00" error={missing ? undefined : errors.telephone?.message} {...register('telephone')} />
        <Input label="E-mail" type="email" autoComplete="email" placeholder="vous@email.com" error={errors.email?.message} {...register('email')} />
        <Input label="Compétences clés" placeholder="Chirurgie, Vaccination, Échographie" hint="Séparées par des virgules" {...register('competences')} />
        <Textarea label="Présentation courte" rows={2} placeholder="Quelques mots sur votre parcours…" error={errors.presentation?.message} {...register('presentation')} />
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.7px] text-slate">CV (PDF, 2 Mo maximum)</p>
          <input ref={picker} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="CV au format PDF" onChange={(e) => { setValue('fichier', e.target.files?.[0] ?? null, { shouldValidate: true }); e.target.value = ''; }} />
          {fichier ? (
            <div className="flex items-center gap-2.5 rounded-[10px] border border-line bg-mist px-3 py-2.5 text-[13px]">
              <FileText size={18} className="shrink-0 text-brand" />
              <span className="min-w-0 flex-1 truncate font-medium">{fichier.name}</span>
              <span className="shrink-0 text-xs text-slate">{formatFileSize(fichier.size)}</span>
              <button type="button" aria-label="Retirer le fichier" onClick={() => setValue('fichier', null, { shouldValidate: true })} className="rounded-md p-1 text-slate hover:bg-white hover:text-ink"><X size={14} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => picker.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-line px-3 py-3 text-[13px] font-semibold text-slate transition hover:border-brand hover:text-brand"><Paperclip size={15} /> Joindre mon CV (facultatif)</button>
          )}
          {errors.fichier && <p role="alert" className="mt-1 text-xs text-danger">{errors.fichier.message as string}</p>}
        </div>
        <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" className="mt-0.5" {...register('consentement')} /> <span>Je consens à la diffusion de mes données et de mon CV aux cabinets membres du réseau, dans le but d'un recrutement. *</span></label>
        {errors.consentement && <p className="-mt-2 text-xs text-danger">{errors.consentement.message}</p>}
        {(missing || vm.error) && <p role="alert" className="rounded-lg bg-danger-pale px-3 py-2 text-[13px] text-danger-text">{missing || vm.error}</p>}
        <Button type="submit" className="w-full !rounded-full !py-3.5 text-[15px]" loading={vm.submitting}>Envoyer ma candidature</Button>
        <p className="text-center text-[11.5px] text-slate">Votre profil apparaîtra dans l'espace membre des cabinets après validation par l'association.</p>
      </form>

      <Modal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} title="Retirer mon CV" footer={<><Button variant="secondary" onClick={() => setWithdrawOpen(false)}>Fermer</Button>{!vm.withdrawn && <Button loading={vm.withdrawing} onClick={() => vm.withdraw(contact)}>Retirer mon profil</Button>}</>}>
        {vm.withdrawn ? <p role="status" className="text-[14px] text-brand-text">{vm.withdrawn}</p> : (
          <div className="space-y-3">
            <p className="text-[13px] text-slate">Indiquez le téléphone ou l'e-mail utilisé lors du dépôt : votre profil disparaîtra du vivier.</p>
            <Input label="Téléphone ou e-mail *" value={contact} onChange={(e) => setContact(e.target.value)} />
            {vm.withdrawError && <p role="alert" className="text-xs text-danger">{vm.withdrawError}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
