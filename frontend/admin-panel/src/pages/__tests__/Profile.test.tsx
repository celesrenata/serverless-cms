import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { createMockUser } from '../../test/mocks/data';
import { api } from '../../services/api';
import { Profile } from '../Profile';

vi.mock('../../services/api', () => ({
  api: {
    getCurrentUser: vi.fn(),
    updateCurrentUser: vi.fn(),
  },
}));

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user profile information after loading', async () => {
    const mockUser = createMockUser();

    vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser);

    renderWithProviders(<Profile />, { authState: { isAuthenticated: true } });

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockUser.name!)).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue(mockUser.email)).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockUser.role)).toBeInTheDocument();
  });

  it('allows editing name and bio fields', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser();

    vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser);

    renderWithProviders(<Profile />, { authState: { isAuthenticated: true } });

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockUser.name!)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const nameInput = screen.getByPlaceholderText('Your display name');
    const bioInput = screen.getByPlaceholderText('Tell us about yourself');

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Jane Editor');

    await user.clear(bioInput);
    await user.type(bioInput, 'Updated editor biography');

    expect(nameInput).toHaveValue('Updated Jane Editor');
    expect(bioInput).toHaveValue('Updated editor biography');
  });

  it('save action calls API and shows success feedback', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser();
    const updatedUser = createMockUser({
      name: 'Updated Jane Editor',
      bio: 'Updated editor biography',
    });

    vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(api.updateCurrentUser).mockResolvedValue(updatedUser);

    renderWithProviders(<Profile />, { authState: { isAuthenticated: true } });

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockUser.name!)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const nameInput = screen.getByPlaceholderText('Your display name');
    const bioInput = screen.getByPlaceholderText('Tell us about yourself');

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Jane Editor');

    await user.clear(bioInput);
    await user.type(bioInput, 'Updated editor biography');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(api.updateCurrentUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Jane Editor',
          bio: 'Updated editor biography',
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument();
    });
  });
});
