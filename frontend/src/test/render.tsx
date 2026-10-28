import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { routes } from '@/app/routes';

/** Renders the app routes at `path` with a fresh, retry-free query client. */
export function renderRoute(path: string, appRoutes: RouteObject[] = routes) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
