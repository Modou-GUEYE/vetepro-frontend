import { CheckCircle2, Mail } from 'lucide-react';
import { formatDate } from '@/core/utils/format';
import { Button, Modal } from '@/shared/ui';
import { Registration } from '@/modules/abonnement/models/abonnement';

/** Résultat de la création d'une entité : adresse d'accès et encadré de simulation de l'e-mail (en production, le mot de passe part uniquement par e-mail). */
export function CredentialsModal({ result, onClose }: { result: Registration | null; onClose: () => void }) {
  return (
    <Modal open={!!result} onClose={onClose} title="Entité créée" footer={<Button onClick={onClose}>Fermer</Button>}>
      {result && (
        <div className="space-y-4 text-[13px]">
          <div className="flex items-center gap-2 font-semibold"><CheckCircle2 size={20} className="text-brand" /> {result.cabinet.nom} peut maintenant se connecter.</div>
          <dl className="grid grid-cols-[130px_1fr] gap-y-1.5">
            <dt className="text-slate">Pack</dt><dd className="font-semibold">{result.pack.nom}</dd>
            <dt className="text-slate">Adresse d'accès</dt><dd className="break-all font-semibold">{result.url_acces}</dd>
            <dt className="text-slate">Lien valable jusqu'au</dt><dd>{formatDate(result.lien_expire)}</dd>
            <dt className="text-slate">Fin de l'essai ou échéance</dt><dd>{formatDate(result.essai_fin)}</dd>
          </dl>
          <div className="rounded-lg border border-dashed border-info/40 bg-info-pale px-4 py-3 text-info-text">
            <p className="mb-2 flex items-center gap-2 font-bold"><Mail size={15} /> Simulation de l'e-mail envoyé</p>
            <p>À : {result.email_simule.destinataire}</p>
            <p>Objet : {result.email_simule.objet}</p>
            <p className="mt-2">Identifiant : <b>{result.identifiant}</b></p>
            <p>Mot de passe : <b className="font-mono">{result.email_simule.mot_de_passe}</b></p>
          </div>
        </div>
      )}
    </Modal>
  );
}
