const fcfa = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** 12500 -> « 12 500 FCFA » */
export const formatFcfa = (n: number) => `${fcfa.format(n).replace(/[\u202f\u00a0]/g, ' ')} FCFA`;

export const formatDate = (d: string | Date) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(d),
  );

export const formatDateTime = (d: string | Date) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(d));

/** « 6 ans », « 8 mois » ou « 12 jours » à partir d'une date de naissance ISO. */
export function ageLabel(naissance: string | null, now = new Date()): string {
  if (!naissance) return '';
  const b = new Date(naissance);
  if (Number.isNaN(b.getTime()) || b > now) return '';
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months >= 12) { const y = Math.floor(months / 12); return `${y} an${y > 1 ? 's' : ''}`; }
  if (months >= 1) return `${months} mois`;
  const days = Math.max(0, Math.floor((now.getTime() - b.getTime()) / 86_400_000));
  return `${days} jour${days > 1 ? 's' : ''}`;
}
