import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ACTIVITES, Activite, PeriodKey, periodRange } from '../models/report';
import { reportingService } from '../services/reporting.service';

/** Rapport réglementaire : l'aperçu n'est demandé qu'au clic, avec les activités et la période choisies. */
export function useRegulatoryViewModel() {
  const [period, setPeriod] = useState<Exclude<PeriodKey, 'tout'>>('trim');
  const [du, setDu] = useState('');
  const [au, setAu] = useState('');
  const [activites, setActivites] = useState<Activite[]>(ACTIVITES.map((a) => a.key));
  const [asked, setAsked] = useState<{ du: string; au: string; activites: Activite[] } | null>(null);
  const range = periodRange(period, du, au);
  const error = activites.length === 0 ? 'Choisissez au moins une activité' : !range.du || !range.au ? 'Renseignez les dates de la période' : range.au < range.du ? 'La fin de la période précède son début' : '';
  const report = useQuery({ queryKey: ['regulatory', asked], queryFn: () => reportingService.regulatory(asked!), enabled: !!asked });
  return {
    period, setPeriod, du, setDu, au, setAu, range, activites, error,
    toggle: (a: Activite) => setActivites((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a])),
    preview: () => { if (!error) setAsked({ du: range.du, au: range.au, activites }); },
    report: report.data, loading: report.isFetching && !!asked,
  };
}
