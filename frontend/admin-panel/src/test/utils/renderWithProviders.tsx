import type * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, type RenderOptions } from '@testing-library/react';
import { AuthContext, type AuthContextType } from '../../contexts/AuthContext';
import { createMockAuthContext, type MockAuthOptions } from './createMockAuthContext';

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  authState?: MockAuthOptions;
  route?: string;
  routePath?: string;
}

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

export function renderWithProviders(
  ui: React.ReactElement,
  {
    queryClient = createTestQueryClient(),
    authState,
    route = '/',
    routePath,
    ...renderOptions
  }: RenderWithProvidersOptions = {},
) {
  const authContext: AuthContextType = createMockAuthContext(authState);

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authContext}>
          <MemoryRouter initialEntries={[route]}>
            {routePath ? (
              <Routes>
                <Route path={routePath} element={<>{children}</>} />
              </Routes>
            ) : (
              children
            )}
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { ...renderOptions, wrapper: Wrapper }),
    queryClient,
  };
}
