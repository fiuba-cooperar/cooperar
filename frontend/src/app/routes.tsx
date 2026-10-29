import type { RouteObject } from 'react-router';
import { Role } from '@/api/generated/model';
import { AdminHomePage } from '@/features/admin/AdminHomePage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireRole } from '@/features/auth/RequireRole';
import { CooperativeHomePage } from '@/features/cooperative/CooperativeHomePage';
import { ForbiddenPage } from '@/features/errors/ForbiddenPage';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { HomePage } from '@/features/home/HomePage';
import { AppLayout } from '@/components/layout/AppLayout';

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
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
