import { Modal } from '@/shared/ui';
import { Periode } from '@/modules/abonnement/models/abonnement';
import { useInscriptionViewModel } from '../viewmodels/useInscriptionViewModel';
import { InscriptionWizard } from './InscriptionWizard';

/** Inscription du portail dans une fenêtre : le pack choisi est présélectionné, les quatre étapes sont celles de la page d'inscription. */
export function InscriptionModal({ packId, periode, onClose }: { packId: string; periode: Periode; onClose: () => void }) {
  const vm = useInscriptionViewModel({ packId, periode });
  return (
    <Modal open onClose={onClose} size="lg" title={vm.step === 4 ? 'Bienvenue sur VétéPro' : 'Inscription de votre cabinet'}>
      <InscriptionWizard vm={vm} embedded />
    </Modal>
  );
}
