import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, mfaCode?: string) => Promise<{ mfaRequired?: boolean; mfaToken?: string } | void>;
  verifyMfaLogin: (mfaToken: string, mfaCode: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string, businessName?: string, taxId?: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.getMe();
      if (res && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string, mfaCode?: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await api.login({ email, password, mfaCode });
      if (res.mfaRequired) {
        setIsLoading(false);
        return { mfaRequired: true, mfaToken: res.mfaToken };
      }
      if (res.user) {
        setUser(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMfaLogin = async (mfaToken: string, mfaCode: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await api.verifyMfaLogin({ mfaToken, mfaCode });
      if (res.user) {
        setUser(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid MFA code.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName?: string, businessName?: string, taxId?: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await api.register({ email, password, fullName, businessName, taxId });
      if (res.user) {
        setUser(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await api.login({
        email: 'alex.morgan@freelancestudio.io',
        password: 'Freelancer2026!',
      });
      if (res.user) {
        setUser(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        verifyMfaLogin,
        register,
        demoLogin,
        logout,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
