import { Info } from 'lucide-react';
import { Button, EmptyState, Modal, Skeleton } from '@/shared/ui';
import { UserRow, fullName } from '../models/administration';
import { useUserRightsViewModel } from '../viewmodels/useUserRightsViewModel';
import { PermissionMatrix } from './PermissionMatrix';

function Legend() {
  const dot = 'inline-block h-3 w-3 rounded border';
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate">
      <li className="flex items-center gap-1.5"><span className={`${dot} border-brand/40 bg-brand-pale`} /> Hérité du profil</li>
      <li className="flex items-center gap-1.5"><span className={`${dot} border-brand bg-brand-pale ring-2 ring-brand/30`} /> Accordé en plus</li>
      <li className="flex items-center gap-1.5"><span className={`${dot} border-danger bg-danger-pale ring-2 ring-danger/25`} /> Retiré malgré le profil</li>
    </ul>
  );
}

export function UserRightsModal({ user, onClose, onSaved }: { user: UserRow; onClose: () => void; onSaved: () => void }) {
  const vm = useUserRightsViewModel(user, onSaved);
  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={`Habilitations de ${fullName(user)}`}
      footer={
        <>
          <Button variant="ghost" onClick={vm.reset} disabled={vm.exceptionsCount === 0}>Revenir au profil</Button>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button loading={vm.saving} onClick={vm.save}>Enregistrer</Button>
        </>
      }
    >
      {vm.loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-9" />)}</div>
      ) : (
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-[13px] text-slate">
            <Info size={16} className="mt-px shrink-0 text-brand" />
            <span>Les droits partent du profil <b className="text-ink">{vm.profilLabel}</b>. Cliquez sur une case pour accorder ou retirer un droit à cet utilisateur uniquement ; le changement s'applique immédiatement.</span>
          </p>
          <Legend />
          <PermissionMatrix cell={vm.cell} onToggle={vm.toggle} />
          <p className="text-xs text-faint">{vm.exceptionsCount === 0 ? 'Aucune exception : les droits sont ceux du profil.' : `${vm.exceptionsCount} exception${vm.exceptionsCount > 1 ? 's' : ''} par rapport au profil.`}</p>
        </div>
      )}
      {!vm.loading && !vm.profilLabel && <EmptyState title="Profil introuvable" />}
    </Modal>
  );
}
