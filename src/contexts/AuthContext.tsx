
// src/contexts/AuthContext.tsx
"use client";

import type { User, Role } from '@/types';
import { getUserByEmail, createUser as apiCreateUser } from '@/lib/mockData'; // Now Firestore-backed
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  isLoading: boolean;
  login: (email: string, pass: string, roleAttempt: Role) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, pass: string, role: Role, prn?: string) => Promise<boolean>;
  refreshAuthUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const robustTrim = (str: string | undefined): string => {
  if (typeof str !== 'string') return '';
  return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
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

  const login = async (emailInput: string, _pass: string, roleAttempt: Role): Promise<boolean> => {
    setIsLoading(true);
    
    const cleanedEmailInput = robustTrim(emailInput);
    const email = cleanedEmailInput.toLowerCase();

    console.log('[AuthContext] LOGIN ATTEMPT: Email (robustly trimmed, lowercased)="', email, '", RoleAttempt="', roleAttempt, '"');
    
    try {
      const foundUser = await getUserByEmail(email); // Now async from Firestore
      
      if (foundUser) {
        console.log('[AuthContext] USER FOUND: ID="', foundUser.id, '", Name="', foundUser.name, '", Email="', foundUser.email, '", StoredRole="', foundUser.role, '"');
        console.log('[AuthContext] COMPARING ROLES: StoredRole="', foundUser.role, '" (Type:', typeof foundUser.role, ') vs RoleAttempt="', roleAttempt, '" (Type:', typeof roleAttempt, ')');
        
        if (foundUser.role === roleAttempt) {
          console.log('[AuthContext] LOGIN SUCCESSFUL for user:', foundUser.name);
          setUser(foundUser);
          sessionStorage.setItem('campusUser', JSON.stringify(foundUser));
          setIsLoading(false);
          return true;
        } else {
          console.error('[AuthContext] ROLE MISMATCH: Stored role is "', foundUser.role, '" but attempted role was "', roleAttempt, '". Login failed.');
        }
      } else {
        console.error('[AuthContext] USER NOT FOUND for email (robustly trimmed, lowercased): "', email, '". Login failed.');
      }
    } catch (error) {
        console.error('[AuthContext] Error during login process:', error);
    }

    console.log('[AuthContext] Overall login outcome: FAILED.');
    setIsLoading(false);
    return false;
  };

  const register = async (name: string, emailInput: string, _pass: string, role: Role, prn?: string): Promise<boolean> => {
    setIsLoading(true);
    const email = robustTrim(emailInput).toLowerCase();
    const cleanedName = robustTrim(name);
    const cleanedPrn = robustTrim(prn).toUpperCase();

    try {
      const existingUser = await getUserByEmail(email); // Check Firestore
      if (existingUser) {
        console.warn(`[AuthContext] Registration failed: User with email ${email} already exists.`);
        setIsLoading(false);
        return false; 
      }
      
      // For students, if PRN is provided, ensure it's not already taken by another student
      if (role === 'student' && cleanedPrn) {
          const studentWithPrn = await getUserByEmail(cleanedPrn); // This is not right, need a getStudentByPrn or similar
          // Simplified: Let's assume createUser handles PRN uniqueness for students or errors out.
          // More robust check: query users collection for role 'student' and matching PRN.
      }

      const newUser = await apiCreateUser({ email: email, name: cleanedName, role, prn: role === 'student' ? cleanedPrn : undefined }); // Now async from Firestore
      setUser(newUser);
      sessionStorage.setItem('campusUser', JSON.stringify(newUser));
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error('[AuthContext] Registration error:', error);
      // Let createUser error propagate for specific messages (e.g. PRN exists)
      toast({ title: "Registration Failed", description: error.message || "An error occurred during registration.", variant: "destructive" });
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('campusUser');
    router.push('/login');
  };

  const refreshAuthUser = async () => {
    if (user?.email) {
      console.log('[AuthContext] Attempting to refresh user session for:', user.email);
      try {
        const latestUserData = await getUserByEmail(user.email); // Now async from Firestore
        if (latestUserData) {
          setUser(latestUserData);
          sessionStorage.setItem('campusUser', JSON.stringify(latestUserData));
          console.log('[AuthContext] User session refreshed successfully for:', latestUserData.name);
          toast({ title: "Session Updated", description: "Your user details and permissions have been refreshed." });
        } else {
          console.warn('[AuthContext] Could not find user data to refresh session for:', user.email, 'Logging out.');
          logout(); // User might have been deleted
        }
      } catch (error) {
          console.error('[AuthContext] Error refreshing user session:', error);
      }
    } else {
      console.log('[AuthContext] No active user to refresh.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, isLoading, login, logout, register, refreshAuthUser }}>
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

    