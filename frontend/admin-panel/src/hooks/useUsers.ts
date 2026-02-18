import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../types';

interface CreateUserData {
  email: string;
  name: string;
  role: string;
  password: string;
}

interface UpdateUserData {
  name: string;
  role: string;
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const createUser = async (userData: CreateUserData) => {
    try {
      setError(null);
      await api.createUser(userData);
      await fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create user';
      setError(message);
      throw new Error(message);
    }
  };

  const updateUser = async (userId: string, userData: UpdateUserData) => {
    try {
      setError(null);
      await api.updateUser(userId, userData);
      await fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user';
      setError(message);
      throw new Error(message);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      setError(null);
      await api.deleteUser(userId);
      await fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      setError(message);
      throw new Error(message);
    }
  };

  const resetPassword = async (userId: string) => {
    try {
      setError(null);
      await api.resetUserPassword(userId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset password';
      setError(message);
      throw new Error(message);
    }
  };

  return {
    users,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    refreshUsers: fetchUsers
  };
}
