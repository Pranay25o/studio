
// src/contexts/AuthContext.tsx
"use client";

import type { User, Role } from '@/types';
import { getUserByEmail, createUser as apiCreateUser } from '@/lib/mockData';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  isLoading: boolean;
  isFirebaseMisconfiguredError: boolean;
  login: (email: string, pass: string, roleAttempt: Role) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, pass: string, role: Role, prn?: string) => Promise<boolean>;
  refreshAuthUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const robustTrim = (str: string | undefined): string => {
  if (typeof str !== 'string') return '';
  // This regex handles various whitespace characters including non-breaking spaces and byte order marks
  return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirebaseMisconfiguredError, setIsFirebaseMisconfiguredError] = useState(false);
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
    setIsFirebaseMisconfiguredError(false);
    console.log('[AuthContext] LOGIN ATTEMPT: Raw emailInput="|', emailInput, '|", Length:', emailInput?.length);
    const cleanedEmailInput = robustTrim(emailInput);
    console.log('[AuthContext] After robustTrim: cleanedEmailInput="|', cleanedEmailInput, '|", Length:', cleanedEmailInput?.length);
    const email = cleanedEmailInput.toLowerCase();
    console.log(`[AuthContext] After toLowerCase: final email for lookup="|${email}|", Length:`, email?.length);
    console.log(`[AuthContext] Attempting to find user with final email="|${email}|" and roleAttempt="${roleAttempt}" in Firestore.`);

    try {
      const foundUser = await getUserByEmail(email);
      if (foundUser) {
        console.log(`[AuthContext] USER FOUND in Firestore: ID="${foundUser.id}", Name="${foundUser.name}", Email="${foundUser.email}", StoredRole="${foundUser.role}"`);
        console.log(`[AuthContext] COMPARING ROLES: StoredRole="${foundUser.role}" (Type: ${typeof foundUser.role}) vs RoleAttempt="${roleAttempt}" (Type: ${typeof roleAttempt})`);
        if (foundUser.role === roleAttempt) {
          console.log(`[AuthContext] LOGIN SUCCESSFUL for user: ${foundUser.name}, Role: ${foundUser.role}`);
          setUser(foundUser);
          sessionStorage.setItem('campusUser', JSON.stringify(foundUser));
          setIsLoading(false);
          return true;
        } else {
          console.error(`[AuthContext] ROLE MISMATCH: Stored role is "${foundUser.role}" but attempted role was "${roleAttempt}". Login failed.`);
          toast({ title: "Login Failed", description: "Role mismatch. Please select the correct role.", variant: "destructive" });
        }
      } else {
        console.error(`[AuthContext] USER NOT FOUND for email (robustly trimmed, lowercased): |${email}|. Login failed.`);
        if (email === 'admin@example.com') {
            toast({
                title: "Admin Login Failed",
                description: "The user 'admin@example.com' was not found. Please register this account with the 'Admin' role via the registration page (Admin role temporarily enabled for setup).",
                variant: "destructive",
                duration: 10000,
            });
        } else {
            toast({ title: "Login Failed", description: "User not found or incorrect credentials/role.", variant: "destructive" });
        }
      }
    } catch (error: any) {
      if (error.message === "FirebaseMisconfigured") {
        console.error("[AuthContext] Firebase Misconfigured Error during login:", error);
        setIsFirebaseMisconfiguredError(true);
        // Toast for misconfiguration is handled by the LoginPage now
      } else if (error.message === "DatabaseQueryFailed") {
        toast({ title: "Login Error", description: "Could not connect to the database to verify credentials. Please try again later.", variant: "destructive" });
      } else {
        console.error('[AuthContext] Error during login process:', error);
        toast({ title: "Login Error", description: "An unexpected error occurred.", variant: "destructive" });
      }
    }
    console.log('[AuthContext] Overall login outcome: FAILED.');
    setIsLoading(false);
    return false;
  };

  const register = async (name: string, emailInput: string, _pass: string, role: Role, prn?: string): Promise<boolean> => {
    setIsLoading(true);
    setIsFirebaseMisconfiguredError(false);
    const email = robustTrim(emailInput).toLowerCase();
    const cleanedName = robustTrim(name);
    const cleanedPrn = prn ? robustTrim(prn).toUpperCase() : undefined;

    // Note: The registration page component itself now allows selecting 'admin'.
    // In a production scenario, you would add a check here to prevent 'admin' role registration
    // if it wasn't coming from a trusted source, or remove 'admin' from public form options entirely.
    // For this setup, we are allowing it so the user can create their initial admin.

    try {
      const newUserPayload: Parameters<typeof apiCreateUser>[0] = {
        email: email,
        name: cleanedName,
        role: role,
        subjects: [],
        semesterAssignments: [],
      };
      if (role === 'student' && cleanedPrn) {
        newUserPayload.prn = cleanedPrn;
      }
      const newUser = await apiCreateUser(newUserPayload);
      setUser(newUser);
      sessionStorage.setItem('campusUser', JSON.stringify(newUser));
      setIsLoading(false);
      return true;
    } catch (error: any) {
      if (error.message === "FirebaseMisconfigured") {
        setIsFirebaseMisconfiguredError(true);
         // Toast for misconfiguration is handled by the RegisterPage now
      } else {
        console.error('[AuthContext] Registration error:', error);
        toast({ title: "Registration Failed", description: error.message || "An error occurred during registration.", variant: "destructive" });
      }
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('campusUser');
    setIsFirebaseMisconfiguredError(false);
    router.push('/login');
  };

  const refreshAuthUser = async () => {
    if (user?.email) {
      setIsFirebaseMisconfiguredError(false);
      console.log('[AuthContext] Attempting to refresh user session for:', user.email);
      try {
        const latestUserData = await getUserByEmail(user.email);
        if (latestUserData) {
          setUser(latestUserData);
          sessionStorage.setItem('campusUser', JSON.stringify(latestUserData));
          console.log('[AuthContext] User session refreshed successfully for:', latestUserData.name);
          toast({ title: "Session Updated", description: "Your user details and permissions have been refreshed." });
        } else {
          console.warn('[AuthContext] Could not find user data to refresh session for:', user.email, 'Logging out.');
          logout();
        }
      } catch (error: any) {
        if (error.message === "FirebaseMisconfigured") {
          setIsFirebaseMisconfiguredError(true);
          // Toast for misconfiguration is handled by the pages now
        } else {
          console.error('[AuthContext] Error refreshing user session:', error);
        }
      }
    } else {
      console.log('[AuthContext] No active user to refresh.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, isLoading, isFirebaseMisconfiguredError, login, logout, register, refreshAuthUser }}>
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

    