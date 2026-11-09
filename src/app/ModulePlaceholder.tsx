import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { EmptyState } from '@/shared/ui';
import { ALL_ITEMS } from './layout/navigation';

/** Écran réservé : sera remplacé par la View du module au lot indiqué. */
export function ModulePlaceholder() {
  const { pathname } = useLocation();
  const item = ALL_ITEMS.find((i) => i.path === pathname);
  return (
    <div className="rounded-lg2 border border-line bg-white shadow-card">
      <EmptyState icon={<Construction size={36} />} title={item?.label ?? 'Module'} description={`Cet écran sera livré au lot ${item?.lot ?? ''}.`} />
    </div>
  );
}
