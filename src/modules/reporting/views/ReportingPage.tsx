import { Tabs } from '@/shared/ui';
import { useReportsViewModel } from '../viewmodels/useReportsViewModel';
import { DetailedReports } from './DetailedReports';
import { RegulatoryReportView } from './RegulatoryReportView';

export function ReportingPage() {
  const vm = useReportsViewModel();
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-lg2 border border-line bg-white shadow-card">
        <Tabs items={[{ key: 'detail', label: 'Rapports détaillés' }, { key: 'reglementaire', label: 'Rapport réglementaire' }]} value={vm.tab} onChange={vm.setTab} />
      </div>
      {vm.tab === 'detail' ? <DetailedReports vm={vm} /> : <RegulatoryReportView canExport={vm.canExport} />}
    </div>
  );
}
