import clsx from 'clsx';
import { CreditCard, QrCode, Smartphone } from 'lucide-react';
import { Input, Select } from '@/shared/ui';
import { MoyenForm, OPERATEURS_DEFAUT } from '../models/abonnement';

/** Choix du moyen de paiement : carte (numéro, expiration, code) ou mobile money (opérateur, numéro). Le contrôle du format est dans `moyenError`. */
export function PaymentFields({ value, onChange, operateurs = OPERATEURS_DEFAUT, error }: { value: MoyenForm; onChange: (m: MoyenForm) => void; operateurs?: string[]; error?: string | null }) {
  const set = (patch: Partial<MoyenForm>) => onChange({ ...value, ...patch });
  const tab = (type: MoyenForm['type'], label: string, Icon: typeof CreditCard) => (
    <button
      type="button" role="radio" aria-checked={value.type === type} onClick={() => set({ type, numero: '', expiration: '', cvc: '', operateur: '' })}
      className={clsx('flex flex-1 items-center justify-center gap-2 rounded-[10px] border px-3 py-2.5 text-[13px] font-semibold transition', value.type === type ? 'border-brand bg-brand-pale text-brand-text' : 'border-line bg-white text-slate hover:bg-mist')}
    ><Icon size={16} /> {label}</button>
  );
  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Moyen de paiement" className="flex gap-2">{tab('mobile', 'Mobile money', Smartphone)}{tab('pispi', 'PI-SPI', QrCode)}{tab('carte', 'Carte bancaire', CreditCard)}</div>
      {value.type === 'carte' ? (
        <div className="grid grid-cols-2 gap-3">
          <Input wrapperClassName="col-span-2" label="Numéro de la carte *" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={value.numero} onChange={(e) => set({ numero: e.target.value })} />
          <Input label="Expiration *" autoComplete="cc-exp" placeholder="MM/AA" value={value.expiration} onChange={(e) => set({ expiration: e.target.value })} />
          <Input label="Code de sécurité *" inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={value.cvc} onChange={(e) => set({ cvc: e.target.value })} />
        </div>
      ) : value.type === 'pispi' ? (
        <Input label="Alias PI-SPI *" placeholder="SN-PI-123456" value={value.numero} onChange={(e) => set({ numero: e.target.value })} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Select label="Opérateur *" value={value.operateur} onChange={(e) => set({ operateur: e.target.value })}>
            <option value="">Choisir</option>
            {operateurs.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
          <Input label="Numéro *" inputMode="tel" autoComplete="tel" placeholder="77 123 45 67" value={value.numero} onChange={(e) => set({ numero: e.target.value })} />
        </div>
      )}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
