import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useCan } from '@/core/auth/permissions';
import { dashboardService } from '../services/dashboard.service';

/** Tableau de bord : indicateurs calculés en temps réel (relus toutes les minutes) et raccourcis selon les droits. */
export function useDashboardViewModel() {
  const can = useCan();
  const navigate = useNavigate();
  const [rdvOpen, setRdvOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const q = useQuery({ queryKey: ['dashboard'], queryFn: dashboardService.get, refetchInterval: 60_000 });
  return {
    data: q.data, loading: q.isLoading, error: q.isError, refetch: q.refetch,
    canRdv: can('rdv', 'create'), canConsult: can('consultations', 'create'),
    rdvOpen, openRdv: () => setRdvOpen(true), closeRdv: () => setRdvOpen(false),
    consultOpen, openConsult: () => setConsultOpen(true), closeConsult: () => setConsultOpen(false),
    go: (to: string) => navigate(to),
  };
}
