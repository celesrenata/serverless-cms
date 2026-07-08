import { ReactElement } from 'react';
import { render, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { SettingsContext } from '../../contexts/SettingsContext';
import { createMockSettingsContext, type MockSettingsOptions } from './createMockSettingsContext';

export interface RenderWithProvidersOptions {
  settings?: MockSettingsOptions;
  route?: string;
  routePath?: string;
  queryClient?: QueryClient;
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderWithProvidersOptions
): RenderResult & { queryClient: QueryClient } {
  const {
    settings,
    route = '/',
    routePath,
    queryClient = createTestQueryClient(),
  } = options ?? {};

  const settingsContextValue = createMockSettingsContext(settings);

  const wrappedUi = routePath ? (
    <Routes>
      <Route path={routePath} element={ui} />
    </Routes>
  ) : (
    ui
  );

  const result = render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <SettingsContext.Provider value={settingsContextValue}>
          <MemoryRouter initialEntries={[route]}>
            {wrappedUi}
          </MemoryRouter>
        </SettingsContext.Provider>
      </QueryClientProvider>
    </HelmetProvider>
  );

  return {
    ...result,
    queryClient,
  };
}
