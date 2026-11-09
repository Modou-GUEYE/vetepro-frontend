import { Copy, Download } from 'lucide-react';
import { Button, toast } from '@/shared/ui';
import { codesToText } from '../models/backupCodes';

/** Codes de secours à usage unique, remis une seule fois : copie et téléchargement. */
export function BackupCodes({ codes }: { codes: string[] }) {
  const copy = async () => {
    try { await navigator.clipboard.writeText(codesToText(codes)); toast.success('Codes copiés'); } catch { toast.warning('Copie impossible, notez les codes à la main'); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([codesToText(codes)], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'codes-de-secours.txt'; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <ul aria-label="Codes de secours" className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-mist p-3 font-mono text-[13px] font-bold tracking-wider">
        {codes.map((c) => <li key={c} className="rounded-lg bg-white px-2 py-1.5 text-center">{c}</li>)}
      </ul>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={copy}><Copy size={13} /> Copier</Button>
        <Button type="button" size="sm" variant="secondary" onClick={download}><Download size={13} /> Télécharger</Button>
      </div>
    </div>
  );
}
