import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../types';

vi.mock('../../services/api', () => ({
  api: {
    listUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    resetUserPassword: vi.fn(),
  },
}));

import { api } from '../../services/api';
import { useUsers } from '../useUsers';

const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    created_at: 1710000000,
    last_login: 1710001000,
  },
  {
    id: '2',
    email: 'editor@example.com',
    name: 'Editor User',
    role: 'editor',
    created_at: 1710002000,
    last_login: 1710003000,
  },
];

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(api.listUsers).mockResolvedValue(mockUsers);
    vi.mocked(api.createUser).mockResolvedValue(undefined as never);
    vi.mocked(api.updateUser).mockResolvedValue(undefined as never);
    vi.mocked(api.deleteUser).mockResolvedValue(undefined as never);
    vi.mocked(api.resetUserPassword).mockResolvedValue(undefined as never);
  });

  it('fetches users on mount and sets state', async () => {
    const { result } = renderHook(() => useUsers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(api.listUsers).toHaveBeenCalledTimes(1);
    expect(result.current.users).toEqual(mockUsers);
    expect(result.current.error).toBeNull();
  });

  it('sets loading=true initially, then false after fetch', async () => {
    let resolveListUsers: (users: User[]) => void;

    vi.mocked(api.listUsers).mockReturnValue(
      new Promise<User[]>((resolve) => {
        resolveListUsers = resolve;
      }),
    );

    const { result } = renderHook(() => useUsers());

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveListUsers!(mockUsers);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.users).toEqual(mockUsers);
  });

  it('sets error when fetch fails', async () => {
    vi.mocked(api.listUsers).mockRejectedValue(new Error('Failed to load users'));

    const { result } = renderHook(() => useUsers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(api.listUsers).toHaveBeenCalledTimes(1);
    expect(result.current.users).toEqual([]);
    expect(result.current.error).toBe('Failed to load users');
  });

  it('createUser calls api.createUser and refetches users', async () => {
    const createdUsers: User[] = [
      ...mockUsers,
      {
        id: '3',
        email: 'new@example.com',
        name: 'New User',
        role: 'author',
        created_at: 1710004000,
        last_login: 0,
      },
    ];

    vi.mocked(api.listUsers)
      .mockResolvedValueOnce(mockUsers)
      .mockResolvedValueOnce(createdUsers);

    const { result } = renderHook(() => useUsers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newUserData = {
      email: 'new@example.com',
      name: 'New User',
      role: 'author',
      password: 'password123',
    };

    await act(async () => {
      await result.current.createUser(newUserData);
    });

    expect(api.createUser).toHaveBeenCalledTimes(1);
    expect(api.createUser).toHaveBeenCalledWith(newUserData);
    expect(api.listUsers).toHaveBeenCalledTimes(2);
    expect(result.current.users).toEqual(createdUsers);
    expect(result.current.error).toBeNull();
  });

  it('updateUser calls api.updateUser and refetches users', async () => {
    const updatedUsers: User[] = [
      {
        ...mockUsers[0],
        name: 'Updated Admin',
        role: 'editor',
      },
      mockUsers[1],
    ];

    vi.mocked(api.listUsers)
      .mockResolvedValueOnce(mockUsers)
      .mockResolvedValueOnce(updatedUsers);

    const { result } = renderHook(() => useUsers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updateData = { name: 'Updated Admin', role: 'editor' };

    await act(async () => {
      await result.current.updateUser('1', updateData);
    });

    expect(api.updateUser).toHaveBeenCalledTimes(1);
    expect(api.updateUser).toHaveBeenCalledWith('1', updateData);
    expect(api.listUsers).toHaveBeenCalledTimes(2);
    expect(result.current.users).toEqual(updatedUsers);
    expect(result.current.error).toBeNull();
  });

  it('deleteUser calls api.deleteUser and refetches users', async () => {
    const remainingUsers: User[] = [mockUsers[1]];

    vi.mocked(api.listUsers)
      .mockResolvedValueOnce(mockUsers)
      .mockResolvedValueOnce(remainingUsers);

    const { result } = renderHook(() => useUsers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteUser('1');
    });

    expect(api.deleteUser).toHaveBeenCalledTimes(1);
    expect(api.deleteUser).toHaveBeenCalledWith('1');
    expect(api.listUsers).toHaveBeenCalledTimes(2);
    expect(result.current.users).toEqual(remainingUsers);
    expect(result.current.error).toBeNull();
  });

  it('resetPassword calls api.resetUserPassword', async () => {
    const { result } = renderHook(() => useUsers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.resetPassword('1');
    });

    expect(api.resetUserPassword).toHaveBeenCalledTimes(1);
    expect(api.resetUserPassword).toHaveBeenCalledWith('1');
    expect(api.listUsers).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });
});
