import { MantineProvider } from '@mantine/core';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { createQueryClient } from './queryClient';
import { routes } from './routes';
import { cssVariablesResolver, theme } from './theme';

const router = createBrowserRouter(routes);

export function App() {
  const [queryClient] = useState(createQueryClient);

  return (
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
}
