import { Plus, X } from 'lucide-react';
import { formatFcfa } from '@/core/utils/format';
import { Button, Input } from '@/shared/ui';
import { Row, emptyRow, rowsTotal } from '../models/comptes';

/** Liste de bénéficiaires ou de destinataires : nom, numéro ou alias, montant. */
export function RowsEditor({ rows, onChange, multiple, nameLabel }: { rows: Row[]; onChange: (rows: Row[]) => void; multiple: boolean; nameLabel: string }) {
  const set = (i: number, patch: Partial<Row>) => onChange(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_110px_auto] items-end gap-2">
          <Input label={i === 0 ? nameLabel : undefined} aria-label={`${nameLabel} ${i + 1}`} value={r.nom} onChange={(e) => set(i, { nom: e.target.value })} />
          <Input label={i === 0 ? 'Numéro ou alias' : undefined} aria-label={`Numéro ou alias ${i + 1}`} value={r.alias} onChange={(e) => set(i, { alias: e.target.value })} />
          <Input label={i === 0 ? 'Montant' : undefined} aria-label={`Montant ${i + 1}`} inputMode="numeric" value={r.montant} onChange={(e) => set(i, { montant: e.target.value })} />
          {multiple && rows.length > 2 ? <Button type="button" size="icon" variant="danger" aria-label={`Retirer la ligne ${i + 1}`} onClick={() => onChange(rows.filter((_, k) => k !== i))}><X size={14} /></Button> : <span className="w-[34px]" />}
        </div>
      ))}
      <div className="flex items-center justify-between">
        {multiple ? <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...rows, emptyRow()])}><Plus size={14} /> Ajouter une ligne</Button> : <span />}
        <p className="text-[13px]">Total <b className="tabular-nums">{formatFcfa(rowsTotal(rows))}</b></p>
      </div>
    </div>
  );
}
