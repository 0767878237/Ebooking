import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '../api/authApi';
import { getStoredToken, getStoredUser, setStoredToken, setStoredUser } from '../api/client';
import type { DemoUser, Role, User } from '../api/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  demoUsers: DemoUser[];
  role: Role;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (payload: { email: string; displayName: string; password: string }) => Promise<void>;
  switchDemoUser: (userId: string) => Promise<void>;
  logout: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'customer@ebooking.local',
  displayName: 'Khách hàng Demo',
  role: 'USER',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [user, setUser] = useState<User | null>(getStoredUser() ?? DEFAULT_USER);
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    let active = true;

    async function initAuth() {
      try {
        // 1. Load demo users list
        const demos = await authApi.getDemoUsers().catch(() => []);
        if (active) {
          setDemoUsers(demos);
        }

        // 2. If token exists, verify with /api/identity/me
        const currentToken = getStoredToken();
        if (currentToken) {
          try {
            const me = await authApi.getMe();
            if (active) {
              setUser(me);
              setStoredUser(me);
            }
          } catch {
            // Token expired or invalid
            setStoredToken(null);
            setToken(null);
          }
        } else if (demos.length > 0 && !getStoredUser()) {
          // If no stored user, default to first demo user (CUSTOMER)
          const customerDemo = demos.find((d) => d.role === 'USER') ?? demos[0];
          try {
            const demoRes = await authApi.getDemoToken(customerDemo.id);
            if (active) {
              setUser(demoRes);
              setStoredUser(demoRes);
              if (demoRes.token) {
                setStoredToken(demoRes.token);
                setToken(demoRes.token);
              }
            }
          } catch {
            if (active) {
              setUser({
                id: customerDemo.id,
                email: customerDemo.email,
                displayName: customerDemo.displayName,
                role: customerDemo.role,
              });
            }
          }
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    initAuth();
    return () => {
      active = false;
    };
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await authApi.login(credentials);
    setUser(res);
    setStoredUser(res);
    if (res.token) {
      setStoredToken(res.token);
      setToken(res.token);
    }
    setIsAuthModalOpen(false);
  };

  const register = async (payload: { email: string; displayName: string; password: string }) => {
    const res = await authApi.register(payload);
    setUser(res);
    setStoredUser(res);
    if (res.token) {
      setStoredToken(res.token);
      setToken(res.token);
    }
    setIsAuthModalOpen(false);
  };

  const switchDemoUser = async (userId: string) => {
    try {
      const res = await authApi.getDemoToken(userId);
      setUser(res);
      setStoredUser(res);
      if (res.token) {
        setStoredToken(res.token);
        setToken(res.token);
      }
    } catch {
      const target = demoUsers.find((d) => d.id === userId);
      if (target) {
        const fallbackUser: User = {
          id: target.id,
          email: target.email,
          displayName: target.displayName,
          role: target.role,
        };
        setUser(fallbackUser);
        setStoredUser(fallbackUser);
      }
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setStoredToken(null);
    setStoredUser(null);
  };

  const role: Role = user?.role ?? 'USER';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        demoUsers,
        role,
        isLoading,
        login,
        register,
        switchDemoUser,
        logout,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
