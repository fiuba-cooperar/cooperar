import type { RouteObject } from 'react-router';
import { Role } from '@/api/generated/model';
import { AdminHomePage } from '@/features/admin/AdminHomePage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireRole } from '@/features/auth/RequireRole';
import { CooperativeHomePage } from '@/features/cooperative/CooperativeHomePage';
import { ForbiddenPage } from '@/features/errors/ForbiddenPage';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { ComingSoonPage } from '@/features/home/ComingSoonPage';
import { HomePage } from '@/features/home/HomePage';
import { AppLayout } from '@/components/layout/AppLayout';
import { PUBLIC_SECTIONS, REGISTER_PATH } from '@/components/layout/publicSections';

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: REGISTER_PATH, element: <ComingSoonPage title="Registrá tu cooperativa" /> },
      ...PUBLIC_SECTIONS.map(({ path, label }) => ({
        path,
        element: <ComingSoonPage title={label} />,
      })),
      { path: 'forbidden', element: <ForbiddenPage /> },
      {
        element: <RequireRole role={Role.ADMIN} />,
        children: [{ path: 'admin', element: <AdminHomePage /> }],
      },
      {
        element: <RequireRole role={Role.COOPERATIVE} />,
        children: [{ path: 'cooperative', element: <CooperativeHomePage /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
