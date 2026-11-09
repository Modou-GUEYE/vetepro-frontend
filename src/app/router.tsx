import { lazy, type ComponentType } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { ALL_ITEMS } from './layout/navigation';
import { ModulePlaceholder } from './ModulePlaceholder';
import { ForbiddenPage, NotFoundPage } from './ErrorPages';
import { AuthGuard, HomeRoute, PermissionGuard, RoleGuard } from './guards';
import { LoginPage } from '@/modules/auth/views/LoginPage';
import { ForgotPasswordPage } from '@/modules/auth/views/ForgotPasswordPage';
import { ResetPasswordPage } from '@/modules/auth/views/ResetPasswordPage';
import { AccountPage } from '@/modules/auth/views/AccountPage';
import { RenewalPage } from '@/modules/abonnement/views/RenewalPage';
import { PortalPage } from '@/modules/portail/views/PortalPage';
import { InscriptionPage } from '@/modules/portail/views/InscriptionPage';


/** Chaque écran est chargé à la demande pour alléger le premier chargement. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const page = <K extends string, P = object>(load: () => Promise<Record<K, ComponentType<any>>>, name: K) => lazy(() => load().then((m) => ({ default: m[name] as ComponentType<P> })));
const UsersPage = page(() => import('@/modules/administration/views/UsersPage'), 'UsersPage');
const FacturationPage = page(() => import('@/modules/facturation/views/FacturationPage'), 'FacturationPage');
const ConsultationsPage = page<'ConsultationsPage', { mode?: 'consultations' | 'ordonnances' }>(() => import('@/modules/consultations/views/ConsultationsPage'), 'ConsultationsPage');
const PaiementsPage = page(() => import('@/modules/paiements/views/PaiementsPage'), 'PaiementsPage');
const ComptesPage = page(() => import('@/modules/comptes/views/ComptesPage'), 'ComptesPage');
const PharmaciePage = page(() => import('@/modules/pharmacie/views/PharmaciePage'), 'PharmaciePage');
const OwnersPage = page(() => import('@/modules/proprietaires/views/OwnersPage'), 'OwnersPage');
const PatientsPage = page(() => import('@/modules/patients/views/PatientsPage'), 'PatientsPage');
const ServicesPage = page(() => import('@/modules/referentiels/views/ServicesPage'), 'ServicesPage');
const SpeciesPage = page(() => import('@/modules/referentiels/views/SpeciesPage'), 'SpeciesPage');
const ProfilesPage = page(() => import('@/modules/administration/views/ProfilesPage'), 'ProfilesPage');
const CvthequePage = page(() => import('@/modules/cvtheque/views/CvthequePage'), 'CvthequePage');
const ForumPage = page(() => import('@/modules/forum/views/ForumPage'), 'ForumPage');
const CasPartagesPage = page(() => import('@/modules/reseau/views/CasPartagesPage'), 'CasPartagesPage');
const EpidemioPage = page(() => import('@/modules/reseau/views/EpidemioPage'), 'EpidemioPage');
const AnnuairePage = page(() => import('@/modules/reseau/views/AnnuairePage'), 'AnnuairePage');
const ReseauPage = page(() => import('@/modules/association/views/ReseauPage'), 'ReseauPage');
const OffresPage = page(() => import('@/modules/association/views/OffresPage'), 'OffresPage');
const ContenusPage = page(() => import('@/modules/association/views/ContenusPage'), 'ContenusPage');
const CvAssociationPage = page(() => import('@/modules/association/views/CvAssociationPage'), 'CvAssociationPage');
const ReclamationsPage = page(() => import('@/modules/association/views/ReclamationsPage'), 'ReclamationsPage');
const RdvPage = page(() => import('@/modules/rendez-vous/views/RdvPage'), 'RdvPage');
const HospitalisationsPage = page(() => import('@/modules/hospitalisations/views/HospitalisationsPage'), 'HospitalisationsPage');
const VaccinationsPage = page(() => import('@/modules/vaccinations/views/VaccinationsPage'), 'VaccinationsPage');
const InseminationPage = page(() => import('@/modules/insemination/views/InseminationPage'), 'InseminationPage');
const ReportingPage = page(() => import('@/modules/reporting/views/ReportingPage'), 'ReportingPage');
const SupportPage = page(() => import('@/modules/support/views/SupportPage'), 'SupportPage');
const CabinetPage = page(() => import('@/modules/cabinet/views/CabinetPage'), 'CabinetPage');
const DashboardPage = page(() => import('@/modules/tableau-de-bord/views/DashboardPage'), 'DashboardPage');

/** Écrans livrés : remplacent le placeholder du lot. */
const SCREENS: Record<string, JSX.Element> = {
  '/administration/utilisateurs': <UsersPage />,
  '/administration/habilitations': <ProfilesPage />,
  '/administration/referentiels': <SpeciesPage />,
  '/administration/cabinet': <CabinetPage />,
  '/services': <ServicesPage />,
  '/proprietaires': <OwnersPage />,
  '/facturation': <FacturationPage />,
  '/pharmacie': <PharmaciePage />,
  '/paiements': <PaiementsPage />,
  '/comptes': <ComptesPage />,
  '/consultations': <ConsultationsPage />,
  '/rendez-vous': <RdvPage />,
  '/hospitalisations': <HospitalisationsPage />,
  '/vaccinations': <VaccinationsPage />,
  '/insemination': <InseminationPage />,
  '/reporting': <ReportingPage />,
  '/support': <SupportPage />,
  '/cvtheque': <CvthequePage />,
  '/forum': <ForumPage />,
  '/cas-partages': <CasPartagesPage />,
  '/veille-epidemio': <EpidemioPage />,
  '/annuaire': <AnnuairePage />,
  '/ordonnances': <ConsultationsPage mode="ordonnances" />,
};

const route = (i: (typeof ALL_ITEMS)[number]) => {
  const screen = SCREENS[i.path] ?? <ModulePlaceholder />;
  return { path: i.path, element: i.module ? <PermissionGuard module={i.module}>{screen}</PermissionGuard> : screen };
};

export const router = createBrowserRouter([
  { path: 'connexion', element: <LoginPage /> },
  { path: 'mot-de-passe-oublie', element: <ForgotPasswordPage /> },
  { path: 'reinitialisation', element: <ResetPasswordPage /> },
  { path: 'portail', element: <PortalPage /> },
  { path: 'inscription', element: <InscriptionPage /> },
  { element: <AuthGuard allowExpired />, children: [{ path: 'abonnement', element: <RenewalPage /> }] },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomeRoute><DashboardPage /></HomeRoute> },
          { path: 'association', element: <RoleGuard role="super_admin"><ReseauPage /></RoleGuard> },
          { path: 'association/offres', element: <RoleGuard role="super_admin"><OffresPage /></RoleGuard> },
          { path: 'association/contenus', element: <RoleGuard role="super_admin"><ContenusPage /></RoleGuard> },
          { path: 'association/cvs', element: <RoleGuard role="super_admin"><CvAssociationPage /></RoleGuard> },
          { path: 'association/reclamations', element: <RoleGuard role="super_admin"><ReclamationsPage /></RoleGuard> },
          ...ALL_ITEMS.filter((i) => i.path !== '/' && i.path !== '/patients').map(route),
          { path: 'patients/:id?', element: <PermissionGuard module="patients"><PatientsPage /></PermissionGuard> },
          { path: 'mon-compte', element: <AccountPage /> },
          { path: '403', element: <ForbiddenPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
