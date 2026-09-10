import { apiClient } from './client';
import type { DemoUser, User } from './types';

export const authApi = {
  async getDemoUsers(): Promise<DemoUser[]> {
    return apiClient<DemoUser[]>('/api/identity/demo-users');
  },

  async getDemoToken(userId: string): Promise<User> {
    return apiClient<User>(`/api/identity/demo-token/${userId}`, {
      method: 'POST',
    });
  },

  async login(credentials: { email: string; password: string }): Promise<User> {
    return apiClient<User>('/api/identity/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async register(payload: { email: string; displayName: string; password: string }): Promise<User> {
    return apiClient<User>('/api/identity/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMe(): Promise<User> {
    return apiClient<User>('/api/identity/me');
  },
};
