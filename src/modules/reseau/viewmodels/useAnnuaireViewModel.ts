import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { unprocessableMessage } from '@/core/http/errors';
import { toast } from '@/shared/ui';
import { patientsService } from '@/modules/patients/services/patients.service';
import { Confrere, OrientationForm } from '../models/reseau';
import { reseauService } from '../services/reseau.service';

/** Annuaire du réseau : recherche d'un confrère et orientation d'un patient vers lui. */
export function useAnnuaireViewModel() {
  const can = useCan();
  const [q, setQ] = useState('');
  const [target, setTarget] = useState<Confrere | null>(null);
  const list = useQuery({ queryKey: ['reseau-annuaire', q], queryFn: () => reseauService.annuaire(q) });
  const canOrient = can('reseau', 'create') && can('patients');
  const patients = useQuery({ queryKey: ['reseau-patients'], queryFn: () => patientsService.list({ page: 1, pageSize: 100 }), enabled: !!target && canOrient, staleTime: 60_000 });
  const orient = useMutation({
    mutationFn: (f: OrientationForm) => reseauService.orient(target!.id, f),
    onSuccess: (o) => { toast.success(`Dossier de ${o.patient} transmis à ${o.confrere}`); setTarget(null); },
    onError: (e) => { const m = unprocessableMessage(e); if (m) toast.error(m); },
  });
  return {
    confreres: list.data ?? [], loading: list.isLoading, q, setQ, canOrient,
    target, openOrient: setTarget, closeOrient: () => setTarget(null), patients: patients.data?.items ?? [], patientsLoading: patients.isLoading,
    send: (f: OrientationForm) => orient.mutateAsync(f).catch(() => undefined), sending: orient.isPending,
  };
}
