import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import Users from '../Users';
import { api } from '../../services/api';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import type { User } from '../../types';

vi.mock('../../services/api', () => ({
  api: {
    listUsers: vi.fn(),
  },
}));

vi.mock('../../components/Users/UserCreateModal', () => ({
  default: () => <div data-testid="create-modal" />,
}));

vi.mock('../../components/Users/UserEditModal', () => ({
  default: () => <div data-testid="edit-modal" />,
}));

vi.mock('../../components/Users/PasswordResetModal', () => ({
  default: () => <div data-testid="password-reset-modal" />,
}));

const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'alice@example.com',
    username: 'alice',
    name: 'Alice Smith',
    role: 'admin',
    created_at: 1700000000,
    last_login: 1700100000,
  },
  {
    id: 'user-2',
    email: 'ed@example.com',
    username: 'ed',
    name: 'Ed Johnson',
    role: 'editor',
    created_at: 1700050000,
    last_login: 1700150000,
  },
  {
    id: 'user-3',
    email: 'amy@example.com',
    username: 'amy',
    name: 'Amy Writer',
    role: 'author',
    created_at: 1700060000,
    last_login: 1700160000,
  },
];

describe('Users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listUsers).mockResolvedValue(mockUsers);
  });

  it('renders user list with names and roles after data loads', async () => {
    renderWithProviders(<Users />, { authState: { isAuthenticated: true } });

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Ed Johnson')).toBeInTheDocument();
    expect(screen.getByText('ed@example.com')).toBeInTheDocument();
    expect(screen.getByText('Amy Writer')).toBeInTheDocument();
    expect(screen.getByText('amy@example.com')).toBeInTheDocument();

    // Verify role badges are rendered
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('editor')).toBeInTheDocument();
    expect(screen.getByText('author')).toBeInTheDocument();
  });

  it('shows management actions for each user', async () => {
    renderWithProviders(<Users />, { authState: { isAuthenticated: true } });

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row');
    // Filter to only data rows (exclude header)
    const userRows = rows.filter((row) =>
      mockUsers.some((user) => within(row).queryByText(user.email)),
    );

    expect(userRows).toHaveLength(mockUsers.length);

    userRows.forEach((row) => {
      expect(within(row).getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: /reset password/i })).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });
  });
});
