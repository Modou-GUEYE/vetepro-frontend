/** Texte à copier ou à télécharger : un code par ligne, avec un rappel d'usage. */
export const codesToText = (codes: string[], cabinet = 'VétéPro') =>
  [`Codes de secours ${cabinet}`, 'Chaque code ne sert qu\'une seule fois. Gardez-les en lieu sûr.', '', ...codes].join('\n');
