import { vi, describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils/renderWithProviders';

vi.mock('../../services/api', () => ({
  api: {
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
  },
}));

import { api } from '../../services/api';
import { VerifyEmail } from '../VerifyEmail';

describe('VerifyEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.verifyEmail).mockResolvedValue(undefined);
    vi.mocked(api.resendVerification).mockResolvedValue(undefined);
  });

  it('renders the page heading in the pending state', () => {
    renderWithProviders(<VerifyEmail />);

    expect(
      screen.getByRole('heading', { name: /verify your email/i })
    ).toBeInTheDocument();
  });

  it('triggers verification and shows verifying message when code and email search params are present', async () => {
    vi.mocked(api.verifyEmail).mockImplementation(
      () => new Promise(() => {})
    );

    renderWithProviders(<VerifyEmail />, {
      route: '/verify?code=123456&email=test@example.com',
    });

    await waitFor(() => {
      expect(api.verifyEmail).toHaveBeenCalledWith(
        'test@example.com',
        '123456'
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Verifying your email...')).toBeInTheDocument();
    });
  });

  it('shows success message on successful verification', async () => {
    vi.mocked(api.verifyEmail).mockResolvedValueOnce(undefined);

    renderWithProviders(<VerifyEmail />, {
      route: '/verify?code=123456&email=test@example.com',
    });

    await waitFor(() => {
      expect(api.verifyEmail).toHaveBeenCalledWith(
        'test@example.com',
        '123456'
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText('Email verified successfully! Redirecting to login...')
      ).toBeInTheDocument();
    });
  });

  it('shows error message and back to registration link on verification error', async () => {
    vi.mocked(api.verifyEmail).mockRejectedValueOnce(
      new Error('Invalid verification code')
    );

    renderWithProviders(<VerifyEmail />, {
      route: '/verify?code=123456&email=test@example.com',
    });

    await waitFor(() => {
      expect(api.verifyEmail).toHaveBeenCalledWith(
        'test@example.com',
        '123456'
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Invalid verification code')).toBeInTheDocument();
    });

    const backToRegistrationLink = screen.getByRole('link', {
      name: /back to registration/i,
    });

    expect(backToRegistrationLink).toBeInTheDocument();
    expect(backToRegistrationLink).toHaveAttribute('href', '/register');
  });
});
