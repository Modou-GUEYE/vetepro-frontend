import { Table, cellText } from '../models/report';

const TH = ({ children, right }: { children?: React.ReactNode; right?: boolean }) => (
  <th className={`whitespace-nowrap border-b border-line bg-[#f8fafb] px-4 py-3 text-[11px] font-semibold uppercase tracking-[.8px] text-slate ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);

/** Tableau en lecture seule ; une ligne portant un identifiant est cliquable pour en voir le détail. */
export function DataTable({ table, onRow, empty = 'Aucune donnée sur la période sélectionnée' }: { table: Table; onRow?: (id: string) => void; empty?: string }) {
  if (table.lignes.length === 0) return <p className="p-8 text-center text-[13px] text-slate">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead><tr>{table.colonnes.map((c) => <TH key={c.cle} right={c.type === 'fcfa' || c.type === 'nombre'}>{c.libelle}</TH>)}</tr></thead>
        <tbody>
          {table.lignes.map((l, i) => (
            <tr key={i} onClick={l.id && onRow ? () => onRow(l.id!) : undefined} className={`border-b border-[#eef2f5] ${l.id && onRow ? 'cursor-pointer hover:bg-mist' : ''}`}>
              {l.cells.map((v, j) => {
                const c = table.colonnes[j];
                const num = c.type === 'fcfa' || c.type === 'nombre';
                return <td key={c.cle} className={`px-4 py-2.5 ${num ? 'whitespace-nowrap text-right tabular-nums' : ''}`}>{cellText(c, v) || '—'}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
