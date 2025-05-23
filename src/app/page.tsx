"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext'; // Assuming you have an AuthContext

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (user.role === 'teacher') {
          router.replace('/teacher/dashboard');
        } else if (user.role === 'student') {
          router.replace('/student/dashboard');
        } else {
           router.replace('/login'); // Fallback, should not happen with proper roles
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>Loading CampusMarks...</p>
      {/* You can add a spinner or loading animation here */}
    </div>
  );
}
