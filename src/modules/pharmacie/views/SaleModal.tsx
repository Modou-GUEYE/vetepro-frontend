import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { formatFcfa } from '@/core/utils/format';
import { PAYMENT_MODES, modeLabel } from '@/modules/facturation/models/facture';
import { useOwnerChoices } from '@/modules/proprietaires/viewmodels/useOwnerChoices';
import { Button, Input, Modal, Select } from '@/shared/ui';
import { SaleForm, emptySaleForm, saleFormSchema, saleSummary } from '../models/pharmacie';
import { useArticleChoices } from '../viewmodels/useArticleChoices';

export function SaleModal({ target, saving, onSubmit, onClose }: { target: { articleId: string } | null; saving: boolean; onSubmit: (f: SaleForm) => void; onClose: () => void }) {
  const choices = useArticleChoices();
  const owners = useOwnerChoices();
  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<SaleForm>({ resolver: zodResolver(saleFormSchema), defaultValues: emptySaleForm() });
  const { fields, append, remove } = useFieldArray({ control, name: 'lignes' });
  useEffect(() => { if (target) { const f = emptySaleForm(); f.lignes[0].articleId = target.articleId; reset(f); } }, [target, reset]);

  const lignes = watch('lignes');
  // Recalculé à chaque rendu : react-hook-form modifie le tableau des lignes sur place, un calcul mis en cache ne verrait pas les changements.
  const { total, over } = saleSummary(lignes, choices.data ?? []);
  const blocked = over.length > 0;

  return (
    <Modal open={!!target} onClose={onClose} size="lg" title="Vente directe, pharmacie"
      footer={<><Button variant="secondary" onClick={onClose}>Annuler</Button><Button loading={saving} disabled={blocked} onClick={handleSubmit(onSubmit)}>Enregistrer et facturer</Button></>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Date *" type="date" error={errors.date?.message} {...register('date')} />
          <Select label="Client (propriétaire)" {...register('proprietaireId')}>
            <option value="">Client anonyme</option>
            {(owners.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
          </Select>
          <Select label="Mode de paiement" {...register('mode')}>{PAYMENT_MODES.map((m) => <option key={m} value={m}>{modeLabel(m)}</option>)}</Select>
          <Input label="Notes" placeholder="Remarques, conseils dispensés" {...register('notes')} />
        </div>

        <div>
          <h4 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1.2px] text-slate">Articles vendus<span className="h-px flex-1 bg-line" /></h4>
          {errors.lignes?.root?.message || errors.lignes?.message ? <p className="mb-2 text-xs text-danger">{errors.lignes?.message ?? errors.lignes?.root?.message}</p> : null}
          <div className="space-y-2">
            {fields.map((f, i) => {
              const choice = choices.data?.find((c) => c.id === lignes[i]?.articleId);
              const tooMany = !!choice && over.includes(choice.id);
              return (
                <div key={f.id} className="grid grid-cols-[1fr_80px_110px_auto] items-start gap-2">
                  <div>
                    <Select aria-label={`Article ligne ${i + 1}`} error={errors.lignes?.[i]?.articleId?.message} {...register(`lignes.${i}.articleId`)}>
                      <option value="">Choisir un article…</option>
                      {(choices.data ?? []).map((a) => <option key={a.id} value={a.id} disabled={a.quantite <= 0}>{a.nom}, {a.quantite > 0 ? `${a.quantite} en stock` : 'épuisé'}</option>)}
                    </Select>
                    {tooMany && <p className="mt-1 text-xs text-danger">Stock insuffisant : {choice.quantite} disponible(s)</p>}
                  </div>
                  <Input aria-label={`Quantité ligne ${i + 1}`} inputMode="numeric" error={errors.lignes?.[i]?.quantite?.message} {...register(`lignes.${i}.quantite`)} />
                  <p className="pt-2 text-right text-[13px] font-semibold tabular-nums" aria-label={`Total ligne ${i + 1}`}>{choice ? formatFcfa(choice.prix * (Number(lignes[i]?.quantite) || 0)) : '0 FCFA'}</p>
                  <Button type="button" size="icon" variant="danger" aria-label={`Retirer la ligne ${i + 1}`} disabled={fields.length === 1} onClick={() => remove(i)}><X size={14} /></Button>
                </div>
              );
            })}
          </div>
          <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => append({ articleId: '', quantite: '1' })}><Plus size={13} /> Ligne</Button>
          <p className="mt-3 text-right font-display text-lg font-bold text-brand-text" aria-live="polite">Total : {formatFcfa(total)}</p>
        </div>
      </form>
    </Modal>
  );
}
