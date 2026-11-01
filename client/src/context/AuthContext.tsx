/// <reference types="vite/client" />
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, DonorAvailability } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  registerDonor: (data: any) => Promise<{ success: boolean; message?: string }>;
  registerRequester: (data: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  quickLogin: (role: 'admin' | 'donor' | 'requester') => Promise<void>;
  updateAvailability: (status: DonorAvailability) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('blood_link_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load current user profile if token exists
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.user) {
          const u = data.user;
          setUser({
            id: u.id,
            fullName: u.full_name,
            email: u.email,
            mobile: u.mobile,
            role: u.role,
            status: u.status,
            isVerified: u.is_verified,
            blood_group: u.profile?.blood_group,
            availability_status: u.profile?.availability_status,
            requester_type: u.profile?.requester_type,
            locality: u.location?.locality,
            district: u.location?.district,
            latitude: u.location?.latitude,
            longitude: u.location?.longitude,
          });
        } else {
          logout();
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        logout();
      } finally {
        setIsLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        setToken(data.token);
        localStorage.setItem('blood_link_token', data.token);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, message: data.message || 'Login failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error during login' };
    }
  };

  const registerDonor = async (payload: any) => {
    try {
      const res = await fetch('/api/v1/auth/register/donor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.token) {
        setToken(data.token);
        localStorage.setItem('blood_link_token', data.token);
        setUser(data.user);
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Donor registration failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error during registration' };
    }
  };

  const registerRequester = async (payload: any) => {
    try {
      const res = await fetch('/api/v1/auth/register/requester', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.token) {
        setToken(data.token);
        localStorage.setItem('blood_link_token', data.token);
        setUser(data.user);
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Requester registration failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error during registration' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('blood_link_token');
  };

  const quickLogin = async (role: 'admin' | 'donor' | 'requester') => {
    // In production builds, quick-login shortcuts are strictly disabled
    if (!import.meta.env.DEV) {
      console.warn('Quick login is disabled in production builds.');
      return;
    }

    const devCredentials = {
      admin: { email: 'admin@bloodlink.org', password: 'Admin@123' },
      donor: { email: 'donor@bloodlink.org', password: 'Donor@123' },
      requester: { email: 'priya.sharma@example.com', password: 'Requester@123' },
    };
    const cred = devCredentials[role];
    if (cred) {
      await login(cred.email, cred.password);
    }
  };

  const updateAvailability = async (status: DonorAvailability): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch('/api/v1/donors/availability', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        if (user) {
          setUser({ ...user, availability_status: status });
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating availability:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        registerDonor,
        registerRequester,
        logout,
        quickLogin,
        updateAvailability,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
