import { Check, KeyRound, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Badge, Button, Column, ConfirmDialog, Input, Panel, Select, Table } from '@/shared/ui';
import { UserRow, fullName, initials } from '../models/administration';
import { useProfilesQuery } from '../viewmodels/useProfilesQuery';
import { useUsersViewModel } from '../viewmodels/useUsersViewModel';
import { PROFILE_TONE } from './profileTone';
import { UserFormModal } from './UserFormModal';
import { UserRightsModal } from './UserRightsModal';

export function UsersPage() {
  const vm = useUsersViewModel();
  const profiles = useProfilesQuery();

  const columns: Column<UserRow>[] = [
    {
      key: 'user', header: 'Utilisateur',
      render: (u) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{initials(u)}</span>
          <div className="min-w-0">
            <div className="truncate font-semibold">{fullName(u)}</div>
            <div className="truncate text-xs text-faint">{u.identifiant}{u.id === vm.currentUserId ? ' (vous)' : ''}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'profil', header: 'Profil',
      render: (u) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={PROFILE_TONE[u.profilBase] ?? 'slate'}>{u.profilLabel}</Badge>
          {u.nbExceptions > 0 && <Badge tone="violet">{u.nbExceptions} exception{u.nbExceptions > 1 ? 's' : ''}</Badge>}
        </div>
      ),
    },
    { key: 'specialite', header: 'Spécialité', render: (u) => u.specialite || <span className="text-faint">—</span> },
    { key: 'contact', header: 'Contact', render: (u) => <div><div>{u.telephone || '—'}</div><div className="text-xs text-faint">{u.email}</div></div> },
    { key: 'securite', header: 'Sécurité', render: (u) => <Badge tone={u.twofa ? 'green' : 'slate'}>{u.twofa ? 'Double authentification' : 'Mot de passe seul'}</Badge> },
    { key: 'statut', header: 'Statut', render: (u) => <Badge tone={u.actif ? 'green' : 'red'}>{u.actif ? 'Actif' : 'Inactif'}</Badge> },
    {
      key: 'actions', header: 'Actions', className: 'whitespace-nowrap',
      render: (u) => u.id === vm.currentUserId ? (
        <span className="text-xs italic text-slate">Compte courant</span>
      ) : (
        <div className="flex gap-1.5">
          {vm.canEdit && <Button size="icon" variant="secondary" title="Modifier" aria-label={`Modifier ${fullName(u)}`} onClick={() => vm.openForm(u)}><Pencil size={14} /></Button>}
          {vm.canRights && <Button size="icon" variant="violet" title="Habilitations" aria-label={`Habilitations de ${fullName(u)}`} onClick={() => vm.openRights(u)}><KeyRound size={14} /></Button>}
          {vm.canEdit && (u.actif
            ? <Button size="icon" variant="danger" title="Désactiver" aria-label={`Désactiver ${fullName(u)}`} onClick={() => vm.askDeactivate(u)}><X size={14} /></Button>
            : <Button size="icon" variant="success" title="Activer" aria-label={`Activer ${fullName(u)}`} onClick={() => vm.activate(u)}><Check size={14} /></Button>)}
          {vm.canDelete && <Button size="icon" variant="secondary" title="Supprimer" aria-label={`Supprimer ${fullName(u)}`} onClick={() => vm.askDelete(u)}><Trash2 size={14} /></Button>}
        </div>
      ),
    },
  ];

  const deleting = vm.confirm?.kind === 'delete';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-[11px] text-faint" />
          <Input aria-label="Rechercher un utilisateur" placeholder="Rechercher (nom, identifiant, profil, e-mail…)" className="pl-9" value={vm.search} onChange={(e) => vm.setSearch(e.target.value)} />
        </div>
        <Select aria-label="Filtrer par profil" wrapperClassName="w-44" value={vm.profil} onChange={(e) => vm.setProfil(e.target.value)}>
          <option value="">Tous les profils</option>
          {(profiles.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </Select>
        <Select aria-label="Filtrer par statut" wrapperClassName="w-40" value={vm.statut} onChange={(e) => vm.setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="actif">Actifs</option>
          <option value="inactif">Inactifs</option>
        </Select>
        {vm.canCreate && <Button onClick={() => vm.openForm('new')}><Plus size={15} /> Nouvel utilisateur</Button>}
      </div>

      <Panel title="Utilisateurs du cabinet" count={`${vm.total} utilisateur${vm.total > 1 ? 's' : ''}`}>
        <Table bare columns={columns} rows={vm.users} rowKey={(u) => u.id} loading={vm.loading} emptyTitle="Aucun utilisateur trouvé"
          page={vm.page} pageSize={vm.pageSize} total={vm.total} onPageChange={vm.setPage} />
      </Panel>

      <UserFormModal target={vm.formTarget} saving={vm.saving} onSubmit={vm.submitForm} onClose={vm.closeForm} />
      {vm.rightsTarget && <UserRightsModal user={vm.rightsTarget} onClose={vm.closeRights} onSaved={vm.afterRights} />}

      <ConfirmDialog
        open={!!vm.confirm} danger loading={vm.confirming}
        title={deleting ? "Supprimer l'utilisateur" : "Désactiver l'utilisateur"}
        message={vm.confirm
          ? deleting
            ? `${fullName(vm.confirm.user)} ne pourra plus se connecter et son compte disparaîtra de la liste. Les données liées sont conservées pour la traçabilité.`
            : `${fullName(vm.confirm.user)} ne pourra plus se connecter tant que son compte ne sera pas réactivé. Ses données sont conservées.`
          : ''}
        confirmLabel={deleting ? 'Supprimer' : 'Désactiver'} onConfirm={vm.runConfirm} onCancel={vm.cancelConfirm}
      />
    </div>
  );
}
