import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, inviteCode: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  changePassword: (currentPassword: string, password: string) => Promise<string>;
  changeEmail: (currentPassword: string, email: string) => Promise<void>;
  updateProfile: (name: string, avatarData?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  updateStartingBalance: (balances: { manual?: number; caixa?: number; trade?: number }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
      } catch {
        setUser(null);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data.user);
  };

  const register = async (email: string, password: string, name: string, inviteCode: string) => {
    const res = await api.post('/auth/register', { email, password, name, inviteCode });
    setUser(res.data.user);
  };

  const requestPasswordReset = async (email: string) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data.message;
  };

  const changePassword = async (currentPassword: string, password: string) => {
    const res = await api.put('/auth/password', { currentPassword, password });
    return res.data.message;
  };

  const changeEmail = async (currentPassword: string, email: string) => {
    const res = await api.put('/auth/email', { currentPassword, email });
    setUser(res.data);
  };

  const updateProfile = async (name: string, avatarData?: string | null) => {
    const res = await api.put('/auth/profile', { name, avatarData });
    setUser(res.data);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  const updateStartingBalance = async (balances: { manual?: number; caixa?: number; trade?: number }) => {
    const res = await api.put('/auth/starting-balance', {
      startingBalance: balances.manual,
      startingBalanceCaixa: balances.caixa,
      startingBalanceTrade: balances.trade
    });
    setUser(res.data);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, requestPasswordReset, changePassword, changeEmail, updateProfile, logout, updateStartingBalance }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
