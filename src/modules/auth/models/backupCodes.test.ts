import { describe, expect, it } from 'vitest';
import { codesToText } from './backupCodes';

describe('codes de secours', () => {
  it('liste un code par ligne sous un rappel d\'usage', () => {
    expect(codesToText(['AB12-CD34', 'EF56-GH78'], 'Cabinet du Sud').split('\n')).toEqual([
      'Codes de secours Cabinet du Sud', "Chaque code ne sert qu'une seule fois. Gardez-les en lieu sûr.", '', 'AB12-CD34', 'EF56-GH78',
    ]);
  });
});
