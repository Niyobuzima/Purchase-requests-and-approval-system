import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { authAPI } from '../api/auth';
import type { User, LoginCredentials, RegisterData } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (userData: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

interface JWTPayload {
  exp: number;
  user_id: number;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token');

    // Call backend to blacklist token (best effort - don't fail if it errors)
    if (refreshToken) {
      try {
        await authAPI.logout(refreshToken);
      } catch (error) {
        // Silent fail - token might already be expired/blacklisted
        // This is fine, we still want to logout locally
      }
    }

    // Clear local storage and state
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  }, []);

  useEffect(() => {
    // Check if user is logged in on mount
    const initAuth = async () => {
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        try {
          const decoded = jwtDecode<JWTPayload>(accessToken);
          // Check if token is expired
          if (decoded.exp * 1000 > Date.now()) {
            const userData = await authAPI.getProfile();
            setUser(userData);
          } else {
            logout();
          }
        } catch (error) {
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [logout]);

  const login = async (email: string, password: string): Promise<User> => {
    const credentials: LoginCredentials = { email, password };
    const response = await authAPI.login(credentials);
    const { user, tokens } = response;

    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    setUser(user);

    return user;
  };

  const register = async (userData: RegisterData): Promise<User> => {
    const response = await authAPI.register(userData);
    const { user, tokens } = response;

    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    setUser(user);

    return user;
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
