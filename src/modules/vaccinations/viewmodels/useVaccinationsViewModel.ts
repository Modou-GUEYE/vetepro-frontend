import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { useDebounce } from '@/core/utils/useDebounce';
import { vaccinationService } from '../services/vaccination.service';

export function useVaccinationsViewModel() {
  const can = useCan();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [programming, setProgramming] = useState(false);
  const [campagneId, setCampagneId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const q = useDebounce(search);
  const list = useQuery({ queryKey: ['vaccinations', q], queryFn: () => vaccinationService.list(q), placeholderData: keepPreviousData });
  const campagnes = useQuery({ queryKey: ['campagnes'], queryFn: vaccinationService.campagnes });

  return {
    rows: list.data?.items ?? [], stats: list.data?.stats, loading: list.isLoading, search, setSearch,
    campagnes: [...(campagnes.data ?? [])].sort((a, b) => b.date.localeCompare(a.date)), campagnesLoading: campagnes.isLoading,
    canCreate: can('vaccinations', 'create'), canUpdate: can('vaccinations', 'update'),
    adding, openAdd: () => setAdding(true), closeAdd: () => setAdding(false),
    programming, openProgram: () => setProgramming(true), closeProgram: () => setProgramming(false),
    campagneId, openCampagne: setCampagneId, closeCampagne: () => setCampagneId(null),
    documentId, openDocument: setDocumentId, closeDocument: () => setDocumentId(null),
  };
}

/** Carnet vaccinal d'un patient et actions de l'onglet « Vaccins ». */
export function usePatientVaccins(patientId: string) {
  const can = useCan();
  const carnet = useQuery({ queryKey: ['vaccinations', 'carnet', patientId], queryFn: () => vaccinationService.carnet(patientId) });
  const [billingId, setBillingId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  return {
    rows: carnet.data ?? [], loading: carnet.isLoading, canBill: can('vaccinations', 'update'),
    billingId, openBilling: setBillingId, closeBilling: () => setBillingId(null),
    documentId, openDocument: setDocumentId, closeDocument: () => setDocumentId(null),
  };
}
