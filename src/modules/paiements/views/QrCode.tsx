import { useMemo } from 'react';
import { qrPattern } from '../models/paiements';

/** Image de démonstration : le vrai QR code est fourni par l'opérateur une fois le serveur branché. */
export function QrCode({ value, size = 168 }: { value: string; size?: number }) {
  const cells = useMemo(() => qrPattern(value), [value]);
  const n = cells.length;
  return (
    <svg role="img" aria-label="QR code de paiement" width={size} height={size} viewBox={`0 0 ${n + 2} ${n + 2}`} className="rounded-lg border border-line bg-white" shapeRendering="crispEdges">
      <rect width={n + 2} height={n + 2} fill="#fff" />
      {cells.map((row, r) => row.map((on, c) => on ? <rect key={`${r}-${c}`} x={c + 1} y={r + 1} width="1" height="1" fill="#0b2a30" /> : null))}
    </svg>
  );
}

const CHANNEL_STYLE: Record<string, { bg: string; abbr: string }> = { Wave: { bg: '#1d9bf0', abbr: 'W' }, 'Orange Money': { bg: '#f97316', abbr: 'OM' }, 'PI-SPI': { bg: '#0f766e', abbr: 'PI' } };

export function ChannelChip({ canal }: { canal: string }) {
  const s = CHANNEL_STYLE[canal];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-semibold">
      {s && <span aria-hidden className="inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[9px] font-extrabold text-white" style={{ background: s.bg }}>{s.abbr}</span>}
      {canal}
    </span>
  );
}
