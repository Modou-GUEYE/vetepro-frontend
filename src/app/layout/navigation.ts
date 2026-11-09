import {
  Activity, BarChart3, Building2, CalendarDays, ClipboardList, CreditCard, FileText, HeartPulse,
  LayoutDashboard, LucideIcon, PawPrint, Pill, Settings2, ShieldCheck, Stethoscope, Syringe, Users, UserCog,
  Baby, LifeBuoy, Contact, Megaphone, MessageSquare, Network, Tag, TriangleAlert, BookUser, Smartphone, Landmark,
} from 'lucide-react';
import type { ModuleKey } from '@/core/auth/permissions';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  lot: string; // lot qui livre l'écran (voir BACKLOG_TRELLO.md)
  module?: ModuleKey; // droit de lecture requis ; absent = visible par tous
}

export interface NavGroup {
  id: string;
  label: string;
  collapsible?: boolean;
  items: NavItem[];
}

/** Structure du menu reprise de VetePro_v4.html. */
export const NAV: NavGroup[] = [
  { id: 'overview', label: "Vue d'ensemble", items: [{ path: '/', label: 'Tableau de bord', icon: LayoutDashboard, lot: 'L6' }] },
  {
    id: 'animaux', label: 'Animaux',
    items: [
      { path: '/patients', label: 'Dossiers patients', icon: PawPrint, lot: 'L2', module: 'patients' },
      { path: '/proprietaires', label: 'Propriétaires', icon: Users, lot: 'L2', module: 'proprietaires' },
    ],
  },
  {
    id: 'clinique', label: 'Clinique',
    items: [
      { path: '/rendez-vous', label: 'Rendez-vous', icon: CalendarDays, lot: 'L4', module: 'rdv' },
      { path: '/consultations', label: 'Consultations', icon: Stethoscope, lot: 'L3', module: 'consultations' },
      { path: '/vaccinations', label: 'Vaccinations', icon: Syringe, lot: 'L5', module: 'vaccinations' },
      { path: '/hospitalisations', label: 'Hospitalisations', icon: HeartPulse, lot: 'L4', module: 'hospitalisations' },
      { path: '/insemination', label: 'Insémination', icon: Baby, lot: 'L5', module: 'insemination' },
    ],
  },
  {
    id: 'gestion', label: 'Gestion',
    items: [
      { path: '/pharmacie', label: 'Pharmacie', icon: Pill, lot: 'L3', module: 'pharmacie' },
      { path: '/ordonnances', label: 'Ordonnances', icon: FileText, lot: 'L3', module: 'ordonnances' },
      { path: '/facturation', label: 'Facturation', icon: CreditCard, lot: 'L3', module: 'facturation' },
      { path: '/paiements', label: 'Paiements', icon: Smartphone, lot: 'L8', module: 'paiements' },
      { path: '/comptes', label: 'Comptes', icon: Landmark, lot: 'L8', module: 'comptes' },
      { path: '/reporting', label: 'Reporting', icon: BarChart3, lot: 'L6', module: 'reporting' },
      { path: '/services', label: 'Services', icon: ClipboardList, lot: 'L1', module: 'services' },
      { path: '/support', label: 'Support', icon: LifeBuoy, lot: 'L6', module: 'support' },
      { path: '/cvtheque', label: 'CVthèque', icon: Contact, lot: 'L7', module: 'cvtheque' },
    ],
  },
  {
    id: 'reseau', label: 'Réseau',
    items: [
      { path: '/forum', label: 'Forum', icon: MessageSquare, lot: 'L7', module: 'reseau' },
      { path: '/cas-partages', label: 'Cas partagés', icon: Stethoscope, lot: 'L7', module: 'reseau' },
      { path: '/veille-epidemio', label: 'Veille épidémio', icon: TriangleAlert, lot: 'L7', module: 'reseau' },
      { path: '/annuaire', label: 'Annuaire réseau', icon: BookUser, lot: 'L7', module: 'reseau' },
    ],
  },
  {
    id: 'admin', label: 'Administration',
    items: [
      { path: '/administration/utilisateurs', label: 'Utilisateurs', icon: UserCog, lot: 'L1', module: 'utilisateurs' },
      { path: '/administration/habilitations', label: 'Habilitations', icon: ShieldCheck, lot: 'L1', module: 'habilitations' },
      { path: '/administration/referentiels', label: 'Référentiels', icon: Settings2, lot: 'L1', module: 'referentiels' },
      { path: '/administration/cabinet', label: 'Informations du cabinet', icon: Building2, lot: 'L1', module: 'referentiels' },
    ],
  },
];

/** Menu du Super-admin : back-office de l'association, sans aucune donnée de cabinet. */
export const NAV_ASSO: NavGroup[] = [
  {
    id: 'association', label: '',
    items: [
      { path: '/association', label: 'Établissements', icon: Network, lot: 'L11' },
      { path: '/association/offres', label: 'Offres et promotions', icon: Tag, lot: 'L11' },
      { path: '/association/contenus', label: 'Contenus du site', icon: Megaphone, lot: 'L11' },
      { path: '/association/cvs', label: 'CVthèque', icon: Contact, lot: 'L11' },
      { path: '/association/reclamations', label: 'Réclamations', icon: LifeBuoy, lot: 'L11' },
    ],
  },
];

export const ALL_ITEMS = NAV.flatMap((g) => g.items);
export const ASSO_ITEMS = NAV_ASSO.flatMap((g) => g.items);
export const BRAND = { name: 'Véte', accent: 'Pro', tagline: 'Cabinet Vétérinaire', Icon: Building2, Activity };
