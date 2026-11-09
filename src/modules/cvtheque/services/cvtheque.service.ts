import { http } from '@/core/http/client';
import { downloadFile } from '@/core/http/download';
import { Cv, CvFilters, cvsDtoSchema, toParams } from '../models/cv';

export const cvthequeService = {
  async search(f: CvFilters): Promise<Cv[]> { return cvsDtoSchema.parse((await http.get('/cvtheque', { params: toParams(f) })).data).items; },
  download: (cv: Pick<Cv, 'id' | 'fichier'>) => downloadFile(`/cvtheque/${cv.id}/fichier`, cv.fichier?.nom ?? 'cv.pdf'),
};
