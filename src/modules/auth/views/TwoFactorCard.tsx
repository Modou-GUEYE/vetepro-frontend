import { useState } from 'react';
import { KeyRound, ShieldCheck, ShieldOff, TriangleAlert } from 'lucide-react';
import { Badge, Button, Modal, PasswordInput } from '@/shared/ui';
import { METHOD_LABEL, TwoFactorMethod } from '../models/auth';
import { useTwoFactorViewModel } from '../viewmodels/useTwoFactorViewModel';
import { BackupCodes } from './BackupCodes';
import { MethodPicker } from './MethodPicker';
import { OtpInput } from './OtpInput';

const Alert = ({ children }: { children: React.ReactNode }) => (
  <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-pale px-3 py-2 text-[13px] font-semibold text-danger-text"><TriangleAlert size={16} className="mt-px shrink-0" /> {children}</p>
);

export function TwoFactorCard() {
  const vm = useTwoFactorViewModel();
  const s = vm.status;
  const [methode, setMethode] = useState<TwoFactorMethod>('sms');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const d = vm.dialog;
  const close = () => { setCode(''); setPassword(''); vm.close(); };

  return (
    <div className="rounded-lg2 border border-line bg-white p-5 shadow-card">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-bold">Double authentification</h3>
        {s && <Badge tone={s.active ? 'green' : 'slate'}>{s.active ? 'Activée' : 'Désactivée'}</Badge>}
      </div>
      <p className="mb-4 text-xs text-slate">Protégez votre compte avec un second facteur à chaque connexion.</p>

      {s?.active ? (
        <div className="space-y-3 text-[13px]">
          <p className="flex items-center gap-2"><ShieldCheck size={16} className="text-brand" /> Méthode : <b>{s.methode ? METHOD_LABEL[s.methode] : ''}</b></p>
          <p className="flex items-center gap-2"><KeyRound size={16} className="text-slate" /> Codes de secours restants : <b>{s.codesSecoursRestants}</b></p>
          {s.requise && <p className="rounded-lg bg-mist px-3 py-2 text-xs text-slate">La double authentification est obligatoire dans votre cabinet : elle ne peut pas être désactivée.</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="secondary" onClick={() => vm.openPassword('renew')}>Nouveaux codes de secours</Button>
            {!s.requise && <Button size="sm" variant="danger" onClick={() => vm.openPassword('disable')}><ShieldOff size={13} /> Désactiver</Button>}
          </div>
        </div>
      ) : (
        <Button size="sm" onClick={vm.openActivation} disabled={vm.loading}><ShieldCheck size={14} /> Activer la double authentification</Button>
      )}

      <Modal open={d?.name === 'method'} onClose={close} title="Activer la double authentification"
        footer={<><Button variant="secondary" onClick={close}>Annuler</Button><Button loading={vm.busy} onClick={() => vm.chooseMethod(methode)}>Recevoir un code</Button></>}>
        <div className="space-y-4">{vm.error && <Alert>{vm.error}</Alert>}<MethodPicker value={methode} onChange={setMethode} /></div>
      </Modal>

      <Modal open={d?.name === 'code'} onClose={close} title="Saisissez le code"
        footer={<><Button variant="secondary" onClick={close}>Annuler</Button><Button loading={vm.busy} disabled={code.length !== 6} onClick={() => vm.confirmCode(code)}>Activer</Button></>}>
        {d?.name === 'code' && (
          <div className="space-y-4">
            {vm.error && <Alert>{vm.error}</Alert>}
            <p className="text-[13px] text-slate">{d.methode === 'app' ? `Saisissez le code affiché par ${d.destinataire}.` : `Un code a été envoyé par ${METHOD_LABEL[d.methode]} à ${d.destinataire}.`}</p>
            <OtpInput value={code} onChange={setCode} autoFocus />
            {import.meta.env.DEV && <p className="rounded-lg bg-info-pale px-3 py-2 text-xs text-info-text">Simulation : le code de démonstration est <b className="tracking-widest">123456</b>.</p>}
          </div>
        )}
      </Modal>

      <Modal open={d?.name === 'codes'} onClose={close} title="Codes de secours" footer={<Button onClick={close}>J'ai enregistré mes codes</Button>}>
        {d?.name === 'codes' && (
          <div className="space-y-4">
            <p className="text-[13px] text-slate">{d.renewed ? 'Les anciens codes ne fonctionnent plus. ' : ''}Chaque code ne sert qu'une fois. Ils ne s'affichent qu'ici : gardez-les en lieu sûr.</p>
            <BackupCodes codes={d.codes} />
          </div>
        )}
      </Modal>

      <Modal open={d?.name === 'password'} onClose={close} title={d?.name === 'password' && d.action === 'disable' ? 'Désactiver la double authentification' : 'Nouveaux codes de secours'}
        footer={d?.name === 'password' && (
          <><Button variant="secondary" onClick={close}>Annuler</Button>
            <Button variant={d.action === 'disable' ? 'danger' : 'primary'} loading={vm.busy} disabled={!password} onClick={() => vm.submitPassword(d.action, password)}>{d.action === 'disable' ? 'Désactiver' : 'Générer'}</Button></>
        )}>
        <div className="space-y-4">
          {vm.error && <Alert>{vm.error}</Alert>}
          <p className="text-[13px] text-slate">Pour confirmer, saisissez votre mot de passe.</p>
          <PasswordInput label="Mot de passe" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
