import type { RouteObject } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { HomePage } from '@/features/home/HomePage';

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
