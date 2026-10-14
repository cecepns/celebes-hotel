import React, { createContext, useContext, useState, useEffect } from 'react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('celebes_auth_token') || null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await request.get(API_ENDPOINTS.AUTH.PROFILE);
      if (res.success && res.data) {
        setUser(res.data);
        localStorage.setItem('celebes_auth_user', JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn('Failed to refresh profile:', err);
      // If unauthorized, token is cleared by interceptor
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      const cached = localStorage.getItem('celebes_auth_user');
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch (e) {}
      }
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('celebes_auth_token', newToken);
    localStorage.setItem('celebes_auth_user', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('celebes_auth_token');
    localStorage.removeItem('celebes_auth_user');
  };

  const updateUser = (updatedData) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedData };
      localStorage.setItem('celebes_auth_user', JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        updateUser,
        refreshProfile: fetchProfile,
        isAuthenticated: !!token,
        isAdmin: ['admin', 'supervisor', 'resepsionis', 'kasir', 'staff'].includes(user?.role),
        isSuperAdmin: user?.role === 'admin',
        isSupervisor: user?.role === 'supervisor',
        isReceptionist: ['resepsionis', 'kasir', 'staff'].includes(user?.role),
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
