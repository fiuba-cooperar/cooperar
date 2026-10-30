import type { RouteObject } from 'react-router';
import { Role } from '@/api/generated/model';
import { AdminHomePage } from '@/features/admin/AdminHomePage';
import { AdminLayout } from '@/features/admin/AdminLayout';
import { ADMIN_HOME_PATH, ADMIN_SECTIONS } from '@/features/admin/adminSections';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
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
      { path: REGISTER_PATH, element: <RegisterPage /> },
      ...PUBLIC_SECTIONS.map(({ path, label }) => ({
        path,
        element: <ComingSoonPage title={label} />,
      })),
      { path: 'forbidden', element: <ForbiddenPage /> },
      {
        element: <RequireRole role={Role.COOPERATIVE} />,
        children: [{ path: 'cooperative', element: <CooperativeHomePage /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    // The observatory panel has its own header and side menu instead of the public ones.
    element: <RequireRole role={Role.ADMIN} />,
    children: [
      {
        path: ADMIN_HOME_PATH,
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminHomePage /> },
          ...ADMIN_SECTIONS.filter(({ path }) => path !== ADMIN_HOME_PATH).map(
            ({ path, label }) => ({
              path,
              element: <ComingSoonPage title={label} homePath={ADMIN_HOME_PATH} />,
            }),
          ),
        ],
      },
    ],
  },
];
