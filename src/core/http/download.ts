import { http } from './client';

/** Taille lisible d'un fichier : « 340 Ko », « 1,2 Mo ». */
export const formatFileSize = (octets: number) => (octets < 1024 * 1024 ? `${Math.max(1, Math.round(octets / 1024))} Ko` : `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`);

/** Télécharge un fichier protégé par l'authentification : on le récupère avec la session puis on le propose à l'enregistrement. */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const { data } = await http.get<Blob>(url, { responseType: 'blob' });
  const href = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}
