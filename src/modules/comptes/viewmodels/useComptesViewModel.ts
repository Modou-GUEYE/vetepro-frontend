import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { unprocessableMessage } from '@/core/http/errors';
import { formatFcfa } from '@/core/utils/format';
import { toast } from '@/shared/ui';
import { Alias, TransferType } from '../models/comptes';
import { RequestBody, TransferBody, comptesService } from '../services/comptes.service';

export type ComptesTab = 'comptes' | 'alias' | 'transferts' | 'demandes';
export type Dialog = { kind: 'transfer'; type: TransferType; from?: string } | { kind: 'alias' } | { kind: 'request'; multiple: boolean } | { kind: 'request-detail'; id: string } | null;

/** Gestion de compte : comptes et soldes, alias de réception, transferts (code de validation) et demandes de paiement. */
export function useComptesViewModel() {
  const can = useCan();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ComptesTab>('comptes');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Alias | null>(null);

  const accounts = useQuery({ queryKey: ['comptes', 'accounts'], queryFn: comptesService.accounts, refetchInterval: 10_000 });
  const aliases = useQuery({ queryKey: ['comptes', 'alias'], queryFn: comptesService.aliases, enabled: tab === 'alias' });
  const transfers = useQuery({ queryKey: ['comptes', 'transfers'], queryFn: comptesService.transfers, enabled: tab === 'transferts', refetchInterval: tab === 'transferts' ? 3000 : false });
  const requests = useQuery({ queryKey: ['comptes', 'requests'], queryFn: comptesService.requests, enabled: tab === 'demandes' || dialog?.kind === 'request-detail' });
  const clients = useQuery({ queryKey: ['comptes', 'clients'], queryFn: comptesService.clients, enabled: dialog?.kind === 'request', staleTime: 60_000 });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['comptes'] });
  const onError = (e: unknown) => setError(unprocessableMessage(e));
  const close = () => { setDialog(null); setError(null); };

  const addAlias = useMutation({ mutationFn: comptesService.addAlias, onSuccess: (a) => { toast.success(`Alias ${a.valeur} ajouté`); close(); refresh(); }, onError });
  const setDefault = useMutation({ mutationFn: comptesService.setDefault, onSuccess: (a) => { toast.success(`Alias par défaut : ${a.valeur}`); refresh(); } });
  const toggle = useMutation({ mutationFn: comptesService.toggleAlias, onSuccess: refresh });
  const remove = useMutation({ mutationFn: comptesService.deleteAlias, onSuccess: () => { toast.success('Alias supprimé'); setToDelete(null); refresh(); } });

  const code = useMutation({ mutationFn: comptesService.requestCode });
  const transfer = useMutation({
    mutationFn: (b: TransferBody) => comptesService.transfer(b),
    onSuccess: (t) => { toast.success(`Transfert ${t.reference} de ${formatFcfa(t.montant)} ${t.statut === 'succes' ? 'effectué' : 'transmis, en attente de confirmation'}`); close(); setTab('transferts'); refresh(); }, onError,
  });
  const request = useMutation({
    mutationFn: (b: RequestBody) => comptesService.createRequest(b),
    onSuccess: (d) => { toast.success(`Demande ${d.reference} envoyée à ${d.destinataires.length} destinataire${d.destinataires.length > 1 ? 's' : ''}`); close(); setTab('demandes'); refresh(); }, onError,
  });
  const act = useMutation({
    mutationFn: (v: { id: string; index: number; action: 'relance' | 'paye' | 'refuse' | 'annule' }) => comptesService.actOnRecipient(v.id, v.index, v.action),
    onSuccess: (_d, v) => { toast.success({ relance: 'Relance envoyée', paye: 'Paiement reçu, portefeuille crédité', refuse: 'Demande refusée par le destinataire', annule: 'Demande annulée' }[v.action]); refresh(); },
  });

  return {
    tab, setTab, dialog, error, canCreate: can('comptes', 'create'), canUpdate: can('comptes', 'update'), canDelete: can('comptes', 'delete'),
    openDialog: (d: Dialog) => { setError(null); setDialog(d); }, closeDialog: close,
    accounts: accounts.data?.items ?? [], totalBalance: accounts.data?.solde_total ?? 0, operations: accounts.data?.operations ?? [], loadingAccounts: accounts.isLoading,
    aliases: aliases.data ?? [], transfers: transfers.data ?? [], requests: requests.data ?? [], clients: clients.data ?? [],
    addAlias: (v: { compte_id: string; type: string; valeur: string; defaut: boolean }) => addAlias.mutate(v), addingAlias: addAlias.isPending,
    setDefault: (id: string) => setDefault.mutate(id), toggleAlias: (id: string) => toggle.mutate(id),
    toDelete, askDelete: setToDelete, confirmDelete: () => toDelete && remove.mutate(toDelete.id), deleting: remove.isPending,
    requestCode: () => code.mutateAsync(), requestingCode: code.isPending,
    submitTransfer: (b: TransferBody) => transfer.mutate(b), transferring: transfer.isPending,
    submitRequest: (b: RequestBody) => request.mutate(b), requesting: request.isPending,
    act: (id: string, index: number, action: 'relance' | 'paye' | 'refuse' | 'annule') => act.mutate({ id, index, action }), acting: act.isPending,
  };
}
