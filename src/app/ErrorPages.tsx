import { Link } from 'react-router-dom';
import { Button, EmptyState } from '@/shared/ui';
import { ShieldOff, SearchX } from 'lucide-react';

export const NotFoundPage = () => (
  <EmptyState icon={<SearchX size={40} />} title="Page introuvable" description="L'adresse demandée n'existe pas."
    action={<Link to="/"><Button>Retour au tableau de bord</Button></Link>} />
);

export const ForbiddenPage = () => (
  <EmptyState icon={<ShieldOff size={40} />} title="Accès refusé" description="Votre profil n'a pas accès à cette section."
    action={<Link to="/"><Button>Retour au tableau de bord</Button></Link>} />
);
