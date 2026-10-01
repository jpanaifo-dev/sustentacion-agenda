import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from '../layouts/public-layout';
import { AdminLayout } from '../layouts/admin-layout';
import { PublicAgendaPage } from '../../pages/public/public-agenda-page';
import { PublicDefenseDetailPage } from '../../pages/public/public-defense-detail-page';
import { DashboardPage } from '../../pages/private/dashboard-page';
import { AgendaCalendarPage } from '../../pages/private/agenda/agenda-calendar-page';
import { DefensesListPage } from '../../pages/private/defenses/defenses-list-page';
import { DefenseDetailPage } from '../../pages/private/defenses/defense-detail-page';
import { DefenseFormPage } from '../../pages/private/defenses/defense-form-page';
import { UnitsPage } from '../../pages/private/units/units-page';
import { FacilitiesPage } from '../../pages/private/facilities/facilities-page';
import { SpacesPage } from '../../pages/private/spaces/spaces-page';
import { PersonsPage } from '../../pages/private/persons/persons-page';
import { UsersPage } from '../../pages/private/users/users-page';
import { AuditPage } from '../../pages/private/audit/audit-page';
import { SettingsPage } from '../../pages/private/settings/settings-page';

export const router = createBrowserRouter([
  // Public Portal Routes
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/agenda" replace />,
      },
      {
        path: 'agenda',
        element: <PublicAgendaPage />,
      },
      {
        path: 'agenda/:id',
        element: <PublicDefenseDetailPage />,
      },
    ],
  },

  // Private Administration Routes
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'agenda',
        element: <AgendaCalendarPage />,
      },
      {
        path: 'defenses',
        element: <DefensesListPage />,
      },
      {
        path: 'defenses/new',
        element: <DefenseFormPage />,
      },
      {
        path: 'defenses/:id',
        element: <DefenseDetailPage />,
      },
      {
        path: 'defenses/:id/edit',
        element: <DefenseFormPage />,
      },
      {
        path: 'units',
        element: <UnitsPage />,
      },
      {
        path: 'facilities',
        element: <FacilitiesPage />,
      },
      {
        path: 'spaces',
        element: <SpacesPage />,
      },
      {
        path: 'persons',
        element: <PersonsPage />,
      },
      {
        path: 'users',
        element: <UsersPage />,
      },
      {
        path: 'audit',
        element: <AuditPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },

  // Fallback Route
  {
    path: '*',
    element: <Navigate to="/agenda" replace />,
  },
]);
