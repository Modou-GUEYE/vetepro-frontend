import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useCan } from '@/core/auth/permissions';
import { useDebounce } from '@/core/utils/useDebounce';
import { PlanningView, RdvRow, addDays, isoDay, monthGrid, rangeOf, weekStart } from '../models/rdv';
import { rdvService } from '../services/rdv.service';

/** Planning : vue (mois, semaine, liste), jour ouvert, filtre par vétérinaire, rendez-vous ouvert (lien ?id= des notifications). */
export function useRdvViewModel() {
  const can = useCan();
  const [params, setParams] = useSearchParams();
  const today = isoDay(new Date());
  const [view, setView] = useState<PlanningView>('mois');
  const [anchor, setAnchor] = useState(today);
  const [selectedDay, setSelectedDay] = useState(today);
  const [vet, setVet] = useState('');
  const [statut, setStatut] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState<{ date?: string } | null>(null);
  const [editing, setEditing] = useState<RdvRow | null>(null);
  const q = useDebounce(search);
  const detailId = params.get('id');

  const range = rangeOf(view, anchor);
  const list = useQuery({
    queryKey: ['rdv', { ...range, vet, statut, q }],
    queryFn: () => rdvService.list({ ...range, veterinaire: vet, statut, q }),
    placeholderData: keepPreviousData,
  });
  const rows = useMemo(() => list.data ?? [], [list.data]);
  const byDay = useMemo(() => {
    const m = new Map<string, RdvRow[]>();
    for (const r of rows) m.set(r.date, [...(m.get(r.date) ?? []), r]);
    for (const l of m.values()) l.sort((a, b) => a.heure.localeCompare(b.heure));
    return m;
  }, [rows]);

  const shift = (dir: 1 | -1) => {
    if (view === 'semaine') setAnchor(addDays(anchor, 7 * dir));
    else { const d = new Date(anchor + 'T00:00:00'); d.setDate(1); d.setMonth(d.getMonth() + dir); setAnchor(isoDay(d)); }
  };
  const openDetail = (id: string) => { const next = new URLSearchParams(params); next.set('id', id); setParams(next, { replace: true }); };
  const closeDetail = () => { const next = new URLSearchParams(params); next.delete('id'); setParams(next, { replace: true }); };

  return {
    view, setView, anchor, today, selectedDay, setSelectedDay, vet, setVet, statut, setStatut, search, setSearch,
    rows, byDay, loading: list.isLoading, grid: view === 'mois' ? monthGrid(anchor) : [], weekDays: view === 'semaine' ? Array.from({ length: 7 }, (_, i) => addDays(weekStart(anchor), i)) : [],
    prev: () => shift(-1), next: () => shift(1), goToday: () => { setAnchor(today); setSelectedDay(today); },
    canCreate: can('rdv', 'create'),
    creating, openCreate: (date?: string) => setCreating({ date }), closeCreate: () => setCreating(null),
    editing, openEdit: setEditing, closeEdit: () => setEditing(null),
    detailId, openDetail, closeDetail,
  };
}
