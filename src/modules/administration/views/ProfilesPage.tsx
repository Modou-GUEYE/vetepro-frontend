import { Copy, Lock } from 'lucide-react';
import clsx from 'clsx';
import { TOTAL_RIGHTS, countRights } from '@/core/auth/permissions';
import { Badge, Button, Input, Modal, Panel, Skeleton } from '@/shared/ui';
import { useProfilesViewModel } from '../viewmodels/useProfilesViewModel';
import { PermissionMatrix } from './PermissionMatrix';

const DOT: Record<string, string> = { admin: 'bg-danger', veterinaire: 'bg-brand', assistant: 'bg-info' };

export function ProfilesPage() {
  const vm = useProfilesViewModel();
  const selected = vm.selected;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {vm.loading
          ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[74px]" />)
          : vm.profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => vm.select(p.id)}
                aria-current={p.id === selected?.id}
                className={clsx(
                  'rounded-lg2 border px-[18px] py-4 text-left shadow-card transition',
                  p.id === selected?.id ? 'border-brand bg-brand-pale ring-2 ring-brand' : 'border-line bg-white hover:border-brand/50',
                )}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <span className={clsx('h-2.5 w-2.5 rounded-full', DOT[p.baseRole] ?? 'bg-slate')} />
                  {p.label}
                </span>
                <span className="mt-1 block text-xs text-slate">{p.usersCount} actif{p.usersCount > 1 ? 's' : ''}, {countRights(p.permissions)}/{TOTAL_RIGHTS} droits</span>
              </button>
            ))}
      </div>

      {selected && (
        <Panel
          title={selected.label}
          actions={<>
            <Badge tone={selected.system ? 'blue' : 'violet'}>{selected.system ? 'Profil de base' : 'Profil dupliqué'}</Badge>
            {vm.canDuplicate && <Button size="sm" variant="secondary" onClick={vm.openDuplicate}><Copy size={13} /> Dupliquer</Button>}
          </>}
        >
          <div className="space-y-4 p-5">
            <div className="rounded-lg bg-mist px-4 py-3 text-[13px]">
              <b>Profil :</b> {selected.label}
              <p className="mt-0.5 text-slate">Toute modification s'applique immédiatement aux utilisateurs de ce profil.</p>
            </div>
            {selected.id === 'admin' && (
              <p className="flex items-center gap-2 rounded-lg bg-amber-pale px-3 py-2 text-xs text-amber-text">
                <Lock size={14} /> L'Administrateur garde tous les droits sur les utilisateurs et les habilitations.
              </p>
            )}
            <PermissionMatrix cell={vm.cell} onToggle={vm.toggle} locked={vm.locked} readOnly={!vm.canEdit} />
            {vm.canEdit && (
              <div className="flex justify-end gap-2">
                <Button variant="secondary" disabled={!vm.dirty} onClick={vm.discard}>Annuler</Button>
                <Button disabled={!vm.dirty} loading={vm.saving} onClick={vm.save}>Enregistrer</Button>
              </div>
            )}
          </div>
        </Panel>
      )}

      <Modal
        open={vm.duplicating}
        onClose={vm.closeDuplicate}
        title={`Dupliquer « ${selected?.label ?? ''} »`}
        footer={
          <>
            <Button variant="secondary" onClick={vm.closeDuplicate}>Annuler</Button>
            <Button loading={vm.duplicateBusy} disabled={!vm.label.trim()} onClick={vm.submitDuplicate}>Créer le profil</Button>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); if (vm.label.trim()) vm.submitDuplicate(); }}>
          <Input label="Libellé du nouveau profil *" autoFocus value={vm.label} onChange={(e) => vm.setLabel(e.target.value)} hint="Le nouveau profil reprend les habilitations du profil copié." />
        </form>
      </Modal>
    </div>
  );
}
