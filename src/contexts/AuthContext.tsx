// src/contexts/AuthContext.tsx
"use client";

import type { User, Role } from '@/types';
import { mockUsers, getUserByEmail, createUser as apiCreateUser } from '@/lib/mockData';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  isLoading: boolean;
  login: (email: string, pass: string, roleAttempt: Role) => Promise<boolean>; // pass is unused for mock
  logout: () => void;
  register: (name: string, email: string, pass: string, role: Role, prn?: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Simulate checking for an existing session
    const storedUser = sessionStorage.getItem('campusUser');
    if (storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        sessionStorage.removeItem('campusUser');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, _pass: string, roleAttempt: Role): Promise<boolean> => {
    setIsLoading(true);
    const foundUser = await getUserByEmail(email);
    if (foundUser && foundUser.role === roleAttempt) {
      setUser(foundUser);
      sessionStorage.setItem('campusUser', JSON.stringify(foundUser));
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  };

  const register = async (name: string, email: string, _pass: string, role: Role, prn?: string): Promise<boolean> => {
    setIsLoading(true);
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      setIsLoading(false);
      return false; // User already exists
    }
    const newUser = await apiCreateUser({ email, name, role, prn });
    setUser(newUser);
    sessionStorage.setItem('campusUser', JSON.stringify(newUser));
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('campusUser');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
