import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDate, formatDateTime, formatFcfa } from '@/core/utils/format';
import { Badge, Button, Input, Modal } from '@/shared/ui';
import { Cabinet } from '@/modules/abonnement/services/abonnement.service';
import { SOURCE_LABEL, STATUT_ABO_LABEL, STATUT_ABO_TONE, prolongationSchema } from '../models/association';

export function CabinetDetailModal({ cabinet, onClose, onExtend, extending }: { cabinet: Cabinet | null; onClose: () => void; onExtend: (jours: number) => void; extending: boolean }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ jours: string }>({ resolver: zodResolver(prolongationSchema), defaultValues: { jours: '15' } });
  useEffect(() => { if (cabinet) reset({ jours: '15' }); }, [cabinet, reset]);
  const row = (label: string, value: React.ReactNode) => <><dt className="text-slate">{label}</dt><dd className="font-medium">{value || 'Non renseigné'}</dd></>;
  return (
    <Modal open={!!cabinet} onClose={onClose} size="lg" title={cabinet?.nom ?? 'Cabinet'} footer={<Button variant="secondary" onClick={onClose}>Fermer</Button>}>
      {cabinet && (
        <div className="space-y-5 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUT_ABO_TONE[cabinet.statut]}>{STATUT_ABO_LABEL[cabinet.statut]}</Badge>
            <span className="text-slate">Pack {cabinet.pack.nom}, {cabinet.periode === 'annuel' ? 'annuel' : 'mensuel'}. Échéance le {formatDate(cabinet.fin)}{cabinet.statut !== 'expire' ? ` (${cabinet.jours_restants} jour${cabinet.jours_restants > 1 ? 's' : ''})` : ''}.</span>
          </div>
          <dl className="grid grid-cols-[150px_1fr] gap-y-1.5">
            {row('Responsable', cabinet.responsable)}{row('Entité', cabinet.entite_label)}{row("Numéro d'ordre", cabinet.ordre)}{row('Adresse', [cabinet.adresse, cabinet.ville].filter(Boolean).join(', '))}
            {row('Téléphone', cabinet.telephone)}{row('E-mail', cabinet.email)}{row('Vétérinaires', cabinet.veterinaires)}{row('Origine', SOURCE_LABEL[cabinet.source] ?? cabinet.source)}
            {row('Offre appliquée', cabinet.promo)}{row("Adresse d'accès", <span className="break-all">{cabinet.url}</span>)}
          </dl>
          <section>
            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[.8px] text-slate">Paiements</h4>
            {cabinet.paiements.length === 0 ? <p className="text-slate">Aucun paiement enregistré.</p> : (
              <ul className="divide-y divide-[#eef2f5] rounded-lg border border-line">
                {cabinet.paiements.map((p) => <li key={p.date + p.libelle} className="flex flex-wrap justify-between gap-2 px-3 py-2"><span>{p.libelle}</span><span className="text-slate">{formatDateTime(p.date)}, {p.moyen}, <b className="text-ink">{formatFcfa(p.montant)}</b></span></li>)}
              </ul>
            )}
          </section>
          <form onSubmit={handleSubmit((f) => onExtend(Number(f.jours)))} noValidate className="flex items-end gap-3 rounded-lg bg-mist px-4 py-3">
            <Input wrapperClassName="w-40" label="Prolonger de (jours)" inputMode="numeric" error={errors.jours?.message} {...register('jours')} />
            <Button type="submit" loading={extending}>Prolonger</Button>
          </form>
        </div>
      )}
    </Modal>
  );
}
