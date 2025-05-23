
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users2, BookLock, ArrowRight, Activity, CalendarClock, CalendarPlus, Users, UserCheck, GraduationCap, Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { getAllUsers } from '@/lib/mockData'; // This now fetches from Firestore
import type { User } from '@/types';

interface FeatureCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

function FeatureCard({ title, description, href, icon }: FeatureCardProps) {
  return (
    <Link href={href} className="block hover:no-underline">
      <Card className="h-full transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-medium text-primary">{title}</CardTitle>
          <div className="text-accent">{icon}</div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="mt-4 flex items-center text-sm font-medium text-accent">
            Go to {title} <ArrowRight className="ml-1 h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [activeTeachers, setActiveTeachers] = useState<number | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setIsLoadingStats(true);
      try {
        const users: User[] = await getAllUsers();
        setTotalUsers(users.length);
        setActiveTeachers(users.filter(u => u.role === 'teacher' || u.role === 'admin').length);
        setEnrolledStudents(users.filter(u => u.role === 'student').length);
      } catch (error) {
        console.error("Failed to fetch user stats for admin dashboard:", error);
        // Set to 0 or error indication if preferred
        setTotalUsers(0);
        setActiveTeachers(0);
        setEnrolledStudents(0);
      }
      setIsLoadingStats(false);
    }
    fetchStats();
  }, []);

  const StatDisplay = ({ value, label, icon }: { value: number | null, label: string, icon: React.ReactNode }) => (
    <div className="p-4 bg-background rounded-lg shadow">
      <p className="text-sm text-muted-foreground flex items-center gap-1">{icon}{label}</p>
      {isLoadingStats ? (
        <Loader2 className="h-7 w-7 animate-spin text-primary mt-1" />
      ) : (
        <p className="text-3xl font-bold text-primary">{value ?? 'N/A'}</p>
      )}
    </div>
  );


  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          System administration, user management, and overall oversight.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          title="Manage Users"
          description="View all users (students, teachers, admins) and their details."
          href="/admin/manage-users"
          icon={<Users2 className="h-8 w-8" />}
        />
        <FeatureCard
          title="User Subject Assignment"
          description="Assign general academic subjects for users (teachers/admins)."
          href="/admin/manage-teacher-subjects"
          icon={<BookLock className="h-8 w-8" />}
        />
        <FeatureCard
          title="Manage Semesters"
          description="Add, rename, or delete academic semesters in the system."
          href="/admin/manage-semesters"
          icon={<CalendarPlus className="h-8 w-8" />}
        />
        <FeatureCard
          title="Teacher Semester Assignments"
          description="Assign subjects to teachers for specific academic semesters."
          href="/admin/manage-teacher-semester-assignments"
          icon={<CalendarClock className="h-8 w-8" />}
        />
         <FeatureCard
          title="Manage System Subjects"
          description="Add, rename, or delete global academic subjects."
          href="/admin/manage-system-subjects"
          icon={<Activity className="h-8 w-8" />}
        />
      </div>

       <Card className="mt-12 bg-secondary/30">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary"/>
            System Overview
          </CardTitle>
          <CardDescription>A brief summary of key metrics in the CampusMarks system from Firestore.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatDisplay value={totalUsers} label="Total Users" icon={<Users className="h-4 w-4"/>} />
          <StatDisplay value={activeTeachers} label="Teachers & Admins" icon={<UserCheck className="h-4 w-4"/>} />
          <StatDisplay value={enrolledStudents} label="Enrolled Students" icon={<GraduationCap className="h-4 w-4"/>} />
        </CardContent>
      </Card>
    </div>
  );
}
