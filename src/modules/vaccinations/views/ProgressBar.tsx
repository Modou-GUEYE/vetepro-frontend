/** Barre de progression plafonnée à 100 % ; le compteur à côté affiche le nombre réel. */
export function ProgressBar({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'amber' | 'danger' }) {
  const color = tone === 'danger' ? 'bg-danger' : tone === 'amber' ? 'bg-amber' : 'bg-brand';
  return (
    <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-mist">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
