import { vi, describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils/renderWithProviders';

// Mock the useSiteSettings hook
vi.mock('../../hooks/useSiteSettings', () => ({
  useSiteSettings: vi.fn(),
}));

import { useSiteSettings } from '../../hooks/useSiteSettings';
import { Register } from '../Register';

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders name, email, password fields and submit button when registration is enabled', () => {
    vi.mocked(useSiteSettings).mockReturnValue({
      data: { registration_enabled: true },
      isLoading: false,
    } as ReturnType<typeof useSiteSettings>);

    renderWithProviders(<Register />);

    expect(screen.getByPlaceholderText('Full Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create account/i })
    ).toBeInTheDocument();
  });
});
